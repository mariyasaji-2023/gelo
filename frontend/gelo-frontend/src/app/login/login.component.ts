import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Interfaces for type safety
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: any;
  message?: string;
}

@Component({
  selector: 'app-login',
  template: `
    <section class="hero-section">
      <div class="container">
        <!-- Left Side - Brand & Message -->
        <div class="brand-section">
          <div class="logo-container">
            <img src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=138,fit=crop,q=95/Yyv20Pge6osev85z/gelo-logo-white-m5KLvDo7Nrt0W8y6.png" 
                 alt="Gelo" 
                 class="logo">
          </div>
          
          <h2 class="hero-title">Discover People<br>Around You</h2>
          
          <p class="hero-subtitle">
            Connect with like-minded individuals in your area. Build meaningful relationships through location-based networking.
          </p>
          
          <ul class="hero-features">
            <li>Find people within your preferred radius</li>
            <li>Real-time location-based matching</li>
            <li>Secure and private connections</li>
            <li>Interactive network visualization</li>
          </ul>
        </div>

        <!-- Right Side - Login Form -->
        <div class="login-section">
          <!-- Messages -->
          <div class="message error" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
          <div class="message success" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <!-- Login Form Container with consistent height -->
          <div class="login-form-container">
            <!-- Loading Overlay -->
            <div class="loading-overlay" *ngIf="isLoading">
              <div class="loading-content">
                <div class="spinner"></div>
                <p>Signing in...</p>
              </div>
            </div>

            <!-- Login Form -->
            <div class="login-form-content" [class.loading-active]="isLoading">
              <div class="login-header">
                <h3 class="login-title">Welcome</h3>
                <p class="login-subtitle">Sign in to start connecting</p>
              </div>

              <form (ngSubmit)="onLogin()" #loginForm="ngForm">
                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" 
                         class="form-input" 
                         [(ngModel)]="loginData.email" 
                         name="email" 
                         required 
                         placeholder="Enter your email">
                </div>

                <div class="form-group">
                  <label class="form-label">Password</label>
                  <input type="password" 
                         class="form-input" 
                         [(ngModel)]="loginData.password" 
                         name="password" 
                         required 
                         placeholder="Enter your password">
                </div>

                <button type="submit" 
                        class="sign-in-btn" 
                        [disabled]="!loginForm.valid || isLoading">
                  Sign In
                </button>
              </form>

              <div class="divider">
                <span class="divider-text">OR</span>
              </div>

              <button type="button" 
                      class="demo-btn" 
                      (click)="onDemoLogin()"
                      [disabled]="isLoading">
                <span class="demo-icon">👤</span>
                Try Demo Account
              </button>

              <div class="secondary-actions">
                <p class="additional-info">
                  Welcome to Gelo! Please sign in with your existing account credentials or try our demo.
                </p>
                
                <p class="support-info">
                  Need help? Contact our support team for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Global reset and ensure full coverage */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
      background: #000000;
      color: #ffffff;
      line-height: 1.6;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1000;
    }

    /* Ensure body and html have no margins/padding */
    :host::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000000;
      z-index: -1;
    }

    /* Hero Section */
    .hero-section {
      min-height: 100vh;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background: 
        radial-gradient(circle at 25% 25%, rgba(220, 38, 38, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(220, 38, 38, 0.03) 0%, transparent 50%),
        linear-gradient(180deg, #000000 0%, #0a0a0a 100%);
      overflow: hidden;
      width: 100vw;
    }

    /* Floating particles animation */
    .hero-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(2px 2px at 20px 30px, rgba(220, 38, 38, 0.3), transparent),
        radial-gradient(2px 2px at 40px 70px, rgba(255, 255, 255, 0.1), transparent),
        radial-gradient(1px 1px at 90px 40px, rgba(220, 38, 38, 0.2), transparent),
        radial-gradient(1px 1px at 130px 80px, rgba(255, 255, 255, 0.05), transparent);
      background-repeat: repeat;
      background-size: 150px 100px;
      animation: floatingParticles 20s linear infinite;
      opacity: 0.4;
    }

    @keyframes floatingParticles {
      0% { transform: translateY(0px) rotate(0deg); }
      100% { transform: translateY(-100px) rotate(360deg); }
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 3rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      gap: 8rem;
      height: 100vh;
      width: 100%;
      box-sizing: border-box;
    }

    /* Left Side - Brand & Message */
    .brand-section {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3rem 0;
      padding-right: 2rem;
      height: 100%;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .logo {
      height: 4.5rem;
      width: auto;
      object-fit: contain;
      filter: 
        brightness(0)
        saturate(100%)
        invert(27%)
        sepia(98%)
        saturate(1844%)
        hue-rotate(346deg)
        brightness(95%)
        contrast(101%);
      animation: logoFloat 3s ease-in-out infinite alternate;
    }

    @keyframes logoFloat {
      0% { transform: translateY(0px); }
      100% { transform: translateY(-5px); }
    }

    .brand-name {
      font-size: 4rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.02em;
      margin: 0;
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 2rem;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }

    .hero-subtitle {
      color: #9ca3af;
      font-size: 1.3rem;
      margin-bottom: 3rem;
      line-height: 1.6;
      max-width: 520px;
    }

    .hero-features {
      list-style: none;
      margin-bottom: 2rem;
    }

    .hero-features li {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      color: #d1d5db;
      font-size: 1.15rem;
      line-height: 1.4;
    }

    .hero-features li::before {
      content: '→';
      color: #dc2626;
      font-weight: bold;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    /* Right Side - Login Form */
    .login-section {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      max-width: 337px;
      margin: 0 auto;
      padding: 2rem;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(220, 38, 38, 0.1);
      border-radius: 12px;
      height: fit-content;
      max-height: 80vh;
      overflow-y: auto;
      box-sizing: border-box;
      /* Hide scrollbar but keep functionality */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    /* Hide scrollbar for webkit browsers */
    .login-section::-webkit-scrollbar {
      display: none;
    }

    /* Fixed container with consistent height */
    .login-form-container {
      position: relative;
      min-height: 650px; /* Increased height to accommodate demo button */
      height: 650px;
      display: flex;
      flex-direction: column;
    }

    /* Loading overlay that covers the entire form */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      border-radius: 8px;
    }

    .loading-content {
      text-align: center;
      color: #9ca3af;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(220, 38, 38, 0.2);
      border-top: 3px solid #dc2626;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Form content */
    .login-form-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
      transition: opacity 0.3s ease;
    }

    .login-form-content.loading-active {
      opacity: 0.3;
      pointer-events: none;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-top: 1rem;
      flex-shrink: 0;
    }

    .login-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 1rem;
      letter-spacing: -0.01em;
    }

    .login-subtitle {
      color: #9ca3af;
      font-size: 1.15rem;
      line-height: 1.4;
    }

    /* Messages */
    .message {
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      font-weight: 500;
      text-align: center;
    }

    .message.error {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .message.success {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .form-group {
      margin-bottom: 2rem;
      position: relative;
    }

    .form-label {
      display: block;
      color: #e5e7eb;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .form-input {
      width: 100%;
      padding: 1rem 0;
      background: transparent !important;
      border: none;
      border-bottom: 2px solid rgba(255, 255, 255, 0.15);
      color: #ffffff !important;
      font-size: 1.1rem;
      transition: all 0.3s ease;
      outline: none;
      font-family: inherit;
    }

    /* Override browser autocomplete styling */
    .form-input:-webkit-autofill,
    .form-input:-webkit-autofill:hover,
    .form-input:-webkit-autofill:focus,
    .form-input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px transparent inset !important;
      -webkit-text-fill-color: #ffffff !important;
      background-color: transparent !important;
      background: transparent !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    /* For Firefox autocomplete */
    .form-input:-moz-autofill {
      background-color: transparent !important;
      background: transparent !important;
      color: #ffffff !important;
    }

    .form-input::placeholder {
      color: #6b7280;
      font-size: 1rem;
    }

    .form-input:focus {
      border-bottom-color: #dc2626;
      border-bottom-width: 2px;
    }

    .form-input:hover:not(:focus) {
      border-bottom-color: rgba(255, 255, 255, 0.3);
    }

    .sign-in-btn {
      width: 100%;
      padding: 1.25rem 0;
      background: transparent;
      color: #dc2626;
      border: 2px solid #dc2626;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 2rem 0 2.5rem 0;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      position: relative;
      overflow: hidden;
      font-family: inherit;
      border-radius: 4px;
    }

    .sign-in-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: #dc2626;
      transition: left 0.3s ease;
      z-index: -1;
    }

    .sign-in-btn:hover:not(:disabled)::before {
      left: 0;
    }

    .sign-in-btn:hover:not(:disabled) {
      color: #ffffff;
    }

    .sign-in-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .divider {
      text-align: center;
      margin: 2rem 0;
      position: relative;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.15);
    }

    .divider-text {
      background: rgba(0, 0, 0, 0.8);
      color: #6b7280;
      padding: 0 1.5rem;
      font-size: 1rem;
      font-weight: 500;
    }

    .secondary-actions {
      text-align: center;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5rem;
    }

    .demo-btn {
      width: 100%;
      padding: 1rem 0;
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
      border: 2px solid rgba(255, 255, 255, 0.15);
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 2rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-family: inherit;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      position: relative;
      overflow: hidden;
    }

    .demo-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.1);
      transition: left 0.3s ease;
      z-index: -1;
    }

    .demo-btn:hover:not(:disabled)::before {
      left: 0;
    }

    .demo-btn:hover:not(:disabled) {
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.08);
    }

    .demo-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .demo-icon {
      font-size: 1.1rem;
      opacity: 0.8;
    }

    .support-info {
      color: #6b7280;
      font-size: 0.9rem;
      line-height: 1.4;
      margin: 0;
      font-style: italic;
    }

    .additional-info {
      color: #9ca3af;
      font-size: 0.95rem;
      line-height: 1.5;
      margin: 0;
    }

    /* Responsive Design */
    @media (max-width: 1200px) {
      .container {
        max-width: 1200px;
        gap: 6rem;
        padding: 0 2rem;
      }

      .brand-section {
        padding-right: 1rem;
      }

      .hero-title {
        font-size: 3rem;
      }

      .brand-name {
        font-size: 3.5rem;
      }
    }

    @media (max-width: 968px) {
      :host {
        position: relative;
        height: auto;
      }

      .hero-section {
        min-height: 100vh;
        height: auto;
      }

      .container {
        grid-template-columns: 1fr;
        gap: 4rem;
        text-align: center;
        padding: 2rem 1rem;
        height: auto;
        min-height: 100vh;
      }

      .brand-section {
        order: 2;
        padding-right: 0;
        padding: 2rem 0;
        height: auto;
      }

      .login-section {
        order: 1;
        margin: 0 auto;
        max-width: 100%;
        padding: 2rem 1.5rem;
        max-height: none;
      }

      .login-form-container {
        min-height: 570px;
        height: 570px;
      }

      .hero-title {
        font-size: 2.5rem;
      }

      .brand-name {
        font-size: 2.5rem;
      }

      .hero-features {
        justify-content: center;
        max-width: 500px;
        margin: 0 auto 2rem;
      }

      .hero-features li {
        text-align: left;
      }
    }

    @media (max-width: 640px) {
      .container {
        padding: 1rem;
        gap: 3rem;
      }

      .login-section {
        padding: 2rem 1rem;
        background: rgba(0, 0, 0, 0.5);
      }

      .login-form-container {
        min-height: 520px;
        height: 520px;
      }

      .hero-title {
        font-size: 2rem;
      }

      .brand-name {
        font-size: 2rem;
      }

      .logo {
        height: 3rem;
      }

      .login-title {
        font-size: 2rem;
      }

      .hero-features li {
        font-size: 1rem;
      }
    }

    /* Smooth animations */
    .brand-section > * {
      animation: slideInLeft 0.8s ease forwards;
    }

    .login-section > * {
      animation: slideInRight 0.8s ease forwards;
    }

    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .brand-section > *:nth-child(1) { animation-delay: 0.1s; }
    .brand-section > *:nth-child(2) { animation-delay: 0.2s; }
    .brand-section > *:nth-child(3) { animation-delay: 0.3s; }
    .brand-section > *:nth-child(4) { animation-delay: 0.4s; }

    .login-section > *:nth-child(1) { animation-delay: 0.2s; }
    .login-section > *:nth-child(2) { animation-delay: 0.3s; }
    .login-section > *:nth-child(3) { animation-delay: 0.4s; }
  `]
})
export class LoginComponent {
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  loginData: LoginRequest = {
    email: '',
    password: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/nearby']);
    }
  }

  onLogin() {
    if (!this.loginData.email || !this.loginData.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.clearMessages();

    this.authService.login({
      email: this.loginData.email,
      password: this.loginData.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Login successful! Redirecting...';
        setTimeout(() => this.router.navigate(['/nearby']), 1000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Login failed. Please check your credentials.';
        console.error('Login error:', error);
      }
    });
  }

  onDemoLogin() {
    // Set demo credentials
    this.loginData.email = 'rahul.menon@example.com';
    this.loginData.password = 'password123';
    
    this.isLoading = true;
    this.clearMessages();

    // Show a brief message about demo account
    this.successMessage = 'Loading demo account...';

    this.authService.login({
      email: this.loginData.email,
      password: this.loginData.password
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Demo login successful! Redirecting...';
        setTimeout(() => this.router.navigate(['/nearby']), 1000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Demo login failed. Please try manual login.';
        console.error('Demo login error:', error);
        
        // Clear demo credentials on error so user can try manual login
        this.loginData.email = '';
        this.loginData.password = '';
      }
    });
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}