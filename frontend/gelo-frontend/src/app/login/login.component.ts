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
}

export interface AuthResponse {
  token: string;
  user: any;
  message?: string;
}

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <div class="login-card">
        <!-- Header -->
        <div class="header">
          <h1>🌍 Gelo</h1>
          <p>Find People Near You</p>
        </div>

        <!-- Messages -->
        <div class="message error" *ngIf="errorMessage">
          {{ errorMessage }}
        </div>
        <div class="message success" *ngIf="successMessage">
          {{ successMessage }}
        </div>

        <!-- Loading -->
        <div class="loading" *ngIf="isLoading">
          <div class="spinner"></div>
          <p>{{ isLoginMode ? 'Signing in...' : 'Creating account...' }}</p>
        </div>

        <!-- Login Form -->
        <div *ngIf="isLoginMode && !isLoading">
          <h2>Welcome Back</h2>
          <form (ngSubmit)="onLogin()" #loginForm="ngForm">
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="loginData.email" name="email" 
                     required placeholder="your@email.com">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" [(ngModel)]="loginData.password" name="password" 
                     required placeholder="Your password">
            </div>
            <button type="submit" class="btn-primary" [disabled]="!loginForm.valid">
              Sign In
            </button>
          </form>
          
          <div class="switch-mode">
            Don't have an account? 
            <button class="link-btn" (click)="toggleMode()">Create one</button>
          </div>

          <!-- Demo Login -->
          <div class="demo-section">
            <div class="divider">or</div>
            <button class="btn-demo" (click)="fillDemoLogin()">
              Try Demo Account
            </button>
          </div>
        </div>

        <!-- Register Form -->
        <div *ngIf="!isLoginMode && !isLoading">
          <h2>Create Account</h2>
          <form (ngSubmit)="onRegister()" #registerForm="ngForm">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" [(ngModel)]="registerData.name" name="name" 
                     required placeholder="John Doe">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="registerData.email" name="email" 
                     required placeholder="your@email.com">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" [(ngModel)]="registerData.password" name="password" 
                     required placeholder="Minimum 6 characters">
            </div>
            <div class="form-group">
              <label>Phone <span class="optional">(optional)</span></label>
              <input type="tel" [(ngModel)]="registerData.contact" name="contact" 
                     placeholder="+91 98765 43210">
            </div>
            <div class="form-group">
              <label>Bio <span class="optional">(optional)</span></label>
              <textarea [(ngModel)]="registerData.bio" name="bio" 
                        placeholder="Tell others about yourself..."></textarea>
            </div>
            <button type="submit" class="btn-primary" [disabled]="!registerForm.valid">
              Create Account
            </button>
          </form>
          
          <div class="switch-mode">
            Already have an account? 
            <button class="link-btn" (click)="toggleMode()">Sign in</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      padding: 40px;
      width: 100%;
      max-width: 420px;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;
    }

    .header h1 {
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #333;
      font-weight: 700;
    }

    .header p {
      color: #666;
      margin: 0;
      font-size: 16px;
    }

    h2 {
      font-size: 24px;
      font-weight: 600;
      color: #333;
      margin: 0 0 24px 0;
      text-align: center;
    }

    /* Messages */
    .message {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-weight: 500;
    }

    .message.error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .message.success {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Forms */
    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }

    .optional {
      color: #999;
      font-weight: 400;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    /* Buttons */
    .btn-primary {
      width: 100%;
      padding: 14px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
      margin-top: 8px;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a6fd8;
    }

    .btn-primary:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }

    .btn-demo {
      width: 100%;
      padding: 12px;
      background: white;
      color: #333;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 8px;
    }

    .btn-demo:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .link-btn {
      background: none;
      border: none;
      color: #667eea;
      cursor: pointer;
      text-decoration: underline;
      font-size: inherit;
      font-weight: 500;
    }

    .link-btn:hover {
      color: #5a6fd8;
    }

    /* Sections */
    .switch-mode {
      text-align: center;
      margin-top: 24px;
      color: #666;
      font-size: 14px;
    }

    .demo-section {
      margin-top: 24px;
      text-align: center;
    }

    .divider {
      position: relative;
      margin: 20px 0;
      color: #999;
      font-size: 14px;
    }

    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: #e5e7eb;
      z-index: 0;
    }

    .divider {
      background: white;
      padding: 0 16px;
      position: relative;
      z-index: 1;
    }

    .demo-section small {
      display: block;
      color: #999;
      font-size: 12px;
      margin-top: 8px;
    }

    /* Mobile */
    @media (max-width: 480px) {
      .login-card {
        padding: 24px;
        margin: 16px;
      }
      
      .header h1 {
        font-size: 28px;
      }
      
      h2 {
        font-size: 20px;
      }
    }
  `]
})
export class LoginComponent {
  isLoginMode = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
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

    // Simulate login process with timeout
    setTimeout(() => {
      // Mock authentication check
      if (this.loginData.email === 'arjun.kumar@example.com' && this.loginData.password === 'password123') {
        const user = {
          id: '1',
          name: 'Arjun Kumar',
          email: 'arjun.kumar@example.com',
          contact: '+91-9876543210',
          bio: 'Software engineer passionate about mobile development'
        };
        
        const token = this.generateToken(user.id);
        this.authService.setAuthData(token, user);
        
        this.isLoading = false;
        this.successMessage = 'Login successful! Redirecting...';
        setTimeout(() => this.router.navigate(['/nearby']), 1000);
      } else {
        this.isLoading = false;
        this.errorMessage = 'Invalid email or password';
      }
    }, 1500);
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

    this.isLoading = true;
    this.clearMessages();

    // Simulate registration process
    setTimeout(() => {
      const newUser = {
        id: Date.now().toString(),
        name: this.registerData.name,
        email: this.registerData.email,
        contact: this.registerData.contact || '',
        bio: this.registerData.bio || ''
      };
      
      const token = this.generateToken(newUser.id);
      this.authService.setAuthData(token, newUser);
      
      this.isLoading = false;
      this.successMessage = 'Account created! Redirecting...';
      setTimeout(() => this.router.navigate(['/nearby']), 1000);
    }, 2000);
  }

  fillDemoLogin() {
    this.loginData.email = 'arjun.kumar@example.com';
    this.loginData.password = 'password123';
    this.clearMessages();
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private generateToken(userId: string): string {
    return btoa(JSON.stringify({ 
      userId, 
      timestamp: Date.now(),
      type: 'gelo_token'
    }));
  }
}