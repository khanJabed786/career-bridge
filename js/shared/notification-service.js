/**
 * Notification Service - Fixed with Supabase integration
 */

class NotificationService {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.permission = false;
        this.supabase = window.supabase;
        this.currentUser = null;
    }

    /**
     * Initialize notification service
     */
    async init() {
        try {
            // Request browser notification permission
            await this.requestPermission();

            // Get current user
            this.currentUser = window.authService?.getCurrentUser();

            if (this.currentUser) {
                // Load notifications from Supabase
                await this.loadNotifications();

                // Setup realtime subscription
                this.setupRealtime();
            }

            console.log('✅ Notification service initialized');
            return true;
        } catch (error) {
            console.error('❌ Notification service init error:', error);
            return false;
        }
    }

    /**
     * Request browser notification permission
     */
    async requestPermission() {
        try {
            if (!('Notification' in window)) {
                console.log('Browser does not support notifications');
                return false;
            }

            if (Notification.permission === 'granted') {
                this.permission = true;
                return true;
            }

            if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                this.permission = permission === 'granted';
                return this.permission;
            }

            return false;
        } catch (error) {
            console.error('Notification permission error:', error);
            return false;
        }
    }

    /**
     * Load notifications from Supabase
     */
    async loadNotifications() {
        try {
            if (!this.currentUser) return;

            const { data, error } = await window.supabase.db.select(
                'notifications',
                { user_id: this.currentUser.id },
                { orderBy: 'created_at', ascending: false }
            );

            if (error) throw error;

            this.notifications = data || [];
            this.unreadCount = this.notifications.filter(n => !n.read).length;

            this.updateBadge();

        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    /**
     * Setup realtime subscription for notifications
     */
    setupRealtime() {
        if (!this.supabase?.client) return;

        this.subscription = this.supabase.client
            .channel('notifications')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${this.currentUser?.id}`
                },
                (payload) => {
                    this.handleNewNotification(payload.new);
                }
            )
            .subscribe();
    }

    /**
     * Handle new notification
     */
    handleNewNotification(notification) {
        this.notifications.unshift(notification);
        this.unreadCount++;

        this.updateBadge();

        // Show browser notification if permission granted
        if (this.permission) {
            this.showBrowserNotification(notification);
        }

        // Show toast
        this.showToast(notification);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('notification:new', {
            detail: notification
        }));
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(notification) {
        try {
            new Notification(notification.title || 'Career Bridge', {
                body: notification.message,
                icon: '/logo.png',
                badge: '/logo.png'
            });
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    /**
     * Show toast notification
     */
    showToast(notification) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${notification.type || 'info'}`;
        toast.innerHTML = `
            <div class="toast-content">
                <strong>${notification.title || 'Notification'}</strong>
                <p>${notification.message}</p>
                <small>${new Date(notification.created_at).toLocaleTimeString()}</small>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Update notification badge
     */
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            const { error } = await window.supabase.db.update(
                'notifications',
                { read: true },
                notificationId
            );

            if (error) throw error;

            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                this.unreadCount--;
                this.updateBadge();
            }

            return true;

        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            const { error } = await window.supabase.client
                .from('notifications')
                .update({ read: true })
                .eq('user_id', this.currentUser.id)
                .eq('read', false);

            if (error) throw error;

            this.notifications.forEach(n => n.read = true);
            this.unreadCount = 0;
            this.updateBadge();

            return true;

        } catch (error) {
            console.error('Error marking all as read:', error);
            return false;
        }
    }

    /**
     * Create a notification
     */
    async createNotification(userId, title, message, type = 'info', link = null) {
        try {
            const { data, error } = await window.supabase.db.insert('notifications', {
                user_id: userId,
                title: title,
                message: message,
                type: type,
                link: link,
                read: false,
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    }

    /**
     * Get unread count
     */
    getUnreadCount() {
        return this.unreadCount;
    }

    /**
     * Get all notifications
     */
    getNotifications() {
        return this.notifications;
    }

    /**
     * Cleanup subscriptions
     */
    cleanup() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    /**
     * Show alert
     */
    showAlert(message, type = 'info', duration = 3000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;

        if (type === 'error') {
            alertDiv.style.background = '#fee';
            alertDiv.style.color = '#c33';
            alertDiv.style.border = '1px solid #e74c3c';
        } else if (type === 'success') {
            alertDiv.style.background = '#efe';
            alertDiv.style.color = '#3c3';
            alertDiv.style.border = '1px solid #28a745';
        } else {
            alertDiv.style.background = '#e7f3ff';
            alertDiv.style.color = '#0c5aa0';
            alertDiv.style.border = '1px solid #2196F3';
        }

        document.body.appendChild(alertDiv);

        if (duration > 0) {
            setTimeout(() => alertDiv.remove(), duration);
        }

        return alertDiv;
    }

    /**
     * Show confirm dialog
     */
    async showConfirm(message) {
        return new Promise(resolve => {
            const result = window.confirm(message);
            resolve(result);
        });
    }

    /**
     * Show prompt dialog
     */
    async showPrompt(message, defaultValue = '') {
        return new Promise(resolve => {
            const result = window.prompt(message, defaultValue);
            resolve(result);
        });
    }
}

// Create global instance
const notificationService = new NotificationService();

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => notificationService.init());
} else {
    notificationService.init();
}

// Make available globally
window.notificationService = notificationService;