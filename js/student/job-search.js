/**
 * Job Search Logic - Fixed with Supabase only
 */

let allJobs = [];
let currentJobId = null;
let studentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.authService) {
    if (!window.authService.requireRole('student')) return;
    await initJobSearch();
  }
});

/**
 * Initialize job search
 */
async function initJobSearch() {
  try {
    const user = window.authService.getCurrentUser();
    
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Load student profile
    await loadStudentProfile(user.id);
    
    // Load initial jobs
    await searchJobs();
    
    // Setup event listeners
    setupEventListeners();

  } catch (error) {
    console.error('Job search initialization error:', error);
    showAlert('Error loading jobs', 'danger');
  }
}

/**
 * Load student profile
 */
async function loadStudentProfile(userId) {
  try {
    const { data, error } = await window.supabase.db.select('student_profiles', { user_id: userId });
    
    if (!error && data && data.length > 0) {
      studentProfile = data[0];
    }
  } catch (error) {
    console.error('Load profile error:', error);
  }
}

/**
 * Search jobs
 */
async function searchJobs() {
  const searchInput = document.getElementById('searchInput')?.value || '';
  const locationInput = document.getElementById('locationInput')?.value || '';
  const jobType = document.getElementById('jobTypeSelect')?.value || '';

  try {
    showLoading(document.querySelector('.search-btn'));
    
    let query = window.supabase.client
      .from('job_posts')
      .select(`
        *,
        company_profiles (
          company_name,
          company_logo
        )
      `)
      .eq('status', 'active');

    if (searchInput) {
      query = query.ilike('title', `%${searchInput}%`);
    }

    if (locationInput) {
      query = query.ilike('location', `%${locationInput}%`);
    }

    if (jobType) {
      query = query.eq('type', jobType);
    }

    const { data: jobs, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    allJobs = jobs || [];
    displayJobs(allJobs);

  } catch (error) {
    console.error('Search error:', error);
    showJobsMessage('Error loading jobs');
  } finally {
    hideLoading(document.querySelector('.search-btn'));
  }
}

/**
 * Display jobs
 */
function displayJobs(jobs) {
  const jobsList = document.getElementById('jobsList');
  
  if (!jobsList) return;

  if (jobs.length === 0) {
    jobsList.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No jobs found</p><button class="btn btn-primary" onclick="resetSearch()">Clear Filters</button></div>';
    return;
  }

  jobsList.innerHTML = jobs.map(job => `
    <div class="job-card" onclick="viewJobDetails('${job.id}')">
      <div class="job-header">
        <div>
          <div class="job-title">${job.title}</div>
          <div class="job-company">${job.company_profiles?.company_name || 'Unknown Company'}</div>
        </div>
        <div>
          <span class="match-score">${calculateMatchPercentage(job)}% Match</span>
        </div>
      </div>

      <div class="job-meta">
        <div class="meta-item"><i class="fas fa-map-marker-alt"></i> ${job.location}</div>
        <div class="meta-item"><i class="fas fa-clock"></i> ${job.type}</div>
        <div class="meta-item"><i class="fas fa-money-bill"></i> ${job.salary}</div>
        <div class="meta-item"><i class="fas fa-briefcase"></i> ${job.experience || 0}+ years</div>
      </div>

      <div class="job-description">
        ${job.description?.substring(0, 150)}...
      </div>

      <div class="job-skills">
        ${job.skills?.slice(0, 5).map(skill => 
          `<span class="skill-tag">${skill}</span>`
        ).join('')}
      </div>

      <div class="job-footer">
        <span class="posted-date"><i class="far fa-clock"></i> ${getTimeAgo(job.created_at)}</span>
        <button class="apply-btn" onclick="event.stopPropagation(); openApplicationModal('${job.id}')">
          Apply Now
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Get time ago string
 */
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

/**
 * Calculate match percentage based on skills
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
 * Reset search filters
 */
function resetSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('locationInput').value = '';
  document.getElementById('jobTypeSelect').value = '';
  searchJobs();
}

/**
 * Open application modal
 */
function openApplicationModal(jobId) {
  event.stopPropagation();
  currentJobId = jobId;
  
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;
  
  const modal = document.getElementById('applicationModal');
  if (!modal) return;
  
  // Set job details in modal
  document.getElementById('modalJobTitle').textContent = job.title;
  document.getElementById('modalCompanyName').textContent = job.company_profiles?.company_name || 'Company';
  
  modal.classList.add('show');
}

/**
 * Close modal
 */
function closeModal() {
  const modal = document.getElementById('applicationModal');
  if (modal) {
    modal.classList.remove('show');
    document.getElementById('coverLetter').value = '';
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchJobs);
  }

  const inputs = document.querySelectorAll('#searchInput, #locationInput, #jobTypeSelect');
  inputs.forEach(input => {
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchJobs();
    });
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('applicationModal');
    if (e.target === modal) {
      closeModal();
    }
  });
}

/**
 * Submit application
 */
window.submitApplication = async function() {
  if (!studentProfile || !currentJobId) {
    showAlert('Error: Invalid request', 'danger');
    return;
  }

  const coverLetter = document.getElementById('coverLetter')?.value || '';

  try {
    const btn = event.target;
    showLoading(btn, 'Submitting...');

    const job = allJobs.find(j => j.id === currentJobId);
    
    // Check if already applied
    const { data: existing } = await window.supabase.db.select(
      'job_applications',
      { 
        student_id: studentProfile.id,
        job_id: currentJobId
      }
    );

    if (existing && existing.length > 0) {
      showAlert('You have already applied for this job', 'warning');
      closeModal();
      return;
    }

    // Create application
    const { error } = await window.supabase.db.insert('job_applications', {
      student_id: studentProfile.id,
      job_id: currentJobId,
      company_id: job.company_id,
      job_title: job.title,
      company_name: job.company_profiles?.company_name,
      student_name: studentProfile.full_name,
      student_email: studentProfile.email,
      student_phone: studentProfile.phone,
      resume_url: studentProfile.resume_url,
      cover_letter: coverLetter,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    showAlert('✅ Application submitted successfully!', 'success');
    closeModal();

  } catch (error) {
    console.error('Application error:', error);
    showAlert('❌ Error submitting application: ' + error.message, 'danger');
  } finally {
    hideLoading(event.target);
  }
};

/**
 * View job details
 */
window.viewJobDetails = function(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h2>${job.title}</h2>
        <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p><strong>Company:</strong> ${job.company_profiles?.company_name || 'Unknown'}</p>
        <p><strong>Location:</strong> ${job.location}</p>
        <p><strong>Type:</strong> ${job.type}</p>
        <p><strong>Salary:</strong> ${job.salary}</p>
        <p><strong>Experience:</strong> ${job.experience || 0}+ years</p>
        
        <h4 style="margin: 20px 0 10px;">Description</h4>
        <p>${job.description}</p>
        
        <h4 style="margin: 20px 0 10px;">Required Skills</h4>
        <div class="skills-list">
          ${job.skills?.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
        
        <button class="btn btn-primary" style="width: 100%; margin-top: 20px;" 
                onclick="this.closest('.modal').remove(); openApplicationModal('${job.id}')">
          Apply Now
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
};

/**
 * Show message in jobs list
 */
function showJobsMessage(message) {
  const jobsList = document.getElementById('jobsList');
  if (jobsList) {
    jobsList.innerHTML = `<div class="empty-state"><i class="fas fa-info-circle"></i><p>${message}</p></div>`;
  }
}

/**
 * Show loading state
 */
function showLoading(btn) {
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
  }
}

/**
 * Hide loading state
 */
function hideLoading(btn) {
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> Search';
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

// Make functions globally available
window.searchJobs = searchJobs;
window.openApplicationModal = openApplicationModal;
window.closeModal = closeModal;
window.resetSearch = resetSearch;