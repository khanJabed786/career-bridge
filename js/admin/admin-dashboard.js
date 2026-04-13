/**
 * Admin Dashboard Logic - Fixed with Supabase only
 */

let adminStats = {
  totalUsers: 0,
  totalStudents: 0,
  totalCompanies: 0,
  verifiedCompanies: 0,
  pendingVerifications: 0,
  totalJobs: 0,
  activeJobs: 0,
  totalApplications: 0
};

document.addEventListener('DOMContentLoaded', async () => {
  if (window.authService) {
    if (!window.authService.requireRole('admin')) return;
    await initAdminDashboard();
  }
});

/**
 * Initialize admin dashboard
 */
async function initAdminDashboard() {
  try {
    const user = window.authService.getCurrentUser();
    
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Display admin name
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
      adminNameElement.textContent = user.email;
    }

    // Load statistics
    await loadAdminStats();
    
    // Load initial tab
    loadCompaniesForVerification();
    
    // Setup UI
    setupAdminUI();
    
    // Setup realtime listeners
    setupRealtimeListeners();

  } catch (error) {
    console.error('Admin dashboard initialization error:', error);
    showAlert('Error loading dashboard', 'danger');
  }
}

/**
 * Load admin statistics from Supabase
 */
async function loadAdminStats() {
  try {
    // Get all users
    const { data: users, error: usersError } = await window.supabase.db.select('users');
    if (!usersError && users) {
      adminStats.totalUsers = users.length;
      adminStats.totalStudents = users.filter(u => u.role === 'student').length;
      adminStats.totalCompanies = users.filter(u => u.role === 'company').length;
    }

    // Get company profiles for verification status
    const { data: companies, error: companiesError } = await window.supabase.db.select('company_profiles');
    if (!companiesError && companies) {
      adminStats.verifiedCompanies = companies.filter(c => c.verified === true).length;
      adminStats.pendingVerifications = companies.filter(c => c.verified === false).length;
    }

    // Get jobs
    const { data: jobs, error: jobsError } = await window.supabase.db.select('job_posts');
    if (!jobsError && jobs) {
      adminStats.totalJobs = jobs.length;
      adminStats.activeJobs = jobs.filter(j => j.status === 'active').length;
    }

    // Get applications
    const { data: applications, error: appsError } = await window.supabase.db.select('job_applications');
    if (!appsError && applications) {
      adminStats.totalApplications = applications.length;
    }

    updateAdminStatsUI();

  } catch (error) {
    console.error('Load stats error:', error);
  }
}

/**
 * Update admin statistics UI
 */
function updateAdminStatsUI() {
  const elements = {
    'totalUsers': adminStats.totalUsers,
    'totalStudents': adminStats.totalStudents,
    'totalCompanies': adminStats.totalCompanies,
    'verifiedCompanies': adminStats.verifiedCompanies,
    'pendingVerifications': adminStats.pendingVerifications,
    'totalJobs': adminStats.totalJobs,
    'activeJobs': adminStats.activeJobs,
    'totalApplications': adminStats.totalApplications
  };

  Object.keys(elements).forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = elements[id] || '0';
    }
  });
}

/**
 * Setup admin UI
 */
function setupAdminUI() {
  // Sidebar navigation
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.getAttribute('onclick')?.includes('switchAdminTab')) {
        e.preventDefault();
      }
    });
  });

  // Logout
  window.logout = async function() {
    if (confirm('Are you sure you want to logout?')) {
      await window.authService.signOut();
      window.location.href = 'login.html';
    }
  };
}

/**
 * Setup realtime listeners
 */
function setupRealtimeListeners() {
  if (!window.supabase.client) return;

  // Listen for new company registrations
  window.supabase.client
    .channel('admin-companies')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'company_profiles' },
      async () => {
        await loadAdminStats();
        if (document.getElementById('verifyCompaniesTab')?.style.display !== 'none') {
          loadCompaniesForVerification();
        }
        showAlert('🏢 New company registered', 'info');
      }
    )
    .subscribe();

  // Listen for verification requests
  window.supabase.client
    .channel('admin-verifications')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'verification_requests' },
      async () => {
        await loadAdminStats();
        if (document.getElementById('verifyCompaniesTab')?.style.display !== 'none') {
          loadCompaniesForVerification();
        }
        showAlert('📋 New verification request received', 'info');
      }
    )
    .subscribe();

  // Listen for new users
  window.supabase.client
    .channel('admin-users')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'users' },
      async () => {
        await loadAdminStats();
        if (document.getElementById('usersTab')?.style.display !== 'none') {
          loadUsers();
        }
      }
    )
    .subscribe();
}

/**
 * Switch admin tab
 */
window.switchAdminTab = function(tabName) {
  // Hide all tabs
  document.querySelectorAll('[id$="Tab"]').forEach(tab => {
    tab.style.display = 'none';
  });

  // Show selected tab
  const tab = document.getElementById(tabName + 'Tab');
  if (tab) {
    tab.style.display = 'block';
  }

  // Update active state in sidebar
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('onclick')?.includes(tabName)) {
      item.classList.add('active');
    }
  });

  // Load tab-specific data
  if (tabName === 'verify-companies') {
    loadCompaniesForVerification();
  } else if (tabName === 'users') {
    loadUsers();
  } else if (tabName === 'jobs') {
    loadJobs();
  } else if (tabName === 'applications') {
    loadApplications();
  }
};

/**
 * Load companies for verification
 */
async function loadCompaniesForVerification() {
  try {
    // Get unverified companies
    const { data: companies, error } = await window.supabase.db.select(
      'company_profiles',
      { verified: false },
      { orderBy: 'created_at', ascending: false }
    );

    if (error) throw error;

    const table = document.getElementById('companiesTable');
    if (!table) return;

    if (!companies || companies.length === 0) {
      table.innerHTML = '<tr><td colspan="6" class="empty-state">No pending verifications</td></tr>';
      return;
    }

    table.innerHTML = companies.map(company => `
      <tr>
        <td>${company.company_name || 'N/A'}</td>
        <td>${company.email || 'N/A'}</td>
        <td>${company.phone || 'N/A'}</td>
        <td>${new Date(company.created_at).toLocaleDateString()}</td>
        <td>
          <button class="action-btn btn-view" onclick="viewCompanyDetails('${company.id}')">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
        <td>
          <button class="action-btn btn-approve" onclick="verifyCompany('${company.id}')">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="action-btn btn-reject" onclick="rejectCompany('${company.id}')">
            <i class="fas fa-times"></i> Reject
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading companies:', error);
  }
}

/**
 * View company details
 */
window.viewCompanyDetails = async function(companyId) {
  try {
    const { data, error } = await window.supabase.db.select('company_profiles', { id: companyId });
    
    if (error) throw error;
    
    const company = data?.[0];
    if (!company) return;

    const content = `
      <div class="company-detail">
        <h3>${company.company_name}</h3>
        
        <div class="detail-section">
          <h4>Contact Information</h4>
          <p><strong>Email:</strong> ${company.email}</p>
          <p><strong>Phone:</strong> ${company.phone || 'N/A'}</p>
          <p><strong>Address:</strong> ${company.address || 'N/A'}</p>
          <p><strong>Website:</strong> <a href="${company.website}" target="_blank">${company.website || 'N/A'}</a></p>
        </div>

        <div class="detail-section">
          <h4>Business Details</h4>
          <p><strong>Industry:</strong> ${company.industry || 'N/A'}</p>
          <p><strong>Description:</strong> ${company.description || 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h4>Government Documents</h4>
          <p><strong>GST Number:</strong> ${company.gst_number || 'N/A'}</p>
          <p><strong>Registration Number:</strong> ${company.registration_number || 'N/A'}</p>
          <p><strong>PAN Number:</strong> ${company.pan_number || 'N/A'}</p>
          <p><strong>Government ID:</strong> ${company.government_id || 'N/A'}</p>
        </div>

        <div class="detail-actions">
          <button class="action-btn btn-approve" onclick="verifyCompany('${company.id}')">
            <i class="fas fa-check"></i> Approve Company
          </button>
          <button class="action-btn btn-reject" onclick="rejectCompany('${company.id}')">
            <i class="fas fa-times"></i> Reject
          </button>
          <button class="action-btn btn-view" onclick="closeModal('companyDetailModal')">
            Close
          </button>
        </div>
      </div>
    `;

    document.getElementById('companyDetailContent').innerHTML = content;
    showModal('companyDetailModal');

  } catch (error) {
    console.error('Error viewing company:', error);
    showAlert('Error loading company details', 'danger');
  }
};

/**
 * Verify company
 */
window.verifyCompany = async function(companyId) {
  try {
    // Update company verification status
    const { error } = await window.supabase.db.update(
      'company_profiles',
      { 
        verified: true,
        verified_at: new Date().toISOString(),
        verified_by: window.authService.getCurrentUser()?.id
      },
      companyId
    );

    if (error) throw error;

    showAlert('✅ Company verified successfully!', 'success');
    
    // Close modal if open
    closeModal('companyDetailModal');
    
    // Reload data
    await loadAdminStats();
    loadCompaniesForVerification();

  } catch (error) {
    console.error('Error verifying company:', error);
    showAlert('❌ Error: ' + error.message, 'danger');
  }
};

/**
 * Reject company
 */
window.rejectCompany = async function(companyId) {
  const reason = prompt('Enter rejection reason:');
  if (!reason) return;

  try {
    // You might want to store rejection reason in a separate table
    showAlert('❌ Company rejected. Email notification would be sent.', 'info');
    
    closeModal('companyDetailModal');
    loadCompaniesForVerification();

  } catch (error) {
    console.error('Error rejecting company:', error);
    showAlert('❌ Error: ' + error.message, 'danger');
  }
};

/**
 * Load users
 */
async function loadUsers() {
  try {
    const { data: users, error } = await window.supabase.db.select(
      'users',
      {},
      { orderBy: 'created_at', ascending: false }
    );

    if (error) throw error;

    const table = document.getElementById('usersTable');
    if (!table) return;

    if (!users || users.length === 0) {
      table.innerHTML = '<tr><td colspan="5" class="empty-state">No users found</td></tr>';
      return;
    }

    table.innerHTML = users.map(user => `
      <tr>
        <td>${user.email}</td>
        <td><span style="text-transform: capitalize;">${user.role}</span></td>
        <td>${new Date(user.created_at).toLocaleDateString()}</td>
        <td><span class="status-badge status-verified">✅ Active</span></td>
        <td>
          <button class="action-btn btn-reject" onclick="toggleUserStatus('${user.id}', '${user.status || 'active'}')">
            ${user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading users:', error);
  }
}

/**
 * Toggle user status
 */
window.toggleUserStatus = async function(userId, currentStatus) {
  const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
  
  if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'unsuspend'} this user?`)) return;

  try {
    const { error } = await window.supabase.db.update(
      'users',
      { status: newStatus },
      userId
    );

    if (error) throw error;

    showAlert(`✅ User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`, 'success');
    loadUsers();

  } catch (error) {
    console.error('Error toggling user status:', error);
    showAlert('❌ Error updating user', 'danger');
  }
};

/**
 * Load jobs
 */
async function loadJobs() {
  try {
    const { data: jobs, error } = await window.supabase.client
      .from('job_posts')
      .select(`
        *,
        company_profiles (
          company_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const table = document.getElementById('jobsTable');
    if (!table) return;

    if (!jobs || jobs.length === 0) {
      table.innerHTML = '<tr><td colspan="6" class="empty-state">No jobs found</td></tr>';
      return;
    }

    table.innerHTML = jobs.map(job => {
      // Get application count for this job
      const appCount = 0; // You would get this from a separate query
      
      return `
        <tr>
          <td>${job.title}</td>
          <td>${job.company_profiles?.company_name || 'Unknown'}</td>
          <td>${new Date(job.created_at).toLocaleDateString()}</td>
          <td><span class="status-badge ${job.status === 'active' ? 'status-verified' : 'status-pending'}">${job.status}</span></td>
          <td>${appCount}</td>
          <td>
            <button class="action-btn btn-view" onclick="viewJobDetails('${job.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn btn-reject" onclick="toggleJobStatus('${job.id}', '${job.status}')">
              ${job.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading jobs:', error);
  }
}

/**
 * Toggle job status
 */
window.toggleJobStatus = async function(jobId, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  try {
    const { error } = await window.supabase.db.update(
      'job_posts',
      { status: newStatus },
      jobId
    );

    if (error) throw error;

    showAlert(`✅ Job ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    loadJobs();

  } catch (error) {
    console.error('Error toggling job status:', error);
    showAlert('❌ Error updating job', 'danger');
  }
};

/**
 * Load applications
 */
async function loadApplications() {
  try {
    const { data: applications, error } = await window.supabase.client
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
      .order('created_at', { ascending: false });

    if (error) throw error;

    const table = document.getElementById('applicationsTable');
    if (!table) return;

    if (!applications || applications.length === 0) {
      table.innerHTML = '<tr><td colspan="6" class="empty-state">No applications found</td></tr>';
      return;
    }

    table.innerHTML = applications.map(app => `
      <tr>
        <td>${app.student_profiles?.full_name || 'Unknown'}</td>
        <td>${app.job_posts?.title || 'Unknown'}</td>
        <td>${app.job_posts?.company_profiles?.company_name || 'Unknown'}</td>
        <td>${new Date(app.created_at).toLocaleDateString()}</td>
        <td><span class="status-badge status-${app.status}">${getStatusText(app.status)}</span></td>
        <td>
          <button class="action-btn btn-view" onclick="viewApplicationDetails('${app.id}')">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Error loading applications:', error);
  }
}

/**
 * View application details
 */
window.viewApplicationDetails = async function(appId) {
  try {
    const { data, error } = await window.supabase.client
      .from('job_applications')
      .select(`
        *,
        student_profiles (*),
        job_posts (*)
      `)
      .eq('id', appId)
      .single();

    if (error) throw error;

    const content = `
      <div class="application-detail">
        <h3>Application Details</h3>
        
        <div class="detail-section">
          <h4>Student Information</h4>
          <p><strong>Name:</strong> ${data.student_profiles?.full_name || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.student_profiles?.email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${data.student_profiles?.phone || 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h4>Job Information</h4>
          <p><strong>Title:</strong> ${data.job_posts?.title || 'N/A'}</p>
          <p><strong>Company:</strong> ${data.job_posts?.company_name || 'N/A'}</p>
          <p><strong>Location:</strong> ${data.job_posts?.location || 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h4>Application Status</h4>
          <p><strong>Applied:</strong> ${new Date(data.created_at).toLocaleString()}</p>
          <p><strong>Status:</strong> <span class="status-badge status-${data.status}">${getStatusText(data.status)}</span></p>
        </div>

        ${data.resume_url ? `
          <div class="detail-section">
            <h4>Resume</h4>
            <a href="${data.resume_url}" target="_blank" class="action-btn btn-view">View Resume</a>
          </div>
        ` : ''}

        <button class="action-btn btn-view" onclick="closeModal('applicationDetailModal')">Close</button>
      </div>
    `;

    document.getElementById('applicationDetailContent').innerHTML = content;
    showModal('applicationDetailModal');

  } catch (error) {
    console.error('Error viewing application:', error);
    showAlert('Error loading application details', 'danger');
  }
};

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
 * View job details
 */
window.viewJobDetails = async function(jobId) {
  try {
    const { data, error } = await window.supabase.client
      .from('job_posts')
      .select(`
        *,
        company_profiles (*)
      `)
      .eq('id', jobId)
      .single();

    if (error) throw error;

    const content = `
      <div class="job-detail">
        <h3>${data.title}</h3>
        
        <div class="detail-section">
          <h4>Company Information</h4>
          <p><strong>Name:</strong> ${data.company_profiles?.company_name || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.company_profiles?.email || 'N/A'}</p>
          <p><strong>Phone:</strong> ${data.company_profiles?.phone || 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h4>Job Details</h4>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Experience:</strong> ${data.experience}</p>
          <p><strong>Salary:</strong> ${data.salary}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p><strong>Skills:</strong> ${data.skills?.join(', ') || 'N/A'}</p>
          <p><strong>Status:</strong> <span class="status-badge ${data.status === 'active' ? 'status-verified' : 'status-pending'}">${data.status}</span></p>
        </div>

        <button class="action-btn btn-view" onclick="closeModal('jobDetailModal')">Close</button>
      </div>
    `;

    document.getElementById('jobDetailContent').innerHTML = content;
    showModal('jobDetailModal');

  } catch (error) {
    console.error('Error viewing job:', error);
    showAlert('Error loading job details', 'danger');
  }
};

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

/**
 * Show modal
 */
window.showModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
};

/**
 * Close modal
 */
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
};

// Make functions globally available
window.switchAdminTab = switchAdminTab;
window.verifyCompany = verifyCompany;
window.rejectCompany = rejectCompany;
window.loadCompaniesForVerification = loadCompaniesForVerification;
window.loadUsers = loadUsers;
window.loadJobs = loadJobs;
window.toggleUserStatus = toggleUserStatus;
window.toggleJobStatus = toggleJobStatus;