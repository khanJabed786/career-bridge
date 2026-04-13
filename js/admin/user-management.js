/**
 * User Management Logic - Admin - Fixed with Supabase only
 */

/**
 * Load all users
 */
async function loadUsers() {
    try {
        const { data: users, error } = await window.supabase.client
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayUsers(users || []);

    } catch (error) {
        console.error('Error loading users:', error);
        showAlert('Error loading users', 'danger');
    }
}

/**
 * Display users in table
 */
function displayUsers(users) {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr id="user-${user.id}">
            <td>${user.email}</td>
            <td>
                <span class="role-badge ${user.role}">
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <span class="status-badge ${user.status === 'suspended' ? 'status-rejected' : 'status-verified'}">
                    ${user.status === 'suspended' ? 'Suspended' : 'Active'}
                </span>
            </td>
            <td>
                <div class="user-actions">
                    <button class="action-btn btn-view" onclick="viewUserDetails('${user.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn ${user.status === 'suspended' ? 'btn-approve' : 'btn-reject'}" 
                            onclick="toggleUserStatus('${user.id}', '${user.status || 'active'}')" 
                            title="${user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}">
                        <i class="fas ${user.status === 'suspended' ? 'fa-play' : 'fa-pause'}"></i>
                    </button>
                    <button class="action-btn btn-edit" onclick="editUserRole('${user.id}', '${user.role}')" title="Change Role">
                        <i class="fas fa-user-tag"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * View user details
 */
async function viewUserDetails(userId) {
    try {
        const { data: user, error } = await window.supabase.client
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Get role-specific profile
        let profile = null;
        if (user.role === 'student') {
            const { data } = await window.supabase.db.select('student_profiles', { user_id: userId });
            profile = data?.[0];
        } else if (user.role === 'company') {
            const { data } = await window.supabase.db.select('company_profiles', { user_id: userId });
            profile = data?.[0];
        }

        showUserModal(user, profile);

    } catch (error) {
        console.error('Error viewing user:', error);
        showAlert('Error loading user details', 'danger');
    }
}

/**
 * Show user details modal
 */
function showUserModal(user, profile) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>User Details</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="user-detail">
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Role:</strong> <span class="role-badge ${user.role}">${user.role}</span></p>
                    <p><strong>Joined:</strong> ${new Date(user.created_at).toLocaleString()}</p>
                    <p><strong>Last Updated:</strong> ${new Date(user.updated_at).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${user.status === 'suspended' ? 'status-rejected' : 'status-verified'}">${user.status || 'Active'}</span></p>
                </div>

                ${profile ? `
                    <div class="user-detail-section">
                        <h3>Profile Information</h3>
                        ${user.role === 'student' ? `
                            <p><strong>Name:</strong> ${profile.full_name || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${profile.phone || 'N/A'}</p>
                            <p><strong>Location:</strong> ${profile.location || 'N/A'}</p>
                            <p><strong>Skills:</strong> ${profile.current_skills?.join(', ') || 'N/A'}</p>
                        ` : user.role === 'company' ? `
                            <p><strong>Company:</strong> ${profile.company_name || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${profile.phone || 'N/A'}</p>
                            <p><strong>Industry:</strong> ${profile.industry || 'N/A'}</p>
                            <p><strong>Verified:</strong> ${profile.verified ? 'Yes ✓' : 'No'}</p>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="editUserRole('${user.id}', '${user.role}'); this.closest('.modal').remove();">
                    <i class="fas fa-user-tag"></i> Change Role
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Toggle user status (suspend/activate)
 */
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const action = newStatus === 'suspended' ? 'suspend' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        const btn = event?.target;
        if (btn) showLoading(btn, 'Updating...');

        const { error } = await window.supabase.db.update(
            'users',
            { 
                status: newStatus,
                updated_at: new Date().toISOString()
            },
            userId
        );

        if (error) throw error;

        // Send notification to user
        await window.supabase.db.insert('notifications', {
            user_id: userId,
            type: 'account_status',
            title: 'Account Status Update',
            message: newStatus === 'suspended' ? 
                '⚠️ Your account has been suspended. Please contact admin for more information.' :
                '✅ Your account has been activated.',
            created_at: new Date().toISOString()
        });

        showAlert(`✅ User ${action}d successfully`, 'success');
        
        // Update UI
        const row = document.getElementById(`user-${userId}`);
        if (row) {
            const statusCell = row.querySelector('.status-badge');
            statusCell.textContent = newStatus === 'suspended' ? 'Suspended' : 'Active';
            statusCell.className = `status-badge ${newStatus === 'suspended' ? 'status-rejected' : 'status-verified'}`;
            
            const toggleBtn = row.querySelector('.action-btn:nth-child(2)');
            toggleBtn.innerHTML = `<i class="fas fa-${newStatus === 'suspended' ? 'play' : 'pause'}"></i>`;
            toggleBtn.title = newStatus === 'suspended' ? 'Unsuspend' : 'Suspend';
            toggleBtn.className = `action-btn ${newStatus === 'suspended' ? 'btn-approve' : 'btn-reject'}`;
        }

    } catch (error) {
        console.error('Error toggling user status:', error);
        showAlert('❌ Error updating user: ' + error.message, 'danger');
    } finally {
        if (btn) hideLoading(btn);
    }
}

/**
 * Edit user role
 */
async function editUserRole(userId, currentRole) {
    const newRole = prompt('Enter new role (student/company/admin):', currentRole);
    if (!newRole) return;

    const validRoles = ['student', 'company', 'admin'];
    if (!validRoles.includes(newRole)) {
        showAlert('Invalid role. Must be student, company, or admin.', 'danger');
        return;
    }

    try {
        const { error } = await window.supabase.db.update(
            'users',
            { 
                role: newRole,
                updated_at: new Date().toISOString()
            },
            userId
        );

        if (error) throw error;

        // Update user metadata in auth (requires admin API - may need backend)
        // For now, just update the users table

        showAlert(`✅ User role updated to ${newRole}`, 'success');
        
        // Update UI
        const row = document.getElementById(`user-${userId}`);
        if (row) {
            const roleCell = row.querySelector('.role-badge');
            roleCell.textContent = newRole.charAt(0).toUpperCase() + newRole.slice(1);
            roleCell.className = `role-badge ${newRole}`;
        }

    } catch (error) {
        console.error('Error updating user role:', error);
        showAlert('❌ Error updating role: ' + error.message, 'danger');
    }
}

/**
 * Search users
 */
function searchUsers(query) {
    const rows = document.querySelectorAll('#usersTable tr');
    const searchTerm = query.toLowerCase();

    rows.forEach(row => {
        if (row.classList.contains('empty-state')) return;
        
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
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
        btn.innerHTML = '<i class="fas fa-eye"></i>';
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
window.loadUsers = loadUsers;
window.viewUserDetails = viewUserDetails;
window.toggleUserStatus = toggleUserStatus;
window.editUserRole = editUserRole;
window.searchUsers = searchUsers;