/**
 * Sign Up Page Logic - FIXED
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ Signup page loaded');
  
  try {
    // Wait for auth service
    await waitForAuthService();
    
    // Setup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', handleSignup);
    }

    // Setup validation
    setupValidation();
    setupPasswordToggles();
    setupPasswordStrength();
    
    // Check if already logged in
    setTimeout(checkExistingSession, 1000);

    // Check for email from URL
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    if (email) {
      document.getElementById('email').value = email;
    }

  } catch (error) {
    console.error('❌ Signup page initialization error:', error);
  }
});

async function waitForAuthService() {
  return new Promise((resolve) => {
    if (window.authService && window.authService.initialized) {
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.authService && window.authService.initialized) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        if (!window.authService && window.supabase) {
          window.authService = new AuthService();
          window.authService.init().then(resolve);
        } else {
          resolve();
        }
      }
    }, 500);
  });
}

async function checkExistingSession() {
  try {
    if (!window.authService) await waitForAuthService();
    
    if (window.authService && window.authService.isAuthenticated()) {
      console.log('✅ User already authenticated, redirecting...');
      window.authService.redirectBasedOnRole();
    }
  } catch (error) {
    console.error('❌ Session check error:', error);
  }
}

function setupValidation() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const fullNameInput = document.getElementById('fullName');
  const phoneInput = document.getElementById('phone');
  
  if (emailInput) {
    emailInput.addEventListener('input', validateEmail);
    emailInput.addEventListener('blur', validateEmail);
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      validatePassword();
      validateConfirmPassword();
    });
    passwordInput.addEventListener('blur', validatePassword);
  }
  
  if (confirmInput) {
    confirmInput.addEventListener('input', validateConfirmPassword);
    confirmInput.addEventListener('blur', validateConfirmPassword);
  }
  
  if (fullNameInput) {
    fullNameInput.addEventListener('input', validateFullName);
    fullNameInput.addEventListener('blur', validateFullName);
  }
  
  if (phoneInput) {
    phoneInput.addEventListener('input', validatePhone);
    phoneInput.addEventListener('blur', validatePhone);
  }
}

function validateEmail() {
  const email = document.getElementById('email').value.trim();
  
  if (!email) {
    showFieldError('email', 'Email is required');
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showFieldError('email', 'Please enter a valid email address');
    return false;
  }
  
  clearFieldError('email');
  return true;
}

function validateFullName() {
  const fullName = document.getElementById('fullName').value.trim();
  
  if (!fullName) {
    showFieldError('fullName', 'Full name is required');
    return false;
  }
  
  if (fullName.length < 2) {
    showFieldError('fullName', 'Name must be at least 2 characters');
    return false;
  }
  
  clearFieldError('fullName');
  return true;
}

function validatePhone() {
  const phone = document.getElementById('phone').value.trim();
  
  if (phone && !/^[\d\s\+\-\(\)]{10,}$/.test(phone)) {
    showFieldError('phone', 'Please enter a valid phone number');
    return false;
  }
  
  clearFieldError('phone');
  return true;
}

function validatePassword() {
  const password = document.getElementById('password').value;
  
  if (!password) {
    showFieldError('password', 'Password is required');
    return false;
  }
  
  if (password.length < 6) {
    showFieldError('password', 'Password must be at least 6 characters');
    return false;
  }
  
  clearFieldError('password');
  return true;
}

function validateConfirmPassword() {
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!confirmPassword) {
    showFieldError('confirmPassword', 'Please confirm your password');
    return false;
  }
  
  if (password !== confirmPassword) {
    showFieldError('confirmPassword', 'Passwords do not match');
    return false;
  }
  
  clearFieldError('confirmPassword');
  return true;
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}Error`);
  
  if (field) field.classList.add('error');
  
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const errorElement = document.getElementById(`${fieldId}Error`);
  
  if (field) field.classList.remove('error');
  
  if (errorElement) {
    errorElement.style.display = 'none';
  }
}

function setupPasswordToggles() {
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
  }
  
  const toggleConfirm = document.getElementById('toggleConfirm');
  const confirmInput = document.getElementById('confirmPassword');
  
  if (toggleConfirm && confirmInput) {
    toggleConfirm.addEventListener('click', () => {
      const type = confirmInput.type === 'password' ? 'text' : 'password';
      confirmInput.type = type;
      toggleConfirm.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });
  }
}

function setupPasswordStrength() {
  const passwordInput = document.getElementById('password');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  
  if (passwordInput && strengthBar && strengthText) {
    passwordInput.addEventListener('input', () => {
      const password = passwordInput.value;
      const strength = calculatePasswordStrength(password);
      
      strengthBar.className = 'strength-bar';
      if (strength.score <= 2) {
        strengthBar.classList.add('weak');
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#dc3545';
      } else if (strength.score <= 4) {
        strengthBar.classList.add('medium');
        strengthText.textContent = 'Medium password';
        strengthText.style.color = '#ffc107';
      } else {
        strengthBar.classList.add('strong');
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#28a745';
      }
    });
  }
}

function calculatePasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  return { score: Math.min(score, 6) };
}

function validateForm() {
  return validateEmail() && validateFullName() && validatePassword() && 
         validateConfirmPassword() && validatePhone() && validateRole();
}

function validateRole() {
  const roleSelected = document.querySelector('input[name="role"]:checked');
  const errorElement = document.getElementById('roleError');
  
  if (!roleSelected) {
    if (errorElement) errorElement.style.display = 'block';
    return false;
  }
  
  if (errorElement) errorElement.style.display = 'none';
  return true;
}

/**
 * ✅ FIXED: Handle signup - CORRECT Supabase syntax
 */
async function handleSignup(e) {
  e.preventDefault();

  if (!validateForm()) {
    showError(document.getElementById('errorMessage'), 'Please fix the errors above');
    return;
  }

  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const phone = document.getElementById('phone').value.trim();
  const role = document.querySelector('input[name="role"]:checked')?.value;
  const termsAccepted = document.getElementById('terms')?.checked || false;
  const errorMessage = document.getElementById('errorMessage');
  const successMessage = document.getElementById('successMessage');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  console.log('📝 Signup attempt:', { email, role, fullName });

  if (!termsAccepted) {
    showError(errorMessage, 'You must accept the Terms and Conditions');
    return;
  }

  hideMessages();
  showLoading(submitBtn);

  try {
    await waitForAuthService();

    if (!window.supabase || !window.supabase.client) {
      throw new Error('Authentication service not available');
    }

    // ✅ FIXED: Correct Supabase signup syntax
    const { data, error } = await window.supabase.client.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          role: role,
          phone: phone || null
        },
        emailRedirectTo: window.location.origin + '/pages/login.html'
      }
    });

    if (error) {
      console.error('❌ Signup error:', error);
      
      let errorMsg = error.message || 'Sign up failed';
      if (error.message.includes('already registered')) {
        errorMsg = '❌ This email is already registered. Please login instead.';
        setTimeout(() => {
          window.location.href = `login.html?email=${encodeURIComponent(email)}`;
        }, 2000);
      }
      showError(errorMessage, errorMsg);
      hideLoading(submitBtn);
      return;
    }

    if (!data || !data.user) {
      throw new Error('Sign up failed - no user returned');
    }

    console.log('✅ Signup successful for:', email, 'Role:', role, 'User ID:', data.user.id);
    
    showSuccess(successMessage, `✅ Account created successfully! Redirecting...`);

    // Store user info
    try {
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userName', fullName);
      localStorage.setItem('userId', data.user.id);
      sessionStorage.setItem('justSignedUp', 'true');
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }

    // ✅ Direct redirect to dashboard
    setTimeout(() => {
      if (role === 'student') {
        window.location.href = 'student-dashboard.html';
      } else if (role === 'company') {
        window.location.href = 'company-dashboard.html';
      } else if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        window.location.href = 'login.html?registered=true';
      }
    }, 1500);

  } catch (error) {
    console.error('❌ Signup error:', error);
    showError(errorMessage, error.message || 'An unexpected error occurred');
    hideLoading(submitBtn);
  }
}

function hideMessages() {
  const errorMsg = document.getElementById('errorMessage');
  const successMsg = document.getElementById('successMessage');
  if (errorMsg) errorMsg.style.display = 'none';
  if (successMsg) successMsg.style.display = 'none';
}

function showError(element, message) {
  if (element) {
    element.textContent = '❌ ' + message;
    element.style.display = 'block';
    element.className = 'auth-error';
  }
}

function showSuccess(element, message) {
  if (element) {
    element.textContent = message;
    element.style.display = 'block';
    element.className = 'auth-success';
  }
}

function showLoading(button) {
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Creating account...';
  }
}

function hideLoading(button) {
  if (button) {
    button.disabled = false;
    button.innerHTML = 'Create Account';
  }
}