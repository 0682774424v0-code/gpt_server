"""
Example Colab Notebook Script
Copy and paste these cells into Google Colab to get started
"""

# ==================== CELL 1: SETUP ====================
# Run this cell first to install everything

!bash <(curl -s https://raw.githubusercontent.com/your-repo/setup_colab.sh)

# ==================== CELL 2: DOWNLOAD FRONTEND ====================
# Download frontend files from GitHub Pages or directly

!git clone https://github.com/your-repo/stable-diffusion-webui.git /root/webui
%cd /root/webui

# ==================== CELL 3: START SERVER ====================
# This starts the Flask server in background

import os
os.environ['FLASK_ENV'] = 'production'
os.environ['DEVICE'] = 'cuda'
os.environ['MODEL_PRECISION'] = 'fp16'

# Run in background
import subprocess
import time

process = subprocess.Popen(['python', 'colab_server.py'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
print("🚀 Server started (PID: {})".format(process.pid))
time.sleep(5)  # Wait for server to start

# ==================== CELL 4: START CLOUDFLARE TUNNEL ====================
# This creates secure WSS connection for frontend access

!./cloudflared tunnel --url http://localhost:5000

# Copy the https://xxx.trycloudflare.com URL and use it in your frontend

# ==================== CELL 5: VERIFY CONNECTION ====================
# Test if server is running

import requests

try:
    response = requests.get('http://localhost:5000/health')
    health = response.json()
    print("✓ Server is healthy!")
    print(f"  Device: {health['device']}")
    print(f"  Google Drive: {'Connected' if health['gdrive_connected'] else 'Not connected'}")
except Exception as e:
    print(f"✗ Server error: {e}")

# ==================== CELL 6: MONITOR SERVER ====================
# Monitor server status and logs

import psutil
import json

# Get process info
proc = psutil.Process(process.pid)
print(f"CPU Usage: {proc.cpu_percent()}%")
print(f"Memory Usage: {proc.memory_info().rss / 1024 / 1024:.2f} MB")

# Check GPU
import torch
print(f"\nGPU Memory:")
print(f"  Allocated: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
print(f"  Reserved: {torch.cuda.memory_reserved() / 1e9:.2f} GB")
print(f"  Available: {(torch.cuda.max_memory_allocated() - torch.cuda.memory_allocated()) / 1e9:.2f} GB")

# ==================== CELL 7: KEEP COLAB RUNNING ====================
# Prevent Colab from disconnecting

import time

print("Keeping session alive...")
print("Your server URL: [Copy from Cloudflare tunnel output]")
print("\nInstructions:")
print("1. Copy the HTTPS URL from Cloudflare output")
print("2. Update SERVER_URL in your frontend app.js")
print("3. Open your frontend in browser")
print("4. Start generating!")

try:
    while True:
        time.sleep(60)
        # Optional: health check every minute
        try:
            requests.get('http://localhost:5000/health', timeout=5)
        except:
            pass
except KeyboardInterrupt:
    print("\nShutting down server...")
    process.terminate()
    process.wait()

# ==================== OPTIONAL: CELL 8 - DOWNLOAD MODELS ====================
# Pre-download models to avoid timeout during first generation

from huggingface_hub import snapshot_download
import os

model_id = "runwayml/stable-diffusion-v1-5"
cache_dir = "./models"

print(f"Downloading {model_id}...")
snapshot_download(model_id, cache_dir=cache_dir)
print("✓ Model downloaded")

# ==================== OPTIONAL: CELL 9 - TEST GENERATION ====================
# Test generation without frontend

import json
from socketio import Client

sio = Client()

@sio.event
def connect():
    print("Connected to server")

@sio.event
def progress(data):
    print(f"Progress: {data['step']}/{data['total']}")

@sio.event
def complete(data):
    print("Generation complete!")
    print(f"Images: {len(data['images'])}")

@sio.event
def error(data):
    print(f"Error: {data['message']}")

sio.connect('http://localhost:5000')

# Send generation request
params = {
    "action": "generate",
    "params": {
        "prompt": "a beautiful landscape with mountains",
        "negative_prompt": "blurry, low quality",
        "task": "txt2img",
        "model": "runwayml/stable-diffusion-v1-5",
        "width": 512,
        "height": 512,
        "steps": 20,
        "cfg_scale": 7.5,
        "seed": -1
    }
}

sio.emit('generate', params["params"])
sio.wait()

# ==================== OPTIONAL: CELL 10 - GPU MEMORY OPTIMIZATION ====================
# If running out of memory, enable optimization

# Clear cache
import torch
torch.cuda.empty_cache()

# Enable memory optimization
import gc
gc.collect()

print("Memory optimized")

# ==================== OPTIONAL: CELL 11 - BACKUP TO GOOGLE DRIVE ====================
# Automatically sync outputs to Google Drive

from google.colab import auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import os

auth.authenticate_user()
drive_service = build('drive', 'v3')

def upload_to_drive(local_path):
    """Upload file to Google Drive"""
    file_name = os.path.basename(local_path)
    file_metadata = {
        'name': file_name,
        'parents': ['your_folder_id']
    }
    media = MediaFileUpload(local_path, mimetype='image/png')
    file = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()
    return file.get('id')

# Upload outputs
outputs_dir = './outputs'
if os.path.exists(outputs_dir):
    for file in os.listdir(outputs_dir):
        file_path = os.path.join(outputs_dir, file)
        print(f"Uploading {file}...")
        file_id = upload_to_drive(file_path)
        print(f"  ✓ Uploaded as {file_id}")

# ==================== OPTIONAL: CELL 12 - PERFORMANCE BENCHMARKING ====================
# Benchmark generation speed

import time
import torch

torch.cuda.synchronize()
start = time.time()

# Generate
# ... (send generation request and wait)

torch.cuda.synchronize()
end = time.time()

print(f"Generation Time: {end - start:.2f}s")
print(f"Peak Memory: {torch.cuda.max_memory_allocated() / 1e9:.2f} GB")
print(f"Images/s: {1 / (end - start):.2f}")

# ==================== HELPFUL TIPS ====================
"""
💡 Tips for Colab:

1. Runtime Issues:
   - Use GPU runtime (not TPU)
   - Runtime > Change runtime type > GPU > A100 (if available)

2. Timeout Prevention:
   - Keep one tab open with Colab visible
   - Don't let browser tab sleep
   - Run keep-alive cell every 30 minutes

3. Memory Issues:
   - Start with smaller image size (512x512)
   - Reduce steps (15-20)
   - Use fp16 precision
   - Restart runtime if needed

4. Speed Optimization:
   - Use xformers for faster attention
   - Enable CUDA graphs
   - Use memory efficient attention

5. Google Drive:
   - Connect your Drive for auto-save
   - Use shared folders for collaboration
   - Set auto-backup in settings

6. Model Selection:
   - SD 1.5: Fast, good for fast iterations
   - SDXL: Better quality, slower
   - Flux: Best quality, slowest

7. Debugging:
   - Check server logs if generation fails
   - Verify GPU memory with nvidia-smi
   - Test with simple prompt first
   - Check WebSocket connection in browser console
"""
