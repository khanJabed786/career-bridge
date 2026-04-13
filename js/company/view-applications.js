/**
 * View Applications Logic - Company - FIXED VERSION
 */

/**
 * View application details
 */
async function viewApplicationDetails(applicationId) {
    try {
        // First try to get from localStorage
        const savedApps = localStorage.getItem('companyApplications');
        if (savedApps) {
            const allApps = JSON.parse(savedApps);
            const application = allApps.find(app => app.id === applicationId);
            
            if (application) {
                showApplicationModal(application);
                return;
            }
        }

        // If not found in localStorage, try Supabase
        const { data: application, error } = await window.supabase.client
            .from('job_applications')
            .select(`
                *,
                student_profiles (
                    full_name,
                    email,
                    phone,
                    location,
                    current_skills,
                    education,
                    experience,
                    resume_url,
                    profile_picture,
                    linkedin_url,
                    github_url,
                    portfolio_url
                ),
                job_posts (
                    title,
                    type,
                    location,
                    salary,
                    description
                )
            `)
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        if (application) {
            showApplicationModal(application);
        }

    } catch (error) {
        console.error('Error viewing application:', error);
        showAlert('Error loading application details', 'danger');
    }
}

/**
 * Show application modal
 */
function showApplicationModal(application) {
    const student = application.student_profiles || {};
    const job = application.job_posts || {};
    const resolvedPhoto = resolveStudentPhoto(application, student);
    const candidateName = application.student_name || student.full_name || 'Candidate';

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>Application Details</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="applicant-info">
                    <div class="applicant-header">
                        ${resolvedPhoto ? 
                            `<img src="${resolvedPhoto}" alt="${candidateName}" class="applicant-photo" onerror="this.outerHTML='<div class=\"applicant-photo-placeholder\"><i class=\"fas fa-user-circle\"></i></div>'">` : 
                            '<div class="applicant-photo-placeholder"><i class="fas fa-user-circle"></i></div>'}
                        <div>
                            <h3>${candidateName}</h3>
                            <p><i class="fas fa-envelope"></i> ${application.student_email || student.email || 'N/A'}</p>
                            <p><i class="fas fa-phone"></i> ${application.student_phone || student.phone || 'N/A'}</p>
                            <p><i class="fas fa-map-marker-alt"></i> ${application.student_location || student.location || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="info-section">
                        <h4><i class="fas fa-briefcase"></i> Job Details</h4>
                        <p><strong>Position:</strong> ${application.job_title || job.title || 'N/A'}</p>
                        <p><strong>Company:</strong> ${application.company_name || 'N/A'}</p>
                        <p><strong>Applied on:</strong> ${new Date(application.created_at).toLocaleString()}</p>
                    </div>

                    <div class="info-section">
                        <h4><i class="fas fa-graduation-cap"></i> Education</h4>
                        <p>${application.student_education || student.education || 'Not provided'}</p>
                    </div>

                    <div class="info-section">
                        <h4><i class="fas fa-code"></i> Skills</h4>
                        <div class="skills-list">
                            ${application.student_skills?.map(skill => 
                                `<span class="skill-tag">${skill}</span>`
                            ).join('') || student.current_skills?.map(skill => 
                                `<span class="skill-tag">${skill}</span>`
                            ).join('') || 'No skills listed'}
                        </div>
                    </div>

                    <div class="info-section">
                        <h4><i class="fas fa-star"></i> Experience</h4>
                        <p>${application.student_experience || student.experience || 'Fresher'}</p>
                    </div>

                    ${application.resume_url ? `
                        <div class="info-section">
                            <h4><i class="fas fa-file-pdf"></i> Resume</h4>
                            <div class="resume-actions">
                                <a href="${application.resume_url}" target="_blank" class="btn btn-primary">
                                    <i class="fas fa-eye"></i> View Resume
                                </a>
                                <a href="${application.resume_url}" download class="btn btn-secondary">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            </div>
                        </div>
                    ` : student.resume_url ? `
                        <div class="info-section">
                            <h4><i class="fas fa-file-pdf"></i> Resume</h4>
                            <div class="resume-actions">
                                <a href="${student.resume_url}" target="_blank" class="btn btn-primary">
                                    <i class="fas fa-eye"></i> View Resume
                                </a>
                                <a href="${student.resume_url}" download class="btn btn-secondary">
                                    <i class="fas fa-download"></i> Download
                                </a>
                            </div>
                        </div>
                    ` : ''}

                    <div class="info-section">
                        <h4><i class="fas fa-link"></i> Profiles</h4>
                        ${student.linkedin_url ? `<p><a href="${student.linkedin_url}" target="_blank">LinkedIn Profile</a></p>` : ''}
                        ${student.github_url ? `<p><a href="${student.github_url}" target="_blank">GitHub Profile</a></p>` : ''}
                        ${student.portfolio_url ? `<p><a href="${student.portfolio_url}" target="_blank">Portfolio</a></p>` : ''}
                    </div>

                    ${application.cover_letter ? `
                        <div class="info-section">
                            <h4><i class="fas fa-envelope-open-text"></i> Cover Letter</h4>
                            <div class="cover-letter">
                                ${application.cover_letter}
                            </div>
                        </div>
                    ` : ''}

                    <div class="info-section">
                        <h4><i class="fas fa-tag"></i> Application Status</h4>
                        <select id="statusSelect" class="status-select" onchange="updateApplicationStatus('${application.id}', this.value)">
                            <option value="pending" ${application.status === 'pending' ? 'selected' : ''}>Applied</option>
                            <option value="shortlisted" ${application.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                            <option value="interview" ${application.status === 'interview' ? 'selected' : ''}>Interview Scheduled</option>
                            <option value="selected" ${application.status === 'selected' ? 'selected' : ''}>Selected</option>
                            <option value="rejected" ${application.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>

                    <div class="info-section">
                        <h4><i class="fas fa-comment"></i> Feedback / Rejection Reason</h4>
                        <textarea id="feedbackText" class="feedback-textarea" placeholder="Add feedback or rejection reason for the candidate..." rows="4">${application.rejectReason || application.rejectFeedback || application.feedback || ''}</textarea>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="saveApplicationUpdates('${application.id}')">
                    <i class="fas fa-save"></i> Save Changes
                </button>
                ${application.status === 'shortlisted' ? `
                    <button class="btn btn-success" onclick="openInterviewModal('${application.id}'); this.closest('.modal').remove();">
                        <i class="fas fa-calendar"></i> Schedule Interview
                    </button>
                ` : ''}
                ${application.status === 'interview' ? `
                    <button class="btn btn-info" onclick="openInterviewModal('${application.id}'); this.closest('.modal').remove();">
                        <i class="fas fa-calendar"></i> Reschedule Interview
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function resolveStudentPhoto(application, student) {
    const directPhoto =
        student?.profile_picture ||
        student?.profile_picture_url ||
        application?.student_profile_picture ||
        application?.profile_picture ||
        application?.profile_picture_url ||
        application?.student_photo ||
        application?.photo_url;

    if (directPhoto) return directPhoto;

    // localStorage fallback for applications saved without image fields
    try {
        const email = (application?.student_email || application?.studentEmail || student?.email || '').toLowerCase();
        if (!email) return '';

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('studentProfile_')) continue;

            const raw = localStorage.getItem(key);
            if (!raw) continue;

            const profile = JSON.parse(raw);
            const profileEmail = (profile?.email || '').toLowerCase();
            if (profileEmail === email) {
                return profile?.profile_picture || profile?.profile_picture_url || '';
            }
        }
    } catch (error) {
        console.warn('Could not resolve student photo from localStorage:', error.message);
    }

    return '';
}

/**
 * Open interview modal
 */
function openInterviewModal(applicationId) {
    // This function should be implemented in company-dashboard.html
    // It will be called from this modal
    if (window.openInterviewModal) {
        window.openInterviewModal(applicationId);
    } else {
        showAlert('Interview scheduling not available', 'warning');
    }
}

/**
 * Update application status
 */
async function updateApplicationStatus(applicationId, status) {
    try {
        // Update in localStorage
        const savedApps = localStorage.getItem('companyApplications');
        if (savedApps) {
            const allApps = JSON.parse(savedApps);
            const appIndex = allApps.findIndex(app => app.id === applicationId);
            if (appIndex !== -1) {
                allApps[appIndex].status = status;
                allApps[appIndex].updated_at = new Date().toISOString();
                localStorage.setItem('companyApplications', JSON.stringify(allApps));
                
                // Also update student's applications if they exist
                const studentApps = localStorage.getItem('studentApplications');
                if (studentApps) {
                    const allStudentApps = JSON.parse(studentApps);
                    const studentAppIndex = allStudentApps.findIndex(app => app.id === applicationId);
                    if (studentAppIndex !== -1) {
                        allStudentApps[studentAppIndex].status = status;
                        allStudentApps[studentAppIndex].updated_at = new Date().toISOString();
                        localStorage.setItem('studentApplications', JSON.stringify(allStudentApps));
                    }
                }
            }
        }

        // Try to update in Supabase
        try {
            const { error } = await window.supabase.db.update(
                'job_applications',
                { 
                    status: status,
                    updated_at: new Date().toISOString()
                },
                applicationId
            );
            if (error) throw error;
        } catch (supabaseError) {
            console.warn('Supabase update failed, but localStorage updated:', supabaseError);
        }

        showAlert('Status updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Error updating status', 'danger');
    }
}

/**
 * Save application updates (status and feedback)
 */
async function saveApplicationUpdates(applicationId) {
    try {
        const status = document.getElementById('statusSelect')?.value;
        const feedback = document.getElementById('feedbackText')?.value;

        // Update in localStorage
        const savedApps = localStorage.getItem('companyApplications');
        if (savedApps) {
            const allApps = JSON.parse(savedApps);
            const appIndex = allApps.findIndex(app => app.id === applicationId);
            if (appIndex !== -1) {
                allApps[appIndex].status = status;
                allApps[appIndex].rejectFeedback = feedback;
                allApps[appIndex].feedback = feedback;
                allApps[appIndex].updated_at = new Date().toISOString();
                localStorage.setItem('companyApplications', JSON.stringify(allApps));
                
                // Also update student's applications
                const studentApps = localStorage.getItem('studentApplications');
                if (studentApps) {
                    const allStudentApps = JSON.parse(studentApps);
                    const studentAppIndex = allStudentApps.findIndex(app => app.id === applicationId);
                    if (studentAppIndex !== -1) {
                        allStudentApps[studentAppIndex].status = status;
                        allStudentApps[studentAppIndex].rejectFeedback = feedback;
                        allStudentApps[studentAppIndex].feedback = feedback;
                        allStudentApps[studentAppIndex].updated_at = new Date().toISOString();
                        localStorage.setItem('studentApplications', JSON.stringify(allStudentApps));
                    }
                }
            }
        }

        // Try to update in Supabase
        try {
            const { error } = await window.supabase.db.update(
                'job_applications',
                { 
                    status: status,
                    feedback: feedback,
                    updated_at: new Date().toISOString()
                },
                applicationId
            );
            if (error) throw error;
        } catch (supabaseError) {
            console.warn('Supabase update failed, but localStorage updated:', supabaseError);
        }

        showAlert('✅ Application updated successfully!', 'success');
        
        // Close modal after short delay
        setTimeout(() => {
            document.querySelector('.modal.show')?.remove();
            // Reload company dashboard data
            if (window.loadData) {
                window.loadData();
            }
        }, 1500);

    } catch (error) {
        console.error('Error updating application:', error);
        showAlert('❌ Error updating application: ' + error.message, 'danger');
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
window.viewApplicationDetails = viewApplicationDetails;
window.saveApplicationUpdates = saveApplicationUpdates;
window.updateApplicationStatus = updateApplicationStatus;
window.openInterviewModal = openInterviewModal;