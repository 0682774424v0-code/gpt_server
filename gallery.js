/**
 * Gallery Management
 * Handles gallery display, filtering, pagination, and batch operations
 */

class GalleryManager {
    constructor() {
        this.items = [];
        this.currentPage = 0;
        this.itemsPerPage = 20;
        this.filteredItems = [];
        this.selectedItems = new Set();
        this.sortBy = 'recent';
        this.filterTask = '';
        this.searchQuery = '';
        this.initialize();
    }

    initialize() {
        // Pagination buttons
        document.getElementById('galleryNextBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('galleryPrevBtn').addEventListener('click', () => this.previousPage());

        // Controls
        document.getElementById('galleryRefreshBtn').addEventListener('click', () => this.refresh());
        document.getElementById('galleryBatchDownloadBtn').addEventListener('click', () => this.batchDownload());

        // Filters
        document.getElementById('galleryFilter').addEventListener('change', (e) => {
            this.filterTask = e.target.value;
            this.applyFilters();
        });

        document.getElementById('gallerySearch').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Load initial gallery
        this.refresh();
    }

    refresh() {
        wsManager.emit('get_gallery', {
            page: 0,
            limit: 1000, // Get all items first
        });
    }

    applyFilters() {
        this.filteredItems = this.items.filter(item => {
            const metadata = item.metadata || {};

            // Task filter
            if (this.filterTask && metadata.task !== this.filterTask) {
                return false;
            }

            // Search filter
            if (this.searchQuery) {
                const prompt = (metadata.prompt || '').toLowerCase();
                if (!prompt.includes(this.searchQuery)) {
                    return false;
                }
            }

            return true;
        });

        // Sort
        this.sortItems();

        // Reset to page 0
        this.currentPage = 0;
        this.render();
    }

    sortItems() {
        switch (this.sortBy) {
            case 'recent':
                this.filteredItems.sort((a, b) => {
                    const aTime = new Date(a.metadata?.timestamp || 0).getTime();
                    const bTime = new Date(b.metadata?.timestamp || 0).getTime();
                    return bTime - aTime;
                });
                break;
            case 'oldest':
                this.filteredItems.sort((a, b) => {
                    const aTime = new Date(a.metadata?.timestamp || 0).getTime();
                    const bTime = new Date(b.metadata?.timestamp || 0).getTime();
                    return aTime - bTime;
                });
                break;
            case 'name':
                this.filteredItems.sort((a, b) => {
                    const aName = (a.path || '').split('/').pop();
                    const bName = (b.path || '').split('/').pop();
                    return aName.localeCompare(bName);
                });
                break;
        }
    }

    render() {
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        const start = this.currentPage * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageItems = this.filteredItems.slice(start, end);

        if (pageItems.length === 0) {
            grid.innerHTML = '<div class="gallery-empty"><i class="fas fa-inbox"></i><p>No images found</p></div>';
            return;
        }

        pageItems.forEach((item, idx) => {
            const tile = this.createGalleryTile(item, start + idx);
            grid.appendChild(tile);
        });

        // Update pagination info
        this.updatePaginationInfo();
    }

    createGalleryTile(item, index) {
        const tile = document.createElement('div');
        tile.className = 'gallery-tile';
        tile.id = `gallery-${index}`;

        const metadata = item.metadata || {};
        const timestamp = new Date(metadata.timestamp || Date.now());
        const isSelected = this.selectedItems.has(index);

        tile.innerHTML = `
            <div class="gallery-tile-image">
                <img src="data:image/png;base64,${item.path}" 
                     alt="Generated image" 
                     loading="lazy" 
                     class="gallery-image">
                <div class="gallery-overlay">
                    <button class="btn-icon" title="View full size" onclick="galleryManager.viewFullSize(${index})">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="btn-icon" title="View metadata" onclick="galleryManager.viewMetadata(${index})">
                        <i class="fas fa-info"></i>
                    </button>
                    <button class="btn-icon" title="Download" onclick="galleryManager.downloadItem(${index})">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn-icon favorite-btn" title="Add to favorites" 
                            onclick="galleryManager.toggleFavorite(${index})"
                            data-favorited="${this.isFavorite(item)}">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            </div>
            <div class="gallery-info">
                <div class="gallery-meta">
                    <span class="meta-badge">${metadata.task || 'unknown'}</span>
                    <span class="meta-time">${timestamp.toLocaleDateString()}</span>
                </div>
                <p class="gallery-prompt">${escapeHtml(metadata.prompt || '').substring(0, 60)}...</p>
            </div>
            <label class="checkbox-label gallery-select">
                <input type="checkbox" data-index="${index}" ${isSelected ? 'checked' : ''}>
                <span></span>
            </label>
        `;

        // Selection checkbox
        const checkbox = tile.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.selectedItems.add(index);
            } else {
                this.selectedItems.delete(index);
            }
        });

        return tile;
    }

    viewFullSize(index) {
        const item = this.filteredItems[index];
        if (!item) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-large">
                <button class="modal-close">&times;</button>
                <img src="data:image/png;base64,${item.path}" alt="Full size" class="modal-image">
                <div class="modal-actions">
                    <button class="btn-primary" onclick="galleryManager.downloadItem(${index})">
                        <i class="fas fa-download"></i>
                        Download
                    </button>
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    viewMetadata(index) {
        const item = this.filteredItems[index];
        if (!item) return;

        const metadata = item.metadata || {};
        const modal = document.getElementById('metadataModal');
        const content = document.getElementById('metadataContent');

        content.innerHTML = `
            <div class="metadata-detail">
                <h3>Generation Parameters</h3>
                <table class="metadata-table">
                    <tr>
                        <td><strong>Prompt:</strong></td>
                        <td>${escapeHtml(metadata.prompt || '')}</td>
                    </tr>
                    <tr>
                        <td><strong>Negative:</strong></td>
                        <td>${escapeHtml(metadata.negative_prompt || '')}</td>
                    </tr>
                    <tr>
                        <td><strong>Model:</strong></td>
                        <td>${metadata.model || 'unknown'}</td>
                    </tr>
                    <tr>
                        <td><strong>Task:</strong></td>
                        <td>${metadata.task || 'unknown'}</td>
                    </tr>
                    <tr>
                        <td><strong>Size:</strong></td>
                        <td>${metadata.width}x${metadata.height}</td>
                    </tr>
                    <tr>
                        <td><strong>Steps:</strong></td>
                        <td>${metadata.steps}</td>
                    </tr>
                    <tr>
                        <td><strong>CFG Scale:</strong></td>
                        <td>${metadata.cfg_scale}</td>
                    </tr>
                    <tr>
                        <td><strong>Sampler:</strong></td>
                        <td>${metadata.sampler}</td>
                    </tr>
                    <tr>
                        <td><strong>Scheduler:</strong></td>
                        <td>${metadata.scheduler}</td>
                    </tr>
                    <tr>
                        <td><strong>Seed:</strong></td>
                        <td>${metadata.seed}</td>
                    </tr>
                    <tr>
                        <td><strong>Timestamp:</strong></td>
                        <td>${new Date(metadata.timestamp).toLocaleString()}</td>
                    </tr>
                </table>
                <div class="metadata-actions">
                    <button class="btn-secondary" onclick="copyToClipboard('${escapeHtml(JSON.stringify(metadata))}')">
                        Copy as JSON
                    </button>
                    <button class="btn-secondary" onclick="copyToClipboard('${escapeHtml(metadata.prompt)}')">
                        Copy Prompt
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    downloadItem(index) {
        const item = this.filteredItems[index];
        if (!item) return;

        const link = document.createElement('a');
        link.href = `data:image/png;base64,${item.path}`;
        
        const metadata = item.metadata || {};
        const timestamp = Date.now();
        const seed = metadata.seed || 'unknown';
        link.download = `gen_${timestamp}_${seed}.png`;
        
        link.click();
        showToast('Image downloaded', 'success');
    }

    batchDownload() {
        if (this.selectedItems.size === 0) {
            showToast('Please select images first', 'warning');
            return;
        }

        // Create zip file (simplified - just download multiple)
        this.selectedItems.forEach(index => {
            setTimeout(() => {
                this.downloadItem(index);
            }, 300); // Stagger downloads
        });

        showToast(`Downloading ${this.selectedItems.size} images...`, 'info');
    }

    toggleFavorite(index) {
        const item = this.filteredItems[index];
        if (!item) return;

        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const itemKey = item.path;

        if (this.isFavorite(item)) {
            favorites.splice(favorites.indexOf(itemKey), 1);
        } else {
            favorites.push(itemKey);
        }

        localStorage.setItem('favorites', JSON.stringify(favorites));
        this.render();
        showToast('Favorite updated', 'success');
    }

    isFavorite(item) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return favorites.includes(item.path);
    }

    nextPage() {
        const maxPage = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        if (this.currentPage < maxPage - 1) {
            this.currentPage++;
            this.render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    updatePaginationInfo() {
        const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        const pageInfo = document.getElementById('galleryPageInfo');
        pageInfo.textContent = `Page ${this.currentPage + 1} of ${totalPages}`;

        // Update button states
        document.getElementById('galleryPrevBtn').disabled = this.currentPage === 0;
        document.getElementById('galleryNextBtn').disabled = this.currentPage === totalPages - 1;
    }

    handleGalleryData(data) {
        this.items = data.items || [];
        this.applyFilters();
    }
}

// Initialize gallery manager
const galleryManager = new GalleryManager();

// Handle gallery data from server
function handleGalleryData(data) {
    galleryManager.handleGalleryData(data);
}

// Utility function
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
}

// Export gallery as JSON
function exportGalleryAsJson() {
    const data = {
        exported_at: new Date().toISOString(),
        items: galleryManager.items,
        total: galleryManager.items.length
    };

    const link = document.createElement('a');
    link.href = `data:text/json,${JSON.stringify(data, null, 2)}`;
    link.download = `gallery_${Date.now()}.json`;
    link.click();
    showToast('Gallery exported', 'success');
}

// Import gallery from JSON
function importGalleryFromJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.items && Array.isArray(data.items)) {
                    galleryManager.items = [...galleryManager.items, ...data.items];
                    galleryManager.applyFilters();
                    showToast(`Imported ${data.items.length} items`, 'success');
                }
            } catch (error) {
                showToast('Failed to import gallery', 'error');
            }
        };
        reader.readAsText(file);
    };

    input.click();
}
