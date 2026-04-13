/**
 * Resume Builder Logic - Fixed with Supabase only
 * ATS-friendly resume builder with PDF export
 */

let resumeData = {
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    portfolio: '',
    github: '',
    summary: ''
  },
  experience: [],
  education: [],
  skills: []
};

let studentProfile = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.authService) {
    if (!window.authService.requireRole('student')) return;
    await initResumeBuilder();
  }
});

/**
 * Initialize resume builder
 */
async function initResumeBuilder() {
  try {
    const user = window.authService.getCurrentUser();
    
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Load student profile
    await loadStudentProfile(user.id);
    
    // Load existing resume data
    await loadResumeData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update preview
    updatePreview();

  } catch (error) {
    console.error('Resume builder initialization error:', error);
    showAlert('Error loading resume builder', 'danger');
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
    }

  } catch (error) {
    console.error('Load profile error:', error);
  }
}

/**
 * Load resume data from student profile
 */
async function loadResumeData() {
  if (!studentProfile) return;

  resumeData.personalInfo = {
    fullName: studentProfile.full_name || '',
    email: studentProfile.email || '',
    phone: studentProfile.phone || '',
    location: studentProfile.location || '',
    linkedIn: studentProfile.linkedin_url || '',
    portfolio: studentProfile.portfolio_url || '',
    github: studentProfile.github_url || '',
    summary: studentProfile.bio || ''
  };

  resumeData.skills = studentProfile.current_skills || [];

  // If there's saved resume data in profile, parse it
  if (studentProfile.resume_data) {
    try {
      const savedData = JSON.parse(studentProfile.resume_data);
      resumeData.experience = savedData.experience || [];
      resumeData.education = savedData.education || [];
    } catch (e) {
      console.error('Error parsing resume data:', e);
    }
  }

  populateForm();
}

/**
 * Populate form with resume data
 */
function populateForm() {
  // Personal info
  document.getElementById('fullName').value = resumeData.personalInfo.fullName;
  document.getElementById('email').value = resumeData.personalInfo.email;
  document.getElementById('phone').value = resumeData.personalInfo.phone;
  document.getElementById('location').value = resumeData.personalInfo.location;
  document.getElementById('linkedIn').value = resumeData.personalInfo.linkedIn;
  document.getElementById('portfolio').value = resumeData.personalInfo.portfolio;
  document.getElementById('github').value = resumeData.personalInfo.github;
  document.getElementById('summary').value = resumeData.personalInfo.summary;

  // Experience
  displayExperience();
  
  // Education
  displayEducation();
  
  // Skills
  updateSkillsList();
}

/**
 * Display experience entries
 */
function displayExperience() {
  const container = document.getElementById('experienceContainer');
  if (!container) return;

  if (resumeData.experience.length === 0) {
    container.innerHTML = '<p class="text-muted">No experience added yet. Click "Add Experience" to add.</p>';
    return;
  }

  container.innerHTML = resumeData.experience.map((exp, index) => `
    <div class="experience-entry" data-index="${index}">
      <div class="entry-header">
        <h4>${exp.title || 'New Position'}</h4>
        <button type="button" class="btn-remove" onclick="removeExperience(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="entry-content">
        <input type="text" placeholder="Job Title" value="${exp.title || ''}" 
               onchange="updateExperience(${index}, 'title', this.value)">
        <input type="text" placeholder="Company" value="${exp.company || ''}" 
               onchange="updateExperience(${index}, 'company', this.value)">
        <input type="text" placeholder="Duration (e.g., Jan 2020 - Dec 2021)" value="${exp.duration || ''}" 
               onchange="updateExperience(${index}, 'duration', this.value)">
        <textarea placeholder="Job Description..." 
                  onchange="updateExperience(${index}, 'description', this.value)">${exp.description || ''}</textarea>
      </div>
    </div>
  `).join('');
}

/**
 * Update experience field
 */
function updateExperience(index, field, value) {
  if (!resumeData.experience[index]) {
    resumeData.experience[index] = {};
  }
  resumeData.experience[index][field] = value;
  updatePreview();
}

/**
 * Add experience
 */
function addExperience() {
  resumeData.experience.push({
    title: '',
    company: '',
    duration: '',
    description: ''
  });
  displayExperience();
  updatePreview();
}

/**
 * Remove experience
 */
function removeExperience(index) {
  resumeData.experience.splice(index, 1);
  displayExperience();
  updatePreview();
}

/**
 * Display education entries
 */
function displayEducation() {
  const container = document.getElementById('educationContainer');
  if (!container) return;

  if (resumeData.education.length === 0) {
    container.innerHTML = '<p class="text-muted">No education added yet. Click "Add Education" to add.</p>';
    return;
  }

  container.innerHTML = resumeData.education.map((edu, index) => `
    <div class="education-entry" data-index="${index}">
      <div class="entry-header">
        <h4>${edu.school || 'New Education'}</h4>
        <button type="button" class="btn-remove" onclick="removeEducation(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="entry-content">
        <input type="text" placeholder="School/University" value="${edu.school || ''}" 
               onchange="updateEducation(${index}, 'school', this.value)">
        <input type="text" placeholder="Degree" value="${edu.degree || ''}" 
               onchange="updateEducation(${index}, 'degree', this.value)">
        <input type="text" placeholder="Field of Study" value="${edu.field || ''}" 
               onchange="updateEducation(${index}, 'field', this.value)">
        <input type="text" placeholder="Graduation Year" value="${edu.year || ''}" 
               onchange="updateEducation(${index}, 'year', this.value)">
      </div>
    </div>
  `).join('');
}

/**
 * Update education field
 */
function updateEducation(index, field, value) {
  if (!resumeData.education[index]) {
    resumeData.education[index] = {};
  }
  resumeData.education[index][field] = value;
  updatePreview();
}

/**
 * Add education
 */
function addEducation() {
  resumeData.education.push({
    school: '',
    degree: '',
    field: '',
    year: ''
  });
  displayEducation();
  updatePreview();
}

/**
 * Remove education
 */
function removeEducation(index) {
  resumeData.education.splice(index, 1);
  displayEducation();
  updatePreview();
}

/**
 * Add skill
 */
function addSkill() {
  const input = document.getElementById('skillInput');
  if (!input || !input.value.trim()) return;

  const skill = input.value.trim();
  
  if (!resumeData.skills.includes(skill)) {
    resumeData.skills.push(skill);
    updateSkillsList();
    updatePreview();
    input.value = '';
  } else {
    showAlert('Skill already exists', 'warning');
  }
}

/**
 * Update skills list
 */
function updateSkillsList() {
  const container = document.getElementById('skillsList');
  if (!container) return;

  if (resumeData.skills.length === 0) {
    container.innerHTML = '<p class="text-muted">No skills added yet</p>';
    return;
  }

  container.innerHTML = resumeData.skills.map((skill, index) => `
    <div class="skill-tag">
      ${skill}
      <button type="button" onclick="removeSkill(${index})">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

/**
 * Remove skill
 */
function removeSkill(index) {
  resumeData.skills.splice(index, 1);
  updateSkillsList();
  updatePreview();
}

/**
 * Update preview
 */
function updatePreview() {
  // Update header
  document.getElementById('previewName').textContent = resumeData.personalInfo.fullName || 'Your Name';
  document.getElementById('previewContact').textContent = 
    `${resumeData.personalInfo.email || 'email@example.com'} | ${resumeData.personalInfo.phone || '+91-XXXXXXXXXX'} | ${resumeData.personalInfo.location || 'City'}`;

  // Update summary
  document.getElementById('previewSummary').innerHTML = resumeData.personalInfo.summary ? `
    <div class="resume-section">
      <div class="resume-section-title">PROFESSIONAL SUMMARY</div>
      <p style="color: #666;">${resumeData.personalInfo.summary}</p>
    </div>
  ` : '';

  // Update experience
  let experienceHTML = '';
  if (resumeData.experience.some(exp => exp.title || exp.company)) {
    experienceHTML = '<div class="resume-section"><div class="resume-section-title">EXPERIENCE</div>';
    resumeData.experience.forEach(exp => {
      if (exp.title || exp.company) {
        experienceHTML += `
          <div class="resume-entry">
            <div class="resume-entry-title">${exp.title || 'Position'}</div>
            <div class="resume-entry-subtitle">${exp.company || 'Company'} | ${exp.duration || 'Duration'}</div>
            <div class="resume-entry-description">${exp.description || ''}</div>
          </div>
        `;
      }
    });
    experienceHTML += '</div>';
  }
  document.getElementById('previewExperience').innerHTML = experienceHTML;

  // Update education
  let educationHTML = '';
  if (resumeData.education.some(edu => edu.school)) {
    educationHTML = '<div class="resume-section"><div class="resume-section-title">EDUCATION</div>';
    resumeData.education.forEach(edu => {
      if (edu.school) {
        educationHTML += `
          <div class="resume-entry">
            <div class="resume-entry-title">${edu.degree || 'Degree'} in ${edu.field || 'Field'}</div>
            <div class="resume-entry-subtitle">${edu.school} | ${edu.year || 'Year'}</div>
          </div>
        `;
      }
    });
    educationHTML += '</div>';
  }
  document.getElementById('previewEducation').innerHTML = educationHTML;

  // Update skills
  if (resumeData.skills.length > 0) {
    document.getElementById('previewSkills').innerHTML = `
      <div class="resume-section">
        <div class="resume-section-title">SKILLS</div>
        <div class="skill-tags">
          ${resumeData.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Calculate ATS score
  calculateATSScore();
}

/**
 * Calculate ATS Score
 */
function calculateATSScore() {
  let score = 0;

  // Name (10 points)
  if (resumeData.personalInfo.fullName) score += 10;

  // Contact info (5 points each)
  if (resumeData.personalInfo.email) score += 5;
  if (resumeData.personalInfo.phone) score += 5;
  if (resumeData.personalInfo.location) score += 5;

  // Professional links (5 points each)
  if (resumeData.personalInfo.linkedIn) score += 5;
  if (resumeData.personalInfo.portfolio) score += 5;
  if (resumeData.personalInfo.github) score += 5;

  // Summary (10 points)
  if (resumeData.personalInfo.summary) score += 10;

  // Experience entries (8 points each, max 20)
  const expCount = resumeData.experience.filter(exp => exp.title || exp.company).length;
  score += Math.min(expCount * 8, 20);

  // Education entries (8 points each, max 15)
  const eduCount = resumeData.education.filter(edu => edu.school).length;
  score += Math.min(eduCount * 8, 15);

  // Skills (5 points each, max 15)
  score += Math.min(resumeData.skills.length * 5, 15);

  const finalScore = Math.min(score, 100);
  document.getElementById('atsScore').textContent = finalScore;
  
  return finalScore;
}

/**
 * Save resume to Supabase
 */
async function saveResume() {
  try {
    if (!studentProfile) {
      showAlert('Error: Profile not found', 'danger');
      return;
    }

    const atsScore = calculateATSScore();
    
    // Prepare resume data for saving
    const resumeJson = JSON.stringify({
      experience: resumeData.experience,
      education: resumeData.education
    });

    const { error } = await window.supabase.db.update(
      'student_profiles',
      {
        full_name: resumeData.personalInfo.fullName,
        phone: resumeData.personalInfo.phone,
        location: resumeData.personalInfo.location,
        linkedin_url: resumeData.personalInfo.linkedIn,
        portfolio_url: resumeData.personalInfo.portfolio,
        github_url: resumeData.personalInfo.github,
        bio: resumeData.personalInfo.summary,
        current_skills: resumeData.skills,
        resume_data: resumeJson,
        resume_score: atsScore,
        updated_at: new Date().toISOString()
      },
      studentProfile.id
    );

    if (error) throw error;

    showAlert('✅ Resume saved successfully!', 'success');

  } catch (error) {
    console.error('Save error:', error);
    showAlert('❌ Error saving resume: ' + error.message, 'danger');
  }
}

/**
 * Download PDF
 */
function downloadPDF() {
  const element = document.getElementById('resumePreview');
  
  if (typeof html2pdf === 'undefined') {
    showAlert('PDF library not loaded', 'danger');
    return;
  }

  const opt = {
    margin: [0.5, 0.5, 0.5, 0.5],
    filename: `${resumeData.personalInfo.fullName || 'resume'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
  showAlert('✅ Resume downloaded successfully!', 'success');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Personal info inputs
  const personalInputs = ['fullName', 'email', 'phone', 'location', 'linkedIn', 'portfolio', 'github', 'summary'];
  personalInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', (e) => {
        resumeData.personalInfo[id] = e.target.value;
        updatePreview();
      });
    }
  });

  // Add buttons
  document.getElementById('addExperienceBtn')?.addEventListener('click', addExperience);
  document.getElementById('addEducationBtn')?.addEventListener('click', addEducation);
  document.getElementById('addSkillBtn')?.addEventListener('click', addSkill);
  
  // Save and download buttons
  document.getElementById('saveResumeBtn')?.addEventListener('click', saveResume);
  document.getElementById('downloadPDFBtn')?.addEventListener('click', downloadPDF);

  // Skill input enter key
  const skillInput = document.getElementById('skillInput');
  if (skillInput) {
    skillInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkill();
      }
    });
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
window.addExperience = addExperience;
window.removeExperience = removeExperience;
window.updateExperience = updateExperience;
window.addEducation = addEducation;
window.removeEducation = removeEducation;
window.updateEducation = updateEducation;
window.addSkill = addSkill;
window.removeSkill = removeSkill;
window.downloadPDF = downloadPDF;
window.saveResume = saveResume;