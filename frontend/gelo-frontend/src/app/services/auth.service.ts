// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  bio?: string;
  contact?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  bio?: string;
  contact?: string;
  isOnline?: boolean;
  createdAt?: Date;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
  expiresIn?: number;
}

export interface ProfileUpdateData {
  name?: string;
  bio?: string;
  contact?: string;
  profession?: string;
  location?: string;
  interests?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private tokenKey = 'gelo_auth_token';
  private userKey = 'gelo_user_data';
  private refreshTokenKey = 'gelo_refresh_token';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private tokenExpirationTimer: any;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuth(): void {
    const token = this.getToken();
    const userData = this.getUserData();

    if (token && userData) {
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
      this.startTokenExpirationTimer(token);
    }
  }

  /**
   * Login user with email/username and password
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
  // ✅ Send the data in the format your API expects
  const loginData = {
    email: credentials.email,
    password: credentials.password
  };

  console.log('Sending login request:', loginData); // Debug log

  return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, loginData)
    .pipe(
      tap(response => {
        console.log('Login response received:', response); // Debug log
        if (response.token && response.user) {
          this.handleAuthSuccess(response);
        }
      }),
      catchError(this.handleError)
    );
}
  /**
   * Register new user
   */
  register(userData: RegisterData): Observable<AuthResponse> {
    // Remove confirmPassword before sending to backend
    const { confirmPassword, ...registrationData } = userData;

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, registrationData)
      .pipe(
        tap(response => {
          if (response.token && response.user) {
            this.handleAuthSuccess(response);
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.refreshTokenKey);
    
    if (!refreshToken) {
      this.logout();
      return throwError('No refresh token available');
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh-token`, {
      refreshToken
    }).pipe(
      tap(response => {
        if (response.token && response.user) {
          this.handleAuthSuccess(response);
        }
      }),
      catchError(error => {
        this.logout();
        return this.handleError(error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
  // Call backend logout endpoint
  const headers = this.getHeaders();
  if (headers.get('Authorization')) {
    this.http.post(`${this.apiUrl}/auth/logout`, {}, { headers })
      .subscribe({
        next: (response) => console.log('Logout successful'),
        error: (error) => {
          // Don't worry about 401 errors during logout - token might be expired
          if (error.status !== 401) {
            console.warn('Logout API call failed:', error);
          }
        }
      });
  }

  // Always clear local auth data regardless of API response
  this.clearAuthData();
  this.currentUserSubject.next(null);
  this.isAuthenticatedSubject.next(false);
  
  if (this.tokenExpirationTimer) {
    clearTimeout(this.tokenExpirationTimer);
  }

  this.router.navigate(['/login']);
}


  /**
   * Get current user profile from backend
   */
  getProfile(): Observable<{ user: AuthUser }> {
    return this.http.get<{ user: AuthUser }>(`${this.apiUrl}/auth/profile`, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        if (response.user) {
          this.updateUserData(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update user profile
   */
  updateProfile(profileData: ProfileUpdateData): Observable<{ user: AuthUser }> {
    return this.http.put<{ user: AuthUser }>(`${this.apiUrl}/auth/profile`, profileData, {
      headers: this.getHeaders()
    }).pipe(
      tap(response => {
        if (response.user) {
          this.updateUserData(response.user);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Change password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    }, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, {
      token,
      newPassword
    }).pipe(catchError(this.handleError));
  }

  /**
   * Verify email address
   */
  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/verify-email`, { token })
      .pipe(catchError(this.handleError));
  }

  /**
   * Resend email verification
   */
  resendEmailVerification(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/resend-verification`, {}, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Update user's location
   */
  updateLocation(latitude: number, longitude: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/auth/location`, {
      latitude,
      longitude
    }, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Update online status
   */
  updateOnlineStatus(isOnline: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/auth/status`, {
      isOnline
    }, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get current user data
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get user data from localStorage
   */
  getUserData(): AuthUser | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Get HTTP headers with authentication
   */
  // Fix AuthService getHeaders method

getHeaders(): HttpHeaders {
  const token = this.getToken();
  
  const headersConfig: any = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headersConfig['Authorization'] = `Bearer ${token}`;
  }
  
  return new HttpHeaders(headersConfig);
}


  /**
 * Manually set token and user data
 */
setAuthData(token: string, user: AuthUser): void {
  localStorage.setItem(this.tokenKey, token);
  localStorage.setItem(this.userKey, JSON.stringify(user));
  this.currentUserSubject.next(user);
  this.isAuthenticatedSubject.next(true);
  this.startTokenExpirationTimer(token);
}


  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    // Store token and user data
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.userKey, JSON.stringify(response.user));

    // Update subjects
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);

    // Start token expiration timer
    this.startTokenExpirationTimer(response.token);

    // Update online status
    this.updateOnlineStatus(true).subscribe({
      error: (error) => console.warn('Failed to update online status:', error)
    });
  }

  /**
   * Update user data in storage and subjects
   */
  private updateUserData(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp <= currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Start token expiration timer
   */
  private startTokenExpirationTimer(token: string): void {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;

      // Set timer to refresh token 5 minutes before expiration
      const refreshTime = timeUntilExpiration - environment.security.tokenExpirationBuffer;

      if (refreshTime > 0) {
        this.tokenExpirationTimer = setTimeout(() => {
          this.refreshToken().subscribe({
            error: () => this.logout()
          });
        }, refreshTime);
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Error parsing token:', error);
      this.logout();
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.status === 401) {
        this.logout();
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.status === 403) {
        errorMessage = 'Access denied. You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (error.status === 422) {
        errorMessage = error.error?.message || 'Validation failed. Please check your input.';
      } else if (error.status === 500) {
        errorMessage = 'Internal server error. Please try again later.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Validate registration data
   */
  validateRegistrationData(data: RegisterData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (data.confirmPassword && data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate login credentials
   */
  validateLoginCredentials(credentials: LoginCredentials): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!credentials.email && !credentials.username) {
      errors.push('Email or username is required');
    }

    if (!credentials.password) {
      errors.push('Password is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}