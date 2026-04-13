/**
 * Company Dashboard Logic - Updated with Full Features
 */

let companyStats = {};
let companyJobs = [];
let companyApplications = [];
let companyProfile = null;
let companyLogo = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (window.authService) {
        window.authService.requireRole('company');
        await initCompanyDashboard();
    }
});

/**
 * Initialize company dashboard
 */
async function initCompanyDashboard() {
    try {
        const user = window.authService.getCurrentUser();
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // Load company profile from both sources
        await loadCompanyProfile();
        
        // Load all data
        await loadCompanyStats();
        await loadCompanyJobs();
        await loadCompanyApplications();
        
        // Display company name
        const companyNameElement = document.getElementById('companyName');
        if (companyNameElement && companyProfile) {
            companyNameElement.textContent = companyProfile.name || companyProfile.company_name || 'Company';
        }

        // Setup UI
        setupCompanyUI();
        setupRealtimeListeners();
        
        // Check verification status periodically
        setInterval(checkVerificationStatus, 30000); // Check every 30 seconds

    } catch (error) {
        console.error('Company dashboard initialization error:', error);
        showAlert('Error loading dashboard', 'danger');
    }
}

/**
 * Load company profile from Supabase and localStorage
 */
async function loadCompanyProfile() {
    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();
        
        // Try to load from Supabase first
        const { data, error } = await window.supabase.client
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (!error && data) {
            companyProfile = data;
            // Save to localStorage as backup
            localStorage.setItem('companyProfile', JSON.stringify(data));
        } else {
            // If Supabase fails, try localStorage
            const localProfile = localStorage.getItem('companyProfile');
            if (localProfile) {
                companyProfile = JSON.parse(localProfile);
            }
        }

        // Update profile form if it exists
        updateProfileForm();
        
        // Update verification status
        updateVerificationStatus();

    } catch (error) {
        console.error('Error loading company profile:', error);
        // Try localStorage as fallback
        const localProfile = localStorage.getItem('companyProfile');
        if (localProfile) {
            companyProfile = JSON.parse(localProfile);
            updateProfileForm();
            updateVerificationStatus();
        }
    }
}

/**
 * Update profile form with company data
 */
function updateProfileForm() {
    if (!companyProfile) return;

    // Update form fields
    if (document.getElementById('companyNameInput')) {
        document.getElementById('companyNameInput').value = companyProfile.name || companyProfile.company_name || '';
        document.getElementById('companyEmail').value = companyProfile.email || companyProfile.company_email || '';
        document.getElementById('companyPhone').value = companyProfile.phone || '';
        document.getElementById('companyAddress').value = companyProfile.address || '';
        document.getElementById('companyWebsite').value = companyProfile.website || companyProfile.website_url || '';
        document.getElementById('companyDescription').value = companyProfile.description || companyProfile.company_description || '';
        document.getElementById('industry').value = companyProfile.industry || '';
        
        // Government fields
        document.getElementById('gstNumber').value = companyProfile.gst_number || '';
        document.getElementById('registrationNumber').value = companyProfile.registration_number || '';
        document.getElementById('panNumber').value = companyProfile.pan_number || '';
        document.getElementById('governmentId').value = companyProfile.government_id || '';
    }

    // Update logo
    if (companyProfile.logo_url || companyProfile.logo) {
        const logo = companyProfile.logo_url || companyProfile.logo;
        document.getElementById('navbarLogo').innerHTML = `<img src="${logo}" alt="Logo">`;
        document.getElementById('logoPreview').innerHTML = `<img src="${logo}" alt="Logo">`;
        companyLogo = logo;
    }
}

/**
 * Update verification status in UI
 */
function updateVerificationStatus() {
    const verificationBadge = document.getElementById('verificationBadge');
    const verificationAlert = document.getElementById('verificationAlert');
    const profileVerificationStatus = document.getElementById('profileVerificationStatus');
    const verifyBtn = document.getElementById('verifyNowBtn');
    const statusDiv = document.getElementById('verificationStatus');
    
    const isVerified = companyProfile?.is_verified || companyProfile?.verified || false;
    
    if (isVerified) {
        // Update navbar badge
        if (verificationBadge) {
            verificationBadge.className = 'verification-badge verified';
            verificationBadge.textContent = 'Verified ✓';
        }
        // Hide verification alert
        if (verificationAlert) verificationAlert.style.display = 'none';
        // Update profile status
        if (profileVerificationStatus) {
            profileVerificationStatus.className = 'status-badge status-verified';
            profileVerificationStatus.textContent = 'Verified ✓';
        }
        // Hide verify button
        if (verifyBtn) verifyBtn.style.display = 'none';
        // Update status div
        if (statusDiv) {
            statusDiv.innerHTML = '<span class="badge bg-success">Verified ✓</span>';
        }
    } else {
        // Update navbar badge
        if (verificationBadge) {
            verificationBadge.className = 'verification-badge pending';
            verificationBadge.textContent = 'Pending';
        }
        // Show verification alert
        if (verificationAlert) verificationAlert.style.display = 'block';
        // Update profile status
        if (profileVerificationStatus) {
            profileVerificationStatus.className = 'status-badge status-warning';
            profileVerificationStatus.textContent = 'Pending Verification';
        }
        // Show verify button
        if (verifyBtn) verifyBtn.style.display = 'inline-flex';
        // Update status div
        if (statusDiv) {
            statusDiv.innerHTML = '<span class="badge bg-warning">Pending Verification</span>';
        }
    }
}

/**
 * Check verification status from admin
 */
async function checkVerificationStatus() {
    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();
        
        // Check from Supabase
        const { data, error } = await window.supabase.client
            .from('companies')
            .select('is_verified, verified_at')
            .eq('user_id', user.id)
            .single();

        if (!error && data) {
            if (data.is_verified && (!companyProfile?.is_verified)) {
                // Update localStorage
                const profile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
                profile.is_verified = true;
                profile.verified_at = data.verified_at;
                localStorage.setItem('companyProfile', JSON.stringify(profile));
                
                // Update companyProfile
                if (companyProfile) {
                    companyProfile.is_verified = true;
                    companyProfile.verified_at = data.verified_at;
                }
                
                updateVerificationStatus();
                showAlert('🎉 Your company has been verified!', 'success');
            }
        }

        // Also check localStorage for verification status
        const verificationRequests = JSON.parse(localStorage.getItem('verificationRequests') || '[]');
        const userEmail = companyProfile?.email || companyProfile?.company_email || localStorage.getItem('companyEmail');
        
        const approvedRequest = verificationRequests.find(r => 
            r.company_email === userEmail && r.status === 'approved'
        );

        if (approvedRequest && (!companyProfile?.is_verified)) {
            const profile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
            profile.is_verified = true;
            profile.verified_at = approvedRequest.reviewed_at || new Date().toISOString();
            localStorage.setItem('companyProfile', JSON.stringify(profile));
            
            if (companyProfile) {
                companyProfile.is_verified = true;
            }
            
            updateVerificationStatus();
            showAlert('🎉 Your company has been verified!', 'success');
            
            // Remove from pending requests
            const updatedRequests = verificationRequests.filter(r => r.id !== approvedRequest.id);
            localStorage.setItem('verificationRequests', JSON.stringify(updatedRequests));
        }

    } catch (error) {
        console.error('Error checking verification status:', error);
    }
}

/**
 * Request verification
 */
window.requestVerification = async function() {
    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();
        
        // Get complete profile data from form
        const profileData = {
            company_name: document.getElementById('companyNameInput')?.value || companyProfile?.name || companyProfile?.company_name,
            company_email: document.getElementById('companyEmail')?.value || companyProfile?.email || companyProfile?.company_email,
            phone: document.getElementById('companyPhone')?.value || companyProfile?.phone,
            address: document.getElementById('companyAddress')?.value || companyProfile?.address,
            website_url: document.getElementById('companyWebsite')?.value || companyProfile?.website || companyProfile?.website_url,
            company_description: document.getElementById('companyDescription')?.value || companyProfile?.description || companyProfile?.company_description,
            industry: document.getElementById('industry')?.value || companyProfile?.industry,
            gst_number: document.getElementById('gstNumber')?.value || companyProfile?.gst_number,
            registration_number: document.getElementById('registrationNumber')?.value || companyProfile?.registration_number,
            pan_number: document.getElementById('panNumber')?.value || companyProfile?.pan_number,
            government_id: document.getElementById('governmentId')?.value || companyProfile?.government_id,
            logo: companyLogo || companyProfile?.logo_url || companyProfile?.logo
        };

        // Try Supabase first
        const { error } = await window.supabase.client
            .from('verification_requests')
            .insert([{
                company_id: user.id,
                company_name: profileData.company_name,
                company_email: profileData.company_email,
                status: 'pending',
                requested_at: new Date().toISOString(),
                profile: profileData
            }]);

        if (error) {
            // If Supabase fails, save to localStorage
            const verificationRequests = JSON.parse(localStorage.getItem('verificationRequests') || '[]');
            
            const existingRequest = verificationRequests.find(r => 
                r.company_email === profileData.company_email && r.status === 'pending'
            );

            if (existingRequest) {
                showAlert('Verification request already pending', 'info');
                return;
            }

            verificationRequests.push({
                id: 'req_' + Date.now(),
                company_id: user.id,
                company_name: profileData.company_name,
                company_email: profileData.company_email,
                status: 'pending',
                requested_at: new Date().toISOString(),
                profile: profileData
            });

            localStorage.setItem('verificationRequests', JSON.stringify(verificationRequests));
        }
        
        showAlert('Verification request sent to admin!', 'success');
        const verifyBtn = document.getElementById('verifyNowBtn');
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-clock"></i> Request Sent';
        }
        
    } catch (error) {
        console.error('Error requesting verification:', error);
        showAlert('Error sending verification request', 'danger');
    }
};

/**
 * Load company statistics
 */
async function loadCompanyStats() {
    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();

        // Get active jobs
        const { data: jobs, error: jobsError } = await window.supabase.client
            .from('job_posts')
            .select('*')
            .eq('company_id', user.id);

        if (jobsError) throw jobsError;
        
        companyStats.totalJobs = jobs?.length || 0;
        companyStats.activeJobs = jobs?.filter(j => j.status === 'active').length || 0;

        // Get applications
        const { data: applications, error: appsError } = await window.supabase.client
            .from('job_applications')
            .select('*')
            .eq('company_id', user.id);

        if (appsError) throw appsError;
        
        companyStats.totalApplications = applications?.length || 0;
        companyStats.shortlisted = applications?.filter(a => a.status === 'shortlisted').length || 0;
        companyStats.interviews = applications?.filter(a => a.status === 'interview').length || 0;
        companyStats.selected = applications?.filter(a => a.status === 'selected').length || 0;
        companyStats.rejected = applications?.filter(a => a.status === 'rejected').length || 0;

        updateCompanyStatsUI();

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Update company statistics UI
 */
function updateCompanyStatsUI() {
    const elements = {
        'totalJobs': companyStats.totalJobs,
        'totalApplications': companyStats.totalApplications,
        'shortlistedCount': companyStats.shortlisted,
        'interviewCount': companyStats.interviews,
        'selectedCount': companyStats.selected,
        'rejectedCount': companyStats.rejected,
        'pendingCount': (companyStats.totalApplications || 0) - 
                        ((companyStats.shortlisted || 0) + 
                         (companyStats.interviews || 0) + 
                         (companyStats.selected || 0) + 
                         (companyStats.rejected || 0))
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id] || '0';
        }
    });
}

/**
 * Load company jobs
 */
async function loadCompanyJobs() {
    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();

        const { data, error } = await window.supabase.client
            .from('job_posts')
            .select('*')
            .eq('company_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        companyJobs = data || [];
        displayCompanyJobs();

    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

/**
 * Display company jobs
 */
function displayCompanyJobs() {
    const container = document.getElementById('jobsList');
    if (!container) return;

    if (!companyJobs || companyJobs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i><p>No jobs posted yet</p></div>';
        return;
    }

    container.innerHTML = companyJobs.map(job => {
        const appCount = companyApplications.filter(a => a.job_id === job.id).length;
        
        return `
            <div class="job-card" data-id="${job.id}">
                <div class="job-header">
                    <h4>${job.title}</h4>
                    <span class="status-badge ${job.status === 'active' ? 'status-verified' : 'status-pending'}">${job.status}</span>
                </div>
                
                <div class="job-details">
                    <span><i class="fas fa-clock"></i> ${job.type}</span>
                    <span><i class="fas fa-money-bill"></i> ${job.salary}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                    <span><i class="fas fa-users"></i> ${appCount} applicants</span>
                </div>
                
                <div class="job-description">
                    <p>${job.description?.substring(0, 150) || ''}${job.description?.length > 150 ? '...' : ''}</p>
                </div>
                
                <div class="job-skills">
                    ${job.skills?.map(skill => `<span class="skill-tag">${skill}</span>`).join('') || ''}
                </div>
                
                <div class="job-actions">
                    <button class="action-btn btn-view" onclick="viewJobDetails('${job.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="action-btn btn-edit" onclick="editJob('${job.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn btn-reject" onclick="deleteJob('${job.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Load company applications
 */
async function loadCompanyApplications() {
    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();

        const { data, error } = await window.supabase.client
            .from('job_applications')
            .select(`
                *,
                students:student_id (
                    name,
                    email,
                    phone,
                    location,
                    skills,
                    experience,
                    education,
                    resume_url,
                    profile_picture_url
                ),
                jobs:job_id (
                    title,
                    type,
                    location
                )
            `)
            .eq('company_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        companyApplications = data || [];
        displayRecentApplications();
        displayAllApplications();

    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

/**
 * Display recent applications
 */
function displayRecentApplications() {
    const tbody = document.getElementById('recentApplicationsTable');
    if (!tbody) return;

    if (!companyApplications || companyApplications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No applications yet</td></tr>';
        return;
    }

    tbody.innerHTML = companyApplications.slice(0, 5).map(app => {
        const isNew = !app.viewed && app.status === 'pending';
        const daysLeft = getDaysLeft(app.created_at);
        
        return `
            <tr onclick="viewApplication('${app.id}')" style="${isNew ? 'background: #fff3cd;' : ''}">
                <td>
                    <strong>${app.students?.name || 'Unknown'}</strong>
                    ${isNew ? '<span class="status-badge status-pending" style="margin-left: 10px;">New</span>' : ''}
                </td>
                <td>${app.jobs?.title || 'N/A'}</td>
                <td>${new Date(app.created_at).toLocaleDateString()}</td>
                <td>
                    ${app.status === 'pending' ? 
                        `<span class="days-left ${daysLeft.class}">${daysLeft.text}</span>` : 
                        '-'}
                </td>
                <td>
                    <span class="status-badge status-${app.status}">${getStatusText(app.status)}</span>
                </td>
                <td onclick="event.stopPropagation()">
                    <button class="action-btn btn-view" onclick="viewApplication('${app.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Display all applications with filter
 */
function displayAllApplications() {
    const search = document.getElementById('searchApplications')?.value.toLowerCase() || '';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    
    let filtered = companyApplications;
    
    if (search) {
        filtered = filtered.filter(app => 
            app.students?.name?.toLowerCase().includes(search) ||
            app.jobs?.title?.toLowerCase().includes(search)
        );
    }
    
    if (filterStatus !== 'all') {
        filtered = filtered.filter(app => app.status === filterStatus);
    }

    const tbody = document.getElementById('allApplicationsTable');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No applications found</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(app => {
        const isNew = !app.viewed && app.status === 'pending';
        const daysLeft = getDaysLeft(app.created_at);
        
        return `
            <tr onclick="viewApplication('${app.id}')" style="${isNew ? 'background: #fff3cd;' : ''}">
                <td>
                    <strong>${app.students?.name || 'Unknown'}</strong>
                    ${isNew ? '<span class="status-badge status-pending">New</span>' : ''}
                </td>
                <td>${app.jobs?.title || 'N/A'}</td>
                <td>${new Date(app.created_at).toLocaleDateString()}</td>
                <td>
                    ${app.status === 'pending' ? 
                        `<span class="days-left ${daysLeft.class}">${daysLeft.text}</span>` : 
                        '-'}
                </td>
                <td>
                    ${app.students?.resume_url ? 
                        `<button class="action-btn btn-resume" onclick="event.stopPropagation(); viewResume('${app.students.resume_url}')">
                            <i class="fas fa-file-pdf"></i> Resume
                        </button>` : 
                        'No resume'}
                </td>
                <td><span class="status-badge status-${app.status}">${getStatusText(app.status)}</span></td>
                <td onclick="event.stopPropagation()">
                    <div class="action-group">
                        <button class="action-btn btn-view" onclick="viewApplication('${app.id}')">
                            <i class="fas fa-user"></i>
                        </button>
                        ${app.status === 'pending' ? `
                            <button class="action-btn btn-approve" onclick="shortlistApplication('${app.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${app.status === 'shortlisted' ? `
                            <button class="action-btn btn-interview" onclick="openInterviewModal('${app.id}')">
                                <i class="fas fa-calendar"></i>
                            </button>
                        ` : ''}
                        ${app.status === 'interview' ? `
                            <button class="action-btn btn-select" onclick="selectApplication('${app.id}')">
                                <i class="fas fa-trophy"></i>
                            </button>
                        ` : ''}
                        ${app.status !== 'rejected' && app.status !== 'selected' ? `
                            <button class="action-btn btn-reject" onclick="openRejectModal('${app.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get days left for application
 */
function getDaysLeft(createdAt) {
    const applied = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const daysPassed = Math.floor((now - applied) / (1000 * 60 * 60 * 24));
    const daysLeft = 7 - daysPassed;
    
    if (daysLeft > 3) {
        return { class: 'days-safe', text: `${daysLeft} days left` };
    } else if (daysLeft > 1) {
        return { class: 'days-warning', text: `⚠️ ${daysLeft} days left` };
    } else if (daysLeft === 1) {
        return { class: 'days-urgent', text: '🚨 Last day!' };
    } else if (daysLeft === 0) {
        return { class: 'days-urgent', text: '⏰ Rejects today' };
    } else {
        return { class: 'days-urgent', text: '❌ Overdue' };
    }
}

/**
 * Get status text
 */
function getStatusText(status) {
    const statusMap = {
        'pending': 'Applied',
        'shortlisted': 'Shortlisted ⭐',
        'interview': 'Interview 📅',
        'selected': 'Selected 🎉',
        'rejected': 'Rejected ❌'
    };
    return statusMap[status] || status;
}

/**
 * Post new job
 */
window.postJob = async function(event) {
    event.preventDefault();

    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();

        const jobData = {
            company_id: user.id,
            company_name: companyProfile?.name || companyProfile?.company_name || 'Company',
            company_logo: companyProfile?.logo_url || companyProfile?.logo || '',
            logo_url: companyProfile?.logo_url || companyProfile?.logo || '',
            title: document.getElementById('jobTitle').value,
            type: document.getElementById('jobType').value,
            experience: document.getElementById('experience').value,
            salary: document.getElementById('salary').value,
            location: document.getElementById('location').value,
            description: document.getElementById('description').value,
            skills: document.getElementById('skills').value.split(',').map(s => s.trim()),
            status: 'active',
            created_at: new Date().toISOString()
        };

        const { error } = await window.supabase.client
            .from('job_posts')
            .insert([jobData]);

        if (error) throw error;

        showAlert('Job posted successfully!', 'success');
        document.getElementById('postJobForm').reset();
        
        await loadCompanyJobs();
        await loadCompanyStats();
        
        switchTab('dashboard');

    } catch (error) {
        console.error('Error posting job:', error);
        showAlert('Error posting job', 'danger');
    }
};

/**
 * Update company profile
 */
window.updateCompanyProfile = async function(event) {
    event.preventDefault();

    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();

        const profileData = {
            name: document.getElementById('companyNameInput').value,
            email: document.getElementById('companyEmail').value,
            phone: document.getElementById('companyPhone').value,
            address: document.getElementById('companyAddress').value,
            website: document.getElementById('companyWebsite').value,
            description: document.getElementById('companyDescription').value,
            industry: document.getElementById('industry').value,
            gst_number: document.getElementById('gstNumber').value,
            registration_number: document.getElementById('registrationNumber').value,
            pan_number: document.getElementById('panNumber').value,
            government_id: document.getElementById('governmentId').value,
            updated_at: new Date().toISOString()
        };

        // Handle logo upload
        if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:')) {
            // Convert base64 to file and upload
            const logoFile = await base64ToFile(companyLogo, 'logo.png');
            const logoUrl = await uploadLogo(logoFile);
            profileData.logo_url = logoUrl;
        } else if (companyLogo) {
            profileData.logo_url = companyLogo;
        }

        const { error } = await window.supabase.client
            .from('companies')
            .update(profileData)
            .eq('user_id', user.id);

        if (error) {
            // If Supabase fails, save to localStorage
            const existingProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
            const updatedProfile = { ...existingProfile, ...profileData };
            if (companyLogo) updatedProfile.logo = companyLogo;
            localStorage.setItem('companyProfile', JSON.stringify(updatedProfile));
            companyProfile = updatedProfile;
        } else {
            // Update localStorage as well
            const existingProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
            const updatedProfile = { ...existingProfile, ...profileData };
            if (companyLogo) updatedProfile.logo = companyLogo;
            localStorage.setItem('companyProfile', JSON.stringify(updatedProfile));
            await loadCompanyProfile();
        }

        showAlert('Profile updated successfully!', 'success');

    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('Error updating profile', 'danger');
    }
};

/**
 * Convert base64 to file
 */
function base64ToFile(base64, filename) {
    return new Promise((resolve) => {
        const arr = base64.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        resolve(new File([u8arr], filename, { type: mime }));
    });
}

/**
 * Upload company logo
 */
async function uploadLogo(file) {
    try {
        const { data: { user } } = await window.supabase.client.auth.getUser();
        
        const fileExt = file.name.split('.').pop();
        const fileName = `company-${user.id}-${Date.now()}.${fileExt}`;
        
        const { error } = await window.supabase.storage
            .from('company-logos')
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = window.supabase.storage
            .from('company-logos')
            .getPublicUrl(fileName);

        return publicUrl;

    } catch (error) {
        console.error('Error uploading logo:', error);
        throw error;
    }
}

/**
 * View application details
 */
window.viewApplication = async function(appId) {
    const app = companyApplications.find(a => a.id === appId);
    if (!app) return;

    // Mark as viewed
    if (!app.viewed) {
        await window.supabase.client
            .from('job_applications')
            .update({ viewed: true, viewed_at: new Date().toISOString() })
            .eq('id', appId);
        
        app.viewed = true;
        displayAllApplications();
    }

    const student = app.students || {};
    
    const content = `
        <div class="application-detail">
            <div class="detail-header">
                ${student.profile_picture_url ? 
                    `<img src="${student.profile_picture_url}" class="profile-pic-large">` : 
                    '<i class="fas fa-user-circle" style="font-size: 80px; color: #667eea;"></i>'}
                <h2>${student.name || 'Unknown'}</h2>
                <p><i class="fas fa-envelope"></i> ${student.email || 'N/A'}</p>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-phone"></i> Contact</h4>
                <p><strong>Phone:</strong> ${student.phone || 'N/A'}</p>
                <p><strong>Location:</strong> ${student.location || 'N/A'}</p>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-briefcase"></i> Job Details</h4>
                <p><strong>Position:</strong> ${app.jobs?.title || 'N/A'}</p>
                <p><strong>Applied:</strong> ${new Date(app.created_at).toLocaleString()}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${app.status}">${getStatusText(app.status)}</span></p>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-graduation-cap"></i> Education</h4>
                <p>${student.education || 'Not provided'}</p>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-code"></i> Skills</h4>
                <div class="skills-list">
                    ${student.skills?.map(skill => `<span class="skill-tag">${skill}</span>`).join('') || 'No skills listed'}
                </div>
            </div>

            <div class="detail-section">
                <h4><i class="fas fa-star"></i> Experience</h4>
                <p>${student.experience || 'Fresher'}</p>
            </div>

            ${student.resume_url ? `
                <div class="detail-section">
                    <h4><i class="fas fa-file-pdf"></i> Resume</h4>
                    <button class="action-btn btn-resume" onclick="viewResume('${student.resume_url}')">
                        <i class="fas fa-eye"></i> View Resume
                    </button>
                    <a href="${student.resume_url}" download class="action-btn btn-view" style="background: #28a745;">
                        <i class="fas fa-download"></i> Download
                    </a>
                </div>
            ` : ''}

            <div class="detail-actions">
                ${app.status === 'pending' ? `
                    <button class="action-btn btn-approve" onclick="shortlistApplication('${app.id}')">
                        <i class="fas fa-check"></i> Shortlist
                    </button>
                ` : ''}
                ${app.status === 'shortlisted' ? `
                    <button class="action-btn btn-interview" onclick="openInterviewModal('${app.id}')">
                        <i class="fas fa-calendar"></i> Schedule Interview
                    </button>
                ` : ''}
                ${app.status === 'interview' ? `
                    <button class="action-btn btn-select" onclick="selectApplication('${app.id}')">
                        <i class="fas fa-trophy"></i> Select Candidate
                    </button>
                ` : ''}
                ${app.status !== 'rejected' && app.status !== 'selected' ? `
                    <button class="action-btn btn-reject" onclick="openRejectModal('${app.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                ` : ''}
                <button class="action-btn btn-view" onclick="closeModal('applicationDetailModal')">
                    Close
                </button>
            </div>
        </div>
    `;

    document.getElementById('applicationDetailContent').innerHTML = content;
    showModal('applicationDetailModal');
};

/**
 * Shortlist application
 */
window.shortlistApplication = async function(appId) {
    try {
        const { error } = await window.supabase.client
            .from('job_applications')
            .update({ 
                status: 'shortlisted',
                shortlisted_at: new Date().toISOString()
            })
            .eq('id', appId);

        if (error) throw error;

        showAlert('Candidate shortlisted!', 'success');
        await loadCompanyApplications();
        await loadCompanyStats();
        closeModal('applicationDetailModal');

    } catch (error) {
        console.error('Error shortlisting:', error);
        showAlert('Error shortlisting candidate', 'danger');
    }
};

/**
 * Schedule interview
 */
window.scheduleInterview = async function(event) {
    event.preventDefault();

    const appId = document.getElementById('interviewAppId').value;
    const interviewData = {
        interview_date: document.getElementById('interviewDate').value,
        interview_time: document.getElementById('interviewTime').value,
        video_link: document.getElementById('videoLink').value,
        instructions: document.getElementById('interviewInstructions').value
    };

    try {
        const { error } = await window.supabase.client
            .from('job_applications')
            .update({ 
                status: 'interview',
                interview_details: interviewData,
                interview_scheduled_at: new Date().toISOString()
            })
            .eq('id', appId);

        if (error) throw error;

        showAlert('Interview scheduled successfully!', 'success');
        await loadCompanyApplications();
        await loadCompanyStats();
        closeModal('interviewModal');

    } catch (error) {
        console.error('Error scheduling interview:', error);
        showAlert('Error scheduling interview', 'danger');
    }
};

/**
 * Select application
 */
window.selectApplication = async function(appId) {
    if (!confirm('Are you sure you want to select this candidate?')) return;

    try {
        const { error } = await window.supabase.client
            .from('job_applications')
            .update({ 
                status: 'selected',
                selected_at: new Date().toISOString()
            })
            .eq('id', appId);

        if (error) throw error;

        showAlert('Candidate selected!', 'success');
        await loadCompanyApplications();
        await loadCompanyStats();
        closeModal('applicationDetailModal');

    } catch (error) {
        console.error('Error selecting candidate:', error);
        showAlert('Error selecting candidate', 'danger');
    }
};

/**
 * Reject application
 */
window.rejectApplication = async function(event) {
    event.preventDefault();

    const appId = document.getElementById('rejectAppId').value;

    try {
        const { error } = await window.supabase.client
            .from('job_applications')
            .update({ 
                status: 'rejected',
                reject_reason: document.getElementById('rejectReason').value,
                reject_feedback: document.getElementById('rejectFeedback').value,
                rejected_at: new Date().toISOString()
            })
            .eq('id', appId);

        if (error) throw error;

        showAlert('Application rejected', 'info');
        await loadCompanyApplications();
        await loadCompanyStats();
        closeModal('rejectModal');

    } catch (error) {
        console.error('Error rejecting application:', error);
        showAlert('Error rejecting application', 'danger');
    }
};

/**
 * View resume
 */
window.viewResume = function(resumeUrl) {
    if (!resumeUrl) {
        showAlert('Resume not available', 'warning');
        return;
    }

    const content = `
        <div class="resume-viewer">
            <div class="download-section">
                <a href="${resumeUrl}" download class="download-btn" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);">
                    <i class="fas fa-download"></i> Download Resume
                </a>
                <a href="${resumeUrl}" target="_blank" class="download-btn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-external-link-alt"></i> Open in New Tab
                </a>
            </div>
            <iframe src="https://docs.google.com/viewer?url=${encodeURIComponent(resumeUrl)}&embedded=true" 
                    style="width: 100%; height: 600px; border: 2px solid #667eea; border-radius: 8px;">
            </iframe>
        </div>
    `;

    document.getElementById('resumeContent').innerHTML = content;
    showModal('resumeModal');
};

/**
 * View company profile (fixed - shows company details instead of student)
 */
window.viewCompanyProfile = function() {
    const profile = companyProfile || JSON.parse(localStorage.getItem('companyProfile') || '{}');
    
    const logoHtml = profile.logo_url || profile.logo ? 
        `<img src="${profile.logo_url || profile.logo}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #667eea;">` : 
        '<i class="fas fa-building" style="font-size: 5em; color: #667eea; margin-bottom: 15px;"></i>';
    
    const content = `
        <div style="background: #f8f9ff; padding: 30px; border-radius: 15px;">
            <div style="text-align: center; margin-bottom: 30px;">
                ${logoHtml}
                <h2 style="color: #667eea; margin: 15px 0 10px;">${profile.name || profile.company_name || 'Company Name'}</h2>
                <div style="margin-top: 10px;">
                    <span class="status-badge ${(profile.is_verified || profile.verified) ? 'status-verified' : 'status-warning'}" style="font-size: 14px; padding: 8px 20px;">
                        ${(profile.is_verified || profile.verified) ? '✓ Verified Company' : '⏳ Pending Verification'}
                    </span>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <h4 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-address-card"></i> Basic Information</h4>
                    <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${profile.email || profile.company_email || 'N/A'}</p>
                    <p><strong><i class="fas fa-phone"></i> Phone:</strong> ${profile.phone || 'N/A'}</p>
                    <p><strong><i class="fas fa-map-marker-alt"></i> Address:</strong> ${profile.address || 'N/A'}</p>
                    <p><strong><i class="fas fa-globe"></i> Website:</strong> <a href="${profile.website || profile.website_url}" target="_blank">${profile.website || profile.website_url || 'N/A'}</a></p>
                    <p><strong><i class="fas fa-industry"></i> Industry:</strong> ${profile.industry || 'N/A'}</p>
                </div>
                
                <div class="info-card">
                    <h4 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-file-contract"></i> Government Registration</h4>
                    <p><strong><i class="fas fa-file-invoice"></i> GST Number:</strong> ${profile.gst_number || 'Not provided'}</p>
                    <p><strong><i class="fas fa-qrcode"></i> Registration Number:</strong> ${profile.registration_number || 'Not provided'}</p>
                    <p><strong><i class="fas fa-id-card"></i> PAN Number:</strong> ${profile.pan_number || 'Not provided'}</p>
                    <p><strong><i class="fas fa-passport"></i> Government ID:</strong> ${profile.government_id || 'Not provided'}</p>
                </div>
            </div>

            <div class="info-card" style="margin-top: 20px;">
                <h4 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-align-left"></i> About Company</h4>
                <p style="line-height: 1.8;">${profile.description || profile.company_description || 'No description provided'}</p>
            </div>

            ${(profile.is_verified || profile.verified) ? `
                <div style="margin-top: 20px; padding: 15px; background: #d4edda; border-radius: 8px; text-align: center;">
                    <i class="fas fa-check-circle" style="color: #28a745; font-size: 24px;"></i>
                    <p style="color: #155724; margin-top: 5px;">Verified on ${profile.verified_at ? new Date(profile.verified_at).toLocaleDateString() : 'Recently'}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    // Make sure the modal exists
    let modal = document.getElementById('companyProfileModal');
    if (!modal) {
        // Create modal if it doesn't exist
        modal = document.createElement('div');
        modal.id = 'companyProfileModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('companyProfileModal')">×</button>
                <div class="modal-header"><i class="fas fa-building"></i> Company Profile</div>
                <div class="modal-body" id="companyProfileContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('companyProfileContent').innerHTML = content;
    showModal('companyProfileModal');
};

/**
 * View job details
 */
window.viewJobDetails = function(jobId) {
    const job = companyJobs.find(j => j.id === jobId);
    if (job) {
        const applicantCount = companyApplications.filter(a => a.job_id === jobId).length;
        showAlert(`📋 ${job.title} - ${applicantCount} applicants`, 'info');
    }
};

/**
 * Edit job
 */
window.editJob = function(jobId) {
    const job = companyJobs.find(j => j.id === jobId);
    if (job) {
        // Switch to post job tab and populate form
        switchTab('post-job');
        document.getElementById('jobTitle').value = job.title;
        document.getElementById('jobType').value = job.type;
        document.getElementById('experience').value = job.experience;
        document.getElementById('salary').value = job.salary;
        document.getElementById('location').value = job.location;
        document.getElementById('description').value = job.description;
        document.getElementById('skills').value = job.skills?.join(', ') || '';
        
        showAlert('Edit job and click "Post Job" to update', 'info');
    }
};

/**
 * Delete job
 */
window.deleteJob = function(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    // Filter out the job
    companyJobs = companyJobs.filter(j => j.id !== jobId);
    localStorage.setItem('companyJobs', JSON.stringify(companyJobs));
    
    // Also try to delete from Supabase
    window.supabase.client
        .from('job_posts')
        .delete()
        .eq('id', jobId)
        .then(() => {
            showAlert('Job deleted successfully!', 'success');
            displayCompanyJobs();
            loadCompanyStats();
        })
        .catch(() => {
            // If Supabase fails, at least localStorage is updated
            showAlert('Job deleted from local storage', 'success');
            displayCompanyJobs();
            loadCompanyStats();
        });
};

/**
 * Setup company UI
 */
function setupCompanyUI() {
    // Form submissions
    document.getElementById('postJobForm')?.addEventListener('submit', postJob);
    document.getElementById('profileForm')?.addEventListener('submit', updateCompanyProfile);
    document.getElementById('interviewForm')?.addEventListener('submit', scheduleInterview);
    document.getElementById('rejectForm')?.addEventListener('submit', rejectApplication);
    
    // Verify button
    document.getElementById('verifyNowBtn')?.addEventListener('click', requestVerification);
    
    // Logo upload preview
    document.getElementById('logoUpload')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                companyLogo = evt.target.result;
                document.getElementById('navbarLogo').innerHTML = `<img src="${evt.target.result}" alt="Logo">`;
                document.getElementById('logoPreview').innerHTML = `<img src="${evt.target.result}" alt="Logo">`;
            };
            reader.readAsDataURL(file);
        }
    });
}

/**
 * Setup realtime listeners
 */
function setupRealtimeListeners() {
    // Listen for new applications
    const appsSubscription = window.supabase.client
        .channel('company-applications')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'job_applications' },
            async () => {
                showAlert('New application received!', 'info');
                await loadCompanyApplications();
                await loadCompanyStats();
            }
        )
        .subscribe();

    // Listen for verification status changes
    const verificationSubscription = window.supabase.client
        .channel('company-verification')
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'companies' },
            async () => {
                await loadCompanyProfile();
                showAlert('Company verification status updated!', 'info');
            }
        )
        .subscribe();
}

/**
 * Switch tab
 */
window.switchTab = function(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });

    // Load tab data
    if (tabName === 'applications') {
        displayAllApplications();
    } else if (tabName === 'interviews') {
        displayInterviews();
    } else if (tabName === 'profile') {
        updateProfileForm();
    }
};

/**
 * Display interviews
 */
function displayInterviews() {
    const tbody = document.getElementById('interviewsTable');
    if (!tbody) return;

    const interviews = companyApplications.filter(a => a.status === 'interview');

    if (interviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No interviews scheduled</td></tr>';
        return;
    }

    tbody.innerHTML = interviews.map(app => `
        <tr>
            <td>${app.students?.name || 'Unknown'}</td>
            <td>${app.jobs?.title || 'N/A'}</td>
            <td>${app.interview_details?.interview_date || 'N/A'} at ${app.interview_details?.interview_time || 'N/A'}</td>
            <td>
                <a href="${app.interview_details?.video_link}" target="_blank" class="video-link">
                    Join Meeting
                </a>
            </td>
            <td><span class="status-badge status-interview">Scheduled</span></td>
            <td>
                <button class="action-btn btn-view" onclick="viewApplication('${app.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn btn-select" onclick="selectApplication('${app.id}')">
                    <i class="fas fa-trophy"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Filter applications
 */
window.filterApplications = function() {
    displayAllApplications();
};

/**
 * Open interview modal
 */
window.openInterviewModal = function(appId) {
    document.getElementById('interviewAppId').value = appId;
    showModal('interviewModal');
};

/**
 * Open reject modal
 */
window.openRejectModal = function(appId) {
    document.getElementById('rejectAppId').value = appId;
    showModal('rejectModal');
};

/**
 * Show alert/modal
 */
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `toast toast-${type}`;
    alertDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

/**
 * Show modal
 */
window.showModal = function(modalId) {
    document.getElementById(modalId).classList.add('show');
};

/**
 * Close modal
 */
window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('show');
};

/**
 * Logout
 */
window.logout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        showAlert('👋 Logging out...', 'info');
        
        try {
            await window.authService.signOut();
            
            // Clear company data from localStorage but keep platform data
            localStorage.removeItem('companyProfile');
            
            setTimeout(() => {
                window.location.href = 'login.html?logout=true&t=' + Date.now();
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = 'login.html?logout=true&t=' + Date.now();
        }
    }
};

// Auto-run check verification status on page load
setTimeout(checkVerificationStatus, 2000);