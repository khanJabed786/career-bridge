import { supabase } from '../config/supabase-config.js';
import { showNotification } from '../shared/notification-service.js';

class CompanyProfile {
    constructor() {
        this.companyId = null;
        this.init();
    }

    async init() {
        await this.getCurrentCompany();
        this.setupEventListeners();
        this.loadCompanyProfile();
    }

    async getCurrentCompany() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            this.companyId = user.id;
        }
    }

    async loadCompanyProfile() {
        try {
            // First try to load from Supabase
            const { data: company, error } = await supabase
                .from('companies')
                .select('*')
                .eq('user_id', this.companyId)
                .single();

            if (error) {
                // If Supabase fails, try localStorage
                const localProfile = localStorage.getItem('companyProfile');
                if (localProfile) {
                    const profile = JSON.parse(localProfile);
                    this.populateForm(profile);
                    this.updateVerificationStatus(profile);
                }
                return;
            }

            // Save to localStorage as backup
            localStorage.setItem('companyProfile', JSON.stringify(company));
            
            this.populateForm(company);
            this.updateVerificationStatus(company);
        } catch (error) {
            console.error('Error loading company profile:', error);
            showNotification('Error loading profile', 'error');
        }
    }

    populateForm(company) {
        document.getElementById('companyName').value = company.name || company.company_name || '';
        document.getElementById('companyEmail').value = company.email || company.company_email || '';
        document.getElementById('companyPhone').value = company.phone || '';
        document.getElementById('companyAddress').value = company.address || '';
        document.getElementById('companyWebsite').value = company.website || company.website_url || '';
        document.getElementById('companyDescription').value = company.description || company.company_description || '';
        document.getElementById('industry').value = company.industry || '';
        
        // New government fields
        document.getElementById('gstNumber').value = company.gst_number || '';
        document.getElementById('registrationNumber').value = company.registration_number || '';
        document.getElementById('panNumber').value = company.pan_number || '';
        document.getElementById('governmentId').value = company.government_id || '';
        
        if (company.logo_url || company.logo) {
            document.getElementById('companyLogo').src = company.logo_url || company.logo;
            document.getElementById('navbarLogo').innerHTML = `<img src="${company.logo_url || company.logo}" alt="Logo">`;
        }
    }

    updateVerificationStatus(company) {
        const statusDiv = document.getElementById('verificationStatus');
        const verifyBtn = document.getElementById('verifyNowBtn');
        const verificationBadge = document.getElementById('verificationBadge');
        const profileVerificationStatus = document.getElementById('profileVerificationStatus');
        
        const isVerified = company.is_verified || company.verified || false;
        
        if (isVerified) {
            if (statusDiv) statusDiv.innerHTML = '<span class="badge bg-success">Verified ✓</span>';
            if (verifyBtn) verifyBtn.style.display = 'none';
            if (verificationBadge) {
                verificationBadge.className = 'verification-badge verified';
                verificationBadge.textContent = 'Verified ✓';
            }
            if (profileVerificationStatus) {
                profileVerificationStatus.className = 'status-badge status-verified';
                profileVerificationStatus.textContent = 'Verified ✓';
            }
        } else {
            if (statusDiv) statusDiv.innerHTML = '<span class="badge bg-warning">Pending Verification</span>';
            if (verifyBtn) verifyBtn.style.display = 'block';
            if (verificationBadge) {
                verificationBadge.className = 'verification-badge pending';
                verificationBadge.textContent = 'Pending';
            }
            if (profileVerificationStatus) {
                profileVerificationStatus.className = 'status-badge status-warning';
                profileVerificationStatus.textContent = 'Pending Verification';
            }
        }
    }

    setupEventListeners() {
        document.getElementById('updateProfileBtn')?.addEventListener('click', () => this.updateProfile());
        document.getElementById('verifyNowBtn')?.addEventListener('click', () => this.requestVerification());
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        
        // Logo upload preview
        document.getElementById('logoUpload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    document.getElementById('companyLogo').src = evt.target.result;
                    document.getElementById('navbarLogo').innerHTML = `<img src="${evt.target.result}" alt="Logo">`;
                    this.pendingLogo = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async updateProfile() {
        try {
            const profileData = {
                name: document.getElementById('companyName').value,
                email: document.getElementById('companyEmail').value,
                phone: document.getElementById('companyPhone').value,
                address: document.getElementById('companyAddress').value,
                website: document.getElementById('companyWebsite').value,
                description: document.getElementById('companyDescription').value,
                industry: document.getElementById('industry').value,
                // New government fields
                gst_number: document.getElementById('gstNumber').value,
                registration_number: document.getElementById('registrationNumber').value,
                pan_number: document.getElementById('panNumber').value,
                government_id: document.getElementById('governmentId').value,
                updated_at: new Date().toISOString()
            };

            // Handle logo upload
            if (this.pendingLogo) {
                profileData.logo = this.pendingLogo;
                profileData.logo_url = this.pendingLogo;
            }

            // Try Supabase first
            const { error } = await supabase
                .from('companies')
                .update(profileData)
                .eq('user_id', this.companyId);

            if (error) {
                // If Supabase fails, save to localStorage
                const existingProfile = JSON.parse(localStorage.getItem('companyProfile') || '{}');
                const updatedProfile = { ...existingProfile, ...profileData };
                localStorage.setItem('companyProfile', JSON.stringify(updatedProfile));
            }
            
            showNotification('Profile updated successfully!', 'success');
            
            // Reload profile to get updated verification status
            await this.loadCompanyProfile();
            
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Error updating profile', 'error');
        }
    }

    async requestVerification() {
        try {
            // Get current profile
            const { data: { user } } = await supabase.auth.getUser();
            
            // Get complete profile data
            const profileData = {
                company_name: document.getElementById('companyName').value,
                company_email: document.getElementById('companyEmail').value,
                phone: document.getElementById('companyPhone').value,
                address: document.getElementById('companyAddress').value,
                website_url: document.getElementById('companyWebsite').value,
                company_description: document.getElementById('companyDescription').value,
                industry: document.getElementById('industry').value,
                gst_number: document.getElementById('gstNumber').value,
                registration_number: document.getElementById('registrationNumber').value,
                pan_number: document.getElementById('panNumber').value,
                government_id: document.getElementById('governmentId').value,
                logo: this.pendingLogo || document.getElementById('companyLogo').src
            };

            // Create verification request in Supabase
            const { error: supabaseError } = await supabase
                .from('verification_requests')
                .insert([{
                    company_id: user.id,
                    company_name: profileData.company_name,
                    company_email: profileData.company_email,
                    status: 'pending',
                    requested_at: new Date().toISOString(),
                    profile: profileData
                }]);

            if (supabaseError) {
                // If Supabase fails, save to localStorage
                const verificationRequests = JSON.parse(localStorage.getItem('verificationRequests') || '[]');
                
                // Check if already pending
                const existingRequest = verificationRequests.find(r => 
                    r.company_email === profileData.company_email && r.status === 'pending'
                );

                if (existingRequest) {
                    showNotification('Verification request already pending', 'info');
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
            
            showNotification('Verification request sent to admin!', 'success');
            document.getElementById('verifyNowBtn').disabled = true;
            document.getElementById('verifyNowBtn').textContent = 'Request Sent';
            
        } catch (error) {
            console.error('Error requesting verification:', error);
            showNotification('Error sending verification request', 'error');
        }
    }

    async logout() {
        await supabase.auth.signOut();
        // Clear company data from localStorage but keep platform data
        localStorage.removeItem('companyProfile');
        window.location.href = '/pages/login.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new CompanyProfile();
});