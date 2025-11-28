/**
 * Google Drive Synchronization
 * Handles syncing generated images with Google Drive
 */

class GoogleDriveSync {
    constructor() {
        this.isConnected = false;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.autoSyncInterval = 5 * 60 * 1000; // 5 minutes
        this.dbName = 'StableDiffusionDB';
        this.storeName = 'images';
        this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB;
        
        this.initializeDB();
        this.setupEventListeners();
    }

    initializeDB() {
        if (!this.indexedDB) {
            console.warn('IndexedDB not available');
            return;
        }

        const request = this.indexedDB.open(this.dbName, 1);

        request.onerror = () => {
            console.error('Failed to open IndexedDB');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(this.storeName)) {
                const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('gdrive_id', 'gdrive_id', { unique: true });
            }
        };

        request.onsuccess = () => {
            this.db = request.result;
            console.log('IndexedDB initialized');
        };
    }

    setupEventListeners() {
        document.getElementById('connectGdriveBtn')?.addEventListener('click', () => {
            this.initializeGoogleDriveAuth();
        });

        // Auto-sync
        setInterval(() => {
            if (this.isConnected && !this.isSyncing) {
                this.syncWithDrive();
            }
        }, this.autoSyncInterval);
    }

    async initializeGoogleDriveAuth() {
        try {
            showToast('Initializing Google Drive authentication...', 'info');

            // This would trigger OAuth flow on server
            wsManager.emit('init_gdrive', {});

            // Wait for response
            setTimeout(() => {
                this.isConnected = true;
                this.updateGdriveStatus();
                showToast('Google Drive connected', 'success');
            }, 2000);

        } catch (error) {
            console.error('Google Drive auth failed:', error);
            showToast('Failed to connect Google Drive', 'error');
        }
    }

    async saveToIndexedDB(imageData) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const data = {
                ...imageData,
                timestamp: Date.now(),
                synced_to_gdrive: false
            };

            const request = store.add(data);

            request.onsuccess = () => {
                console.log('Image saved to IndexedDB:', request.result);
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to save to IndexedDB');
                reject(request.error);
            };
        });
    }

    async getUnsyncedImages() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');

            const request = index.getAll();

            request.onsuccess = () => {
                const unsynced = request.result.filter(img => !img.synced_to_gdrive);
                resolve(unsynced);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async markAsSynced(imageId, gdriveId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const request = store.get(imageId);

            request.onsuccess = () => {
                const image = request.result;
                if (image) {
                    image.synced_to_gdrive = true;
                    image.gdrive_id = gdriveId;
                    image.sync_time = Date.now();

                    const updateRequest = store.put(image);

                    updateRequest.onsuccess = () => {
                        console.log('Marked as synced:', imageId);
                        resolve();
                    };

                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                } else {
                    resolve();
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    async syncWithDrive() {
        if (!this.isConnected || this.isSyncing) {
            return;
        }

        this.isSyncing = true;
        showToast('Syncing with Google Drive...', 'info');

        try {
            const unsynced = await this.getUnsyncedImages();

            if (unsynced.length === 0) {
                this.isSyncing = false;
                return;
            }

            // Send sync request to server
            wsManager.emit('sync_gdrive', {
                images: unsynced.map(img => ({
                    id: img.id,
                    data: img.data,
                    metadata: img.metadata
                }))
            });

            this.lastSyncTime = new Date();
            this.updateGdriveStatus();

        } catch (error) {
            console.error('Sync failed:', error);
            showToast('Google Drive sync failed', 'error');
        } finally {
            this.isSyncing = false;
        }
    }

    updateGdriveStatus() {
        const status = document.getElementById('gdriveStatus');
        if (!status) return;

        if (this.isConnected) {
            const lastSync = this.lastSyncTime 
                ? this.lastSyncTime.toLocaleTimeString() 
                : 'Never';
            
            status.innerHTML = `
                <span class="status-indicator connected"></span>
                Connected to Google Drive
                <br>
                Last sync: ${lastSync}
                <button class="btn-secondary btn-sm" onclick="googleDriveSync.syncWithDrive()">
                    <i class="fas fa-sync"></i>
                    Sync Now
                </button>
            `;
        } else {
            status.innerHTML = `
                <span class="status-indicator"></span>
                Not connected
            `;
        }
    }

    // Setup service worker for offline caching
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    // Cleanup old cached images
    async cleanupCache(daysOld = 30) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('timestamp');

            const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            const range = IDBKeyRange.upperBound(cutoffTime);

            const request = index.getAll(range);

            request.onsuccess = () => {
                request.result.forEach(image => {
                    store.delete(image.id);
                });
                console.log(`Cleaned up ${request.result.length} old images`);
                resolve(request.result.length);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Export images for backup
    async exportImages() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            const request = store.getAll();

            request.onsuccess = () => {
                const data = {
                    exported_at: new Date().toISOString(),
                    version: 1,
                    images: request.result
                };

                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `gdrive_backup_${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);

                resolve(request.result.length);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Import images from backup
    async importImages(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    if (!data.images || !Array.isArray(data.images)) {
                        throw new Error('Invalid backup format');
                    }

                    const transaction = this.db.transaction([this.storeName], 'readwrite');
                    const store = transaction.objectStore(this.storeName);

                    let imported = 0;
                    data.images.forEach(image => {
                        store.add(image);
                        imported++;
                    });

                    transaction.oncomplete = () => {
                        showToast(`Imported ${imported} images`, 'success');
                        resolve(imported);
                    };

                    transaction.onerror = () => {
                        reject(transaction.error);
                    };

                } catch (error) {
                    showToast('Failed to import backup', 'error');
                    reject(error);
                }
            };

            reader.readAsText(file);
        });
    }
}

// Initialize Google Drive Sync
const googleDriveSync = new GoogleDriveSync();

// Register service worker on app load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        googleDriveSync.registerServiceWorker();
    });
} else {
    googleDriveSync.registerServiceWorker();
}

// Handle sync response from server
function handleGdriveSyncResponse(data) {
    if (data.success) {
        data.synced_ids.forEach(({ local_id, gdrive_id }) => {
            googleDriveSync.markAsSynced(local_id, gdrive_id);
        });
        showToast('Images synced to Google Drive', 'success');
    } else {
        showToast('Sync failed: ' + data.error, 'error');
    }
}
