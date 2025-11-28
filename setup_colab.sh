#!/bin/bash

# Stable Diffusion WebUI - Google Colab Setup Script
# This script installs all required dependencies and sets up the environment

set -e

echo "=========================================="
echo "Stable Diffusion WebUI - Colab Setup"
echo "=========================================="

# Update system packages
echo "[1/8] Updating system packages..."
apt-get update -qq
apt-get install -y -qq git wget curl zip unzip

# Install Python dependencies
echo "[2/8] Installing Python dependencies..."
pip install --upgrade -q pip setuptools wheel

# Install Flask and WebSocket
echo "[3/8] Installing Flask and SocketIO..."
pip install -q flask flask-cors flask-socketio python-socketio python-engineio

# Install Google Drive API
echo "[4/8] Installing Google Drive API..."
pip install -q google-auth-oauthlib google-auth-httplib2 google-api-python-client

# Install ML/DL dependencies
echo "[5/8] Installing PyTorch and diffusers..."
pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -q diffusers transformers accelerate safetensors

# Install image processing
echo "[6/8] Installing image processing libraries..."
pip install -q pillow opencv-python numpy scipy

# Install optional but useful libraries
echo "[7/8] Installing optional libraries..."
pip install -q einops omegaconf xformers controlnet-aux

# Download Cloudflare tunnel
echo "[8/8] Setting up Cloudflare tunnel..."
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
chmod +x cloudflared

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload your frontend files (index.html, app.js, styles.css, etc.) to a web server or GitHub Pages"
echo "2. Start the Flask server:"
echo "   python colab_server.py"
echo "3. In another cell, run Cloudflare tunnel:"
echo "   !./cloudflared tunnel --url http://localhost:5000"
echo "4. Connect your frontend to the server URL provided by Cloudflare"
echo ""
echo "For authentication with Google Drive, the first generation will prompt for auth."
echo ""
