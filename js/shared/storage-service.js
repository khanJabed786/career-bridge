/**
 * Storage Service for File Management - Using Supabase Storage
 */

class StorageService {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        this.allowedResumeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    }

    /**
     * Upload file to Supabase Storage
     */
    async uploadFile(file, bucket = 'general', folder = '') {
        try {
            // Validate file
            if (!this.validateFile(file)) {
                throw new Error('Invalid file or file too large (max 10MB)');
            }

            // Wait for Supabase client
            await this.waitForSupabase();

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = folder ? `${folder}/${fileName}` : fileName;
            
            const { data, error } = await window.supabaseClient.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) throw error;
            
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from(bucket)
                .getPublicUrl(filePath);
            
            console.log('✅ File uploaded to Supabase Storage:', publicUrl);
            
            return {
                url: publicUrl,
                path: filePath,
                error: null
            };

        } catch (error) {
            console.error('❌ File upload error:', error);
            return {
                url: null,
                error: error.message
            };
        }
    }

    /**
     * Wait for Supabase client
     */
    async waitForSupabase() {
        return new Promise((resolve, reject) => {
            if (window.supabaseClient) {
                resolve();
                return;
            }
            
            let attempts = 0;
            const maxAttempts = 30;
            
            const checkInterval = setInterval(() => {
                if (window.supabaseClient) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    reject(new Error('Supabase client not available'));
                }
                attempts++;
            }, 500);
        });
    }

    /**
     * Upload image (profile picture, logo)
     */
    async uploadImage(file, bucket = 'profile-pictures') {
        try {
            // Validate image type
            if (!this.allowedImageTypes.includes(file.type)) {
                throw new Error('Please upload a valid image file (JPEG, PNG, GIF, WEBP)');
            }

            return await this.uploadFile(file, bucket);

        } catch (error) {
            console.error('Image upload error:', error);
            return { url: null, error: error.message };
        }
    }

    /**
     * Upload resume
     */
    async uploadResume(file) {
        try {
            // Validate file type
            if (!this.allowedResumeTypes.includes(file.type)) {
                throw new Error('Please upload a PDF or Word document');
            }

            return await this.uploadFile(file, 'resumes');

        } catch (error) {
            console.error('Resume upload error:', error);
            return { url: null, error: error.message };
        }
    }

    /**
     * Upload profile picture
     */
    async uploadProfilePicture(file) {
        return await this.uploadImage(file, 'profile-pictures');
    }

    /**
     * Upload company logo
     */
    async uploadCompanyLogo(file) {
        return await this.uploadImage(file, 'company-logos');
    }

    /**
     * Upload job attachment
     */
    async uploadJobAttachment(file) {
        return await this.uploadFile(file, 'job-attachments');
    }

    /**
     * Validate file
     */
    validateFile(file) {
        if (!file) return false;
        if (file.size > this.maxFileSize) {
            console.warn(`File too large: ${this.getFileSizeInMB(file.size)}MB > ${this.getFileSizeInMB(this.maxFileSize)}MB`);
            return false;
        }
        return true;
    }

    /**
     * Get file size in MB
     */
    getFileSizeInMB(bytes) {
        return (bytes / (1024 * 1024)).toFixed(2);
    }

    /**
     * Get file icon based on type
     */
    getFileIcon(fileType) {
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        if (fileType.includes('image')) return '🖼️';
        return '📁';
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    /**
     * Delete file from Supabase Storage
     */
    async deleteFile(path, bucket) {
        try {
            await this.waitForSupabase();
            
            const { error } = await window.supabaseClient.storage
                .from(bucket)
                .remove([path]);
            
            if (error) throw error;
            
            return { success: true, error: null };

        } catch (error) {
            console.error('Delete file error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create file input and trigger upload
     */
    async selectAndUpload(options = {}) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = options.accept || '*/*';
            input.multiple = options.multiple || false;

            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                
                if (files.length === 0) {
                    resolve(null);
                    return;
                }

                if (!options.multiple) {
                    // Single file upload
                    const result = await this.uploadFile(files[0], options.bucket, options.folder);
                    resolve(result);
                } else {
                    // Multiple files upload
                    const results = await Promise.all(
                        files.map(file => this.uploadFile(file, options.bucket, options.folder))
                    );
                    resolve(results);
                }
            };

            input.click();
        });
    }
}

// Create global instance
const storageService = new StorageService();

// Make available globally
window.storageService = storageService;