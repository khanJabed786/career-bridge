/**
 * Aptitude Tests Module - Fixed with Supabase only
 */

const testQuestions = {
  quantitative: [
    {
      question: "What is 15% of 200?",
      options: ["30", "25", "35", "20"],
      correct: 0
    },
    {
      question: "If a man walks at 5 km/hr for 8 hours, what is the distance?",
      options: ["30 km", "35 km", "40 km", "45 km"],
      correct: 2
    },
    {
      question: "What is the area of a circle with radius 7? (π=22/7)",
      options: ["154", "196", "198", "210"],
      correct: 0
    },
    {
      question: "Solve: 2x + 5 = 15",
      options: ["3", "5", "10", "20"],
      correct: 1
    },
    {
      question: "What is the average of 10, 20, 30, 40, 50?",
      options: ["25", "30", "35", "40"],
      correct: 1
    }
  ],
  logical: [
    {
      question: "If all roses are flowers and some flowers fade quickly, then:",
      options: [
        "All roses fade quickly", 
        "Some roses fade quickly", 
        "No roses fade quickly", 
        "Cannot be determined"
      ],
      correct: 3
    },
    {
      question: "Which number comes next? 2, 5, 10, 17, ?",
      options: ["24", "25", "26", "27"],
      correct: 2
    },
    {
      question: "All cats are animals. All animals have legs. Therefore:",
      options: [
        "All cats have legs", 
        "Some cats have legs", 
        "Cats may or may not have legs", 
        "No conclusion"
      ],
      correct: 0
    },
    {
      question: "Which shape doesn't belong? Circle, Triangle, Square, Sphere",
      options: ["Circle", "Triangle", "Square", "Sphere"],
      correct: 3
    }
  ],
  verbal: [
    {
      question: "Choose the word closest in meaning to 'Perspicacious':",
      options: ["Lazy", "Keen insight", "Generous", "Timid"],
      correct: 1
    },
    {
      question: "Antonym of 'Verbose':",
      options: ["Concise", "Detailed", "Explanatory", "Long"],
      correct: 0
    },
    {
      question: "Fill in the blank: She is as light as a ___",
      options: ["feather", "cloud", "breeze", "dream"],
      correct: 0
    },
    {
      question: "Correct the sentence: 'He don't like apples'",
      options: [
        "He doesn't like apples", 
        "He not like apples", 
        "He don't likes apples", 
        "He didn't like apples"
      ],
      correct: 0
    }
  ],
  python: [
    {
      question: "What is the output of print(2 ** 3)?",
      options: ["6", "8", "5", "9"],
      correct: 1
    },
    {
      question: "Which method adds an element to a list?",
      options: ["add()", "append()", "insert()", "extend()"],
      correct: 1
    },
    {
      question: "What does 'len()' do?",
      options: ["Returns type", "Returns length", "Converts to list", "Returns value"],
      correct: 1
    },
    {
      question: "What is the correct syntax for dictionary?",
      options: [
        "d = {key: value}", 
        "d = [key, value]", 
        "d = (key, value)", 
        "d = <key, value>"
      ],
      correct: 0
    }
  ],
  java: [
    {
      question: "Which keyword is used to define a class in Java?",
      options: ["class", "Class", "CLASS", "def"],
      correct: 0
    },
    {
      question: "What is the correct way to declare a variable?",
      options: ["int x;", "x int;", "declare x as int;", "int x()"],
      correct: 0
    },
    {
      question: "Which method is the entry point of a Java program?",
      options: ["start()", "main()", "run()", "init()"],
      correct: 1
    },
    {
      question: "What is the default value of a boolean in Java?",
      options: ["0", "false", "null", "undefined"],
      correct: 1
    }
  ],
  sql: [
    {
      question: "Which command retrieves data from a database?",
      options: ["RETRIEVE", "SELECT", "GET", "FETCH"],
      correct: 1
    },
    {
      question: "Which keyword is used to sort results?",
      options: ["SORT", "ORDER BY", "ARRANGE", "ORGANIZE"],
      correct: 1
    },
    {
      question: "What does JOIN do?",
      options: ["Combines rows from two tables", "Creates a new table", "Deletes data", "Updates data"],
      correct: 0
    },
    {
      question: "Which SQL statement is used to update data?",
      options: ["MODIFY", "UPDATE", "CHANGE", "ALTER"],
      correct: 1
    }
  ]
};

let currentTest = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let timeLeft = 0;
let timerInterval = null;
let testResults = [];

document.addEventListener('DOMContentLoaded', () => {
  initAptitudeTests();
});

/**
 * Initialize aptitude tests
 */
function initAptitudeTests() {
  displayAvailableTests();
  loadTestResults();
  setupEventListeners();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Close modal on outside click
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('resultModal');
    if (e.target === modal) {
      closeModal();
    }
  });
}

/**
 * Display available tests
 */
function displayAvailableTests() {
  const tests = [
    { id: 'quantitative', name: 'Quantitative Aptitude', icon: '🔢', questions: 5, time: 10, description: 'Test your mathematical and numerical skills' },
    { id: 'logical', name: 'Logical Reasoning', icon: '🧩', questions: 4, time: 8, description: 'Test your logical thinking and problem-solving' },
    { id: 'verbal', name: 'Verbal Ability', icon: '📚', questions: 4, time: 8, description: 'Test your English language skills' },
    { id: 'python', name: 'Python Programming', icon: '🐍', questions: 4, time: 10, description: 'Test your Python knowledge' },
    { id: 'java', name: 'Java Programming', icon: '☕', questions: 4, time: 10, description: 'Test your Java programming skills' },
    { id: 'sql', name: 'SQL Database', icon: '🗄️', questions: 4, time: 8, description: 'Test your SQL query knowledge' }
  ];

  const container = document.getElementById('testsGrid');
  if (!container) return;

  container.innerHTML = tests.map(test => `
    <div class="test-card" data-test="${test.id}">
      <div class="test-icon">${test.icon}</div>
      <div class="test-title">${test.name}</div>
      <div class="test-description">${test.description}</div>
      <div class="test-meta">
        <span><i class="fas fa-question-circle"></i> ${test.questions} Questions</span>
        <span><i class="fas fa-clock"></i> ${test.time} minutes</span>
      </div>
      <button class="start-btn" onclick="startTest('${test.id}')">
        <i class="fas fa-play"></i> Start Test
      </button>
    </div>
  `).join('');
}

/**
 * Load test results from Supabase
 */
async function loadTestResults() {
  try {
    const user = window.authService?.getCurrentUser();
    if (!user) return;

    const { data: profile } = await window.supabase.db.select('student_profiles', { user_id: user.id });
    if (!profile || profile.length === 0) return;

    const { data: results, error } = await window.supabase.db.select(
      'test_results',
      { student_id: profile[0].id },
      { orderBy: 'completed_at', ascending: false }
    );

    if (error) throw error;

    testResults = results || [];
    displayTestHistory();

  } catch (error) {
    console.error('Error loading test results:', error);
  }
}

/**
 * Display test history
 */
function displayTestHistory() {
  const container = document.getElementById('testHistory');
  if (!container) return;

  if (testResults.length === 0) {
    container.innerHTML = '<p class="text-muted">No tests taken yet</p>';
    return;
  }

  container.innerHTML = testResults.map(result => `
    <div class="history-item">
      <div class="history-info">
        <strong>${getTestName(result.test_id)}</strong>
        <span class="score">Score: ${result.score}/${result.total_questions}</span>
      </div>
      <div class="history-meta">
        <span>${result.percentage}%</span>
        <span>${new Date(result.completed_at).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

/**
 * Get test name from ID
 */
function getTestName(testId) {
  const names = {
    quantitative: 'Quantitative Aptitude',
    logical: 'Logical Reasoning',
    verbal: 'Verbal Ability',
    python: 'Python Programming',
    java: 'Java Programming',
    sql: 'SQL Database'
  };
  return names[testId] || testId;
}

/**
 * Start test
 */
function startTest(testType) {
  currentTest = testType;
  currentQuestionIndex = 0;
  userAnswers = new Array(testQuestions[testType].length).fill(-1);
  
  const timeAllowed = {
    quantitative: 10 * 60,
    logical: 8 * 60,
    verbal: 8 * 60,
    python: 10 * 60,
    java: 10 * 60,
    sql: 8 * 60
  };

  timeLeft = timeAllowed[testType] || 10 * 60;

  // Hide tests grid, show test container
  document.getElementById('testsGrid').style.display = 'none';
  document.getElementById('testHistory').style.display = 'none';
  document.getElementById('testContainer').classList.add('active');
  
  document.getElementById('testTitle').textContent = getTestName(testType);
  document.getElementById('totalQuestions').textContent = testQuestions[testType].length;

  startTimer();
  displayQuestion();
}

/**
 * Start timer
 */
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    timeLeft--;
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitTest();
    }
  }, 1000);
}

/**
 * Display question
 */
function displayQuestion() {
  const questions = testQuestions[currentTest];
  const question = questions[currentQuestionIndex];

  document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;

  const container = document.getElementById('questionsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="question-display">
      <div class="question-text">${question.question}</div>
      <div class="options-grid">
        ${question.options.map((option, index) => `
          <label class="option-card ${userAnswers[currentQuestionIndex] === index ? 'selected' : ''}">
            <input type="radio" name="answer" value="${index}" 
              ${userAnswers[currentQuestionIndex] === index ? 'checked' : ''}
              onchange="selectAnswer(${index})">
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span class="option-text">${option}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Select answer
 */
function selectAnswer(index) {
  userAnswers[currentQuestionIndex] = index;
}

/**
 * Next question
 */
function nextQuestion() {
  if (currentQuestionIndex < testQuestions[currentTest].length - 1) {
    currentQuestionIndex++;
    displayQuestion();
  }
}

/**
 * Previous question
 */
function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
  }
}

/**
 * Submit test
 */
async function submitTest() {
  clearInterval(timerInterval);

  const questions = testQuestions[currentTest];
  let correct = 0;

  userAnswers.forEach((answer, index) => {
    if (answer === questions[index].correct) {
      correct++;
    }
  });

  const percentage = Math.round((correct / questions.length) * 100);
  let grade = 'Good';
  if (percentage >= 80) grade = 'Excellent!';
  if (percentage >= 60 && percentage < 80) grade = 'Good';
  if (percentage >= 40 && percentage < 60) grade = 'Average';
  if (percentage < 40) grade = 'Need Improvement';

  // Hide test container, show result
  document.getElementById('testContainer').classList.remove('active');
  
  // Show result modal
  const modal = document.getElementById('resultModal');
  document.getElementById('resultScore').textContent = `${percentage}%`;
  document.getElementById('resultGrade').textContent = grade;
  document.getElementById('resultCorrect').textContent = correct;
  document.getElementById('resultTotal').textContent = questions.length;
  
  modal.classList.add('show');

  // Save test result to Supabase
  await saveTestResult(currentTest, correct, questions.length, percentage);

  // Update history
  await loadTestResults();
}

/**
 * Save test result to Supabase
 */
async function saveTestResult(testId, score, total, percentage) {
  try {
    const user = window.authService?.getCurrentUser();
    if (!user) return;

    // Get student profile
    const { data: profile } = await window.supabase.db.select('student_profiles', { user_id: user.id });
    if (!profile || profile.length === 0) return;

    const { error } = await window.supabase.db.insert('test_results', {
      student_id: profile[0].id,
      test_id: testId,
      score: score,
      total_questions: total,
      percentage: percentage,
      completed_at: new Date().toISOString()
    });

    if (error) throw error;

  } catch (error) {
    console.error('Error saving test result:', error);
  }
}

/**
 * Close modal and back to tests
 */
function closeModal() {
  document.getElementById('resultModal').classList.remove('show');
  backToTests();
}

/**
 * Back to tests
 */
function backToTests() {
  document.getElementById('testContainer').classList.remove('active');
  document.getElementById('testsGrid').style.display = 'grid';
  document.getElementById('testHistory').style.display = 'block';
  currentTest = null;
}

// Make functions globally available
window.startTest = startTest;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.selectAnswer = selectAnswer;
window.submitTest = submitTest;
window.backToTests = backToTests;
window.closeModal = closeModal;