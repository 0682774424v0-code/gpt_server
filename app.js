/**
 * Main WebSocket Client & UI Logic
 * Handles generation, settings, and WebSocket communication
 */

// ==================== CONFIG ====================
const CONFIG = {
    SERVER_URL: getServerUrl(),
    WS_TIMEOUT: 30000,
    MAX_TOAST_QUEUE: 5,
    LORA_SLOTS: 7,
    AUTO_RECONNECT_INTERVAL: 5000,
};

// Get server URL from localStorage or use default
function getServerUrl() {
    const savedUrl = localStorage.getItem('serverUrl');
    if (savedUrl) {
        return savedUrl;
    }
    return window.location.origin;
}

// ==================== STATE MANAGEMENT ====================
class AppState {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.isGenerating = false;
        this.currentTask = 'txt2img';
        this.generationParams = this._getDefaultParams();
        this.gallery = [];
        this.currentPage = 0;
        this.loraModels = [];
        this.controlnetTypes = [];
        this.loadLocalSettings();
    }

    _getDefaultParams() {
        return {
            prompt: '',
            negative_prompt: '',
            task: 'txt2img',
            model: 'runwayml/stable-diffusion-v1-5',
            width: 512,
            height: 512,
            steps: 20,
            cfg_scale: 7.5,
            sampler: 'euler',
            scheduler: 'normal',
            seed: -1,
            loras: Array(CONFIG.LORA_SLOTS).fill(null).map(() => ({ name: '', weight: 1 })),
            clip_skip: 0,
            freeu_beta: 0,
            pag_scale: 0,
        };
    }

    loadLocalSettings() {
        const saved = localStorage.getItem('appSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                Object.assign(this.generationParams, settings);
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }
    }

    saveLocalSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.generationParams));
    }

    reset() {
        this.generationParams = this._getDefaultParams();
        this.saveLocalSettings();
    }
}

const appState = new AppState();

// ==================== WEBSOCKET MANAGEMENT ====================
class WebSocketManager {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(CONFIG.SERVER_URL, {
                    reconnection: true,
                    reconnectionDelay: CONFIG.AUTO_RECONNECT_INTERVAL,
                    reconnectionDelayMax: 60000,
                    reconnectionAttempts: this.maxReconnectAttempts,
                });

                this.socket.on('connect', () => {
                    console.log('Connected to server');
                    appState.connected = true;
                    this.reconnectAttempts = 0;
                    updateConnectionStatus(true);
                    showToast('Connected to server', 'success');
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    console.log('Disconnected from server');
                    appState.connected = false;
                    updateConnectionStatus(false);
                    showToast('Disconnected from server', 'warning');
                });

                this.socket.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    showToast(`Connection error: ${error}`, 'error');
                    reject(error);
                });

                // Handle server events
                this.socket.on('progress', (data) => updateProgress(data));
                this.socket.on('complete', (data) => handleGenerationComplete(data));
                this.socket.on('error', (data) => handleError(data));
                this.socket.on('models_list', (data) => handleModelsList(data));
                this.socket.on('gallery_data', (data) => handleGalleryData(data));
                this.socket.on('prompt_enhanced', (data) => handlePromptEnhanced(data));
                this.socket.on('upscale_complete', (data) => handleUpscaleComplete(data));
                this.socket.on('adetailer_complete', (data) => handleAdetailerComplete(data));

                setTimeout(() => {
                    if (!appState.connected) {
                        reject(new Error('Connection timeout'));
                    }
                }, CONFIG.WS_TIMEOUT);

            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    emit(event, data) {
        if (this.socket && appState.connected) {
            this.socket.emit(event, data);
        } else {
            showToast('Not connected to server', 'error');
        }
    }
}

const wsManager = new WebSocketManager();

// ==================== UI EVENT HANDLERS ====================

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        switchTab(tabName);
    });
});

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabContent = document.getElementById(tabName);
    if (tabContent) {
        tabContent.classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }
}

// Theme Toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
}

// Help Modal
document.getElementById('helpBtn').addEventListener('click', () => {
    document.getElementById('helpModal').style.display = 'block';
});

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
    });
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'enter':
                e.preventDefault();
                handleGenerate();
                break;
            case 'e':
                e.preventDefault();
                handleEnhancePrompt();
                break;
            case 'g':
                e.preventDefault();
                handleRandomSeed();
                break;
        }
    }
});

// ==================== GENERATION PARAMETERS ====================

// Model Selection
document.getElementById('modelSelect').addEventListener('change', (e) => {
    appState.generationParams.model = e.target.value;
    appState.saveLocalSettings();
});

// Task Selection
document.getElementById('taskSelect').addEventListener('change', (e) => {
    appState.generationParams.task = e.target.value;
    appState.currentTask = e.target.value;
    appState.saveLocalSettings();
});

// Prompt Input
document.getElementById('promptInput').addEventListener('input', (e) => {
    appState.generationParams.prompt = e.target.value;
});

document.getElementById('negativePromptInput').addEventListener('input', (e) => {
    appState.generationParams.negative_prompt = e.target.value;
});

// Dimension Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const width = parseInt(btn.dataset.width);
        const height = parseInt(btn.dataset.height);
        document.getElementById('widthInput').value = width;
        document.getElementById('heightInput').value = height;
        appState.generationParams.width = width;
        appState.generationParams.height = height;
    });
});

// Width/Height Input
document.getElementById('widthInput').addEventListener('input', (e) => {
    appState.generationParams.width = Math.max(64, Math.min(2048, parseInt(e.target.value) || 512));
});

document.getElementById('heightInput').addEventListener('input', (e) => {
    appState.generationParams.height = Math.max(64, Math.min(2048, parseInt(e.target.value) || 512));
});

// Steps Slider
document.getElementById('stepsSlider').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('stepsValue').textContent = value;
    appState.generationParams.steps = value;
});

// CFG Scale Slider
document.getElementById('cfgSlider').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('cfgValue').textContent = value.toFixed(1);
    appState.generationParams.cfg_scale = value;
});

// Sampler Selection
document.getElementById('samplerSelect').addEventListener('change', (e) => {
    appState.generationParams.sampler = e.target.value;
    appState.saveLocalSettings();
});

// Scheduler Selection
document.getElementById('schedulerSelect').addEventListener('change', (e) => {
    appState.generationParams.scheduler = e.target.value;
    appState.saveLocalSettings();
});

// Seed Input
document.getElementById('seedInput').addEventListener('input', (e) => {
    appState.generationParams.seed = parseInt(e.target.value) || -1;
});

// Random Seed
document.getElementById('randomSeedBtn').addEventListener('click', handleRandomSeed);

function handleRandomSeed() {
    const seed = Math.floor(Math.random() * 2147483647);
    document.getElementById('seedInput').value = seed;
    appState.generationParams.seed = seed;
    showToast(`Seed set to: ${seed}`, 'info');
}

// Advanced Options
document.getElementById('clipSkipSlider').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('clipSkipValue').textContent = value;
    appState.generationParams.clip_skip = value;
});

document.getElementById('freeuSlider').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('freeuValue').textContent = value.toFixed(2);
    appState.generationParams.freeu_beta = value;
});

document.getElementById('pagSlider').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    document.getElementById('pagValue').textContent = value.toFixed(1);
    appState.generationParams.pag_scale = value;
});

// ==================== LORA MANAGEMENT ====================

function initializeLoraSlots() {
    const container = document.getElementById('loraContainer');
    container.innerHTML = '';

    for (let i = 0; i < CONFIG.LORA_SLOTS; i++) {
        const slot = createLoraSlot(i);
        container.appendChild(slot);
    }

    updateAddLoraButton();
}

function createLoraSlot(index) {
    const div = document.createElement('div');
    div.className = 'lora-slot';
    div.id = `lora-${index}`;

    div.innerHTML = `
        <div class="lora-slot-content">
            <input type="text" class="lora-name" placeholder="LoRA name or URL" data-index="${index}">
            <input type="range" class="lora-weight" min="0" max="2" step="0.1" value="1" data-index="${index}">
            <span class="lora-weight-value">${1.0}</span>
            <button class="btn-secondary btn-sm remove-lora" data-index="${index}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Events
    const nameInput = div.querySelector('.lora-name');
    const weightSlider = div.querySelector('.lora-weight');
    const removeBtn = div.querySelector('.remove-lora');

    nameInput.addEventListener('input', (e) => {
        appState.generationParams.loras[index].name = e.target.value;
    });

    weightSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        div.querySelector('.lora-weight-value').textContent = value.toFixed(1);
        appState.generationParams.loras[index].weight = value;
    });

    removeBtn.addEventListener('click', () => {
        nameInput.value = '';
        weightSlider.value = 1;
        appState.generationParams.loras[index] = { name: '', weight: 1 };
        updateAddLoraButton();
    });

    return div;
}

function updateAddLoraButton() {
    const btn = document.getElementById('addLoraBtn');
    const hasEmpty = appState.generationParams.loras.some(lora => !lora.name);
    btn.disabled = !hasEmpty;
}

document.getElementById('addLoraBtn').addEventListener('click', () => {
    const empty = appState.generationParams.loras.find(l => !l.name);
    if (empty) {
        showToast('Fill empty LoRA slot first', 'info');
    }
});

// ==================== IMAGE UPLOAD ====================

const dropzone = document.getElementById('dropzone');
const imageUpload = document.getElementById('imageUpload');

dropzone.addEventListener('click', () => imageUpload.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleImageUpload(files[0]);
    }
});

imageUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
    }
});

function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('uploadPreview');
        const img = document.getElementById('previewImage');
        img.src = e.target.result;
        preview.style.display = 'block';

        // Store image data
        appState.generationParams.image = e.target.result;
    };
    reader.readAsDataURL(file);
}

document.getElementById('clearUploadBtn').addEventListener('click', () => {
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('imageUpload').value = '';
    appState.generationParams.image = null;
});

// ==================== PROMPT ENHANCEMENT ====================

document.getElementById('enhancePromptBtn').addEventListener('click', handleEnhancePrompt);

function handleEnhancePrompt() {
    const prompt = document.getElementById('promptInput').value;
    if (!prompt) {
        showToast('Please enter a prompt', 'warning');
        return;
    }

    showToast('Enhancing prompt...', 'info');
    wsManager.emit('enhance_prompt', { prompt });
}

function handlePromptEnhanced(data) {
    document.getElementById('promptInput').value = data.enhanced;
    appState.generationParams.prompt = data.enhanced;
    showToast('Prompt enhanced', 'success');
}

// ==================== GENERATION CONTROL ====================

document.getElementById('generateBtn').addEventListener('click', handleGenerate);
document.getElementById('cancelGenerateBtn').addEventListener('click', handleCancelGeneration);

function handleGenerate() {
    if (!appState.generationParams.prompt) {
        showToast('Please enter a prompt', 'warning');
        return;
    }

    if (appState.isGenerating) {
        showToast('Generation already in progress', 'warning');
        return;
    }

    appState.isGenerating = true;
    document.getElementById('generateBtn').style.display = 'none';
    document.getElementById('cancelGenerateBtn').style.display = 'block';
    document.getElementById('progressBar').style.display = 'block';

    const params = {
        ...appState.generationParams,
        loras: appState.generationParams.loras.filter(l => l.name),
    };

    wsManager.emit('generate', params);
    showToast('Starting generation...', 'info');
}

function handleCancelGeneration() {
    wsManager.emit('cancel_generation', {});
    showToast('Generation cancelled', 'info');
    resetGenerationUI();
}

function handleGenerationComplete(data) {
    const preview = document.getElementById('generationPreview');
    preview.innerHTML = '';

    // Display generated images
    data.images.forEach((imgBase64, idx) => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'preview-item';
        imgContainer.innerHTML = `
            <img src="data:image/png;base64,${imgBase64}" alt="Generated image ${idx + 1}">
            <div class="image-actions">
                <button class="btn-secondary btn-sm download-img" data-index="${idx}">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-secondary btn-sm view-metadata" data-index="${idx}">
                    <i class="fas fa-info"></i>
                </button>
            </div>
        `;
        preview.appendChild(imgContainer);
    });

    // Add event listeners
    preview.querySelectorAll('.download-img').forEach(btn => {
        btn.addEventListener('click', () => downloadImage(data.images[btn.dataset.index]));
    });

    preview.querySelectorAll('.view-metadata').forEach(btn => {
        btn.addEventListener('click', () => showMetadata(data.metadata));
    });

    resetGenerationUI();
    showToast('Generation complete!', 'success');
}

function resetGenerationUI() {
    appState.isGenerating = false;
    document.getElementById('generateBtn').style.display = 'block';
    document.getElementById('cancelGenerateBtn').style.display = 'none';
    document.getElementById('progressBar').style.display = 'none';
}

function updateProgress(data) {
    const progress = Math.round((data.step / data.total) * 100);
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;

    if (data.preview) {
        const preview = document.getElementById('generationPreview');
        preview.innerHTML = `<img src="data:image/png;base64,${data.preview}" alt="Preview" class="live-preview">`;
    }
}

function handleError(data) {
    showToast(`Error: ${data.message}`, 'error');
    resetGenerationUI();
}

// ==================== UTILITIES ====================

function downloadImage(imgBase64) {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imgBase64}`;
    link.download = `generated_${Date.now()}.png`;
    link.click();
}

function showMetadata(metadata) {
    const modal = document.getElementById('metadataModal');
    const content = document.getElementById('metadataContent');

    content.innerHTML = `
        <table class="metadata-table">
            <tr><td>Prompt:</td><td>${escapeHtml(metadata.prompt)}</td></tr>
            <tr><td>Negative Prompt:</td><td>${escapeHtml(metadata.negative_prompt)}</td></tr>
            <tr><td>Model:</td><td>${metadata.model}</td></tr>
            <tr><td>Task:</td><td>${metadata.task}</td></tr>
            <tr><td>Seed:</td><td>${metadata.seed}</td></tr>
            <tr><td>Steps:</td><td>${metadata.steps}</td></tr>
            <tr><td>CFG Scale:</td><td>${metadata.cfg_scale}</td></tr>
            <tr><td>Sampler:</td><td>${metadata.sampler}</td></tr>
            <tr><td>Size:</td><td>${metadata.width}x${metadata.height}</td></tr>
            <tr><td>Timestamp:</td><td>${new Date(metadata.timestamp).toLocaleString()}</td></tr>
        </table>
        <button class="btn-secondary" onclick="copyMetadataAsJson('${escapeHtml(JSON.stringify(metadata))}')">
            Copy as JSON
        </button>
    `;

    modal.style.display = 'block';
}

function copyMetadataAsJson(json) {
    navigator.clipboard.writeText(json);
    showToast('Metadata copied to clipboard', 'success');
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ==================== TOAST NOTIFICATIONS ====================

let toastQueue = [];

function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');

    if (toastQueue.length >= CONFIG.MAX_TOAST_QUEUE) {
        const first = container.querySelector('.toast');
        if (first) first.remove();
        toastQueue.shift();
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);
    toastQueue.push(toast);

    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
        toastQueue = toastQueue.filter(t => t !== toast);
    });

    setTimeout(() => {
        toast.remove();
        toastQueue = toastQueue.filter(t => t !== toast);
    }, duration);
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// ==================== CONNECTION STATUS ====================

function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    const text = document.getElementById('statusText');

    if (connected) {
        status.classList.add('connected');
        text.textContent = 'Connected';
    } else {
        status.classList.remove('connected');
        text.textContent = 'Disconnected';
    }
}

// ==================== INITIALIZATION ====================

async function initializeApp() {
    try {
        console.log('Initializing application...');

        // Connect to server
        await wsManager.connect();

        // Initialize UI
        initializeLoraSlots();

        // Load initial models
        wsManager.emit('get_models', {});

        // Restore settings
        document.getElementById('promptInput').value = appState.generationParams.prompt;
        document.getElementById('negativePromptInput').value = appState.generationParams.negative_prompt;

        showToast('Application ready', 'success');

    } catch (error) {
        console.error('Initialization failed:', error);
        showToast(`Failed to initialize: ${error.message}`, 'error');

        // Retry after delay
        setTimeout(() => {
            initializeApp();
        }, CONFIG.AUTO_RECONNECT_INTERVAL);
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    if (modal && e.target === modal) {
        modal.style.display = 'none';
    }
});
