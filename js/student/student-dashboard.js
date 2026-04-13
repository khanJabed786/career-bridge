/**
 * Student Dashboard Logic - Fixed with Supabase only
 */

let studentProfile = null;
let studentStats = {};
let studentApplications = [];
let recommendedJobs = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initStudentDashboard();
});

/**
 * Initialize student dashboard
 */
async function initStudentDashboard() {
  try {
    const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
    
    if (userError || !user) {
      window.location.href = 'login.html';
      return;
    }

    // Load student profile
    await loadStudentProfile(user.id);
    
    // Load applications
    await loadStudentApplications();
    
    // Load recommended jobs
    await loadRecommendedJobs();
    
    // Load statistics
    await loadStudentStats();
    
    // Setup UI
    setupUI();

  } catch (error) {
    console.error('Dashboard initialization error:', error);
    showAlert('Error loading dashboard', 'danger');
  }
}

/**
 * Load student profile from Supabase
 */
async function loadStudentProfile(userId) {
  try {
    const { data, error } = await window.supabaseClient
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    
    if (data && data.length > 0) {
      studentProfile = data[0];
    }
    
    updateProfileUI();

  } catch (error) {
    console.error('Load profile error:', error);
  }
}

/**
 * Update profile in UI
 */
function updateProfileUI() {
  if (!studentProfile) return;

  const elements = {
    'userName': studentProfile.full_name || 'Student',
    'profilePicNav': studentProfile.full_name?.charAt(0).toUpperCase() || 'S',
    'resumeScore': studentProfile.resume_score || 0
  };

  Object.keys(elements).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      if (id === 'profilePicNav') {
        if (studentProfile.profile_picture) {
          element.innerHTML = `<img src="${studentProfile.profile_picture}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
          element.textContent = elements[id];
        }
      } else if (id === 'resumeScore') {
        element.textContent = elements[id] + '%';
      } else {
        element.textContent = elements[id];
      }
    }
  });
}

/**
 * Load student applications from Supabase
 */
async function loadStudentApplications() {
  try {
    if (!studentProfile) return;

    const { data, error } = await window.supabaseClient
      .from('job_applications')
      .select('*')
      .eq('student_id', studentProfile.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    studentApplications = data || [];
    displayRecentApplications();

  } catch (error) {
    console.error('Load applications error:', error);
  }
}

/**
 * Display recent applications
 */
function displayRecentApplications() {
  const container = document.getElementById('recentApplications');
  if (!container) return;

  if (!studentApplications || studentApplications.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i><p>No applications yet</p><button class="btn btn-primary" onclick="window.location.href=\'job-search.html\'">Browse Jobs</button></div>';
    return;
  }

  container.innerHTML = studentApplications.slice(0, 5).map(app => `
    <div class="application-card">
      <div class="app-header">
        <h4>${app.job_title || 'Job Application'}</h4>
        <span class="status-badge status-${app.status}">${getStatusText(app.status)}</span>
      </div>
      <p class="company-name">${app.company_name || 'Company'}</p>
      <p class="app-date">Applied: ${new Date(app.created_at).toLocaleDateString()}</p>
    </div>
  `).join('');
}

/**
 * Get status text
 */
function getStatusText(status) {
  const statusMap = {
    'pending': 'Applied',
    'shortlisted': 'Shortlisted ⭐',
    'interview': 'Interview Scheduled',
    'selected': 'Selected 🎉',
    'rejected': 'Rejected'
  };
  return statusMap[status] || status;
}

/**
 * Load recommended jobs
 */
async function loadRecommendedJobs() {
  try {
    const { data, error } = await window.supabaseClient
      .from('job_posts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    
    recommendedJobs = data || [];
    displayRecommendedJobs();

  } catch (error) {
    console.error('Load recommended jobs error:', error);
  }
}

/**
 * Display recommended jobs
 */
function displayRecommendedJobs() {
  const container = document.getElementById('recommendedJobs');
  if (!container) return;

  if (!recommendedJobs || recommendedJobs.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No jobs available</p></div>';
    return;
  }

  container.innerHTML = recommendedJobs.map(job => `
    <div class="job-card">
      <h4>${job.title}</h4>
      <p class="company">${job.company_name || 'Company'}</p>
      <div class="job-meta">
        <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
        <span><i class="fas fa-clock"></i> ${job.type}</span>
      </div>
      <p class="salary">${job.salary}</p>
    </div>
  `).join('');
}

/**
 * Load student statistics
 */
async function loadStudentStats() {
  try {
    if (!studentProfile) return;

    studentStats = {
      total: studentApplications.length,
      shortlisted: studentApplications.filter(a => a.status === 'shortlisted').length,
      interviews: studentApplications.filter(a => a.status === 'interview').length,
      score: studentProfile.resume_score || 0
    };

    updateStatsUI();

  } catch (error) {
    console.error('Load stats error:', error);
  }
}

/**
 * Update statistics in UI
 */
function updateStatsUI() {
  const elements = {
    'applicationsCount': studentStats.total || 0,
    'shortlistedCount': studentStats.shortlisted || 0,
    'interviewCount': studentStats.interviews || 0,
    'profileScore': (studentStats.score || 0) + '%'
  };

  Object.keys(elements).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = elements[id];
    }
  });
}

/**
 * Setup UI interactions
 */
function setupUI() {
  // Logout
  window.logout = async function() {
    if (confirm('Are you sure you want to logout?')) {
      await window.supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    }
  };
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  
  const container = document.querySelector('.main-content');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => alertDiv.remove(), 3000);
  }
}