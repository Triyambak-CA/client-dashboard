// auth.js - Handles authentication and password protection

// Configuration
const CORRECT_PASSWORD = "Youwe@Creds";

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const mainContent = document.getElementById('main-content');
const passwordInput = document.getElementById('password-input');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const togglePasswordButton = document.getElementById('toggle-password');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already authenticated
    checkAuthentication();
    
    // Login button click
    loginButton.addEventListener('click', attemptLogin);
    
    // Enter key press in password field
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            attemptLogin();
        }
    });
    
    // Toggle password visibility
    togglePasswordButton.addEventListener('click', togglePasswordVisibility);
});

// Functions
function attemptLogin() {
    const password = passwordInput.value.trim();
    
    if (password === CORRECT_PASSWORD) {
        // Set authentication in session
        sessionStorage.setItem('authenticated', 'true');
        
        // Hide login overlay and show main content with animation
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
            mainContent.classList.remove('hidden');
            // Trigger fade-in animation for main content
            setTimeout(() => {
                mainContent.style.opacity = '1';
            }, 50);
        }, 300);
        
        // Clear password field
        passwordInput.value = '';
        loginError.textContent = '';
    } else {
        // Show error message with animation
        loginError.textContent = '';
        setTimeout(() => {
            loginError.textContent = 'Incorrect password. Please try again.';
            // Shake animation for error
            passwordInput.classList.add('shake');
            setTimeout(() => {
                passwordInput.classList.remove('shake');
            }, 500);
        }, 10);
        
        // Clear password field
        passwordInput.value = '';
        
        // Focus on password input
        passwordInput.focus();
    }
}

function togglePasswordVisibility() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Toggle icon
    const icon = togglePasswordButton.querySelector('i');
    if (type === 'password') {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

function checkAuthentication() {
    // Check if user is already authenticated in this session
    const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
    
    if (isAuthenticated) {
        // Hide login overlay and show main content
        loginOverlay.classList.add('hidden');
        mainContent.classList.remove('hidden');
        mainContent.style.opacity = '1';
    } else {
        // Show login overlay and hide main content
        loginOverlay.classList.remove('hidden');
        mainContent.classList.add('hidden');
        mainContent.style.opacity = '0';
        
        // Focus on password input
        setTimeout(() => {
            passwordInput.focus();
        }, 100);
    }
}

// Expose functions for other modules
window.auth = {
    logout: function() {
        sessionStorage.removeItem('authenticated');
        checkAuthentication();
    }
};
