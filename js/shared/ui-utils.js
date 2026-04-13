/**
 * UI Utilities - Simple helper functions
 */

// Show toast notification
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

// Show alert (legacy)
function showAlert(message, type = 'info', duration = 3000) {
    return showToast(message, type, duration);
}

// Show loading state on button
function showLoading(btn, text = 'Loading...') {
    if (!btn) return;
    
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

// Hide loading state on button
function hideLoading(btn) {
    if (!btn) return;
    
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || 'Submit';
}

// Show confirm dialog
async function showConfirm(message) {
    return new Promise(resolve => {
        const result = window.confirm(message);
        resolve(result);
    });
}

// Show prompt dialog
async function showPrompt(message, defaultValue = '') {
    return new Promise(resolve => {
        const result = window.prompt(message, defaultValue);
        resolve(result);
    });
}

// Format date
function formatDate(dateString, format = 'short') {
    const date = new Date(dateString);
    
    if (format === 'short') {
        return date.toLocaleDateString();
    } else if (format === 'long') {
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else if (format === 'datetime') {
        return date.toLocaleString();
    }
    
    return date.toLocaleDateString();
}

// Get time ago string
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} week${Math.floor(diffDay / 7) > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        showToast('Failed to copy', 'error');
        return false;
    }
}

// Download file
function downloadFile(content, fileName, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone (Indian)
function isValidPhone(phone) {
    const re = /^[6-9]\d{9}$/;
    return re.test(phone.replace(/\D/g, ''));
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available
window.showToast = showToast;
window.showAlert = showAlert;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showConfirm = showConfirm;
window.showPrompt = showPrompt;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.truncateText = truncateText;
window.getUrlParameter = getUrlParameter;
window.debounce = debounce;
window.throttle = throttle;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.escapeHtml = escapeHtml;