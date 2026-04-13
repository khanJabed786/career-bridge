/**
 * Real-time Updates Utility - Fixed with Supabase realtime
 */

class RealtimeManager {
    constructor() {
        this.subscriptions = {};
        this.channels = {};
        this.listeners = {};
        this.supabase = window.supabase;
    }

    /**
     * Subscribe to table changes
     */
    subscribe(table, callback, filter = null) {
        try {
            if (!this.supabase?.client) {
                console.error('Supabase client not available');
                return null;
            }

            let channelConfig = {
                event: '*',
                schema: 'public',
                table: table
            };

            if (filter) {
                channelConfig.filter = filter;
            }

            const channelId = `${table}-${Date.now()}`;

            const channel = this.supabase.client
                .channel(channelId)
                .on('postgres_changes', channelConfig, (payload) => {
                    console.log(`📡 Realtime update on ${table}:`, payload.eventType);
                    callback(payload);
                    
                    // Emit event to local listeners
                    this.emit('realtime:update', {
                        table,
                        event: payload.eventType,
                        data: payload.new || payload.old
                    });
                })
                .subscribe();

            this.channels[channelId] = channel;
            this.subscriptions[table] = this.subscriptions[table] || [];
            this.subscriptions[table].push(channelId);

            return channelId;

        } catch (error) {
            console.error('Subscription error:', error);
            return null;
        }
    }

    /**
     * Subscribe to specific events on a table
     */
    subscribeToEvents(table, events, callback, filter = null) {
        try {
            if (!this.supabase?.client) {
                console.error('Supabase client not available');
                return null;
            }

            const channelId = `${table}-events-${Date.now()}`;

            const channel = this.supabase.client
                .channel(channelId);

            events.forEach(eventType => {
                channel.on('postgres_changes', {
                    event: eventType,
                    schema: 'public',
                    table: table,
                    filter: filter
                }, (payload) => {
                    console.log(`📡 Event ${eventType} on ${table}`);
                    callback(payload);
                });
            });

            channel.subscribe();

            this.channels[channelId] = channel;

            return channelId;

        } catch (error) {
            console.error('Event subscription error:', error);
            return null;
        }
    }

    /**
     * Subscribe to user-specific notifications
     */
    subscribeToUserNotifications(userId) {
        return this.subscribe('notifications', (payload) => {
            // Handle new notification
            if (payload.eventType === 'INSERT') {
                this.emit('notification:new', payload.new);
            }
        }, `user_id=eq.${userId}`);
    }

    /**
     * Subscribe to job updates for a company
     */
    subscribeToCompanyJobs(companyId) {
        return this.subscribe('job_posts', (payload) => {
            this.emit('jobs:update', {
                companyId,
                event: payload.eventType,
                job: payload.new || payload.old
            });
        }, `company_id=eq.${companyId}`);
    }

    /**
     * Subscribe to application updates for a student
     */
    subscribeToStudentApplications(studentId) {
        return this.subscribe('job_applications', (payload) => {
            if (payload.eventType === 'UPDATE') {
                this.emit('application:update', {
                    studentId,
                    applicationId: payload.new.id,
                    oldStatus: payload.old?.status,
                    newStatus: payload.new.status
                });
            }
        }, `student_id=eq.${studentId}`);
    }

    /**
     * Unsubscribe from a channel
     */
    unsubscribe(channelId) {
        try {
            if (this.channels[channelId]) {
                this.channels[channelId].unsubscribe();
                delete this.channels[channelId];

                // Remove from subscriptions mapping
                Object.keys(this.subscriptions).forEach(table => {
                    this.subscriptions[table] = this.subscriptions[table].filter(id => id !== channelId);
                });
            }
        } catch (error) {
            console.error('Unsubscribe error:', error);
        }
    }

    /**
     * Unsubscribe from a table
     */
    unsubscribeFromTable(table) {
        if (this.subscriptions[table]) {
            this.subscriptions[table].forEach(channelId => {
                this.unsubscribe(channelId);
            });
            delete this.subscriptions[table];
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                callback(data);
            });
        }
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Unsubscribe all
     */
    unsubscribeAll() {
        Object.keys(this.channels).forEach(channelId => {
            this.unsubscribe(channelId);
        });
        this.subscriptions = {};
        this.channels = {};
    }

    /**
     * Check if subscribed to a table
     */
    isSubscribed(table) {
        return this.subscriptions[table] && this.subscriptions[table].length > 0;
    }

    /**
     * Get subscription count
     */
    getSubscriptionCount() {
        return Object.keys(this.channels).length;
    }
}

// Create global instance
const realtimeManager = new RealtimeManager();

// Make available globally
window.realtimeManager = realtimeManager;