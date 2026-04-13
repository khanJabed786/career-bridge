/**
 * Login Page Logic - FIXED & ENHANCED with Logout Prevention
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ Login page loaded');
  
  // 🆕 CHECK FOR LOGOUT FLAGS FIRST
  const justLoggedOut = sessionStorage.getItem('justLoggedOut') === 'true' || 
                        localStorage.getItem('justLoggedOut') === 'true';
  const isLoggingOut = sessionStorage.getItem('isLoggingOut') === 'true';
  const skipAutoRedirect = sessionStorage.getItem('skipAutoRedirect') === 'true';
  
  if (justLoggedOut || isLoggingOut || skipAutoRedirect) {
    console.log('🚫 User just logged out - clearing flags and preventing auto-login');
    
    // Clear all flags
    sessionStorage.removeItem('justLoggedOut');
    localStorage.removeItem('justLoggedOut');
    sessionStorage.removeItem('isLoggingOut');
    sessionStorage.removeItem('skipAutoRedirect');
    
    // Force clear any existing sessions
    try {
      if (window.authService) {
        await window.authService.signOut();
      } else if (window.supabase) {
        await window.supabase.auth.signOut();
      }
    } catch (e) {
      console.log('Error clearing session:', e);
    }
    
    // Clear all storage
    sessionStorage.clear();
    // Don't clear all localStorage, just auth related
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('user') || key.includes('auth') || key.includes('session') || key.includes('token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Don't proceed with auto-login check
    // Just initialize the form normally
    try {
      await waitForAuthService();
      setupLoginForm();
    } catch (error) {
      console.error('❌ Login page initialization error:', error);
    }
    
    return;
  }
  
  // Normal initialization if not coming from logout
  try {
    await waitForAuthService();
    setupLoginForm();
    
    // Check if already logged in (but only if not coming from logout)
    setTimeout(() => {
      checkExistingSession();
    }, 1000);

  } catch (error) {
    console.error('❌ Login page initialization error:', error);
    showError(document.getElementById('errorMessage'), 'Failed to initialize login page. Please refresh.');
  }
});

/**
 * Setup login form and event listeners
 */
function setupLoginForm() {
  // Setup form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Setup password visibility toggle
  setupPasswordToggle();
  
  // Setup input validation
  setupInputValidation();

  // Check for email from signup
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  if (email) {
    document.getElementById('email').value = email;
    showMessage('info', `Welcome! Please login with your password.`);
  }

  // Check for error messages from redirects
  const error = urlParams.get('error');
  if (error) {
    showError(document.getElementById('errorMessage'), decodeURIComponent(error));
  }
  
  // Check for logout parameter
  if (urlParams.get('logout') === 'true') {
    console.log('🔄 Logout parameter detected');
    showMessage('info', 'You have been logged out successfully.');
  }
}

/**
 * Wait for auth service to be ready
 */
async function waitForAuthService() {
  return new Promise((resolve) => {
    // Check if already available
    if (window.authService && window.authService.initialized) {
      console.log('✅ Auth service already ready');
      resolve();
      return;
    }

    console.log('⏳ Waiting for auth service...');
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.authService && window.authService.initialized) {
        console.log('✅ Auth service ready after', attempts, 'attempts');
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        console.warn('⚠️ Auth service timeout after', maxAttempts, 'attempts');
        clearInterval(checkInterval);
        
        // Create fallback auth service if needed
        if (!window.authService && window.supabase) {
          console.log('Creating fallback auth service');
          try {
            window.authService = new AuthService();
            window.authService.init().then(() => {
              if (window.authService.initialized) {
                resolve();
              }
            }).catch(() => resolve());
          } catch (e) {
            resolve(); // Continue anyway
          }
        } else {
          resolve(); // Continue anyway, let the login attempt fail gracefully
        }
      }
    }, 500);
  });
}

/**
 * Check if user is already logged in - with logout prevention
 */
async function checkExistingSession() {
  try {
    // 🆕 DOUBLE CHECK LOGOUT FLAGS
    const justLoggedOut = sessionStorage.getItem('justLoggedOut') === 'true' || 
                          localStorage.getItem('justLoggedOut') === 'true';
    const skipAutoRedirect = sessionStorage.getItem('skipAutoRedirect') === 'true';
    
    if (justLoggedOut || skipAutoRedirect) {
      console.log('🚫 Skipping auto-redirect due to logout flags');
      return false;
    }
    
    if (!window.authService) {
      await waitForAuthService();
    }
    
    if (window.authService && window.authService.isAuthenticated()) {
      // 🆕 FINAL CHECK - make sure we're not in logout process
      if (sessionStorage.getItem('isLoggingOut') === 'true') {
        console.log('🚫 Logout in progress, not redirecting');
        return false;
      }
      
      console.log('✅ User already authenticated, redirecting...');
      window.authService.redirectBasedOnRole();
      return true;
    }
    
    console.log('ℹ️ No existing session found');
    return false;
  } catch (error) {
    console.error('❌ Session check error:', error);
    return false;
  }
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe')?.checked || false;
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  console.log('🔐 Login attempt:', email);

  // Validation
  if (!email || !password) {
    showError(errorMessage, 'Please enter both email and password');
    return;
  }

  if (!isValidEmail(email)) {
    showError(errorMessage, 'Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    showError(errorMessage, 'Password must be at least 6 characters');
    return;
  }

  // Hide any previous messages
  hideMessages();

  // Show loading state
  showLoading(submitBtn);

  try {
    // Wait for auth service if needed
    if (!window.authService) {
      await waitForAuthService();
    }

    if (!window.authService) {
      throw new Error('Authentication service not available. Please refresh the page.');
    }

    // Attempt login
    const result = await window.authService.signIn(email, password);

    if (!result.success) {
      // Handle specific error cases
      let errorMsg = result.error || 'Login failed';
      
      if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = '❌ Invalid email or password';
      } else if (errorMsg.includes('Email not confirmed')) {
        errorMsg = '❌ Please verify your email before logging in';
      } else if (errorMsg.includes('rate limit')) {
        errorMsg = '❌ Too many attempts. Please try again later';
      }
      
      showError(errorMessage, errorMsg);
      hideLoading(submitBtn);
      
      // Clear password field on error
      document.getElementById('password').value = '';
      return;
    }

    // Login successful
    console.log('✅ Login successful for:', email);
    
    // 🆕 CLEAR ANY LOGOUT FLAGS
    sessionStorage.removeItem('justLoggedOut');
    localStorage.removeItem('justLoggedOut');
    sessionStorage.removeItem('isLoggingOut');
    sessionStorage.removeItem('skipAutoRedirect');
    
    // Store remember me preference
    if (rememberMe) {
      try {
        localStorage.setItem('rememberedEmail', email);
      } catch (e) {
        // Ignore storage errors
      }
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    // Store user info
    try {
      localStorage.setItem('userName', result.user?.email?.split('@')[0] || 'User');
      localStorage.setItem('userEmail', email);
      if (result.user?.role) {
        localStorage.setItem('userRole', result.user.role);
      }
    } catch (e) {
      // Ignore
    }

    // Show success message
    showSuccess(successMessage, '✅ Login successful! Redirecting to dashboard...');

    // Get redirect URL from query param if any
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');

    // Redirect after short delay
    setTimeout(() => {
      if (redirectUrl && redirectUrl.startsWith('/')) {
        window.location.href = redirectUrl;
      } else if (window.authService) {
        window.authService.redirectBasedOnRole();
      } else {
        // Default redirects based on role
        const role = result.user?.role || 'student';
        if (role === 'company') {
          window.location.href = '/pages/company-dashboard.html';
        } else if (role === 'admin') {
          window.location.href = '/pages/admin-dashboard.html';
        } else {
          window.location.href = '/pages/student-dashboard.html';
        }
      }
    }, 1500);

  } catch (error) {
    console.error('❌ Login error:', error);
    showError(errorMessage, error.message || 'An unexpected error occurred');
    hideLoading(submitBtn);
  }
}

/**
 * Setup password visibility toggle
 */
function setupPasswordToggle() {
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  
  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      toggleBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
  }
}

/**
 * Setup input validation
 */
function setupInputValidation() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const errorMsg = document.getElementById('emailError');
      if (errorMsg) errorMsg.style.display = 'none';
    });
    
    // Load remembered email
    try {
      const remembered = localStorage.getItem('rememberedEmail');
      if (remembered) {
        emailInput.value = remembered;
        const rememberMe = document.getElementById('rememberMe');
        if (rememberMe) rememberMe.checked = true;
      }
    } catch (e) {
      // Ignore
    }
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      const errorMsg = document.getElementById('passwordError');
      if (errorMsg) errorMsg.style.display = 'none';
    });
  }
}

/**
 * Hide all message elements
 */
function hideMessages() {
  const errorMsg = document.getElementById('errorMessage');
  const successMsg = document.getElementById('successMessage');
  
  if (errorMsg) errorMsg.style.display = 'none';
  if (successMsg) successMsg.style.display = 'none';
}

/**
 * Show error message
 */
function showError(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.className = 'auth-error';
    element.style.color = '#dc3545';
    element.style.backgroundColor = '#f8d7da';
    element.style.border = '1px solid #f5c6cb';
    element.style.padding = '10px';
    element.style.borderRadius = '4px';
    element.style.marginBottom = '15px';
  }
}

/**
 * Show success message
 */
function showSuccess(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.className = 'auth-success';
    element.style.color = '#28a745';
    element.style.backgroundColor = '#d4edda';
    element.style.border = '1px solid #c3e6cb';
    element.style.padding = '10px';
    element.style.borderRadius = '4px';
    element.style.marginBottom = '15px';
  }
}

/**
 * Show info message
 */
function showMessage(type, message) {
  const element = document.getElementById(`${type}Message`);
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
  }
}

/**
 * Show loading state
 */
function showLoading(button) {
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Logging in...';
    
    // Add spinner styles if not present
    if (!document.getElementById('spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'spinner-styles';
      style.textContent = `
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
          margin-right: 8px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

/**
 * Hide loading state
 */
function hideLoading(button) {
  if (button) {
    button.disabled = false;
    button.innerHTML = 'Login';
  }
}

/**
 * Email validation helper
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Handle forgot password
document.addEventListener('click', (e) => {
  if (e.target.id === 'forgotPassword') {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
      alert('Please enter your email address first');
      document.getElementById('email').focus();
      return;
    }
    
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }
    
    // Implement password reset logic here
    alert(`Password reset link will be sent to ${email}`);
  }
});

// Handle social login
window.handleSocialLogin = (provider) => {
  console.log(`Social login with ${provider}`);
  alert(`${provider} login coming soon!`);
};