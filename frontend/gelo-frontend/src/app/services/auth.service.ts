import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  email: string;
  contact?: string;
  bio?: string;
  createdAt?: Date;
}

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
  user: User;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/auth'; // Update this when you have a backend
  private readonly TOKEN_KEY = 'gelo_token';
  private readonly USER_KEY = 'gelo_user';

  // Mock users database for demo purposes
  private mockUsers: User[] = [
    {
      id: '1',
      name: 'Arjun Kumar',
      email: 'arjun.kumar@example.com',
      contact: '+91-9876543210',
      bio: 'Software engineer passionate about mobile development',
      createdAt: new Date()
    },
    {
      id: '2',
      name: 'Demo User',
      email: 'demo@geloapp.com',
      contact: '+91-9876543211',
      bio: 'Demo user for testing the application',
      createdAt: new Date()
    }
  ];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Simple methods for demo - we'll implement HTTP calls later
  login(user: any): void {
    const token = this.generateMockToken(user.id || '1');
    this.setAuthData(token, user);
  }

  // Mock login for demo purposes
  mockLogin(credentials: LoginRequest): Observable<AuthResponse> {
    return of(null).pipe(
      delay(1500), // Simulate network delay
      map(() => {
        // Check mock users
        const user = this.mockUsers.find(u => 
          u.email === credentials.email && this.isValidPassword(credentials.password)
        );

        if (!user) {
          throw { status: 401, error: { message: 'Invalid email or password' } };
        }

        const token = this.generateMockToken(user.id);
        return {
          token,
          user,
          message: 'Login successful'
        };
      })
    );
  }

  // Mock registration for demo purposes
  mockRegister(userData: RegisterRequest): Observable<AuthResponse> {
    return of(null).pipe(
      delay(2000), // Simulate network delay
      map(() => {
        // Check if user already exists
        const existingUser = this.mockUsers.find(u => u.email === userData.email);
        if (existingUser) {
          throw { status: 409, error: { message: 'Email already exists' } };
        }

        // Create new user
        const newUser: User = {
          id: (this.mockUsers.length + 1).toString(),
          name: userData.name,
          email: userData.email,
          contact: userData.contact || '',
          bio: userData.bio || '',
          createdAt: new Date()
        };

        // Add to mock database
        this.mockUsers.push(newUser);

        const token = this.generateMockToken(newUser.id);
        return {
          token,
          user: newUser,
          message: 'Account created successfully'
        };
      })
    );
  }

  // Set authentication data
  setAuthData(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return false;

    try {
      const decoded = this.decodeToken(token);
      const isValid = decoded.userId && decoded.timestamp;
      const tokenAge = Date.now() - decoded.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      return isValid && tokenAge < maxAge;
    } catch {
      return false;
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Logout user
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  // Get token
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Helper methods
  private generateMockToken(userId: string): string {
    return btoa(JSON.stringify({ 
      userId, 
      timestamp: Date.now(),
      type: 'gelo_token'
    }));
  }

  private decodeToken(token: string): any {
    return JSON.parse(atob(token));
  }

  private isValidPassword(password: string): boolean {
    // For demo purposes, accept common passwords
    const validPasswords = ['password123', 'password', 'demo123'];
    return validPasswords.includes(password);
  }
}