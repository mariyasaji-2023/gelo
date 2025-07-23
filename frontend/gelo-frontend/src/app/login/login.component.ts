import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Interfaces for type safety
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  contact?: string;
  bio?: string;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
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

        <!-- Right Side - Login/Register Form -->
        <div class="login-section">
          <!-- Messages -->
          <div class="message error" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
          <div class="message success" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <!-- Loading -->
          <div class="loading" *ngIf="isLoading || isGettingLocation">
            <div class="spinner"></div>
            <p *ngIf="isLoading">{{ isLoginMode ? 'Signing in...' : 'Creating account...' }}</p>
            <p *ngIf="isGettingLocation">Getting your location...</p>
          </div>

          <!-- Login Form -->
          <div *ngIf="isLoginMode && !isLoading && !isGettingLocation">
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
                      [disabled]="!loginForm.valid">
                Sign In
              </button>
            </form>

            <div class="divider">
              <span class="divider-text">or</span>
            </div>

            <div class="secondary-actions">
              <p class="switch-mode">
                Don't have an account? 
                <a href="#" class="create-account-link" (click)="toggleMode(); $event.preventDefault()">Create one here</a>
              </p>
            </div>
          </div>

          <!-- Register Form -->
          <div *ngIf="!isLoginMode && !isLoading && !isGettingLocation">
            <div class="login-header">
              <h3 class="login-title">Create Account</h3>
              <p class="login-subtitle">Join the network today</p>
            </div>

            <form (ngSubmit)="onRegister()" #registerForm="ngForm">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" 
                       class="form-input" 
                       [(ngModel)]="registerData.name" 
                       name="name" 
                       required 
                       placeholder="John Doe">
              </div>

              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" 
                       class="form-input" 
                       [(ngModel)]="registerData.email" 
                       name="email" 
                       required 
                       placeholder="your@email.com">
              </div>

              <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" 
                       class="form-input" 
                       [(ngModel)]="registerData.password" 
                       name="password" 
                       required 
                       placeholder="Minimum 6 characters">
              </div>

              <div class="form-group">
                <label class="form-label">Phone <span class="optional">(optional)</span></label>
                <input type="tel" 
                       class="form-input" 
                       [(ngModel)]="registerData.contact" 
                       name="contact" 
                       placeholder="+91 98765 43210">
              </div>

              <div class="form-group">
                <label class="form-label">Bio <span class="optional">(optional)</span></label>
                <textarea class="form-input textarea" 
                          [(ngModel)]="registerData.bio" 
                          name="bio" 
                          placeholder="Tell others about yourself..."></textarea>
              </div>

              <button type="submit" 
                      class="sign-in-btn" 
                      [disabled]="!registerForm.valid">
                Create Account
              </button>
            </form>

            <div class="divider">
              <span class="divider-text">or</span>
            </div>

            <div class="secondary-actions">
              <p class="switch-mode">
                Already have an account? 
                <a href="#" class="create-account-link" (click)="toggleMode(); $event.preventDefault()">Sign in here</a>
              </p>
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
      max-width: 450px;
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

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-top: 1rem;
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

    /* Loading */
    .loading {
      text-align: center;
      padding: 2rem;
      color: #9ca3af;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(220, 38, 38, 0.2);
      border-top: 3px solid #dc2626;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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

    .optional {
      color: #6b7280;
      font-weight: 400;
      text-transform: lowercase;
      font-size: 0.85rem;
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

    .textarea {
      min-height: 100px;
      resize: vertical;
      padding-top: 1rem;
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
    }

    .switch-mode {
      margin-bottom: 2rem;
      color: #9ca3af;
      font-size: 1rem;
      line-height: 1.6;
    }

    .create-account-link {
      color: #dc2626;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
      border-bottom: 1px solid transparent;
    }

    .create-account-link:hover {
      border-bottom-color: #dc2626;
      color: #ef4444;
    }

    .demo-btn {
      display: none;
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
  isLoginMode = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  isGettingLocation = false;

  loginData: LoginRequest = {
    email: '',
    password: ''
  };

  registerData: RegisterRequest = {
    name: '',
    email: '',
    password: '',
    contact: '',
    bio: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/nearby']);
    }
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.clearMessages();
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

  onRegister() {
    if (!this.registerData.name || !this.registerData.email || !this.registerData.password) {
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    if (this.registerData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    // First get user location, then register
    this.getCurrentLocation()
      .then((location) => {
        this.registerWithLocation(location);
      })
      .catch((error) => {
        console.warn('Location access denied or failed:', error);
        // Register without location if user denies or location fails
        this.registerWithLocation(null);
      });
  }

  private getCurrentLocation(): Promise<{latitude: number, longitude: number}> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      this.isGettingLocation = true;
      this.successMessage = 'Getting your location...';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.isGettingLocation = false;
          this.successMessage = '';
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          this.isGettingLocation = false;
          this.successMessage = '';
          let errorMessage = 'Location access failed';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds timeout
          maximumAge: 300000 // Accept cached position up to 5 minutes old
        }
      );
    });
  }

  private registerWithLocation(location: {latitude: number, longitude: number} | null) {
    this.isLoading = true;
    this.clearMessages();

    // Prepare registration data
    const registrationData: RegisterRequest = {
      name: this.registerData.name,
      email: this.registerData.email,
      password: this.registerData.password,
      bio: this.registerData.bio,
      contact: this.registerData.contact
    };

    // Add location if available
    if (location) {
      registrationData.location = {
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdated: new Date()
      };
    }

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = location 
          ? 'Account created with location! Redirecting...' 
          : 'Account created! Redirecting...';
        setTimeout(() => this.router.navigate(['/nearby']), 1000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Registration failed. Please try again.';
        console.error('Registration error:', error);
      }
    });
  }

  fillDemoLogin() {
    const demoEmail = `demo.user.${Date.now()}@example.com`;

    this.isLoading = true;
    this.clearMessages();

    this.authService.register({
      name: 'Demo User',
      email: demoEmail,
      password: 'demo123456',
      bio: 'Demo account for testing Gelo app',
      contact: '+91-9876543210'
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Demo account created! Redirecting...';
        setTimeout(() => this.router.navigate(['/nearby']), 1000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to create demo account: ' + error.message;
        console.error('Demo registration error:', error);
      }
    });
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}