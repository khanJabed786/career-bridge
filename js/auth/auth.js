/**
 * Authentication Service
 * Core authentication functions - Fixed with Supabase only
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentRole = null;
    this.initialized = false;
  }

  async init() {
    try {
      await this.waitForSupabase();
      await this.checkAuthStatus();
      this.setupAuthListener();
      this.initialized = true;
      console.log('✅ Auth service initialized');
      return true;
    } catch (error) {
      console.error('❌ Auth init error:', error);
      return false;
    }
  }

  async waitForSupabase() {
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts
    
    while (attempts < maxAttempts) {
      if (window.supabase && window.supabase.client) {
        console.log('✅ Supabase client ready');
        return true;
      }
      
      // Try to wait for initialization
      if (window.supabase && window.supabase.ready) {
        try {
          await window.supabase.ready;
          if (window.supabase.client) {
            console.log('✅ Supabase client ready after waiting');
            return true;
          }
        } catch (e) {
          console.warn('⚠️ Error waiting for supabase:', e);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    throw new Error('Supabase client not available after timeout');
  }

  async checkAuthStatus() {
    try {
      if (!window.supabase?.client) return false;
      
      const { data: { session } } = await window.supabase.client.auth.getSession();
      
      if (session?.user) {
        this.currentUser = session.user;
        this.currentRole = session.user.user_metadata?.role || 'student';
        
        console.log('✅ User authenticated:', session.user.email, 'Role:', this.currentRole);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Auth check error:', error);
      return false;
    }
  }

  setupAuthListener() {
    if (!window.supabase?.client) return;

    this.unsubscribe = window.supabase.client.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUser = session.user;
        this.currentRole = session.user.user_metadata?.role || 'student';
        window.dispatchEvent(new CustomEvent('auth:stateChange', {
          detail: { event, user: session.user, role: this.currentRole }
        }));
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this.currentRole = null;
        window.dispatchEvent(new CustomEvent('auth:stateChange', {
          detail: { event, user: null, role: null }
        }));
      }
    });
  }

  /**
   * Sign up - Supabase only
   */
  async signUp(email, password, role = 'student', userData = {}) {
    try {
      console.log('📝 Signing up:', email, 'Role:', role);
      
      if (!email || !password) throw new Error('Email and password are required');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      
      // Wait for supabase to be ready
      await window.supabase?.ready;
      
      if (!window.supabase?.client) throw new Error('Authentication service not available');

      const { data, error } = await window.supabase.auth.signUp(email, password, { role, ...userData });

      if (error) throw error;
      if (!data?.user) throw new Error('Sign up failed');

      console.log('✅ Auth signup successful, user ID:', data.user.id);

      this.currentUser = data.user;
      this.currentRole = role;

      return { success: true, user: data.user, role, error: null };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      console.log('🔐 Signing in:', email);
      
      if (!email || !password) throw new Error('Email and password are required');
      
      // Wait for supabase to be ready
      await window.supabase?.ready;
      
      if (!window.supabase?.client) throw new Error('Authentication service not available');

      const { data, error } = await window.supabase.auth.signIn(email, password);

      if (error) throw error;
      if (!data?.user) throw new Error('Sign in failed');

      console.log('✅ Sign in successful:', data.user.id);

      this.currentUser = data.user;
      const role = data.user.user_metadata?.role || 'student';
      this.currentRole = role;

      return { success: true, user: data.user, role, error: null };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      console.log('👋 Signing out...');
      
      // Wait for supabase to be ready
      await window.supabase?.ready;
      
      if (!window.supabase?.client) {
        throw new Error('Authentication service not available');
      }
      
      const { error } = await window.supabase.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      this.currentRole = null;

      console.log('✅ Sign out successful');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() { return this.currentUser; }
  getCurrentRole() { return this.currentRole; }
  hasRole(role) { return this.currentRole === role; }

  redirectBasedOnRole(role = this.currentRole) {
    const targetRole = role || this.currentRole || 'student';
    
    const paths = {
      student: 'pages/student-dashboard.html',
      company: 'pages/company-dashboard.html',
      admin: 'pages/admin-dashboard.html'
    };
    
    const targetPage = paths[targetRole] || paths.student;
    
    // Check if we're already in pages directory
    if (window.location.pathname.includes('/pages/')) {
      window.location.href = targetPage;
    } else {
      window.location.href = targetPage;
    }
  }

  requireAuth(redirectTo = 'pages/login.html') {
    if (!this.isAuthenticated()) {
      if (window.location.pathname.includes('/pages/')) {
        window.location.href = redirectTo;
      } else {
        window.location.href = redirectTo;
      }
      return false;
    }
    return true;
  }

  requireRole(requiredRole, redirectTo = 'pages/login.html') {
    if (!this.isAuthenticated()) {
      if (window.location.pathname.includes('/pages/')) {
        window.location.href = redirectTo;
      } else {
        window.location.href = redirectTo;
      }
      return false;
    }
    if (!this.hasRole(requiredRole)) {
      alert(`❌ Access Denied! This page requires ${requiredRole} role.`);
      this.redirectBasedOnRole();
      return false;
    }
    return true;
  }

  // Clean up subscriptions
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

// Initialize
let authService = null;

async function initAuthService() {
  try {
    // Wait for supabase to be ready
    if (window.supabase) {
      await window.supabase.ready;
    }
    
    if (window.supabase?.client) {
      authService = new AuthService();
      const success = await authService.init();
      if (success) {
        window.authService = authService;
        console.log('✅ Auth service fully initialized');
        window.dispatchEvent(new CustomEvent('auth:ready'));
      }
    } else {
      console.warn('⚠️ Supabase client not ready, retrying...');
      setTimeout(initAuthService, 1000);
    }
  } catch (error) {
    console.error('❌ Auth service init error:', error);
    setTimeout(initAuthService, 2000);
  }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthService);
} else {
  initAuthService();
}

// Make instances globally available
window.AuthService = AuthService;
window.authService = authService;

// Helper to get auth service with promise
window.getAuthService = function() {
  return new Promise((resolve) => {
    if (authService && authService.initialized) {
      resolve(authService);
    } else {
      const checkInterval = setInterval(() => {
        if (authService && authService.initialized) {
          clearInterval(checkInterval);
          resolve(authService);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (authService) {
          resolve(authService);
        } else {
          authService = new AuthService();
          authService.init().then(() => resolve(authService));
        }
      }, 10000);
    }
  });
};

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (authService) {
    authService.cleanup();
  }
});