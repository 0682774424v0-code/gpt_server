"""
Quick start script for Google Colab
Run this in a Colab cell to set up and start the server
"""

# ==================== SETUP ====================
import subprocess
import sys

def install_dependencies():
    """Install all required packages"""
    print("Installing dependencies...")
    
    packages = [
        "flask flask-cors flask-socketio python-socketio python-engineio",
        "google-auth-oauthlib google-auth-httplib2 google-api-python-client",
        "diffusers transformers accelerate safetensors",
        "pillow opencv-python scipy",
        "einops omegaconf xformers controlnet-aux"
    ]
    
    for package_group in packages:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q"] + package_group.split())
    
    print("✓ Dependencies installed")

def download_cloudflare_tunnel():
    """Download Cloudflare tunnel binary"""
    print("Setting up Cloudflare tunnel...")
    subprocess.run([
        "wget", "-q",
        "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64",
        "-O", "cloudflared"
    ], check=False)
    subprocess.run(["chmod", "+x", "cloudflared"], check=False)
    print("✓ Cloudflare tunnel ready")

def start_server():
    """Start Flask server"""
    print("\n" + "="*60)
    print("Starting Stable Diffusion WebUI Server")
    print("="*60)
    print("\nServer will be available on http://localhost:5000")
    print("Use Cloudflare tunnel for external access:")
    print("  ./cloudflared tunnel --url http://localhost:5000")
    print("="*60 + "\n")
    
    # Import and start
    import os
    os.system("python colab_server.py")

if __name__ == "__main__":
    print("\n🚀 Stable Diffusion WebUI - Colab Quick Start\n")
    
    try:
        install_dependencies()
        download_cloudflare_tunnel()
        start_server()
    except KeyboardInterrupt:
        print("\n\n⚠️  Server stopped")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
