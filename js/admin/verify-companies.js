/**
 * Verify Companies Logic - Admin - Fixed with Supabase only
 */

/**
 * Load companies for verification
 */
async function loadCompaniesForVerification() {
    try {
        const { data: companies, error } = await window.supabase.client
            .from('company_profiles')
            .select('*')
            .eq('verified', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayCompaniesForVerification(companies || []);

    } catch (error) {
        console.error('Error loading companies:', error);
        showAlert('Error loading companies', 'danger');
    }
}

/**
 * Display companies for verification
 */
function displayCompaniesForVerification(companies) {
    const container = document.getElementById('companiesContainer');
    if (!container) return;

    if (companies.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-building"></i><p>No pending verifications</p></div>';
        return;
    }

    container.innerHTML = companies.map(company => `
        <div class="company-card" id="company-${company.id}">
            <div class="company-header">
                <div>
                    <h3>${company.company_name}</h3>
                    <p class="company-email"><i class="fas fa-envelope"></i> ${company.email}</p>
                </div>
                <span class="status-badge status-pending">⏳ Pending</span>
            </div>

            <div class="company-details">
                ${company.phone ? `
                    <p><i class="fas fa-phone"></i> ${company.phone}</p>
                ` : ''}
                ${company.website ? `
                    <p><i class="fas fa-globe"></i> <a href="${company.website}" target="_blank">${company.website}</a></p>
                ` : ''}
                ${company.location ? `
                    <p><i class="fas fa-map-marker-alt"></i> ${company.location}</p>
                ` : ''}
                ${company.industry ? `
                    <p><i class="fas fa-industry"></i> ${company.industry}</p>
                ` : ''}
                <p><i class="fas fa-calendar"></i> Registered: ${new Date(company.created_at).toLocaleDateString()}</p>
            </div>

            ${company.company_description ? `
                <div class="company-description">
                    <strong>Description:</strong>
                    <p>${company.company_description.substring(0, 200)}${company.company_description.length > 200 ? '...' : ''}</p>
                </div>
            ` : ''}

            <div class="documents-section">
                <h4>Documents</h4>
                <div class="documents-list">
                    ${company.gst_number ? `
                        <span class="document-tag"><i class="fas fa-file-invoice"></i> GST: ${company.gst_number}</span>
                    ` : ''}
                    ${company.registration_number ? `
                        <span class="document-tag"><i class="fas fa-qrcode"></i> Reg: ${company.registration_number}</span>
                    ` : ''}
                    ${company.pan_number ? `
                        <span class="document-tag"><i class="fas fa-id-card"></i> PAN: ${company.pan_number}</span>
                    ` : ''}
                </div>
            </div>

            <div class="company-actions">
                <button class="action-btn btn-view" onclick="viewCompanyDetails('${company.id}')">
                    <i class="fas fa-eye"></i> View Full Details
                </button>
                <button class="action-btn btn-approve" onclick="verifyCompany('${company.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="action-btn btn-reject" onclick="rejectCompany('${company.id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * View company details
 */
async function viewCompanyDetails(companyId) {
    try {
        const { data: company, error } = await window.supabase.client
            .from('company_profiles')
            .select('*')
            .eq('id', companyId)
            .single();

        if (error) throw error;

        if (company) {
            showCompanyModal(company);
        }

    } catch (error) {
        console.error('Error viewing company:', error);
        showAlert('Error loading company details', 'danger');
    }
}

/**
 * Show company details modal
 */
function showCompanyModal(company) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>${company.company_name}</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="company-detail-section">
                    <h3><i class="fas fa-building"></i> Company Information</h3>
                    <p><strong>Email:</strong> ${company.email}</p>
                    <p><strong>Phone:</strong> ${company.phone || 'N/A'}</p>
                    <p><strong>Website:</strong> ${company.website ? `<a href="${company.website}" target="_blank">${company.website}</a>` : 'N/A'}</p>
                    <p><strong>Location:</strong> ${company.location || 'N/A'}</p>
                    <p><strong>Industry:</strong> ${company.industry || 'N/A'}</p>
                </div>

                <div class="company-detail-section">
                    <h3><i class="fas fa-align-left"></i> Description</h3>
                    <p>${company.company_description || 'No description provided'}</p>
                </div>

                <div class="company-detail-section">
                    <h3><i class="fas fa-file-contract"></i> Government Documents</h3>
                    <p><strong>GST Number:</strong> ${company.gst_number || 'Not provided'}</p>
                    <p><strong>Registration Number:</strong> ${company.registration_number || 'Not provided'}</p>
                    <p><strong>PAN Number:</strong> ${company.pan_number || 'Not provided'}</p>
                    <p><strong>Government ID:</strong> ${company.government_id || 'Not provided'}</p>
                </div>

                <div class="company-detail-section">
                    <h3><i class="fas fa-calendar-alt"></i> Registration Details</h3>
                    <p><strong>Registered on:</strong> ${new Date(company.created_at).toLocaleString()}</p>
                    <p><strong>Last updated:</strong> ${new Date(company.updated_at).toLocaleString()}</p>
                </div>

                ${company.company_logo ? `
                    <div class="company-detail-section">
                        <h3><i class="fas fa-image"></i> Company Logo</h3>
                        <img src="${company.company_logo}" alt="${company.company_name}" style="max-width: 200px; border-radius: 8px;">
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-success" onclick="verifyCompany('${company.id}'); this.closest('.modal').remove();">
                    <i class="fas fa-check"></i> Approve Company
                </button>
                <button class="btn btn-danger" onclick="rejectCompany('${company.id}'); this.closest('.modal').remove();">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

/**
 * Verify company
 */
async function verifyCompany(companyId) {
    if (!confirm('Are you sure you want to verify this company?')) return;

    try {
        const btn = event?.target;
        if (btn) showLoading(btn, 'Verifying...');

        const { error } = await window.supabase.db.update(
            'company_profiles',
            {
                verified: true,
                verified_at: new Date().toISOString(),
                verified_by: window.authService?.getCurrentUser()?.id
            },
            companyId
        );

        if (error) throw error;

        // Get company user to send notification
        const { data: company } = await window.supabase.client
            .from('company_profiles')
            .select('user_id, company_name')
            .eq('id', companyId)
            .single();

        if (company) {
            await window.supabase.db.insert('notifications', {
                user_id: company.user_id,
                type: 'company_verified',
                title: 'Company Verified',
                message: `✅ Your company "${company.company_name}" has been verified! You can now post jobs.`,
                created_at: new Date().toISOString()
            });
        }

        showAlert('✅ Company verified successfully!', 'success');
        
        // Remove from list
        document.getElementById(`company-${companyId}`)?.remove();
        
        // Reload if no companies left
        const container = document.getElementById('companiesContainer');
        if (container && container.children.length === 0) {
            loadCompaniesForVerification();
        }

    } catch (error) {
        console.error('Verification error:', error);
        showAlert('❌ Error verifying company: ' + error.message, 'danger');
    } finally {
        if (btn) hideLoading(btn);
    }
}

/**
 * Reject company verification
 */
async function rejectCompany(companyId) {
    const reason = prompt('Enter rejection reason (optional):');
    
    try {
        // Get company user
        const { data: company } = await window.supabase.client
            .from('company_profiles')
            .select('user_id, company_name')
            .eq('id', companyId)
            .single();

        if (company) {
            await window.supabase.db.insert('notifications', {
                user_id: company.user_id,
                type: 'company_rejected',
                title: 'Verification Update',
                message: reason ? 
                    `❌ Your company verification was rejected. Reason: ${reason}` :
                    '❌ Your company verification was rejected. Please update your information and try again.',
                created_at: new Date().toISOString()
            });
        }

        showAlert('✅ Company rejected and notification sent', 'success');
        
        // Remove from list
        document.getElementById(`company-${companyId}`)?.remove();
        
        // Reload if no companies left
        const container = document.getElementById('companiesContainer');
        if (container && container.children.length === 0) {
            loadCompaniesForVerification();
        }

    } catch (error) {
        console.error('Rejection error:', error);
        showAlert('❌ Error rejecting company: ' + error.message, 'danger');
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
        btn.innerHTML = '<i class="fas fa-check"></i> Approve';
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
window.loadCompaniesForVerification = loadCompaniesForVerification;
window.viewCompanyDetails = viewCompanyDetails;
window.verifyCompany = verifyCompany;
window.rejectCompany = rejectCompany;