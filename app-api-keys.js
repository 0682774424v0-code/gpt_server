/**
 * API Keys Management Module
 * Handles HuggingFace tokens, Civitai keys, and model downloads
 */

// ==================== API KEYS STORAGE ====================

const APIKeysManager = {
    // Save tokens locally (encrypted would be better for production)
    saveHFToken(token) {
        if (token.trim()) {
            localStorage.setItem('hf_token', token.trim());
            document.getElementById('hfTokenStatus').textContent = '✓ Saved';
            document.getElementById('hfTokenStatus').style.color = 'var(--color-success)';
            setTimeout(() => {
                document.getElementById('hfTokenStatus').textContent = '';
            }, 3000);
            return true;
        }
        return false;
    },

    saveCivitaiKey(key) {
        if (key.trim()) {
            localStorage.setItem('civitai_api_key', key.trim());
            document.getElementById('civitaiKeyStatus').textContent = '✓ Saved';
            document.getElementById('civitaiKeyStatus').style.color = 'var(--color-success)';
            setTimeout(() => {
                document.getElementById('civitaiKeyStatus').textContent = '';
            }, 3000);
            return true;
        }
        return false;
    },

    getHFToken() {
        return localStorage.getItem('hf_token') || '';
    },

    getCivitaiKey() {
        return localStorage.getItem('civitai_api_key') || '';
    },

    // Load saved tokens into input fields
    loadSavedTokens() {
        const hfToken = this.getHFToken();
        const civitaiKey = this.getCivitaiKey();

        if (hfToken) {
            document.getElementById('hfTokenInput').value = hfToken;
            document.getElementById('hfTokenStatus').textContent = '✓ Loaded';
            document.getElementById('hfTokenStatus').style.color = 'var(--color-success)';
        }

        if (civitaiKey) {
            document.getElementById('civitaiKeyInput').value = civitaiKey;
            document.getElementById('civitaiKeyStatus').textContent = '✓ Loaded';
            document.getElementById('civitaiKeyStatus').style.color = 'var(--color-success)';
        }
    },

    // Clear all tokens
    clearAllTokens() {
        localStorage.removeItem('hf_token');
        localStorage.removeItem('civitai_api_key');
        document.getElementById('hfTokenInput').value = '';
        document.getElementById('civitaiKeyInput').value = '';
        document.getElementById('hfTokenStatus').textContent = '';
        document.getElementById('civitaiKeyStatus').textContent = '';
        showToast('All API keys cleared', 'info');
    }
};

// ==================== MODEL DOWNLOADER ====================

const ModelDownloader = {
    async downloadCheckpoint() {
        const url = document.getElementById('checkpointUrl').value.trim();
        if (!url) {
            showToast('Enter a model URL or HuggingFace ID', 'warning');
            return;
        }

        const progressContainer = document.getElementById('checkpointProgress');
        const progressFill = document.getElementById('checkpointProgressFill');
        const progressText = document.getElementById('checkpointProgressText');
        const btn = document.getElementById('downloadCheckpointBtn');

        progressContainer.style.display = 'block';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';

        try {
            // Send download request to server
            wsManager.emit('download_model', {
                url: url,
                model_type: 'checkpoint',
                hf_token: APIKeysManager.getHFToken(),
                civitai_key: APIKeysManager.getCivitaiKey()
            });

            // Listen for progress updates
            wsManager.socket.on('download_progress', (data) => {
                if (data.model_type === 'checkpoint') {
                    const percent = Math.round(data.progress * 100);
                    progressFill.style.width = percent + '%';
                    progressText.textContent = `${percent}%`;

                    if (percent === 100) {
                        showToast(`Model downloaded: ${data.filename}`, 'success');
                        progressContainer.style.display = 'none';
                        document.getElementById('checkpointUrl').value = '';
                        this.refreshModelsList();
                    }
                }
            });

        } catch (error) {
            showToast(`Download error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-download"></i> Download';
        }
    },

    async downloadLora() {
        const url = document.getElementById('loraUrl').value.trim();
        if (!url) {
            showToast('Enter a LoRA URL', 'warning');
            return;
        }

        const progressContainer = document.getElementById('loraProgress');
        const progressFill = document.getElementById('loraProgressFill');
        const progressText = document.getElementById('loraProgressText');
        const btn = document.getElementById('downloadLoraBtn');

        progressContainer.style.display = 'block';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';

        try {
            wsManager.emit('download_model', {
                url: url,
                model_type: 'lora',
                hf_token: APIKeysManager.getHFToken(),
                civitai_key: APIKeysManager.getCivitaiKey()
            });

            wsManager.socket.on('download_progress', (data) => {
                if (data.model_type === 'lora') {
                    const percent = Math.round(data.progress * 100);
                    progressFill.style.width = percent + '%';
                    progressText.textContent = `${percent}%`;

                    if (percent === 100) {
                        showToast(`LoRA downloaded: ${data.filename}`, 'success');
                        progressContainer.style.display = 'none';
                        document.getElementById('loraUrl').value = '';
                        this.refreshModelsList();
                    }
                }
            });

        } catch (error) {
            showToast(`Download error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-download"></i> Download';
        }
    },

    async downloadVae() {
        const url = document.getElementById('vaeUrl').value.trim();
        if (!url) {
            showToast('Enter a VAE URL', 'warning');
            return;
        }

        const progressContainer = document.getElementById('vaeProgress');
        const progressFill = document.getElementById('vaeProgressFill');
        const progressText = document.getElementById('vaeProgressText');
        const btn = document.getElementById('downloadVaeBtn');

        progressContainer.style.display = 'block';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';

        try {
            wsManager.emit('download_model', {
                url: url,
                model_type: 'vae',
                hf_token: APIKeysManager.getHFToken(),
                civitai_key: APIKeysManager.getCivitaiKey()
            });

            wsManager.socket.on('download_progress', (data) => {
                if (data.model_type === 'vae') {
                    const percent = Math.round(data.progress * 100);
                    progressFill.style.width = percent + '%';
                    progressText.textContent = `${percent}%`;

                    if (percent === 100) {
                        showToast(`VAE downloaded: ${data.filename}`, 'success');
                        progressContainer.style.display = 'none';
                        document.getElementById('vaeUrl').value = '';
                        this.refreshModelsList();
                    }
                }
            });

        } catch (error) {
            showToast(`Download error: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-download"></i> Download';
        }
    },

    async refreshModelsList() {
        try {
            wsManager.emit('get_available_models', {});
        } catch (error) {
            console.error('Error refreshing models:', error);
        }
    },

    displayModelsList(models) {
        const modelsList = document.getElementById('modelsList');
        modelsList.innerHTML = '';

        if (!models || models.length === 0) {
            modelsList.innerHTML = '<p class="no-models">No models downloaded yet</p>';
            return;
        }

        models.forEach(model => {
            const modelItem = document.createElement('div');
            modelItem.className = 'model-item';
            modelItem.innerHTML = `
                <div class="model-info">
                    <div class="model-name">${model.name}</div>
                    <div class="model-type">${model.type}</div>
                    <div class="model-size">${(model.size / 1e9).toFixed(2)} GB</div>
                </div>
                <button class="btn-danger btn-small" data-model="${model.path}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;

            modelItem.querySelector('button').addEventListener('click', (e) => {
                if (confirm(`Delete ${model.name}?`)) {
                    wsManager.emit('delete_model', { path: model.path });
                    this.refreshModelsList();
                }
            });

            modelsList.appendChild(modelItem);
        });
    }
};

// ==================== EVENT LISTENERS INITIALIZATION ====================

function initializeAPIKeysUI() {
    // Load saved tokens on page load
    APIKeysManager.loadSavedTokens();
    
    // Load saved server URL
    const savedServerUrl = localStorage.getItem('serverUrl');
    if (savedServerUrl) {
        document.getElementById('serverUrlInput').value = savedServerUrl;
        document.getElementById('serverUrlStatus').textContent = '✓ Loaded';
        document.getElementById('serverUrlStatus').style.color = 'var(--color-success)';
    }

    // HuggingFace Token
    document.getElementById('saveHfTokenBtn')?.addEventListener('click', () => {
        const token = document.getElementById('hfTokenInput').value;
        if (APIKeysManager.saveHFToken(token)) {
            showToast('HuggingFace token saved', 'success');
        } else {
            showToast('Please enter a valid token', 'warning');
        }
    });

    // Civitai Key
    document.getElementById('saveCivitaiKeyBtn')?.addEventListener('click', () => {
        const key = document.getElementById('civitaiKeyInput').value;
        if (APIKeysManager.saveCivitaiKey(key)) {
            showToast('Civitai API key saved', 'success');
        } else {
            showToast('Please enter a valid API key', 'warning');
        }
    });

    // Server URL
    document.getElementById('saveServerUrlBtn')?.addEventListener('click', () => {
        const url = document.getElementById('serverUrlInput').value.trim();
        if (url) {
            localStorage.setItem('serverUrl', url);
            document.getElementById('serverUrlStatus').textContent = '✓ Saved';
            document.getElementById('serverUrlStatus').style.color = 'var(--color-success)';
            showToast('Server URL saved. Please refresh page to apply.', 'info', 5000);
            setTimeout(() => {
                document.getElementById('serverUrlStatus').textContent = '';
            }, 3000);
        } else {
            localStorage.removeItem('serverUrl');
            document.getElementById('serverUrlStatus').textContent = '✓ Reset to default';
            document.getElementById('serverUrlStatus').style.color = 'var(--color-info)';
            showToast('Server URL reset to default. Please refresh page.', 'info', 5000);
        }
    });

    // Download Buttons
    document.getElementById('downloadCheckpointBtn')?.addEventListener('click', () => {
        ModelDownloader.downloadCheckpoint();
    });

    document.getElementById('downloadLoraBtn')?.addEventListener('click', () => {
        ModelDownloader.downloadLora();
    });

    document.getElementById('downloadVaeBtn')?.addEventListener('click', () => {
        ModelDownloader.downloadVae();
    });

    // Refresh Models List
    document.getElementById('refreshModelsBtn')?.addEventListener('click', () => {
        showToast('Refreshing models list...', 'info');
        ModelDownloader.refreshModelsList();
    });

    // Handle Enter key in URL inputs
    document.getElementById('checkpointUrl')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ModelDownloader.downloadCheckpoint();
    });

    document.getElementById('loraUrl')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ModelDownloader.downloadLora();
    });

    document.getElementById('vaeUrl')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') ModelDownloader.downloadVae();
    });
    
    // WebSocket event listeners for download progress
    if (wsManager.socket) {
        wsManager.socket.on('download_start', (data) => {
            console.log('Download started:', data);
        });

        wsManager.socket.on('download_progress', (data) => {
            console.log('Download progress:', data);
            ModelDownloader.handleProgressUpdate(data);
        });

        wsManager.socket.on('download_complete', (data) => {
            console.log('Download complete:', data);
            showToast(`${data.model_type} downloaded successfully!`, 'success');
            ModelDownloader.refreshModelsList();
        });

        wsManager.socket.on('models_list', (data) => {
            console.log('Models list received:', data);
            ModelDownloader.displayModelsList(data.models);
        });

        wsManager.socket.on('model_deleted', (data) => {
            showToast('Model deleted successfully', 'success');
            ModelDownloader.refreshModelsList();
        });
    }
}

// ==================== PROGRESS UPDATE HANDLER ====================

ModelDownloader.handleProgressUpdate = function(data) {
    const { model_type, progress, filename } = data;
    
    const progressContainer = document.getElementById(`${model_type}Progress`);
    const progressFill = document.getElementById(`${model_type}ProgressFill`);
    const progressText = document.getElementById(`${model_type}ProgressText`);
    
    if (progressContainer && progressFill && progressText) {
        const percent = Math.round(progress * 100);
        progressFill.style.width = percent + '%';
        progressText.textContent = `${percent}%`;
        
        if (progressContainer.style.display === 'none') {
            progressContainer.style.display = 'flex';
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAPIKeysUI);
} else {
    initializeAPIKeysUI();
}
