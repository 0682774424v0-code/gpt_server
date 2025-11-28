"""
Utility functions and helpers
"""

import os
import json
import hashlib
from datetime import datetime
from pathlib import Path

def get_system_info():
    """Get system information"""
    import torch
    import platform
    
    return {
        'os': platform.system(),
        'python_version': platform.python_version(),
        'torch_version': torch.__version__,
        'cuda_available': torch.cuda.is_available(),
        'cuda_version': torch.version.cuda if torch.cuda.is_available() else None,
        'gpu_count': torch.cuda.device_count() if torch.cuda.is_available() else 0,
        'gpu_names': [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())] if torch.cuda.is_available() else [],
    }

def format_bytes(bytes_size):
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024:
            return f"{bytes_size:.2f} {unit}"
        bytes_size /= 1024
    return f"{bytes_size:.2f} TB"

def get_file_hash(filepath, algorithm='sha256'):
    """Calculate file hash"""
    hash_func = hashlib.new(algorithm)
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            hash_func.update(chunk)
    return hash_func.hexdigest()

def ensure_directory(path):
    """Ensure directory exists"""
    Path(path).mkdir(parents=True, exist_ok=True)
    return Path(path)

def load_config(config_path='.env'):
    """Load configuration from .env file"""
    config = {}
    if os.path.exists(config_path):
        with open(config_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip()
    return config

def log_to_file(message, log_file='server.log'):
    """Log message to file"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(log_file, 'a') as f:
        f.write(f"[{timestamp}] {message}\n")

def cleanup_old_files(directory, days=30):
    """Remove files older than specified days"""
    import time
    from pathlib import Path
    
    cutoff_time = time.time() - (days * 86400)
    count = 0
    
    for filepath in Path(directory).glob('**/*'):
        if filepath.is_file() and filepath.stat().st_mtime < cutoff_time:
            filepath.unlink()
            count += 1
    
    return count

def estimate_memory_requirement(width, height, steps, model_type='sd15'):
    """Estimate VRAM requirement for generation"""
    # Base memory for model
    base_memory = {
        'sd15': 4,      # GB
        'sd21': 5,
        'sdxl': 7,
        'flux': 12
    }
    
    model_mem = base_memory.get(model_type, 4)
    
    # Additional for inference
    batch_mem = (width * height * 4 * steps) / (1024**3)  # Rough estimate
    
    total = model_mem + batch_mem
    return round(total, 2)

def validate_image_path(filepath):
    """Validate image file"""
    from PIL import Image
    
    try:
        img = Image.open(filepath)
        img.verify()
        return True
    except:
        return False

def compress_image(filepath, quality=85):
    """Compress image to reduce file size"""
    from PIL import Image
    
    img = Image.open(filepath)
    
    # Convert to RGB if necessary
    if img.mode == 'RGBA':
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        rgb_img.paste(img, mask=img.split()[3])
        img = rgb_img
    
    output_path = filepath.replace('.png', '_compressed.jpg')
    img.save(output_path, 'JPEG', quality=quality, optimize=True)
    
    return output_path

class PerformanceMonitor:
    """Monitor performance metrics"""
    
    def __init__(self):
        self.metrics = {
            'generation_time': [],
            'average_time': 0,
            'total_generations': 0,
            'failed_generations': 0,
            'average_memory': 0,
        }
    
    def record_generation(self, duration, success=True):
        """Record generation metrics"""
        if success:
            self.metrics['generation_time'].append(duration)
            self.metrics['total_generations'] += 1
            self.metrics['average_time'] = sum(self.metrics['generation_time']) / len(self.metrics['generation_time'])
        else:
            self.metrics['failed_generations'] += 1
    
    def get_report(self):
        """Get performance report"""
        return {
            'total_generations': self.metrics['total_generations'],
            'failed_generations': self.metrics['failed_generations'],
            'success_rate': (self.metrics['total_generations'] / (self.metrics['total_generations'] + self.metrics['failed_generations']) * 100) if (self.metrics['total_generations'] + self.metrics['failed_generations']) > 0 else 0,
            'average_generation_time': round(self.metrics['average_time'], 2),
            'fastest_generation': round(min(self.metrics['generation_time']), 2) if self.metrics['generation_time'] else 0,
            'slowest_generation': round(max(self.metrics['generation_time']), 2) if self.metrics['generation_time'] else 0,
        }

class ImageMetadataExtractor:
    """Extract and manage image metadata"""
    
    @staticmethod
    def extract_from_dict(metadata_dict):
        """Extract metadata from dictionary"""
        return json.dumps(metadata_dict)
    
    @staticmethod
    def save_to_image(image_path, metadata):
        """Save metadata to image (requires piexif or exif)"""
        from PIL import Image
        
        try:
            img = Image.open(image_path)
            # Add metadata to description
            info = img.info if hasattr(img, 'info') else {}
            info['metadata'] = json.dumps(metadata)
            img.save(image_path, pnginfo=info)
            return True
        except:
            return False
    
    @staticmethod
    def extract_from_image(image_path):
        """Extract metadata from image"""
        from PIL import Image
        
        try:
            img = Image.open(image_path)
            metadata = img.info.get('metadata', {})
            if isinstance(metadata, str):
                metadata = json.loads(metadata)
            return metadata
        except:
            return {}

# Example usage
if __name__ == '__main__':
    print("System Information:")
    print(json.dumps(get_system_info(), indent=2))
    
    print("\nMemory Requirements:")
    print(f"SD 1.5 (512x512, 20 steps): {estimate_memory_requirement(512, 512, 20, 'sd15')} GB")
    print(f"SDXL (768x768, 30 steps): {estimate_memory_requirement(768, 768, 30, 'sdxl')} GB")
    
    print("\nPerformance Monitor Test:")
    monitor = PerformanceMonitor()
    monitor.record_generation(5.2)
    monitor.record_generation(4.8)
    monitor.record_generation(5.1)
    print(json.dumps(monitor.get_report(), indent=2))
