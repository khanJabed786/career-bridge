/**
 * Content Moderation Logic - Admin - Fixed with Supabase only
 */

/**
 * Load reports
 */
async function loadReports() {
    try {
        const { data: reports, error } = await window.supabase.client
            .from('reports')
            .select(`
                *,
                reporter:reporter_id (
                    email
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayReports(reports || []);

    } catch (error) {
        console.error('Error loading reports:', error);
        showAlert('Error loading reports', 'danger');
    }
}

/**
 * Display reports
 */
function displayReports(reports) {
    const container = document.getElementById('reportsContainer');
    if (!container) return;

    if (reports.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-flag"></i><p>No reports submitted yet</p></div>';
        return;
    }

    container.innerHTML = reports.map(report => `
        <div class="report-card" id="report-${report.id}">
            <div class="report-header">
                <div>
                    <h3>${report.title || 'Report'}</h3>
                    <span class="report-type ${report.type}">${report.type}</span>
                </div>
                <span class="status-badge ${report.status === 'resolved' ? 'status-verified' : 'status-pending'}">
                    ${report.status || 'Pending'}
                </span>
            </div>

            <div class="report-meta">
                <span><i class="fas fa-user"></i> Reported by: ${report.reporter?.email || 'Unknown'}</span>
                <span><i class="fas fa-calendar"></i> ${new Date(report.created_at).toLocaleString()}</span>
                <span><i class="fas fa-tag"></i> ${report.category || 'General'}</span>
            </div>

            <div class="report-description">
                <p>${report.description}</p>
            </div>

            ${report.entity_type ? `
                <div class="report-entity">
                    <strong>Reported ${report.entity_type}:</strong> 
                    ${report.entity_id}
                </div>
            ` : ''}

            <div class="report-actions">
                <button class="action-btn btn-view" onclick="viewReportedContent('${report.id}', '${report.entity_type}', '${report.entity_id}')">
                    <i class="fas fa-eye"></i> View Content
                </button>
                <button class="action-btn btn-approve" onclick="resolveReport('${report.id}')">
                    <i class="fas fa-check"></i> Resolve
                </button>
                <button class="action-btn btn-reject" onclick="dismissReport('${report.id}')">
                    <i class="fas fa-times"></i> Dismiss
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * View reported content
 */
async function viewReportedContent(reportId, entityType, entityId) {
    try {
        let data = null;
        
        if (entityType === 'job') {
            const { data: job } = await window.supabase.client
                .from('job_posts')
                .select(`
                    *,
                    company_profiles (
                        company_name,
                        email
                    )
                `)
                .eq('id', entityId)
                .single();
            data = job;
        } else if (entityType === 'application') {
            const { data: app } = await window.supabase.client
                .from('job_applications')
                .select(`
                    *,
                    student_profiles (
                        full_name,
                        email
                    ),
                    job_posts (
                        title,
                        company_profiles (
                            company_name
                        )
                    )
                `)
                .eq('id', entityId)
                .single();
            data = app;
        } else if (entityType === 'feedback') {
            const { data: feedback } = await window.supabase.client
                .from('feedback')
                .select(`
                    *,
                    from_user:from_user_id (
                        email
                    ),
                    to_user:to_user_id (
                        email
                    )
                `)
                .eq('id', entityId)
                .single();
            data = feedback;
        }

        if (data) {
            showContentModal(reportId, entityType, data);
        }

    } catch (error) {
        console.error('Error viewing content:', error);
        showAlert('Error loading content', 'danger');
    }
}

/**
 * Show content modal
 */
function showContentModal(reportId, entityType, data) {
    let content = '';

    if (entityType === 'job') {
        content = `
            <h3>${data.title}</h3>
            <p><strong>Company:</strong> ${data.company_profiles?.company_name}</p>
            <p><strong>Location:</strong> ${data.location}</p>
            <p><strong>Type:</strong> ${data.type}</p>
            <p><strong>Description:</strong> ${data.description}</p>
            <p><strong>Skills:</strong> ${data.skills?.join(', ')}</p>
        `;
    } else if (entityType === 'application') {
        content = `
            <h3>Application by ${data.student_profiles?.full_name}</h3>
            <p><strong>Job:</strong> ${data.job_posts?.title}</p>
            <p><strong>Company:</strong> ${data.job_posts?.company_profiles?.company_name}</p>
            <p><strong>Status:</strong> ${data.status}</p>
            ${data.cover_letter ? `<p><strong>Cover Letter:</strong> ${data.cover_letter}</p>` : ''}
        `;
    } else if (entityType === 'feedback') {
        content = `
            <h3>Feedback</h3>
            <p><strong>From:</strong> ${data.from_user?.email}</p>
            <p><strong>To:</strong> ${data.to_user?.email}</p>
            <p><strong>Rating:</strong> ${'⭐'.repeat(data.rating)}</p>
            <p><strong>Message:</strong> ${data.feedback_text}</p>
        `;
    }

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>Reported ${entityType}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button class="btn btn-danger" onclick="removeReportedContent('${reportId}', '${entityType}', '${data.id}'); this.closest('.modal').remove();">
                    <i class="fas fa-trash"></i> Remove Content
                </button>
                <button class="btn btn-success" onclick="resolveReport('${reportId}'); this.closest('.modal').remove();">
                    <i class="fas fa-check"></i> Keep & Resolve
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Remove reported content
 */
async function removeReportedContent(reportId, entityType, entityId) {
    try {
        let error = null;

        if (entityType === 'job') {
            // Soft delete by setting inactive
            const { error: e } = await window.supabase.db.update(
                'job_posts',
                { 
                    status: 'removed',
                    removed_at: new Date().toISOString(),
                    removed_by: window.authService?.getCurrentUser()?.id
                },
                entityId
            );
            error = e;
        } else if (entityType === 'application') {
            const { error: e } = await window.supabase.db.update(
                'job_applications',
                { 
                    status: 'removed',
                    removed_at: new Date().toISOString()
                },
                entityId
            );
            error = e;
        } else if (entityType === 'feedback') {
            const { error: e } = await window.supabase.db.delete('feedback', entityId);
            error = e;
        }

        if (error) throw error;

        // Resolve the report
        await window.supabase.db.update(
            'reports',
            { 
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                action_taken: 'content_removed'
            },
            reportId
        );

        showAlert('✅ Content removed and report resolved', 'success');
        document.getElementById(`report-${reportId}`)?.remove();
        loadReports();

    } catch (error) {
        console.error('Error removing content:', error);
        showAlert('❌ Error removing content: ' + error.message, 'danger');
    }
}

/**
 * Resolve report
 */
async function resolveReport(reportId) {
    try {
        const { error } = await window.supabase.db.update(
            'reports',
            { 
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolved_by: window.authService?.getCurrentUser()?.id,
                action_taken: 'no_action'
            },
            reportId
        );

        if (error) throw error;

        showAlert('✅ Report resolved', 'success');
        document.getElementById(`report-${reportId}`)?.remove();

    } catch (error) {
        console.error('Error resolving report:', error);
        showAlert('❌ Error resolving report: ' + error.message, 'danger');
    }
}

/**
 * Dismiss report
 */
async function dismissReport(reportId) {
    if (!confirm('Are you sure you want to dismiss this report?')) return;

    try {
        const { error } = await window.supabase.db.update(
            'reports',
            { 
                status: 'dismissed',
                dismissed_at: new Date().toISOString(),
                dismissed_by: window.authService?.getCurrentUser()?.id
            },
            reportId
        );

        if (error) throw error;

        showAlert('✅ Report dismissed', 'success');
        document.getElementById(`report-${reportId}`)?.remove();

    } catch (error) {
        console.error('Error dismissing report:', error);
        showAlert('❌ Error dismissing report: ' + error.message, 'danger');
    }
}

/**
 * Remove job posting
 */
async function removeJob(jobId) {
    if (!confirm('Are you sure you want to remove this job posting?')) return;

    try {
        const { error } = await window.supabase.db.update(
            'job_posts',
            { 
                status: 'removed',
                removed_at: new Date().toISOString(),
                removed_by: window.authService?.getCurrentUser()?.id
            },
            jobId
        );

        if (error) throw error;

        showAlert('✅ Job posting removed', 'success');

    } catch (error) {
        console.error('Error removing job:', error);
        showAlert('❌ Error removing job: ' + error.message, 'danger');
    }
}

/**
 * Remove feedback
 */
async function removeFeedback(feedbackId) {
    if (!confirm('Are you sure you want to remove this feedback?')) return;

    try {
        const { error } = await window.supabase.db.delete('feedback', feedbackId);

        if (error) throw error;

        showAlert('✅ Feedback removed', 'success');

    } catch (error) {
        console.error('Error removing feedback:', error);
        showAlert('❌ Error removing feedback: ' + error.message, 'danger');
    }
}

/**
 * Block user
 */
async function blockUser(userId) {
    const reason = prompt('Enter reason for blocking:');
    if (!reason) return;

    try {
        const { error } = await window.supabase.db.update(
            'users',
            { 
                status: 'blocked',
                blocked_at: new Date().toISOString(),
                blocked_by: window.authService?.getCurrentUser()?.id,
                block_reason: reason
            },
            userId
        );

        if (error) throw error;

        // Send notification
        await window.supabase.db.insert('notifications', {
            user_id: userId,
            type: 'account_blocked',
            title: 'Account Blocked',
            message: `Your account has been blocked. Reason: ${reason}`,
            created_at: new Date().toISOString()
        });

        showAlert('✅ User blocked', 'success');

    } catch (error) {
        console.error('Error blocking user:', error);
        showAlert('❌ Error blocking user: ' + error.message, 'danger');
    }
}

/**
 * Show alert
 */
function showAlert(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make functions globally available
window.loadReports = loadReports;
window.viewReportedContent = viewReportedContent;
window.removeReportedContent = removeReportedContent;
window.resolveReport = resolveReport;
window.dismissReport = dismissReport;
window.removeJob = removeJob;
window.removeFeedback = removeFeedback;
window.blockUser = blockUser;