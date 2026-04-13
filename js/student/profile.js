/**
 * Student Profile Management - FINAL FIXED VERSION
 */

let studentProfile = null;
let profileId = null;

// ============================================
// WAIT FOR SUPABASE
// ============================================
async function waitForSupabase() {
    return new Promise((resolve) => {
        if (window.supabaseClient) {
            resolve(window.supabaseClient);
            return;
        }
        const check = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(check);
                resolve(window.supabaseClient);
            }
        }, 100);
    });
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForSupabase();
        
        const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
        if (userError || !user) {
            window.location.href = 'login.html';
            return;
        }
        
        console.log('Current user ID:', user.id);
        
        // Direct query to get profile by user_id
        const { data, error } = await window.supabaseClient
            .from('student_profiles')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        if (data && data.length > 0) {
            studentProfile = data[0];
            profileId = studentProfile.id;
            console.log('Profile loaded, ID:', profileId);
            console.log('Profile data:', studentProfile);
            displayProfile();
        } else {
            console.log('No profile found - creating new one');
            // Create new profile if doesn't exist
            const { data: newProfile, error: createError } = await window.supabaseClient
                .from('student_profiles')
                .insert([{
                    user_id: user.id,
                    full_name: user.email.split('@')[0],
                    email: user.email,
                    current_skills: []
                }])
                .select();
            
            if (createError) throw createError;
            
            if (newProfile && newProfile.length > 0) {
                studentProfile = newProfile[0];
                profileId = studentProfile.id;
                displayProfile();
            }
        }
        
        setupEventListeners();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    }
});

// ============================================
// DISPLAY PROFILE
// ============================================
function displayProfile() {
    if (!studentProfile) return;

    // Basic info
    document.getElementById('fullName').value = studentProfile.full_name || '';
    document.getElementById('email').value = studentProfile.email || '';
    document.getElementById('phone').value = studentProfile.phone || '';
    document.getElementById('location').value = studentProfile.location || '';
    
    // Social links
    document.getElementById('linkedIn').value = studentProfile.linkedin_url || '';
    document.getElementById('github').value = studentProfile.github_url || '';
    document.getElementById('portfolio').value = studentProfile.portfolio_url || '';
    
    // About
    document.getElementById('bio').value = studentProfile.bio || '';
    document.getElementById('education').value = studentProfile.education || '';
    document.getElementById('experience').value = studentProfile.experience || '';

    // Skills
    displaySkills(studentProfile.current_skills || []);

    // Profile picture
    if (studentProfile.profile_picture) {
        const picDisplay = document.getElementById('profilePicDisplay');
        if (picDisplay) {
            picDisplay.innerHTML = `<img src="${studentProfile.profile_picture}" style="width:100%; height:100%; object-fit:cover;">`;
        }
    }

    // Display name at top
    document.getElementById('displayName').textContent = studentProfile.full_name || 'Your Name';
    document.getElementById('displayEmail').textContent = studentProfile.email || '';
    document.getElementById('displayLocation').textContent = studentProfile.location || 'Your Location';
}

// ============================================
// SKILLS
// ============================================
function displaySkills(skills) {
    const container = document.getElementById('skillsList');
    if (!container) return;
    
    if (!skills || skills.length === 0) {
        container.innerHTML = '<p>No skills added</p>';
        return;
    }
    
    container.innerHTML = skills.map((skill, index) => 
        `<div>${skill} <button onclick="removeSkill(${index})">✕</button></div>`
    ).join('');
}

window.addSkill = function() {
    const input = document.getElementById('skillInput');
    const skill = input.value.trim();
    if (!skill) return;
    
    if (!studentProfile.current_skills) studentProfile.current_skills = [];
    if (!studentProfile.current_skills.includes(skill)) {
        studentProfile.current_skills.push(skill);
        displaySkills(studentProfile.current_skills);
        input.value = '';
    }
};

window.removeSkill = function(index) {
    studentProfile.current_skills.splice(index, 1);
    displaySkills(studentProfile.current_skills);
};

// ============================================
// ✅ FIXED: SAVE PROFILE - USING ID
// ============================================
window.saveProfile = async function() {
    try {
        if (!profileId) {
            alert('Profile ID not found');
            return;
        }

        const data = {
            full_name: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            location: document.getElementById('location').value,
            linkedin_url: document.getElementById('linkedIn').value,
            github_url: document.getElementById('github').value,
            portfolio_url: document.getElementById('portfolio').value,
            bio: document.getElementById('bio').value,
            education: document.getElementById('education').value,
            experience: document.getElementById('experience').value,
            current_skills: studentProfile.current_skills || []
        };

        console.log('Updating profile ID:', profileId);
        console.log('Update data:', data);

        // ✅ CRITICAL: Update using ID, NOT user_id
        const { error } = await window.supabaseClient
            .from('student_profiles')
            .update(data)
            .eq('id', profileId);  // Using PRIMARY KEY

        if (error) throw error;

        // Update local object
        studentProfile = { ...studentProfile, ...data };
        
        // Update display
        document.getElementById('displayName').textContent = data.full_name || 'Your Name';
        document.getElementById('displayLocation').textContent = data.location || 'Your Location';
        
        alert('✅ Profile saved successfully!');

    } catch (error) {
        console.error('Save error:', error);
        alert('❌ Error: ' + error.message);
    }
};

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    document.getElementById('addSkillBtn')?.addEventListener('click', window.addSkill);
    document.getElementById('saveBtn')?.addEventListener('click', window.saveProfile);
    
    document.getElementById('skillInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            window.addSkill();
        }
    });
    
    // Photo upload
    document.getElementById('photoInput')?.addEventListener('change', async (e) => {
        if (e.target.files?.[0]) {
            await uploadProfilePicture(e.target.files[0]);
        }
    });
}

// ============================================
// UPLOAD PROFILE PICTURE
// ============================================
async function uploadProfilePicture(file) {
    try {
        if (!profileId) throw new Error('Profile not loaded');
        
        const fileExt = file.name.split('.').pop();
        const fileName = `profile_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await window.supabaseClient.storage
            .from('profile-pictures')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(fileName);
        
        const { error } = await window.supabaseClient
            .from('student_profiles')
            .update({ profile_picture: publicUrl })
            .eq('id', profileId);
        
        if (error) throw error;
        
        studentProfile.profile_picture = publicUrl;
        document.getElementById('profilePicDisplay').innerHTML = 
            `<img src="${publicUrl}" style="width:100%; height:100%; object-fit:cover;">`;
        
        alert('✅ Photo updated!');

    } catch (error) {
        alert('❌ Upload failed: ' + error.message);
    }
}

// ============================================
// UPLOAD RESUME
// ============================================
async function uploadResume(file) {
    try {
        if (!profileId) throw new Error('Profile not loaded');
        
        const fileExt = file.name.split('.').pop();
        const fileName = `resume_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await window.supabaseClient.storage
            .from('resumes')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = window.supabaseClient.storage
            .from('resumes')
            .getPublicUrl(fileName);
        
        const { error } = await window.supabaseClient
            .from('student_profiles')
            .update({ resume_url: publicUrl })
            .eq('id', profileId);
        
        if (error) throw error;
        
        studentProfile.resume_url = publicUrl;
        alert('✅ Resume uploaded!');

    } catch (error) {
        alert('❌ Upload failed: ' + error.message);
    }
}

// Make functions globally available
window.uploadProfilePicture = uploadProfilePicture;
window.uploadResume = uploadResume;