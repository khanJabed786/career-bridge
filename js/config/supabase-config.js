/**
 * Supabase Configuration with Offline Support
 */

const SUPABASE_URL = 'https://fzxshilccguzydqsajzd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eHNoaWxjY2d1enlkcXNhanpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM2NTcsImV4cCI6MjA4ODQyOTY1N30.d2cdKlKGRmgMaQR6TMgcNw0-8Awa4Rb_2V8Vk32DxYg';

let supabaseClient = null;
let isOnline = navigator.onLine;

// Track online/offline status
window.addEventListener('online', () => {
    isOnline = true;
    console.log('🌐 Connection restored - retrying Supabase initialization');
    attemptSupabaseInit();
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('📡 Connection lost');
});

// Use sessionStorage as fallback if localStorage is blocked
const getStorage = () => {
    try {
        window.localStorage.setItem('__test__', 'test');
        window.localStorage.removeItem('__test__');
        return window.localStorage;
    } catch (e) {
        console.warn('⚠️ localStorage blocked, using sessionStorage');
        return window.sessionStorage;
    }
};

// Initialize Supabase with retry logic
let initAttempts = 0;
const MAX_RETRIES = 3;

function attemptSupabaseInit() {
    console.log('🚀 Initializing Supabase client...');
    
    if (typeof window.supabase === 'undefined') {
        if (!isOnline && initAttempts >= MAX_RETRIES) {
            console.error('❌ No internet connection and max retries exceeded');
            window.dispatchEvent(new CustomEvent('supabase:offline'));
            return;
        }
        
        console.log('📦 Loading Supabase library...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.timeout = 10000;
        
        const timeout = setTimeout(() => {
            if (!script.loaded) {
                console.error('❌ Supabase library loading timeout');
                script.onerror();
            }
        }, 10000);
        
        script.onload = () => {
            clearTimeout(timeout);
            script.loaded = true;
            console.log('✅ Supabase library loaded');
            createClient();
        };
        
        script.onerror = () => {
            clearTimeout(timeout);
            initAttempts++;
            console.error(`❌ Failed to load Supabase library (attempt ${initAttempts}/${MAX_RETRIES})`);
            
            if (initAttempts < MAX_RETRIES && isOnline) {
                setTimeout(attemptSupabaseInit, 2000 * initAttempts);
            } else {
                window.dispatchEvent(new CustomEvent('supabase:offline'));
            }
        };
        
        document.head.appendChild(script);
    } else {
        createClient();
    }
}

function createClient() {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                storage: getStorage()
            }
        });
        
        console.log('✅ Supabase client created');
        window.supabaseClient = supabaseClient;
        
        // Simple helper object
        window.supabase = {
            client: supabaseClient,
            auth: {
                signUp: (email, password, userData) => supabaseClient.auth.signUp({
                    email, password,
                    options: { data: userData }
                }),
                signIn: (email, password) => supabaseClient.auth.signInWithPassword({ email, password }),
                signOut: () => supabaseClient.auth.signOut(),
                getUser: () => supabaseClient.auth.getUser(),
                getSession: () => supabaseClient.auth.getSession()
            },
            from: (table) => supabaseClient.from(table)
        };
        
        window.dispatchEvent(new CustomEvent('supabase:ready'));
        
    } catch (err) {
        console.error('❌ Failed to create Supabase client:', err);
        window.dispatchEvent(new CustomEvent('supabase:error', { detail: err }));
    }
}

// Start initialization
attemptSupabaseInit();

console.log('📦 Config loaded');