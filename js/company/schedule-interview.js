/**
 * Schedule Interview Logic - Company - Fixed with Supabase only
 */

/**
 * Schedule interview for an application
 */
async function scheduleInterview(applicationId) {
    try {
        // Get application details
        const { data: application, error } = await window.supabase.client
            .from('job_applications')
            .select(`
                *,
                student_profiles (
                    full_name,
                    email
                ),
                job_posts (
                    title
                )
            `)
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        showInterviewModal(application);

    } catch (error) {
        console.error('Error scheduling interview:', error);
        showAlert('Error loading application details', 'danger');
    }
}

/**
 * Show interview scheduling modal
 */
function showInterviewModal(application) {
    const student = application.student_profiles || {};
    const job = application.job_posts || {};

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2><i class="fas fa-calendar-alt"></i> Schedule Interview</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="interview-info">
                    <p><strong>Candidate:</strong> ${student.full_name || 'Unknown'}</p>
                    <p><strong>Position:</strong> ${job.title || 'Unknown'}</p>
                    <p><strong>Email:</strong> ${student.email || 'N/A'}</p>
                </div>

                <form id="interviewForm" onsubmit="submitInterviewSchedule(event, '${application.id}')">
                    <div class="form-group">
                        <label for="interviewDate">Interview Date *</label>
                        <input type="date" id="interviewDate" required min="${new Date().toISOString().split('T')[0]}">
                    </div>

                    <div class="form-group">
                        <label for="interviewTime">Interview Time *</label>
                        <input type="time" id="interviewTime" required>
                    </div>

                    <div class="form-group">
                        <label for="interviewType">Interview Type *</label>
                        <select id="interviewType" required onchange="toggleInterviewType()">
                            <option value="online">Online (Video Call)</option>
                            <option value="offline">Offline (In Person)</option>
                            <option value="phone">Phone Call</option>
                        </select>
                    </div>

                    <div class="form-group" id="onlineDetails">
                        <label for="videoLink">Video Call Link *</label>
                        <input type="url" id="videoLink" placeholder="https://meet.google.com/...">
                        <small>Google Meet, Zoom, or Microsoft Teams link</small>
                    </div>

                    <div class="form-group" id="offlineDetails" style="display: none;">
                        <label for="interviewLocation">Location/Address *</label>
                        <input type="text" id="interviewLocation" placeholder="Office address">
                    </div>

                    <div class="form-group" id="phoneDetails" style="display: none;">
                        <label for="phoneNumber">Phone Number *</label>
                        <input type="tel" id="phoneNumber" placeholder="+91 XXXXX XXXXX">
                    </div>

                    <div class="form-group">
                        <label for="interviewDuration">Duration (minutes)</label>
                        <select id="interviewDuration">
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60" selected>60 minutes</option>
                            <option value="90">90 minutes</option>
                            <option value="120">120 minutes</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="interviewerName">Interviewer Name</label>
                        <input type="text" id="interviewerName" placeholder="e.g., John Doe">
                    </div>

                    <div class="form-group">
                        <label for="interviewerEmail">Interviewer Email</label>
                        <input type="email" id="interviewerEmail" placeholder="interviewer@company.com">
                    </div>

                    <div class="form-group">
                        <label for="interviewNotes">Additional Instructions</label>
                        <textarea id="interviewNotes" rows="4" placeholder="Add any special instructions for the candidate..."></textarea>
                    </div>

                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-calendar-check"></i> Schedule Interview
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
    
    // Set default values
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('interviewDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('interviewTime').value = '10:00';
}

/**
 * Toggle interview type details
 */
function toggleInterviewType() {
    const type = document.getElementById('interviewType').value;
    
    document.getElementById('onlineDetails').style.display = type === 'online' ? 'block' : 'none';
    document.getElementById('offlineDetails').style.display = type === 'offline' ? 'block' : 'none';
    document.getElementById('phoneDetails').style.display = type === 'phone' ? 'block' : 'none';
}

/**
 * Submit interview schedule
 */
async function submitInterviewSchedule(event, applicationId) {
    event.preventDefault();

    const interviewType = document.getElementById('interviewType').value;
    let location = '';

    if (interviewType === 'online') {
        location = document.getElementById('videoLink').value;
        if (!location) {
            showAlert('Please enter video call link', 'danger');
            return;
        }
    } else if (interviewType === 'offline') {
        location = document.getElementById('interviewLocation').value;
        if (!location) {
            showAlert('Please enter interview location', 'danger');
            return;
        }
    } else if (interviewType === 'phone') {
        location = document.getElementById('phoneNumber').value;
        if (!location) {
            showAlert('Please enter phone number', 'danger');
            return;
        }
    }

    const interviewData = {
        application_id: applicationId,
        interview_date: document.getElementById('interviewDate').value,
        interview_time: document.getElementById('interviewTime').value,
        interview_type: interviewType,
        location: location,
        duration: document.getElementById('interviewDuration').value,
        interviewer_name: document.getElementById('interviewerName').value,
        interviewer_email: document.getElementById('interviewerEmail').value,
        notes: document.getElementById('interviewNotes').value,
        status: 'scheduled',
        created_at: new Date().toISOString()
    };

    try {
        const btn = event.target.querySelector('button[type="submit"]');
        showLoading(btn, 'Scheduling...');

        // Save interview
        const { error } = await window.supabase.db.insert('interview_schedules', interviewData);

        if (error) throw error;

        // Update application status
        await window.supabase.db.update(
            'job_applications',
            { 
                status: 'interview_scheduled',
                interview_details: interviewData,
                updated_at: new Date().toISOString()
            },
            applicationId
        );

        showAlert('✅ Interview scheduled successfully!', 'success');
        
        setTimeout(() => {
            document.querySelector('.modal')?.remove();
            location.reload();
        }, 2000);

    } catch (error) {
        console.error('Error scheduling interview:', error);
        showAlert('❌ Error scheduling interview: ' + error.message, 'danger');
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
        btn.innerHTML = '<i class="fas fa-calendar-check"></i> Schedule Interview';
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
window.scheduleInterview = scheduleInterview;
window.toggleInterviewType = toggleInterviewType;
window.submitInterviewSchedule = submitInterviewSchedule;