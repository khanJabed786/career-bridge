/**
 * Post Job Logic - Fixed with Supabase only
 */

let companyProfile = null;
let editingJobId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.authService) {
    if (!window.authService.requireRole('company')) return;
    await initPostJob();
  }
});

/**
 * Initialize post job page
 */
async function initPostJob() {
  try {
    const user = window.authService.getCurrentUser();
    
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Load company profile
    await loadCompanyProfile(user.id);
    
    // Check if editing existing job
    const jobId = getUrlParameter('edit');
    if (jobId) {
      await loadJobForEditing(jobId);
    }

    setupPostJobForm();

  } catch (error) {
    console.error('Post job initialization error:', error);
    showAlert('Error loading page', 'danger');
  }
}

/**
 * Load company profile
 */
async function loadCompanyProfile(userId) {
  try {
    const { data, error } = await window.supabase.db.select('company_profiles', { user_id: userId });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      companyProfile = data[0];
    } else {
      showAlert('Company profile not found. Please complete your profile first.', 'warning');
      setTimeout(() => {
        window.location.href = 'company-dashboard.html?tab=profile';
      }, 2000);
    }

  } catch (error) {
    console.error('Load company profile error:', error);
    showAlert('Error loading company profile', 'danger');
  }
}

/**
 * Load job for editing
 */
async function loadJobForEditing(jobId) {
  try {
    const { data, error } = await window.supabase.db.select('job_posts', { id: jobId });
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const job = data[0];
      editingJobId = jobId;
      
      // Populate form
      document.getElementById('jobTitle').value = job.title || '';
      document.getElementById('jobType').value = job.type || '';
      document.getElementById('experience').value = job.experience || '';
      document.getElementById('salary').value = job.salary || '';
      document.getElementById('location').value = job.location || '';
      document.getElementById('description').value = job.description || '';
      document.getElementById('skills').value = job.skills?.join(', ') || '';
      
      document.querySelector('h2').textContent = 'Edit Job';
      document.querySelector('button[type="submit"]').textContent = 'Update Job';
    }

  } catch (error) {
    console.error('Load job error:', error);
    showAlert('Error loading job details', 'danger');
  }
}

/**
 * Setup post job form
 */
function setupPostJobForm() {
  const form = document.getElementById('postJobForm');
  if (form) {
    form.addEventListener('submit', handlePostJob);
  }
}

/**
 * Handle post job form submission
 */
async function handlePostJob(e) {
  e.preventDefault();

  if (!companyProfile) {
    showAlert('Company profile not found', 'danger');
    return;
  }

  // Check if company is verified
  if (!companyProfile.verified) {
    showAlert('Your company needs to be verified before posting jobs. Please wait for admin verification.', 'warning');
    return;
  }

  const jobData = {
    company_id: companyProfile.id,
    company_name: companyProfile.company_name,
    title: document.getElementById('jobTitle')?.value?.trim() || '',
    type: document.getElementById('jobType')?.value || '',
    experience: document.getElementById('experience')?.value || '0',
    salary: document.getElementById('salary')?.value?.trim() || '',
    location: document.getElementById('location')?.value?.trim() || '',
    description: document.getElementById('description')?.value?.trim() || '',
    skills: (document.getElementById('skills')?.value || '').split(',').map(s => s.trim()).filter(s => s),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Validation
  if (!jobData.title) {
    showAlert('Please enter job title', 'danger');
    return;
  }
  if (!jobData.description) {
    showAlert('Please enter job description', 'danger');
    return;
  }
  if (!jobData.location) {
    showAlert('Please enter job location', 'danger');
    return;
  }
  if (jobData.skills.length === 0) {
    showAlert('Please enter at least one skill', 'danger');
    return;
  }

  try {
    const btn = e.target.querySelector('button[type="submit"]');
    showLoading(btn, editingJobId ? 'Updating...' : 'Posting...');

    let error;

    if (editingJobId) {
      // Update existing job
      const { error: updateError } = await window.supabase.db.update(
        'job_posts',
        jobData,
        editingJobId
      );
      error = updateError;
    } else {
      // Insert new job
      const { error: insertError } = await window.supabase.db.insert('job_posts', jobData);
      error = insertError;
    }

    if (error) throw error;

    showAlert(editingJobId ? '✅ Job updated successfully!' : '✅ Job posted successfully!', 'success');
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      window.location.href = 'company-dashboard.html';
    }, 2000);

  } catch (error) {
    console.error('Job post error:', error);
    showAlert('❌ Error: ' + error.message, 'danger');
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
    btn.innerHTML = editingJobId ? 'Update Job' : 'Post Job';
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