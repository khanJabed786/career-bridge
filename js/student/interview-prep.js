/**
 * Interview Preparation Module - Fixed
 */

const interviewCategories = {
  behavioral: [
    {
      question: "Tell me about yourself",
      tips: [
        "Keep it concise (2-3 minutes)",
        "Highlight relevant experience",
        "Mention career goals",
        "Show enthusiasm for the role"
      ],
      sampleAnswer: "I'm a computer science graduate with 2 years of experience in web development. I'm passionate about creating user-friendly applications and have worked on several projects using React and Node.js. I'm looking to grow my skills in a challenging environment."
    },
    {
      question: "Tell me about a time you faced a difficult problem and how you solved it",
      tips: [
        "Use STAR method: Situation, Task, Action, Result",
        "Be specific with examples",
        "Focus on your contribution",
        "Highlight learnings"
      ],
      sampleAnswer: "In my previous role, we faced a critical bug that was affecting user experience. I took initiative to debug the issue, found it was related to database queries, optimized them, and reduced load time by 50%. This taught me the importance of performance optimization."
    },
    {
      question: "Describe a situation where you worked in a team",
      tips: [
        "Mention your specific role",
        "Highlight collaboration",
        "Show respect for team members",
        "Discuss the positive outcome"
      ],
      sampleAnswer: "During my final year project, I worked in a team of 4 to build a job portal. I was responsible for the backend development. We used agile methodology, had daily stand-ups, and delivered the project on time. Our project was selected as the best project of the year."
    }
  ],
  technical: [
    {
      question: "Explain the concepts of OOP",
      tips: [
        "Cover: Encapsulation, Inheritance, Polymorphism, Abstraction",
        "Provide real-world examples",
        "Discuss advantages and use cases"
      ],
      sampleAnswer: "Object-Oriented Programming has four main concepts: Encapsulation (bundling data and methods), Inheritance (creating parent-child relationships), Polymorphism (same interface different implementations), and Abstraction (hiding complex details). For example, a Car class can inherit from Vehicle class."
    },
    {
      question: "What is the difference between SQL and NoSQL?",
      tips: [
        "SQL: Relational, structured data",
        "NoSQL: Non-relational, flexible schema",
        "Discuss use cases for each"
      ],
      sampleAnswer: "SQL databases are relational with predefined schemas, best for complex queries and transactions. Examples: MySQL, PostgreSQL. NoSQL databases are non-relational with dynamic schemas, best for scalability and unstructured data. Examples: MongoDB, Firebase. Choose based on your data structure needs."
    },
    {
      question: "How does REST API work?",
      tips: [
        "Explain HTTP methods: GET, POST, PUT, DELETE",
        "Discuss status codes",
        "Mention request/response format"
      ],
      sampleAnswer: "REST APIs use HTTP methods to perform CRUD operations. GET retrieves data, POST creates new resources, PUT updates, DELETE removes. They return data in JSON/XML format with status codes like 200 (success), 400 (bad request), 404 (not found). Stateless communication between client and server."
    }
  ],
  hr: [
    {
      question: "What are your strengths and weaknesses?",
      tips: [
        "For strengths: Be genuine and relevant",
        "For weaknesses: Show self-awareness",
        "Mention how you're working on improvements"
      ],
      sampleAnswer: "My strengths are problem-solving and quick learning. I enjoy tackling challenges and adapting to new technologies. My weakness is public speaking, but I'm actively working on it by participating in team meetings and taking online communication courses."
    },
    {
      question: "Where do you see yourself in 5 years?",
      tips: [
        "Show ambition and growth mindset",
        "Align with company goals",
        "Mention skill development plans"
      ],
      sampleAnswer: "In 5 years, I see myself as a technical lead, mentoring junior developers and architecting solutions. I want to deepen my expertise in full-stack development and contribute to meaningful projects that impact users positively."
    },
    {
      question: "Why do you want to join our company?",
      tips: [
        "Research the company thoroughly",
        "Mention specific projects or values",
        "Connect your skills to their needs"
      ],
      sampleAnswer: "I admire your company's innovative approach to technology and your focus on employee growth. Your recent project in AI-driven solutions aligns with my interests. I believe my skills in full-stack development and passion for learning would make me a valuable addition to your team."
    }
  ]
};

let currentCategory = 'behavioral';
let recordedAnswers = {};

document.addEventListener('DOMContentLoaded', () => {
  initInterviewPrep();
});

/**
 * Initialize interview prep
 */
function initInterviewPrep() {
  displayCategories();
  displayQuestions('behavioral');
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Category buttons
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const category = e.target.dataset.category;
      if (category) {
        displayQuestions(category);
        
        // Update active state
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      }
    });
  });
}

/**
 * Display categories
 */
function displayCategories() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;

  container.innerHTML = `
    <button class="category-btn active" data-category="behavioral" onclick="displayQuestions('behavioral')">
      <i class="fas fa-users"></i> Behavioral
    </button>
    <button class="category-btn" data-category="technical" onclick="displayQuestions('technical')">
      <i class="fas fa-code"></i> Technical
    </button>
    <button class="category-btn" data-category="hr" onclick="displayQuestions('hr')">
      <i class="fas fa-handshake"></i> HR
    </button>
  `;
}

/**
 * Display questions for category
 */
function displayQuestions(category) {
  currentCategory = category;
  const questions = interviewCategories[category] || [];
  const container = document.getElementById('questionsContainer');
  
  if (!container) return;

  container.innerHTML = questions.map((item, index) => `
    <div class="question-card" id="question-${category}-${index}">
      <div class="question-header" onclick="toggleQuestion(${index}, '${category}')">
        <h3>${index + 1}. ${item.question}</h3>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="question-content" id="content-${category}-${index}" style="display: none;">
        <div class="tips-section">
          <h4><i class="fas fa-lightbulb"></i> Tips</h4>
          <ul>
            ${item.tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
        
        <div class="sample-answer">
          <h4><i class="fas fa-check-circle"></i> Sample Answer</h4>
          <p>${item.sampleAnswer || 'Think about your own experience and prepare a relevant example.'}</p>
        </div>
        
        <div class="practice-section">
          <h4><i class="fas fa-pen"></i> Practice Your Answer</h4>
          <textarea 
            class="practice-answer" 
            placeholder="Write your answer here..." 
            onchange="saveAnswer('${category}', ${index}, this.value)"
          >${recordedAnswers[`${category}-${index}`] || ''}</textarea>
          
          <div class="practice-actions">
            <button class="btn btn-primary" onclick="startRecording(${index}, '${category}')">
              <i class="fas fa-microphone"></i> Record Answer
            </button>
            <button class="btn btn-secondary" onclick="clearAnswer(${index}, '${category}')">
              <i class="fas fa-trash"></i> Clear
            </button>
          </div>
          
          <div class="recording-status" id="recording-${category}-${index}" style="display: none;">
            <i class="fas fa-circle" style="color: #f44336;"></i> Recording...
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Toggle question visibility
 */
function toggleQuestion(index, category) {
  const content = document.getElementById(`content-${category}-${index}`);
  const icon = document.querySelector(`#question-${category}-${index} .fa-chevron-down`);
  
  if (content) {
    if (content.style.display === 'none') {
      content.style.display = 'block';
      icon.style.transform = 'rotate(180deg)';
    } else {
      content.style.display = 'none';
      icon.style.transform = 'rotate(0deg)';
    }
  }
}

/**
 * Save answer to localStorage (temporary)
 */
function saveAnswer(category, index, answer) {
  recordedAnswers[`${category}-${index}`] = answer;
  showToast('Answer saved', 'success');
}

/**
 * Clear answer
 */
function clearAnswer(index, category) {
  const textarea = document.querySelector(`#content-${category}-${index} .practice-answer`);
  if (textarea) {
    textarea.value = '';
    delete recordedAnswers[`${category}-${index}`];
    showToast('Answer cleared', 'info');
  }
}

/**
 * Start recording answer (simulated)
 */
function startRecording(index, category) {
  const recordingStatus = document.getElementById(`recording-${category}-${index}`);
  if (recordingStatus) {
    recordingStatus.style.display = 'flex';
    
    // Simulate recording for 3 seconds
    setTimeout(() => {
      recordingStatus.style.display = 'none';
      
      // Simulate transcribed text
      const textarea = document.querySelector(`#content-${category}-${index} .practice-answer`);
      if (textarea) {
        textarea.value = 'This is a simulated recorded answer. In a real implementation, this would be transcribed from your voice.';
        saveAnswer(category, index, textarea.value);
      }
      
      showToast('Recording saved!', 'success');
    }, 3000);
  }
}

/**
 * Show toast
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Make functions globally available
window.displayQuestions = displayQuestions;
window.toggleQuestion = toggleQuestion;
window.saveAnswer = saveAnswer;
window.clearAnswer = clearAnswer;
window.startRecording = startRecording;