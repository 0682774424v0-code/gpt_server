# ⚡ Quick Setup Guide - API Keys & Model Downloads

## 5-Minute Setup

### Step 1️⃣: Get API Keys (2 min)

#### HuggingFace Token
```
1. Go to: https://huggingface.co/settings/tokens
2. Create new token (Read access)
3. Copy token
```

#### Civitai API Key (Optional)
```
1. Go to: https://civitai.com/user/account
2. Copy API Key
```

### Step 2️⃣: Configure in GUI (1 min)

```
1. Open WebUI: http://localhost:5000
2. Go to Settings tab
3. Paste HuggingFace token → Click "Save Token"
4. (Optional) Paste Civitai key → Click "Save Key"
```

### Step 3️⃣: Download Model (1 min)

```
1. Settings → Model Management → Download Checkpoint
2. Enter: runwayml/stable-diffusion-v1-5
3. Click "Download"
4. Wait for progress bar to reach 100%
```

### Step 4️⃣: Generate! (1 min)

```
1. Generation tab
2. Prompt: "a beautiful landscape"
3. Click "Generate"
4. Done! 🎨
```

---

## 🚀 Google Colab (Even Easier!)

### One-Click Setup

```
1. Open: stable_diffusion_colab.ipynb in Google Colab
2. Click "▶ Run all"
3. Enter HuggingFace token when prompted
4. Start generating!
```

### No GPU Setup Needed
- Google Colab provides free GPU
- All dependencies auto-installed
- Interactive GUI included
- Runs in browser

---

## 📥 Model Download Examples

### Checkpoints

```
runwayml/stable-diffusion-v1-5
stabilityai/stable-diffusion-2-1
stabilityai/stable-diffusion-xl-base-1.0
black-forest-labs/flux-1-dev
```

### LoRAs

```
ostris/super-color-watercolor-lora-sdxl
nerijs/pixel-art-xl
prodiGY-ai/all-in-one-better-hands
```

### VAEs

```
stabilityai/sd-vae-ft-mse
stabilityai/sd-vae-ft-ema
```

---

## ⚙️ Configuration Tips

### For Faster Generation
```
Settings → Advanced Settings
✓ Enable CUDA Optimizations
✓ Enable CPU Offload
✓ Enable Memory Efficient
Precision: fp16 (not fp32)
```

### For Better Quality
```
Generation tab
Steps: 30-50 (instead of 20)
CFG Scale: 9-12 (instead of 7.5)
Sampler: Euler Ancestral
```

### For Lower VRAM Usage
```
Settings → Advanced Settings
✓ Enable CPU Offload
Precision: fp16
Resolution: 512x512 (not higher)
```

---

## 🆘 Common Issues

### "Invalid Token"
```
✓ Check token at huggingface.co/settings/tokens
✓ Ensure it has "Read" permission
✓ Copy exact token (no extra spaces)
✓ Clear browser cache and try again
```

### "Download Failed"
```
✓ Check internet connection
✓ Try different model URL
✓ Check disk space (df -h)
✓ Try again in 5 minutes
```

### "CUDA Out of Memory"
```
✓ Lower image resolution
✓ Reduce inference steps
✓ Use fp16 precision
✓ Enable memory optimizations
✓ Try smaller model (SD 1.5 instead of SDXL)
```

---

## 📊 File Locations

```
./models/checkpoints/     ← Downloaded checkpoints
./models/loras/           ← Downloaded LoRAs
./models/vaes/            ← Downloaded VAEs
./outputs/                ← Generated images
```

---

## 📚 Full Documentation

- **API_KEYS_GUIDE.md** - Complete guide with examples
- **README.md** - Full feature documentation
- **QUICKSTART.md** - Basic setup guide
- **NEW_FEATURES.md** - What's new summary

---

**That's it! You're ready to generate amazing images! 🎨**

Next: Try the Colab notebook for easiest setup →
https://colab.research.google.com/

Upload **stable_diffusion_colab.ipynb** and run!
