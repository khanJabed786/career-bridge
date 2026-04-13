/**
 * Feedback Management - Company - Fixed with Supabase only
 */

/**
 * Load feedback for company
 */
async function loadFeedback() {
    try {
        const user = window.authService?.getCurrentUser();
        if (!user) return;

        // Get company profile
        const { data: companies } = await window.supabase.db.select('company_profiles', { user_id: user.id });
        if (!companies || companies.length === 0) return;

        const company = companies[0];

        // Get feedback given to company
        const { data: feedback, error } = await window.supabase.client
            .from('feedback')
            .select(`
                *,
                from_user:from_user_id (
                    email
                ),
                student_profiles!inner (
                    full_name,
                    profile_picture
                )
            `)
            .eq('to_user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayFeedback(feedback || []);

    } catch (error) {
        console.error('Error loading feedback:', error);
        showAlert('Error loading feedback', 'danger');
    }
}

/**
 * Display feedback list
 */
function displayFeedback(feedbackList) {
    const container = document.getElementById('feedbackContainer');
    if (!container) return;

    if (feedbackList.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-comment"></i><p>No feedback yet</p></div>';
        return;
    }

    container.innerHTML = feedbackList.map(fb => `
        <div class="feedback-card">
            <div class="feedback-header">
                <div style="display:flex; align-items:center; gap:10px;">
                    ${fb.student_profiles?.profile_picture ? `<img src="${fb.student_profiles.profile_picture}" alt="${fb.student_profiles?.full_name || 'Student'}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:2px solid #e6eaff;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';">` : ''}
                    <span style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; display:${fb.student_profiles?.profile_picture ? 'none' : 'inline-flex'}; align-items:center; justify-content:center; font-weight:700;">${(fb.student_profiles?.full_name || 'S').charAt(0).toUpperCase()}</span>
                    <div>
                        <strong>${fb.student_profiles?.full_name || 'Anonymous'}</strong>
                        <span class="feedback-date">${new Date(fb.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="feedback-rating">
                    ${renderStars(fb.rating)}
                </div>
            </div>
            <div class="feedback-content">
                ${fb.feedback_text}
            </div>
            ${fb.response ? `
                <div class="feedback-response">
                    <strong>Your Response:</strong>
                    <p>${fb.response}</p>
                </div>
            ` : ''}
            <div class="feedback-actions">
                <button class="btn btn-sm btn-primary" onclick="showResponseModal('${fb.id}')">
                    <i class="fas fa-reply"></i> Respond
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Render stars for rating
 */
function renderStars(rating) {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
}

/**
 * Show response modal
 */
function showResponseModal(feedbackId) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-reply"></i> Respond to Feedback</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="responseForm" onsubmit="submitFeedbackResponse(event, '${feedbackId}')">
                    <div class="form-group">
                        <label for="responseText">Your Response</label>
                        <textarea id="responseText" rows="6" required placeholder="Write your response here..."></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Response
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Submit feedback response
 */
async function submitFeedbackResponse(event, feedbackId) {
    event.preventDefault();

    const response = document.getElementById('responseText').value;

    try {
        const btn = event.target.querySelector('button[type="submit"]');
        showLoading(btn, 'Sending...');

        const { error } = await window.supabase.db.update(
            'feedback',
            { 
                response: response,
                responded_at: new Date().toISOString()
            },
            feedbackId
        );

        if (error) throw error;

        showAlert('✅ Response sent successfully!', 'success');
        
        setTimeout(() => {
            document.querySelector('.modal')?.remove();
            loadFeedback();
        }, 1500);

    } catch (error) {
        console.error('Error sending response:', error);
        showAlert('❌ Error sending response: ' + error.message, 'danger');
    } finally {
        hideLoading(event.target.querySelector('button[type="submit"]'));
    }
}

/**
 * Provide feedback to candidate
 */
async function provideFeedback(applicationId) {
    try {
        // Get application details
        const { data: application, error } = await window.supabase.client
            .from('job_applications')
            .select(`
                *,
                student_profiles (
                    user_id,
                    full_name
                )
            `)
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        showProvideFeedbackModal(application);

    } catch (error) {
        console.error('Error loading application:', error);
        showAlert('Error loading application details', 'danger');
    }
}

/**
 * Show provide feedback modal
 */
function showProvideFeedbackModal(application) {
    const student = application.student_profiles || {};

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-star"></i> Feedback for ${student.full_name || 'Candidate'}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="feedbackForm" onsubmit="submitCandidateFeedback(event, '${application.id}', '${student.user_id}')">
                    <div class="form-group">
                        <label>Rating</label>
                        <div class="rating-select">
                            ${[1,2,3,4,5].map(num => `
                                <label class="rating-star">
                                    <input type="radio" name="rating" value="${num}" ${num === 5 ? 'checked' : ''}>
                                    <span>⭐</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="feedbackMessage">Feedback Message</label>
                        <textarea id="feedbackMessage" rows="6" required placeholder="Share your feedback about the candidate..."></textarea>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Submit Feedback
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Submit candidate feedback
 */
async function submitCandidateFeedback(event, applicationId, candidateUserId) {
    event.preventDefault();

    const user = window.authService?.getCurrentUser();
    if (!user) return;

    const rating = parseInt(document.querySelector('input[name="rating"]:checked').value);
    const feedbackMessage = document.getElementById('feedbackMessage').value;

    try {
        const btn = event.target.querySelector('button[type="submit"]');
        showLoading(btn, 'Submitting...');

        // Save feedback
        const { error } = await window.supabase.db.insert('feedback', {
            from_user_id: user.id,
            to_user_id: candidateUserId,
            feedback_text: feedbackMessage,
            rating: rating,
            feedback_type: 'application_feedback',
            application_id: applicationId,
            created_at: new Date().toISOString()
        });

        if (error) throw error;

        showAlert('✅ Feedback submitted successfully!', 'success');
        
        setTimeout(() => {
            document.querySelector('.modal')?.remove();
            location.reload();
        }, 1500);

    } catch (error) {
        console.error('Error submitting feedback:', error);
        showAlert('❌ Error submitting feedback: ' + error.message, 'danger');
    } finally {
        hideLoading(event.target.querySelector('button[type="submit"]'));
    }
}

/**
 * Show loading state
 */
function showLoading(btn, text = 'Loading...') {
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }
}

/**
 * Hide loading state
 */
function hideLoading(btn) {
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
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
window.loadFeedback = loadFeedback;
window.provideFeedback = provideFeedback;
window.showResponseModal = showResponseModal;
window.submitFeedbackResponse = submitFeedbackResponse;
window.submitCandidateFeedback = submitCandidateFeedback;