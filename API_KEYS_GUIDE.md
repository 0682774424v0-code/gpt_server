# 🔑 API Keys & Model Management Guide

## Overview

The Stable Diffusion WebUI now includes comprehensive API keys management and model downloading capabilities directly from the GUI.

---

## 📋 Table of Contents

1. [Server Configuration](#server-configuration)
2. [API Keys Configuration](#api-keys-configuration)
3. [Model Downloads](#model-downloads)
4. [Supported Sources](#supported-sources)
5. [Google Colab Notebook](#google-colab-notebook)
6. [Troubleshooting](#troubleshooting)

---

## 🌐 Server Configuration

### WebSocket Server URL

**Purpose:** Connect to a custom server instead of the default localhost

**Location:** Settings tab → "Server Configuration" section

**Use Cases:**
- Connect to remote server with SSL/TLS (wss://)
- Connect to Cloudflare Tunnel
- Connect to custom domain with reverse proxy
- Deploy to production server

**Examples:**

```
Local (default):    http://localhost:5000
Secure tunnel:      wss://example.cloudflareaccess.com
Production:         wss://api.example.com
Remote server:      ws://192.168.1.100:5000
```

**Steps:**

1. Go to Settings tab
2. Find "Server Configuration" section
3. Enter WebSocket URL in "WebSocket Server URL" field
4. Click "Save URL"
5. Refresh page to apply changes

**Note:** URL is stored in browser's localStorage and persists across sessions.

---

## 🔑 API Keys Configuration

### HuggingFace Token

Required for downloading models from HuggingFace Hub.

**Steps:**

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a new token (Read access is sufficient)
3. In Settings tab, enter your token in "HuggingFace Token" field
4. Click "Save Token"

**What it's used for:**
- Downloading Stable Diffusion checkpoints
- Accessing gated models (with permission)
- Downloading LoRA and VAE models
- Stable Diffusion pipeline initialization

### Civitai API Key

Optional but recommended for downloading models from Civitai.

**Steps:**

1. Go to [civitai.com/user/account](https://civitai.com/user/account)
2. Copy your API Key
3. In Settings tab, enter your key in "Civitai API Key" field
4. Click "Save Key"

**What it's used for:**
- Downloading models from Civitai
- Accessing exclusive models
- Automatic model metadata fetching

**Note:** Keys are stored in browser's `localStorage` (plaintext). For production, consider using environment variables instead.

---

## 📦 Model Downloads

### Download Checkpoint Models

#### From HuggingFace Hub

Enter the model ID in the "Download Checkpoint" field:

```
runwayml/stable-diffusion-v1-5
stabilityai/stable-diffusion-2-1
stabilityai/stable-diffusion-xl-base-1.0
```

#### From Civitai

Copy the direct download URL:

```
https://civitai.com/api/v1/models/[MODEL_ID]/modelVersions/[VERSION_ID]/files
```

#### From Direct URL

Paste the direct safetensors or ckpt file URL:

```
https://example.com/model.safetensors
```

### Download LoRA Models

LoRA models for style control and enhancement:

```
ostris/super-color-watercolor-lora-sdxl
nerijs/pixel-art-xl
...
```

### Download VAE Models

Optional VAE for improved image quality:

```
stabilityai/sd-vae-ft-mse
stabilityai/sd-vae-ft-ema
```

---

## 🌐 Supported Sources

### HuggingFace Hub
- ✅ Diffusers format
- ✅ Safetensors (.safetensors)
- ✅ Model IDs and URLs
- ✅ Automatic tokenization with HF token

### Civitai
- ✅ Direct download URLs
- ✅ Model API endpoints
- ✅ Requires API key for some models

### Direct URLs
- ✅ Direct safetensors links
- ✅ Direct ckpt links
- ✅ Any HTTP(S) endpoint

---

## 🚀 Google Colab Notebook

### Quick Start

1. **Open in Colab:**
   - Copy `stable_diffusion_colab.ipynb` URL
   - Paste in [colab.research.google.com](https://colab.research.google.com)
   - Or upload the file directly

2. **Run Setup Cell:**
   - Executes: `# Initialize Dependencies and Environment`
   - Installs all required packages

3. **Configure API Keys:**
   - Enter HuggingFace token
   - (Optional) Enter Civitai API key
   - Click "Save Token"/"Save Key"

4. **Download Models:**
   - Enter model URLs in "Download Checkpoint" section
   - Click "Download"
   - Monitor progress bar

5. **Load Model:**
   - Select model from dropdown
   - Choose precision (fp16 or fp32)
   - Click "Load Model"

6. **Generate Images:**
   - Enter prompt
   - Adjust parameters (steps, CFG, dimensions)
   - Click "🎨 Generate"

### Notebook Features

| Feature | Details |
|---------|---------|
| **Cell 1** | Markdown - Introduction |
| **Cell 2** | Install dependencies |
| **Cell 3** | Import libraries, setup GPU |
| **Cell 4** | API Keys Manager class |
| **Cell 5** | API Keys GUI configuration |
| **Cell 6** | Model Downloader class |
| **Cell 7** | Download GUI |
| **Cell 8** | StableDiffusionManager class |
| **Cell 9** | Model loading GUI |
| **Cell 10** | Image generation GUI |
| **Cell 11** | Quick examples |
| **Cell 12** | Gallery display |
| **Cell 13** | Download all images |

### Google Colab Advantages

- ✅ Free GPU (Tesla T4 or A100)
- ✅ Pre-installed Python environment
- ✅ Google Drive integration built-in
- ✅ No installation required
- ✅ Accessible from any device

### Memory Requirements

**Colab GPU Memory:**
- SD 1.5: ~6-8 GB
- SDXL: ~16-20 GB
- Flux: ~20+ GB

**Google Colab provides:**
- Tesla T4: 16 GB VRAM
- A100 (free tier sometimes): 40 GB VRAM

---

## 🖥️ Local Setup

### Installation

```bash
# Install PyTorch with CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create `.env` file:

```env
HF_TOKEN=hf_your_token_here
CIVITAI_API_KEY=your_civitai_key_here
PORT=5000
SECRET_KEY=your_secret_key_here
```

### Run Server

```bash
# Start backend server
python colab_server.py

# In browser, open:
# http://localhost:5000
```

---

## 🛠️ Troubleshooting

### API Key Issues

**Problem:** "Invalid token" error
```
Solution: 
1. Check token at https://huggingface.co/settings/tokens
2. Ensure token has "Read" permission
3. Clear browser cache and try again
```

**Problem:** "Authentication required" for Civitai
```
Solution:
1. Get API key from https://civitai.com/user/account
2. Ensure key is valid and not expired
3. Some models may require paid access
```

### Download Issues

**Problem:** "Download timeout" or "Connection refused"
```
Solution:
1. Check internet connection
2. Try direct URL instead of model ID
3. Use HuggingFace mirror if main server is slow:
   - https://huggingface-mirror.com/
```

**Problem:** "Disk space full"
```
Solution:
1. Check available disk space: df -h
2. Models directory location: ./models/checkpoints/
3. Consider downloading to Google Drive in Colab
```

### Memory Issues

**Problem:** "CUDA out of memory"
```
Solution:
1. Enable memory optimizations in Settings
2. Use lower resolution images (512x512)
3. Reduce number of inference steps
4. Use fp16 precision instead of fp32
5. Enable CPU offloading
```

**Problem:** "Model not found"
```
Solution:
1. Ensure model is downloaded correctly
2. Check ./models/checkpoints/ directory
3. Try redownloading the model
4. Clear cache: Settings -> Clear Cache
```

### GUI Issues

**Problem:** Settings tab not showing API keys section
```
Solution:
1. Ensure app-api-keys.js is loaded
2. Check browser console for errors (F12)
3. Clear browser cache
4. Hard refresh: Ctrl+Shift+R
```

**Problem:** Download progress not showing
```
Solution:
1. Check WebSocket connection (Connection Status in header)
2. Verify server is running
3. Check browser console for errors
4. Restart server and refresh page
```

---

## 📝 Examples

### Example 1: Download and Generate with SD 1.5

```javascript
// In browser console (or GUI)
1. Settings -> HuggingFace Token: [paste token]
2. Settings -> Download Checkpoint: runwayml/stable-diffusion-v1-5
3. Wait for download
4. Generation -> Model: SD 1.5
5. Generation -> Prompt: "a beautiful landscape"
6. Click Generate
```

### Example 2: Use Custom LoRA

```
1. Settings -> Download LoRA: ostris/super-color-watercolor-lora-sdxl
2. Wait for completion
3. Generation -> LoRA Models: [select downloaded LoRA]
4. Generation -> LoRA Weight: 0.8
5. Generate with LoRA enabled
```

### Example 3: Colab Full Workflow

```python
# Cell 4: Enter HuggingFace token
hf_token_input.value = "hf_..."

# Cell 4: Click "Save Token" button

# Cell 6: Download model
checkpoint_url.value = "runwayml/stable-diffusion-v1-5"
# Click "Download"

# Cell 8: Load model
model_dropdown.value = "runwayml/stable-diffusion-v1-5"
# Click "Load Model"

# Cell 10: Generate
prompt_input.value = "a beautiful landscape, sunset, 4k"
steps_input.value = 25
cfg_input.value = 7.5
# Click "🎨 Generate"

# Cell 12: Show gallery
show_gallery()

# Cell 13: Download all
download_all()
```

---

## 🔐 Security Considerations

⚠️ **Important:**

- API keys stored in `localStorage` are accessible via JavaScript
- Don't share your browser data with others
- Use environment variables on production servers
- Rotate API keys regularly
- Check HuggingFace/Civitai audit logs for unusual activity

**Better approach for production:**
```python
# Use environment variables
HF_TOKEN = os.getenv('HF_TOKEN')
CIVITAI_KEY = os.getenv('CIVITAI_API_KEY')
```

---

## 📚 Resources

- **HuggingFace Hub:** https://huggingface.co/models?pipeline_tag=text-to-image
- **Civitai Models:** https://civitai.com/
- **Stable Diffusion Docs:** https://huggingface.co/docs/diffusers/
- **Google Colab:** https://colab.research.google.com/

---

## 🎯 Next Steps

1. ✅ Configure API keys
2. ✅ Download your first model
3. ✅ Generate images locally or in Colab
4. ✅ Explore advanced features (ControlNet, LoRA, etc.)
5. ✅ Share generated artwork!

---

**Happy generating! 🎨**
