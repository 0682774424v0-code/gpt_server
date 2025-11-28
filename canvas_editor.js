/**
 * Canvas Editor for Inpaint
 * Interactive mask drawing with brush and eraser tools
 */

class CanvasEditor {
    constructor() {
        this.canvas = document.getElementById('inpaintCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.mode = 'brush'; // 'brush' or 'eraser'
        this.brushSize = 20;
        this.baseImage = null;
        this.maskCanvas = document.createElement('canvas');
        this.maskCanvas.width = this.canvas.width;
        this.maskCanvas.height = this.canvas.height;
        this.maskCtx = this.maskCanvas.getContext('2d');
        
        this.initialize();
    }

    initialize() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.startDrawing(e));
        this.canvas.addEventListener('touchmove', (e) => this.draw(e));
        this.canvas.addEventListener('touchend', () => this.stopDrawing());

        // Brush size slider
        document.getElementById('brushSizeSlider').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = this.brushSize;
        });

        // Tool buttons
        document.getElementById('brushModeBtn').addEventListener('click', () => this.setMode('brush'));
        document.getElementById('eraserModeBtn').addEventListener('click', () => this.setMode('eraser'));
        document.getElementById('clearCanvasBtn').addEventListener('click', () => this.clearCanvas());

        // Draw initial background
        this.clearCanvas();
    }

    setMode(mode) {
        this.mode = mode;
        document.querySelectorAll('.canvas-controls button[id$="ModeBtn"]').forEach(btn => {
            btn.classList.remove('active');
        });
        if (mode === 'brush') {
            document.getElementById('brushModeBtn').classList.add('active');
        } else {
            document.getElementById('eraserModeBtn').classList.add('active');
        }
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        let x, y;

        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        // Account for canvas scaling
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: x * scaleX,
            y: y * scaleY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        const coords = this.getCanvasCoords(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(coords.x, coords.y);
        this.maskCtx.beginPath();
        this.maskCtx.moveTo(coords.x, coords.y);
    }

    draw(e) {
        if (!this.isDrawing) return;

        const coords = this.getCanvasCoords(e);

        // Draw on display canvas
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        if (this.mode === 'brush') {
            this.ctx.strokeStyle = 'rgba(255, 200, 100, 0.7)'; // Orange mask
            this.ctx.globalCompositeOperation = 'source-over';
            this.maskCtx.strokeStyle = 'rgba(255, 255, 255, 1)'; // White mask data
            this.maskCtx.globalCompositeOperation = 'source-over';
        } else {
            this.ctx.strokeStyle = 'transparent';
            this.ctx.globalCompositeOperation = 'destination-out';
            this.maskCtx.strokeStyle = 'rgba(0, 0, 0, 1)'; // Black for eraser
            this.maskCtx.globalCompositeOperation = 'source-out';
        }

        this.ctx.lineTo(coords.x, coords.y);
        this.ctx.stroke();

        this.maskCtx.lineTo(coords.x, coords.y);
        this.maskCtx.stroke();
    }

    stopDrawing() {
        this.isDrawing = false;
        this.ctx.closePath();
        this.maskCtx.closePath();
    }

    clearCanvas() {
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.maskCtx.fillStyle = 'black';
        this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);

        // Draw grid pattern
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        const gridSize = 50;
        
        for (let i = 0; i <= this.canvas.width; i += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
        }

        for (let i = 0; i <= this.canvas.height; i += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }
    }

    setBackgroundImage(imageData) {
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.baseImage = img;
        };
        img.src = imageData;
    }

    getMaskData() {
        return this.maskCanvas.toDataURL('image/png');
    }

    getCanvasData() {
        return this.canvas.toDataURL('image/png');
    }

    resetMask() {
        if (this.baseImage) {
            this.ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);
            this.maskCtx.fillStyle = 'black';
            this.maskCtx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        } else {
            this.clearCanvas();
        }
    }
}

// Initialize canvas editor
const canvasEditor = new CanvasEditor();

// Handle inpaint image upload
const inpaintDropzone = document.createElement('div');
inpaintDropzone.id = 'inpaintDropzone';
inpaintDropzone.className = 'dropzone';

// Integration with main image upload
document.querySelector('[data-tab="inpaint"]')?.addEventListener('click', function() {
    // Show inpaint options
    const canvas = document.getElementById('inpaintCanvas');
    
    // If we have an uploaded image, load it to canvas
    const uploadedImg = document.getElementById('previewImage');
    if (uploadedImg && uploadedImg.src) {
        canvasEditor.setBackgroundImage(uploadedImg.src);
    }
});

// Inpaint generation button
document.getElementById('inpaintGenerateBtn').addEventListener('click', () => {
    const prompt = document.getElementById('inpaintPrompt').value;
    if (!prompt) {
        showToast('Please enter inpaint prompt', 'warning');
        return;
    }

    const maskData = canvasEditor.getMaskData();
    const imageData = document.getElementById('previewImage').src;

    if (!imageData) {
        showToast('Please upload an image first', 'warning');
        return;
    }

    const strength = parseFloat(document.getElementById('inpaintStrengthSlider').value);

    wsManager.emit('generate', {
        task: 'inpaint',
        prompt: prompt,
        negative_prompt: document.getElementById('inpaintNegative').value,
        image: imageData.split(',')[1], // Remove data URL prefix
        mask: maskData.split(',')[1],
        strength: strength,
        width: canvasEditor.canvas.width,
        height: canvasEditor.canvas.height,
        model: document.getElementById('modelSelect').value,
        steps: parseInt(document.getElementById('stepsSlider').value),
        cfg_scale: parseFloat(document.getElementById('cfgSlider').value),
        seed: parseInt(document.getElementById('seedInput').value),
    });

    showToast('Starting inpaint generation...', 'info');
});

// Update inpaint strength display
document.getElementById('inpaintStrengthSlider').addEventListener('input', (e) => {
    document.getElementById('inpaintStrengthValue').textContent = parseFloat(e.target.value).toFixed(2);
});

// Canvas preview tabs
const canvasPreviewTabs = document.createElement('div');
canvasPreviewTabs.className = 'canvas-preview-tabs';
canvasPreviewTabs.innerHTML = `
    <button class="preview-tab active" data-view="canvas">Canvas</button>
    <button class="preview-tab" data-view="mask">Mask</button>
    <button class="preview-tab" data-view="original">Original</button>
`;

// Mask strength slider
document.getElementById('inpaintStrengthSlider').addEventListener('input', (e) => {
    const strength = parseFloat(e.target.value);
    const opacity = Math.round(strength * 100);
    const canvas = document.getElementById('inpaintCanvas');
    canvas.style.opacity = 1;
});
