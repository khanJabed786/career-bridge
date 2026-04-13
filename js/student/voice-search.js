/**
 * Voice-based Job Search - Fixed with Supabase only
 */

let isListening = false;
let transcript = '';
let recognition = null;

document.addEventListener('DOMContentLoaded', () => {
  initVoiceSearch();
});

/**
 * Initialize voice search
 */
function initVoiceSearch() {
  // Initialize Speech Recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      updateMicStatus('listening');
    };

    recognition.onresult = (event) => {
      transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      displayTranscript(transcript);
    };

    recognition.onerror = (event) => {
      updateMicStatus('error', event.error);
    };

    recognition.onend = () => {
      isListening = false;
      updateMicStatus('idle');
    };
  } else {
    updateMicStatus('unsupported');
  }

  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  const micBtn = document.getElementById('micButton');
  if (micBtn) {
    micBtn.addEventListener('click', toggleListening);
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetVoiceSearch);
  }

  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', performVoiceSearch);
  }
}

/**
 * Toggle listening
 */
function toggleListening() {
  if (recognition) {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  } else {
    showAlert('Speech Recognition not supported in your browser', 'warning');
  }
}

/**
 * Update mic status
 */
function updateMicStatus(status, error = null) {
  const statusDiv = document.getElementById('status');
  const micBtn = document.getElementById('micButton');
  
  if (!statusDiv || !micBtn) return;

  const statusMessages = {
    idle: 'Click the microphone and speak your job search',
    listening: '🎤 Listening... Speak now',
    error: `❌ Error: ${error || 'Please try again'}`,
    unsupported: '❌ Speech Recognition not supported in your browser'
  };

  statusDiv.textContent = statusMessages[status] || '';

  if (status === 'listening') {
    micBtn.classList.add('listening');
    micBtn.innerHTML = '<i class="fas fa-microphone"></i> Listening...';
  } else {
    micBtn.classList.remove('listening');
    micBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Listening';
  }
}

/**
 * Display transcript
 */
function displayTranscript(text) {
  const transcriptDiv = document.getElementById('transcript');
  if (transcriptDiv) {
    transcriptDiv.textContent = `"${text}"`;
    transcriptDiv.style.display = 'block';
  }
}

/**
 * Reset voice search
 */
function resetVoiceSearch() {
  transcript = '';
  document.getElementById('transcript').style.display = 'none';
  document.getElementById('transcript').textContent = '';
  document.getElementById('results').innerHTML = '';
  updateMicStatus('idle');
  
  if (recognition && isListening) {
    recognition.stop();
  }
}

/**
 * Perform voice search
 */
async function performVoiceSearch() {
  if (!transcript.trim()) {
    showAlert('Please speak first or type your search!', 'warning');
    return;
  }

  updateMicStatus('idle');
  document.getElementById('status').textContent = '🔍 Searching jobs...';
  
  const searchBtn = document.getElementById('searchBtn');
  const originalText = searchBtn.innerHTML;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
  searchBtn.disabled = true;

  try {
    // Parse voice input for job search criteria
    const searchCriteria = parseVoiceInput(transcript);

    // Perform job search
    const jobs = await searchJobsByVoice(searchCriteria);

    displayVoiceSearchResults(jobs, transcript);

  } catch (error) {
    console.error('Voice search error:', error);
    showAlert('Error searching jobs', 'danger');
    document.getElementById('status').textContent = 'Error searching. Please try again.';
  } finally {
    searchBtn.innerHTML = originalText;
    searchBtn.disabled = false;
  }
}

/**
 * Parse voice input
 */
function parseVoiceInput(input) {
  const criteria = {
    keywords: [],
    location: null,
    jobType: null
  };

  const lower = input.toLowerCase();

  // Extract location
  const locations = [
    'delhi', 'mumbai', 'bangalore', 'pune', 'hyderabad', 'chennai', 
    'kolkata', 'ahmedabad', 'noida', 'gurgaon', 'remote', 'work from home'
  ];
  
  locations.forEach(loc => {
    if (lower.includes(loc)) {
      if (loc === 'work from home' || loc === 'remote') {
        criteria.location = 'Remote';
      } else {
        criteria.location = loc.charAt(0).toUpperCase() + loc.slice(1);
      }
    }
  });

  // Extract job type
  if (lower.includes('full time') || lower.includes('fulltime')) 
    criteria.jobType = 'Full-time';
  else if (lower.includes('part time') || lower.includes('parttime')) 
    criteria.jobType = 'Part-time';
  else if (lower.includes('internship')) 
    criteria.jobType = 'Internship';
  else if (lower.includes('contract')) 
    criteria.jobType = 'Contract';

  // Extract keywords (job titles)
  const jobKeywords = [
    'developer', 'engineer', 'designer', 'analyst', 'manager', 
    'consultant', 'architect', 'administrator', 'specialist',
    'frontend', 'backend', 'full stack', 'devops', 'data scientist',
    'machine learning', 'ai', 'software', 'web', 'mobile', 'ios', 'android'
  ];
  
  jobKeywords.forEach(keyword => {
    if (lower.includes(keyword)) {
      criteria.keywords.push(keyword);
    }
  });

  // If no specific keywords found, use the whole phrase
  if (criteria.keywords.length === 0 && input.length > 0) {
    criteria.keywords = [input];
  }

  return criteria;
}

/**
 * Search jobs by voice criteria
 */
async function searchJobsByVoice(criteria) {
  try {
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

    if (criteria.location) {
      query = query.ilike('location', `%${criteria.location}%`);
    }

    if (criteria.jobType) {
      query = query.eq('type', criteria.jobType);
    }

    if (criteria.keywords.length > 0) {
      // Search in title and description
      const keyword = criteria.keywords[0];
      query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }

    const { data: jobs, error } = await query.limit(10);

    if (error) throw error;
    return jobs || [];

  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Display voice search results
 */
function displayVoiceSearchResults(jobs, voiceInput) {
  const resultsDiv = document.getElementById('results');
  
  if (!resultsDiv) return;

  if (jobs.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <p>No jobs found matching "${voiceInput}"</p>
        <p class="suggestion">Try: "software developer in bangalore" or "remote internship"</p>
        <button class="btn btn-primary" onclick="resetVoiceSearch()">
          <i class="fas fa-redo"></i> Try Again
        </button>
      </div>
    `;
    document.getElementById('status').textContent = 'No jobs found';
    return;
  }

  resultsDiv.innerHTML = `
    <h3>📋 Found ${jobs.length} jobs for "${voiceInput}"</h3>
    <div class="jobs-grid">
      ${jobs.map(job => `
        <div class="job-card">
          <div class="job-card-header">
            <h4>${job.title}</h4>
            <span class="company">${job.company_profiles?.company_name || 'Company'}</span>
          </div>
          <div class="job-card-details">
            <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
            <span><i class="fas fa-clock"></i> ${job.type}</span>
            <span><i class="fas fa-money-bill"></i> ${job.salary}</span>
          </div>
          <button class="apply-btn" onclick="window.location.href='apply-job.html?id=${job.id}'">
            Apply Now
          </button>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('status').textContent = `✅ Found ${jobs.length} jobs`;
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
window.toggleListening = toggleListening;
window.resetVoiceSearch = resetVoiceSearch;
window.performVoiceSearch = performVoiceSearch;