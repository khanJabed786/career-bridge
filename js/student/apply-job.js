/**
 * Apply Job Logic - Fixed with Supabase only
 */

let selectedJobId = null;
let studentProfile = null;
let jobDetails = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.authService) {
    if (!window.authService.requireRole('student')) return;
    await initApplyJob();
  }
});

/**
 * Initialize apply job page
 */
async function initApplyJob() {
  try {
    const user = window.authService.getCurrentUser();
    
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Get job ID from URL
    const jobId = getUrlParameter('id');
    if (!jobId) {
      showAlert('No job selected', 'danger');
      setTimeout(() => {
        window.location.href = 'job-search.html';
      }, 2000);
      return;
    }

    selectedJobId = jobId;

    // Load student profile
    await loadStudentProfile(user.id);

    // Load job details
    await loadJobDetails(jobId);

    // Setup form
    setupApplicationForm();

  } catch (error) {
    console.error('Apply job initialization error:', error);
    showAlert('Error loading page', 'danger');
  }
}

/**
 * Load student profile
 */
async function loadStudentProfile(userId) {
  try {
    const { data, error } = await window.supabase.db.select('student_profiles', { user_id: userId });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      studentProfile = data[0];
      populateStudentInfo();
    } else {
      showAlert('Student profile not found', 'danger');
    }

  } catch (error) {
    console.error('Load profile error:', error);
    showAlert('Error loading profile', 'danger');
  }
}

/**
 * Populate student info in form
 */
function populateStudentInfo() {
  if (!studentProfile) return;

  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const nameInput = document.getElementById('fullName');

  if (emailInput) emailInput.value = studentProfile.email || '';
  if (phoneInput) phoneInput.value = studentProfile.phone || '';
  if (nameInput) nameInput.value = studentProfile.full_name || '';
}

/**
 * Load job details
 */
async function loadJobDetails(jobId) {
  try {
    const { data, error } = await window.supabase.client
      .from('job_posts')
      .select(`
        *,
        company_profiles (
          company_name,
          company_logo,
          email,
          phone,
          location
        )
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;

    if (data) {
      jobDetails = data;
      displayJobDetails(data);
    } else {
      showAlert('Job not found', 'danger');
    }

  } catch (error) {
    console.error('Load job error:', error);
    showAlert('Job not found', 'danger');
  }
}

/**
 * Display job details
 */
function displayJobDetails(job) {
  const container = document.getElementById('jobDetails');
  if (!container) return;

  const company = job.company_profiles || {};

  container.innerHTML = `
    <div class="job-detail-card">
      <div class="job-header-large">
        ${company.company_logo ? 
          `<img src="${company.company_logo}" alt="${company.company_name}" class="company-logo">` : 
          '<div class="company-logo-placeholder"><i class="fas fa-building"></i></div>'}
        <div>
          <h2>${job.title}</h2>
          <p class="company-name">${company.company_name || 'Company'}</p>
        </div>
        <div class="match-score-badge">
          <span class="match-score">${calculateMatchPercentage(job)}%</span>
          <span>Match</span>
        </div>
      </div>

      <div class="job-info-grid">
        <div class="info-item">
          <i class="fas fa-map-marker-alt"></i>
          <div>
            <span class="label">Location</span>
            <span class="value">${job.location}</span>
          </div>
        </div>
        <div class="info-item">
          <i class="fas fa-clock"></i>
          <div>
            <span class="label">Job Type</span>
            <span class="value">${job.type}</span>
          </div>
        </div>
        <div class="info-item">
          <i class="fas fa-money-bill"></i>
          <div>
            <span class="label">Salary</span>
            <span class="value">${job.salary}</span>
          </div>
        </div>
        <div class="info-item">
          <i class="fas fa-briefcase"></i>
          <div>
            <span class="label">Experience</span>
            <span class="value">${job.experience || 0}+ years</span>
          </div>
        </div>
      </div>

      <div class="job-section">
        <h3>Job Description</h3>
        <p class="description-text">${job.description}</p>
      </div>

      <div class="job-section">
        <h3>Required Skills</h3>
        <div class="skills-list">
          ${job.skills?.map(skill => `
            <span class="skill-tag ${studentProfile?.current_skills?.includes(skill) ? 'matched' : ''}">
              ${skill}
              ${studentProfile?.current_skills?.includes(skill) ? ' ✓' : ''}
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Calculate match percentage
 */
function calculateMatchPercentage(job) {
  if (!studentProfile?.current_skills || !job.skills) return 0;
  
  const studentSkills = studentProfile.current_skills.map(s => s.toLowerCase());
  const jobSkills = job.skills.map(s => s.toLowerCase());
  
  if (jobSkills.length === 0) return 0;
  
  const matches = jobSkills.filter(skill => studentSkills.includes(skill)).length;
  return Math.round((matches / jobSkills.length) * 100);
}

/**
 * Setup application form
 */
function setupApplicationForm() {
  const form = document.getElementById('applicationForm');
  if (form) {
    form.addEventListener('submit', submitApplication);
  }

  // Resume upload preview
  const resumeInput = document.getElementById('resumeFile');
  if (resumeInput) {
    resumeInput.addEventListener('change', handleResumeUpload);
  }
}

/**
 * Handle resume upload to Cloudinary
 */
async function handleResumeUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.includes('pdf') && !file.type.includes('document')) {
    showAlert('Please upload a PDF or Word document', 'warning');
    event.target.value = '';
    return;
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showAlert('File size must be less than 5MB', 'warning');
    event.target.value = '';
    return;
  }

  try {
    showAlert('Uploading resume...', 'info');
    
    const resumeUrl = await window.supabase.storage.uploadResume(file);
    
    // Update student profile with resume URL
    if (studentProfile) {
      await window.supabase.db.update(
        'student_profiles',
        { resume_url: resumeUrl },
        studentProfile.id
      );
      
      studentProfile.resume_url = resumeUrl;
    }
    
    showAlert('✅ Resume uploaded successfully!', 'success');
    
  } catch (error) {
    console.error('Resume upload error:', error);
    showAlert('❌ Error uploading resume', 'danger');
    event.target.value = '';
  }
}

/**
 * Submit application
 */
async function submitApplication(e) {
  e.preventDefault();

  if (!studentProfile || !selectedJobId || !jobDetails) {
    showAlert('Error: Invalid request', 'danger');
    return;
  }

  // Check if resume exists
  if (!studentProfile.resume_url) {
    showAlert('Please upload your resume first', 'warning');
    return;
  }

  const coverLetter = document.getElementById('coverLetter')?.value || '';

  try {
    const btn = e.target.querySelector('button[type="submit"]');
    showLoading(btn, 'Submitting...');

    // Check if already applied
    const { data: existing } = await window.supabase.db.select(
      'job_applications',
      { 
        student_id: studentProfile.id,
        job_id: selectedJobId
      }
    );

    if (existing && existing.length > 0) {
      showAlert('You have already applied for this job', 'warning');
      setTimeout(() => {
        window.location.href = 'student-dashboard.html';
      }, 2000);
      return;
    }

    // Create application
    const { error } = await window.supabase.db.insert('job_applications', {
      student_id: studentProfile.id,
      job_id: selectedJobId,
      company_id: jobDetails.company_id,
      job_title: jobDetails.title,
      company_name: jobDetails.company_profiles?.company_name,
      student_name: studentProfile.full_name,
      student_email: studentProfile.email,
      student_phone: studentProfile.phone,
      student_skills: studentProfile.current_skills,
      student_education: studentProfile.education,
      student_experience: studentProfile.experience,
      resume_url: studentProfile.resume_url,
      cover_letter: coverLetter,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    // Create notification for student
    await window.supabase.db.insert('notifications', {
      user_id: studentProfile.user_id,
      type: 'application_submitted',
      title: 'Application Submitted',
      message: `Your application for ${jobDetails.title} has been submitted successfully!`,
      created_at: new Date().toISOString()
    });

    showAlert('✅ Application submitted successfully!', 'success');
    
    setTimeout(() => {
      window.location.href = 'student-dashboard.html';
    }, 2000);

  } catch (error) {
    console.error('Application error:', error);
    showAlert('❌ Error submitting application: ' + error.message, 'danger');
  } finally {
    hideLoading(e.target.querySelector('button[type="submit"]'));
  }
}

/**
 * Get URL parameter
 */
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
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
    btn.innerHTML = 'Submit Application';
  }
}

/**
 * Show alert
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