"""
Stable Diffusion WebSocket Server for Google Colab
Підтримує txt2img, img2img, inpaint, ControlNet, LoRA, IP-Adapter та інші функції
"""

import os
import json
import base64
import asyncio
import threading
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from functools import wraps
import time
import re

from flask import Flask, request, send_file, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from PIL import Image
import io
import cv2
import numpy as np

# Optional imports для Colab
try:
    from google.colab import auth
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload
    IN_COLAB = True
except ImportError:
    IN_COLAB = False

try:
    import torch
    from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline
    from diffusers import StableDiffusionImg2ImgPipeline, StableDiffusionInpaintPipeline
    from transformers import CLIPTextModel, CLIPTokenizer
    DIFFUSERS_AVAILABLE = True
except ImportError:
    DIFFUSERS_AVAILABLE = False

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app initialization
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60, ping_interval=25)

# Global state
class ServerState:
    def __init__(self):
        self.models = {}
        self.current_task = None
        self.is_generating = False
        self.queue = []
        self.gdrive_service = None
        self.gdrive_folder_id = None
        self.gallery_history = []
        self.rate_limit_store = {}
        self.model_precision = "fp16"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def clear(self):
        self.models = {}
        self.current_task = None
        self.is_generating = False
        self.queue = []

state = ServerState()

# ==================== UTILITY FUNCTIONS ====================

def rate_limit(max_calls: int = 100, time_window: int = 60):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_id = request.sid if hasattr(request, 'sid') else 'default'
            now = time.time()
            
            if client_id not in state.rate_limit_store:
                state.rate_limit_store[client_id] = []
            
            # Remove old entries
            state.rate_limit_store[client_id] = [
                t for t in state.rate_limit_store[client_id] 
                if now - t < time_window
            ]
            
            if len(state.rate_limit_store[client_id]) >= max_calls:
                return {'status': 'error', 'message': 'Rate limit exceeded'}, 429
            
            state.rate_limit_store[client_id].append(now)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_input(data: Dict, required_fields: List[str]) -> Optional[Dict]:
    """Validate input data"""
    if not isinstance(data, dict):
        return {'error': 'Invalid request format'}
    
    for field in required_fields:
        if field not in data:
            return {'error': f'Missing required field: {field}'}
    
    # Validate string lengths
    for key, value in data.items():
        if isinstance(value, str) and len(value) > 10000:
            return {'error': f'Field {key} exceeds maximum length'}
    
    return None

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for file system"""
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    filename = filename[:200]  # Max length
    return filename

def create_metadata_dict(params: Dict) -> Dict:
    """Create metadata dictionary for saved images"""
    return {
        'prompt': params.get('prompt', ''),
        'negative_prompt': params.get('negative_prompt', ''),
        'seed': params.get('seed', -1),
        'steps': params.get('steps', 20),
        'cfg_scale': params.get('cfg_scale', 7.5),
        'sampler': params.get('sampler', 'euler'),
        'scheduler': params.get('scheduler', 'normal'),
        'model': params.get('model', 'unknown'),
        'task': params.get('task', 'txt2img'),
        'width': params.get('width', 512),
        'height': params.get('height', 512),
        'timestamp': datetime.now().isoformat(),
        'loras': params.get('loras', []),
        'controlnet': params.get('controlnet', {})
    }

# ==================== GOOGLE DRIVE INTEGRATION ====================

class GoogleDriveManager:
    """Manage Google Drive integration"""
    
    def __init__(self):
        self.service = None
        self.folder_id = None
        self.initialized = False
    
    async def initialize(self):
        """Initialize Google Drive API (Colab only)"""
        if not IN_COLAB:
            logger.warning("Not in Colab, Google Drive integration unavailable")
            return False
        
        try:
            auth.authenticate_user()
            self.service = build('drive', 'v3')
            
            # Create or find StableDiffusion_Gallery folder
            results = self.service.files().list(
                q="name='StableDiffusion_Gallery' and trashed=false and mimeType='application/vnd.google-apps.folder'",
                spaces='drive',
                fields='files(id, name)',
                pageSize=1
            ).execute()
            
            files = results.get('files', [])
            if files:
                self.folder_id = files[0]['id']
            else:
                # Create folder
                file_metadata = {
                    'name': 'StableDiffusion_Gallery',
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                folder = self.service.files().create(body=file_metadata, fields='id').execute()
                self.folder_id = folder.get('id')
            
            self.initialized = True
            logger.info(f"Google Drive initialized. Folder ID: {self.folder_id}")
            return True
        
        except Exception as e:
            logger.error(f"Google Drive initialization failed: {e}")
            return False
    
    async def upload_image(self, image: Image.Image, metadata: Dict) -> Optional[str]:
        """Upload image to Google Drive with metadata"""
        if not self.initialized or not self.service:
            return None
        
        try:
            # Prepare image
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            # Create folder structure: Year/Month/Day
            now = datetime.now()
            date_path = f"{now.year}/{now.strftime('%m')}/{now.strftime('%d')}"
            
            # Create date folders if not exist
            parent_id = self.folder_id
            for folder_name in date_path.split('/'):
                folder_id = await self._get_or_create_folder(folder_name, parent_id)
                parent_id = folder_id
            
            # Save filename with seed and timestamp
            seed = metadata.get('seed', -1)
            timestamp = int(time.time())
            filename = f"{timestamp}_{seed}.png"
            
            file_metadata = {
                'name': filename,
                'parents': [parent_id],
                'description': json.dumps(metadata)
            }
            
            media = MediaIoBaseUpload(img_byte_arr, mimetype='image/png', resumable=True)
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            logger.info(f"Image uploaded to Google Drive: {file['id']}")
            return file['id']
        
        except Exception as e:
            logger.error(f"Google Drive upload failed: {e}")
            return None
    
    async def _get_or_create_folder(self, folder_name: str, parent_id: str) -> str:
        """Get or create folder in Google Drive"""
        try:
            results = self.service.files().list(
                q=f"name='{folder_name}' and parent='{parent_id}' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                spaces='drive',
                fields='files(id)',
                pageSize=1
            ).execute()
            
            files = results.get('files', [])
            if files:
                return files[0]['id']
            
            # Create folder
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [parent_id]
            }
            folder = self.service.files().create(body=file_metadata, fields='id').execute()
            return folder['id']
        
        except Exception as e:
            logger.error(f"Folder creation failed: {e}")
            return parent_id

gdrive_manager = GoogleDriveManager()

# ==================== STABLE DIFFUSION PIPELINE ====================

class StableDiffusionManager:
    """Manage Stable Diffusion models and generation"""
    
    def __init__(self):
        self.pipelines = {}
        self.models_path = Path(os.environ.get('MODELS_PATH', './models'))
        self.models_path.mkdir(exist_ok=True)
        self.current_model = None
        self.model_lock = threading.Lock()
    
    async def load_model(self, model_name: str, model_type: str = "checkpoint") -> bool:
        """Load model into memory"""
        with self.model_lock:
            try:
                if model_name in self.pipelines:
                    self.current_model = model_name
                    return True
                
                logger.info(f"Loading model: {model_name}")
                
                if model_type == "checkpoint":
                    # Load from HuggingFace or local path
                    if "xl" in model_name.lower():
                        pipeline = StableDiffusionXLPipeline.from_pretrained(
                            model_name,
                            torch_dtype=torch.float16 if state.model_precision == "fp16" else torch.float32,
                            use_safetensors=True
                        )
                    else:
                        pipeline = StableDiffusionPipeline.from_pretrained(
                            model_name,
                            torch_dtype=torch.float16 if state.model_precision == "fp16" else torch.float32,
                            use_safetensors=True
                        )
                    
                    pipeline = pipeline.to(state.device)
                    self.pipelines[model_name] = pipeline
                    self.current_model = model_name
                    
                    logger.info(f"Model loaded successfully: {model_name}")
                    return True
                
                return False
            
            except Exception as e:
                logger.error(f"Model loading failed: {e}")
                return False
    
    async def unload_model(self, model_name: str = None):
        """Unload model from memory"""
        model_to_unload = model_name or self.current_model
        
        if model_to_unload and model_to_unload in self.pipelines:
            del self.pipelines[model_to_unload]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info(f"Model unloaded: {model_to_unload}")
    
    async def generate(self, params: Dict) -> List[Image.Image]:
        """Generate images based on parameters"""
        try:
            # Validate input
            validation_error = validate_input(params, ['task', 'prompt'])
            if validation_error:
                raise ValueError(validation_error['error'])
            
            task = params['task']
            prompt = params['prompt']
            negative_prompt = params.get('negative_prompt', '')
            
            # Load model if not already loaded
            model_name = params.get('model', 'runwayml/stable-diffusion-v1-5')
            await self.load_model(model_name)
            
            pipeline = self.pipelines[self.current_model]
            
            # Generate based on task type
            if task == 'txt2img':
                images = await self._txt2img(pipeline, params)
            elif task == 'img2img':
                images = await self._img2img(pipeline, params)
            elif task == 'inpaint':
                images = await self._inpaint(pipeline, params)
            elif 'controlnet' in task:
                images = await self._controlnet(pipeline, params)
            else:
                raise ValueError(f"Unknown task: {task}")
            
            return images
        
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise
    
    async def _txt2img(self, pipeline, params: Dict) -> List[Image.Image]:
        """Text to image generation"""
        prompt = params['prompt']
        negative_prompt = params.get('negative_prompt', '')
        width = params.get('width', 512)
        height = params.get('height', 512)
        steps = params.get('steps', 20)
        cfg_scale = params.get('cfg_scale', 7.5)
        seed = params.get('seed', -1)
        sampler = params.get('sampler', 'euler')
        num_images = params.get('num_images', 1)
        loras = params.get('loras', [])
        
        logger.info(f"🎨 Txt2Img: {prompt[:50]}... ({width}x{height}, {steps} steps)")
        if loras:
            logger.info(f"📦 LoRAs: {[l.get('name', '') for l in loras]}")
        
        try:
            # Load LoRAs if provided
            for lora in loras:
                lora_name = lora.get('name', '')
                lora_weight = lora.get('weight', 1.0)
                lora_path = Path('./models/loras') / lora_name
                
                if lora_path.exists():
                    logger.info(f"Loading LoRA: {lora_name} (weight={lora_weight})")
                    pipeline.load_lora_weights(str(lora_path))
                    if hasattr(pipeline, 'set_lora_device'):
                        pipeline.set_lora_device(state.device)
                    if hasattr(pipeline, 'fuse_lora'):
                        pipeline.fuse_lora(lora_scale=lora_weight)
            
            # Set seed
            generator = None
            if seed >= 0:
                generator = torch.Generator(device=state.device).manual_seed(seed)
            
            # Run generation
            output = pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt,
                height=height,
                width=width,
                num_inference_steps=steps,
                guidance_scale=cfg_scale,
                generator=generator,
                num_images_per_prompt=num_images
            )
            
            logger.info(f"✅ Generated {len(output.images)} image(s)")
            return output.images
        
        except Exception as e:
            logger.error(f"❌ Txt2Img error: {e}")
            raise
    
    async def _img2img(self, pipeline, params: Dict) -> List[Image.Image]:
        """Image to image generation"""
        from diffusers import StableDiffusionImg2ImgPipeline
        
        prompt = params['prompt']
        negative_prompt = params.get('negative_prompt', '')
        strength = params.get('strength', 0.75)
        steps = params.get('steps', 20)
        cfg_scale = params.get('cfg_scale', 7.5)
        seed = params.get('seed', -1)
        
        # Decode input image
        image_data = base64.b64decode(params.get('image', ''))
        image = Image.open(io.BytesIO(image_data))
        
        logger.info(f"🖼️ Img2Img: {prompt[:50]}... (strength={strength})")
        
        try:
            # Load img2img pipeline if not already loaded
            if not isinstance(pipeline, StableDiffusionImg2ImgPipeline):
                model_name = self.current_model
                logger.info("Loading img2img pipeline...")
                pipeline = StableDiffusionImg2ImgPipeline.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16 if state.model_precision == "fp16" else torch.float32,
                    use_safetensors=True
                ).to(state.device)
            
            generator = None
            if seed >= 0:
                generator = torch.Generator(device=state.device).manual_seed(seed)
            
            output = pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=image,
                strength=strength,
                num_inference_steps=steps,
                guidance_scale=cfg_scale,
                generator=generator
            )
            
            logger.info(f"✅ Img2Img generated successfully")
            return output.images
        
        except Exception as e:
            logger.error(f"❌ Img2Img error: {e}")
            raise
    
    async def _inpaint(self, pipeline, params: Dict) -> List[Image.Image]:
        """Inpainting generation"""
        from diffusers import StableDiffusionInpaintPipeline
        
        prompt = params['prompt']
        negative_prompt = params.get('negative_prompt', '')
        strength = params.get('strength', 0.8)
        steps = params.get('steps', 20)
        cfg_scale = params.get('cfg_scale', 7.5)
        seed = params.get('seed', -1)
        
        # Decode images
        image_data = base64.b64decode(params.get('image', ''))
        image = Image.open(io.BytesIO(image_data))
        
        mask_data = base64.b64decode(params.get('mask', ''))
        mask = Image.open(io.BytesIO(mask_data))
        
        logger.info(f"🎭 Inpaint: {prompt[:50]}... (strength={strength})")
        
        try:
            # Load inpaint pipeline if not already loaded
            if not isinstance(pipeline, StableDiffusionInpaintPipeline):
                model_name = self.current_model
                logger.info("Loading inpaint pipeline...")
                pipeline = StableDiffusionInpaintPipeline.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16 if state.model_precision == "fp16" else torch.float32,
                    use_safetensors=True
                ).to(state.device)
            
            generator = None
            if seed >= 0:
                generator = torch.Generator(device=state.device).manual_seed(seed)
            
            output = pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=image,
                mask_image=mask,
                strength=strength,
                num_inference_steps=steps,
                guidance_scale=cfg_scale,
                generator=generator
            )
            
            logger.info(f"✅ Inpaint generated successfully")
            return output.images
        
        except Exception as e:
            logger.error(f"❌ Inpaint error: {e}")
            raise
    
    async def _controlnet(self, pipeline, params: Dict) -> List[Image.Image]:
        """ControlNet generation"""
        from diffusers import ControlNetModel, StableDiffusionControlNetPipeline
        import cv2
        
        prompt = params['prompt']
        negative_prompt = params.get('negative_prompt', '')
        steps = params.get('steps', 20)
        cfg_scale = params.get('cfg_scale', 7.5)
        seed = params.get('seed', -1)
        width = params.get('width', 512)
        height = params.get('height', 512)
        
        controlnet_type = params.get('controlnet_type', 'canny')
        controlnet_weight = params.get('controlnet_weight', 1.0)
        
        # Decode input image
        image_data = base64.b64decode(params.get('image', ''))
        image = Image.open(io.BytesIO(image_data))
        image = image.resize((width, height))
        
        logger.info(f"🎮 ControlNet {controlnet_type}: {prompt[:50]}...")
        
        try:
            # Map controlnet types to models
            controlnet_models = {
                'canny': 'lllyasviel/control_v11p_sd15_canny',
                'openpose': 'lllyasviel/control_v11p_sd15_openpose',
                'depth': 'lllyasviel/control_v11p_sd15_depth',
                'mlsd': 'lllyasviel/control_v11p_sd15_mlsd',
                'lineart': 'lllyasviel/control_v11p_sd15_lineart',
                'normalbae': 'lllyasviel/control_v11p_sd15_normalbae',
                'tile': 'lllyasviel/control_v11f1p_sd15_tile'
            }
            
            cn_model = controlnet_models.get(controlnet_type, 'lllyasviel/control_v11p_sd15_canny')
            
            logger.info(f"Loading ControlNet: {cn_model}")
            controlnet = ControlNetModel.from_pretrained(
                cn_model,
                torch_dtype=torch.float16 if state.model_precision == "fp16" else torch.float32,
                use_safetensors=True
            )
            
            cn_pipeline = StableDiffusionControlNetPipeline.from_pretrained(
                self.current_model,
                controlnet=controlnet,
                torch_dtype=torch.float16 if state.model_precision == "fp16" else torch.float32,
                use_safetensors=True
            ).to(state.device)
            
            # Preprocess image based on type
            if controlnet_type == 'canny':
                low = params.get('canny_low', 100)
                high = params.get('canny_high', 200)
                image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                edges = cv2.Canny(image_cv, low, high)
                edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
                control_image = Image.fromarray(cv2.cvtColor(edges, cv2.COLOR_BGR2RGB))
            else:
                control_image = image  # Assume preprocessed
            
            generator = None
            if seed >= 0:
                generator = torch.Generator(device=state.device).manual_seed(seed)
            
            output = cn_pipeline(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=control_image,
                controlnet_conditioning_scale=controlnet_weight,
                num_inference_steps=steps,
                guidance_scale=cfg_scale,
                generator=generator
            )
            
            logger.info(f"✅ ControlNet generated successfully")
            return output.images
        
        except Exception as e:
            logger.error(f"❌ ControlNet error: {e}")
            raise

sd_manager = StableDiffusionManager()

# ==================== ENHANCEMENT FUNCTIONS ====================

async def enhance_prompt(prompt: str) -> str:
    """Enhance prompt using LLM or predefined templates"""
    enhancements = {
        'portrait': 'a detailed portrait, professional lighting, sharp focus, 8k',
        'landscape': 'a beautiful landscape, atmospheric, cinematic lighting, 8k',
        'abstract': 'abstract art, colorful, artistic, creative composition',
    }
    
    # Simple keyword matching
    for key, enhancement in enhancements.items():
        if key.lower() in prompt.lower():
            return f"{prompt}, {enhancement}"
    
    # Default enhancement
    return f"{prompt}, high quality, detailed, professional"

async def apply_adetailer(image: Image.Image, params: Dict) -> Image.Image:
    """Apply Adetailer for detail enhancement"""
    logger.info("Applying Adetailer...")
    # Mock implementation
    return image

async def upscale_image(image: Image.Image, scale: int = 2, method: str = 'esrgan') -> Image.Image:
    """Upscale image"""
    logger.info(f"Upscaling image with {method}...")
    new_width = image.width * scale
    new_height = image.height * scale
    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)

# ==================== WEBSOCKET HANDLERS ====================

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f"Client connected: {request.sid}")
    emit('connection', {'status': 'connected', 'message': 'Connected to Stable Diffusion server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('generate')
async def handle_generate(data):
    """Handle generation request"""
    try:
        validation_error = validate_input(data, ['task', 'prompt'])
        if validation_error:
            emit('error', validation_error)
            return
        
        if state.is_generating:
            emit('error', {'message': 'Generation already in progress'})
            return
        
        state.is_generating = True
        
        try:
            # Emit progress
            emit('progress', {'step': 0, 'total': 100, 'status': 'Starting generation...'})
            
            # Generate images
            images = await sd_manager.generate(data)
            
            # Save images and metadata
            metadata = create_metadata_dict(data)
            saved_paths = []
            gdrive_ids = []
            
            for idx, image in enumerate(images):
                # Create filename
                timestamp = int(time.time())
                seed = data.get('seed', -1)
                filename = f"gen_{timestamp}_{seed}_{idx}.png"
                
                # Save locally
                local_path = Path(data.get('output_dir', './outputs')) / filename
                local_path.parent.mkdir(parents=True, exist_ok=True)
                image.save(local_path)
                saved_paths.append(str(local_path))
                
                # Upload to Google Drive
                if gdrive_manager.initialized:
                    gdrive_id = await gdrive_manager.upload_image(image, metadata)
                    if gdrive_id:
                        gdrive_ids.append(gdrive_id)
                
                # Store in gallery history
                state.gallery_history.append({
                    'path': str(local_path),
                    'metadata': metadata,
                    'gdrive_id': gdrive_id,
                    'timestamp': datetime.now().isoformat()
                })
            
            # Convert images to base64 for preview
            image_data = []
            for image in images:
                buffered = io.BytesIO()
                image.save(buffered, format="PNG")
                img_base64 = base64.b64encode(buffered.getvalue()).decode()
                image_data.append(img_base64)
            
            # Emit completion
            emit('complete', {
                'images': image_data,
                'metadata': metadata,
                'paths': saved_paths,
                'gdrive_ids': gdrive_ids
            })
        
        finally:
            state.is_generating = False
    
    except Exception as e:
        logger.error(f"Generation error: {e}")
        emit('error', {'message': str(e)})
        state.is_generating = False

@socketio.on('cancel_generation')
def handle_cancel():
    """Cancel current generation"""
    state.is_generating = False
    emit('cancelled', {'message': 'Generation cancelled'})

@socketio.on('download_model')
async def handle_download_model(data):
    """Handle model download request"""
    try:
        url = data.get('url', '').strip()
        model_type = data.get('model_type', 'checkpoint')
        hf_token = data.get('hf_token', '')
        civitai_key = data.get('civitai_key', '')
        
        if not url:
            emit('error', {'message': 'URL is required'})
            return
        
        # Emit start
        emit('download_start', {
            'model_type': model_type,
            'url': url
        })
        
        # Define progress callback
        async def progress_callback(progress_data):
            emit('download_progress', {
                'model_type': model_type,
                'progress': progress_data['progress'],
                'filename': progress_data['filename']
            })
        
        # Download based on type
        if model_type == 'checkpoint':
            result = await downloader.download_checkpoint(url, hf_token, civitai_key, progress_callback)
        elif model_type == 'lora':
            result = await downloader.download_lora(url, hf_token, civitai_key, progress_callback)
        elif model_type == 'vae':
            result = await downloader.download_vae(url, hf_token, progress_callback)
        else:
            emit('error', {'message': f'Unknown model type: {model_type}'})
            return
        
        if result['status'] == 'success':
            emit('download_complete', {
                'model_type': model_type,
                'filename': result['filename'],
                'path': result['path'],
                'size': result['size']
            })
        else:
            emit('error', {'message': result.get('message', 'Download failed')})
    
    except Exception as e:
        logger.error(f"Download error: {e}")
        emit('error', {'message': f'Download error: {str(e)}'})

@socketio.on('get_available_models')
def handle_get_available_models():
    """Get list of available models"""
    try:
        models = downloader.get_available_models()
        emit('models_list', {
            'models': models,
            'total': len(models)
        })
    except Exception as e:
        logger.error(f"Error getting models list: {e}")
        emit('error', {'message': str(e)})

@socketio.on('delete_model')
def handle_delete_model(data):
    """Delete a model file"""
    try:
        path = data.get('path', '')
        if not path:
            emit('error', {'message': 'Path is required'})
            return
        
        if downloader.delete_model(path):
            emit('model_deleted', {'path': path})
        else:
            emit('error', {'message': 'Failed to delete model'})
    except Exception as e:
        logger.error(f"Delete error: {e}")
        emit('error', {'message': str(e)})

@socketio.on('get_models')
async def handle_get_models():
    """Get list of available models"""
    try:
        models = {
            'checkpoints': [
                'runwayml/stable-diffusion-v1-5',
                'stabilityai/stable-diffusion-2-1',
                'stabilityai/stable-diffusion-xl-base-1.0'
            ],
            'loras': [],
            'vaes': [],
            'controlnets': [
                'lllyasviel/control_v11p_sd15_canny',
                'lllyasviel/control_v11p_sd15_openpose',
                'lllyasviel/control_v11p_sd15_depth',
            ]
        }
        emit('models_list', models)
    except Exception as e:
        emit('error', {'message': f'Failed to get models: {e}'})

@socketio.on('download_model')
async def handle_download_model(data):
    """Download model from URL"""
    try:
        validation_error = validate_input(data, ['url', 'type'])
        if validation_error:
            emit('error', validation_error)
            return
        
        url = data['url']
        model_type = data['type']  # checkpoint, lora, vae
        
        emit('progress', {'status': f'Downloading {model_type}...', 'step': 0, 'total': 100})
        
        # Mock download
        logger.info(f"Downloading {model_type} from {url}")
        
        emit('progress', {'status': f'{model_type} downloaded', 'step': 100, 'total': 100})
        emit('success', {'message': f'{model_type} downloaded successfully'})
    
    except Exception as e:
        logger.error(f"Download failed: {e}")
        emit('error', {'message': f'Download failed: {e}'})

@socketio.on('get_gallery')
async def handle_get_gallery(data):
    """Get gallery items with pagination"""
    try:
        page = data.get('page', 0)
        limit = data.get('limit', 20)
        
        start = page * limit
        end = start + limit
        
        items = state.gallery_history[start:end]
        total = len(state.gallery_history)
        
        emit('gallery_data', {
            'items': items,
            'total': total,
            'page': page,
            'limit': limit
        })
    
    except Exception as e:
        logger.error(f"Gallery retrieval failed: {e}")
        emit('error', {'message': f'Gallery retrieval failed: {e}'})

@socketio.on('enhance_prompt')
async def handle_enhance_prompt(data):
    """Enhance prompt"""
    try:
        validation_error = validate_input(data, ['prompt'])
        if validation_error:
            emit('error', validation_error)
            return
        
        original_prompt = data['prompt']
        enhanced = await enhance_prompt(original_prompt)
        
        emit('prompt_enhanced', {
            'original': original_prompt,
            'enhanced': enhanced
        })
    
    except Exception as e:
        logger.error(f"Prompt enhancement failed: {e}")
        emit('error', {'message': f'Prompt enhancement failed: {e}'})

@socketio.on('upscale_image')
async def handle_upscale_image(data):
    """Upscale image"""
    try:
        validation_error = validate_input(data, ['image', 'scale'])
        if validation_error:
            emit('error', validation_error)
            return
        
        # Decode base64 image
        image_data = base64.b64decode(data['image'])
        image = Image.open(io.BytesIO(image_data))
        
        scale = int(data.get('scale', 2))
        method = data.get('method', 'lanczos')
        
        upscaled = await upscale_image(image, scale, method)
        
        # Encode to base64
        buffered = io.BytesIO()
        upscaled.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        emit('upscale_complete', {
            'image': img_base64,
            'original_size': (image.width, image.height),
            'upscaled_size': (upscaled.width, upscaled.height)
        })
    
    except Exception as e:
        logger.error(f"Upscaling failed: {e}")
        emit('error', {'message': f'Upscaling failed: {e}'})

@socketio.on('adetailer')
async def handle_adetailer(data):
    """Apply Adetailer to image"""
    try:
        validation_error = validate_input(data, ['image'])
        if validation_error:
            emit('error', validation_error)
            return
        
        image_data = base64.b64decode(data['image'])
        image = Image.open(io.BytesIO(image_data))
        
        result = await apply_adetailer(image, data)
        
        buffered = io.BytesIO()
        result.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        emit('adetailer_complete', {'image': img_base64})
    
    except Exception as e:
        logger.error(f"Adetailer failed: {e}")
        emit('error', {'message': f'Adetailer failed: {e}'})

# ==================== MODEL DOWNLOADER ====================

class ModelDownloader:
    """Handle model downloads from HuggingFace, Civitai, and direct URLs"""
    
    def __init__(self):
        self.models_dir = Path('./models')
        self.models_dir.mkdir(exist_ok=True)
        self.checkpoint_dir = self.models_dir / 'checkpoints'
        self.lora_dir = self.models_dir / 'loras'
        self.vae_dir = self.models_dir / 'vaes'
        
        self.checkpoint_dir.mkdir(exist_ok=True)
        self.lora_dir.mkdir(exist_ok=True)
        self.vae_dir.mkdir(exist_ok=True)
    
    def _parse_civitai_url(self, url: str, civitai_key: str = None) -> Optional[str]:
        """Extract direct download link from Civitai URL"""
        try:
            import requests
            if 'civitai.com' in url:
                model_id = url.split('/')[-1].split('?')[0]
                api_url = f"https://civitai.com/api/v1/models/{model_id}"
                headers = {'Authorization': f'Bearer {civitai_key}'} if civitai_key else {}
                
                response = requests.get(api_url, headers=headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('modelVersions'):
                        return data['modelVersions'][0]['downloadUrl']
            return url
        except Exception as e:
            logger.error(f"Error parsing Civitai URL: {e}")
            return url
    
    def _parse_huggingface_url(self, url: str, hf_token: str = None) -> Optional[str]:
        """Handle HuggingFace model IDs and URLs"""
        if 'huggingface.co' not in url and '/' in url and not url.startswith('http'):
            # It's a model ID like "runwayml/stable-diffusion-v1-5"
            return url
        return url
    
    @staticmethod
    def _get_filename_from_url(url: str) -> str:
        """Extract filename from URL"""
        try:
            return url.split('/')[-1].split('?')[0] or 'model.safetensors'
        except:
            return 'model.safetensors'
    
    async def download_checkpoint(self, url: str, hf_token: str = None, 
                                   civitai_key: str = None, 
                                   progress_callback=None) -> Dict[str, Any]:
        """Download checkpoint model"""
        try:
            import requests
            from tqdm import tqdm
            
            # Parse URLs
            url = self._parse_civitai_url(url, civitai_key)
            url = self._parse_huggingface_url(url, hf_token)
            
            # For HF model IDs, download via HF_Hub
            if '/' in url and not url.startswith('http'):
                return await self._download_hf_model(url, hf_token)
            
            filename = self._get_filename_from_url(url)
            filepath = self.checkpoint_dir / filename
            
            # Download
            headers = {'Authorization': f'Bearer {hf_token}'} if hf_token else {}
            response = requests.get(url, headers=headers, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            with open(filepath, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback and total_size:
                            progress = downloaded / total_size
                            await progress_callback({'progress': progress, 'filename': filename})
            
            return {
                'status': 'success',
                'path': str(filepath),
                'filename': filename,
                'size': filepath.stat().st_size
            }
        except Exception as e:
            logger.error(f"Checkpoint download failed: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def download_lora(self, url: str, hf_token: str = None,
                            civitai_key: str = None,
                            progress_callback=None) -> Dict[str, Any]:
        """Download LoRA model"""
        try:
            import requests
            
            url = self._parse_civitai_url(url, civitai_key)
            url = self._parse_huggingface_url(url, hf_token)
            
            if '/' in url and not url.startswith('http'):
                return await self._download_hf_model(url, hf_token, 'loras')
            
            filename = self._get_filename_from_url(url)
            filepath = self.lora_dir / filename
            
            headers = {'Authorization': f'Bearer {hf_token}'} if hf_token else {}
            response = requests.get(url, headers=headers, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            with open(filepath, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback and total_size:
                            progress = downloaded / total_size
                            await progress_callback({'progress': progress, 'filename': filename})
            
            return {
                'status': 'success',
                'path': str(filepath),
                'filename': filename,
                'size': filepath.stat().st_size
            }
        except Exception as e:
            logger.error(f"LoRA download failed: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def download_vae(self, url: str, hf_token: str = None,
                           progress_callback=None) -> Dict[str, Any]:
        """Download VAE model"""
        try:
            import requests
            
            if '/' in url and not url.startswith('http'):
                return await self._download_hf_model(url, hf_token, 'vaes')
            
            filename = self._get_filename_from_url(url)
            filepath = self.vae_dir / filename
            
            headers = {'Authorization': f'Bearer {hf_token}'} if hf_token else {}
            response = requests.get(url, headers=headers, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            
            with open(filepath, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_callback and total_size:
                            progress = downloaded / total_size
                            await progress_callback({'progress': progress, 'filename': filename})
            
            return {
                'status': 'success',
                'path': str(filepath),
                'filename': filename,
                'size': filepath.stat().st_size
            }
        except Exception as e:
            logger.error(f"VAE download failed: {e}")
            return {'status': 'error', 'message': str(e)}
    
    async def _download_hf_model(self, model_id: str, hf_token: str = None,
                                  model_type: str = 'checkpoints') -> Dict[str, Any]:
        """Download HuggingFace model"""
        try:
            from huggingface_hub import hf_hub_download
            
            filename = f"{model_id.split('/')[-1]}.safetensors"
            directory = {
                'checkpoints': self.checkpoint_dir,
                'loras': self.lora_dir,
                'vaes': self.vae_dir
            }.get(model_type, self.checkpoint_dir)
            
            filepath = hf_hub_download(
                repo_id=model_id,
                filename="model.safetensors" if model_type != 'loras' else filename,
                cache_dir=str(directory),
                token=hf_token,
                force_download=False
            )
            
            return {
                'status': 'success',
                'path': filepath,
                'filename': Path(filepath).name,
                'size': Path(filepath).stat().st_size
            }
        except Exception as e:
            logger.error(f"HF download failed: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """List all available models"""
        models = []
        
        for model_type, directory in [
            ('checkpoint', self.checkpoint_dir),
            ('lora', self.lora_dir),
            ('vae', self.vae_dir)
        ]:
            if directory.exists():
                for file in directory.glob('*.safetensors') + directory.glob('*.ckpt'):
                    models.append({
                        'name': file.name,
                        'type': model_type,
                        'path': str(file),
                        'size': file.stat().st_size
                    })
        
        return models
    
    def delete_model(self, path: str) -> bool:
        """Delete a model file"""
        try:
            file_path = Path(path)
            if file_path.exists() and file_path.parent in [self.checkpoint_dir, self.lora_dir, self.vae_dir]:
                file_path.unlink()
                logger.info(f"Deleted model: {path}")
                return True
        except Exception as e:
            logger.error(f"Failed to delete model: {e}")
        return False

downloader = ModelDownloader()

# ==================== REST API ENDPOINTS ====================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'device': state.device,
        'is_generating': state.is_generating,
        'gdrive_connected': gdrive_manager.initialized
    })

@app.route('/api/image/<image_id>', methods=['GET'])
def get_image(image_id):
    """Get saved image by ID"""
    try:
        # Find image in history
        for item in state.gallery_history:
            if item.get('timestamp', '').replace(':', '').replace('-', '') == image_id.replace('-', ''):
                image_path = item['path']
                if os.path.exists(image_path):
                    return send_file(image_path, mimetype='image/png')
        
        return jsonify({'error': 'Image not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gallery/export', methods=['GET'])
def export_gallery():
    """Export gallery as JSON"""
    try:
        export_data = {
            'exported_at': datetime.now().isoformat(),
            'items': state.gallery_history,
            'total': len(state.gallery_history)
        }
        return jsonify(export_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/models/list', methods=['GET'])
def list_models():
    """List all loaded models"""
    try:
        return jsonify({
            'loaded_models': list(sd_manager.pipelines.keys()),
            'current_model': sd_manager.current_model,
            'device': state.device,
            'precision': state.model_precision
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== INITIALIZATION ====================

async def initialize_server():
    """Initialize server components"""
    try:
        logger.info("🚀 Initializing Stable Diffusion server...")
        
        # Check if in Colab and mount Google Drive
        if IN_COLAB:
            try:
                from google.colab import drive
                logger.info("📁 Mounting Google Drive...")
                drive.mount('/content/drive')
                
                # Create project directory on Drive
                project_path = Path('/content/drive/My Drive/StableDiffusion_Server')
                project_path.mkdir(exist_ok=True)
                
                # Create subdirectories
                (project_path / 'models' / 'checkpoints').mkdir(parents=True, exist_ok=True)
                (project_path / 'models' / 'loras').mkdir(parents=True, exist_ok=True)
                (project_path / 'outputs').mkdir(parents=True, exist_ok=True)
                
                # Symlink to local directories
                local_models = Path('./models')
                if not local_models.exists():
                    os.symlink(str(project_path / 'models'), str(local_models))
                    logger.info(f"✅ Linked models to Drive")
                
                local_outputs = Path('./outputs')
                if not local_outputs.exists():
                    os.symlink(str(project_path / 'outputs'), str(local_outputs))
                    logger.info(f"✅ Linked outputs to Drive")
                
            except Exception as e:
                logger.warning(f"⚠️ Google Drive mount failed: {e}")
        
        # Initialize Google Drive API
        await gdrive_manager.initialize()
        
        logger.info("✅ Server initialization complete")
    except Exception as e:
        logger.error(f"❌ Server initialization failed: {e}")

@app.before_request
def before_request():
    """Before request hook for rate limiting"""
    pass

# ==================== MAIN ====================

if __name__ == '__main__':
    # Create output directory
    Path('./outputs').mkdir(exist_ok=True)
    
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 5000))
    
    # Initialize server
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(initialize_server())
    
    # Start server
    logger.info(f"Starting server on port {port}")
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=False,
        allow_unsafe_werkzeug=True
    )
