// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface User {
   _id?: string;
  id?: string;
  name: string;
  email: string;
  bio?: string;
  contact?: string;
  profession?: string;
  interests?: string[];
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  
  // ✅ Support both flat and nested location structures
  latitude?: number;
  longitude?: number;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated?: Date;
    address?: string;
  } | string;
}

export interface NearbyUsersResponse {
  message: string;
  users: User[];
  totalCount: number;
  searchParams: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

export interface UsersResponse {
  message: string;
  users: User[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UserResponse {
  message: string;
  user: User;
  isOwnProfile?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('UserService initialized with API URL:', this.apiUrl);
  }
// Fix your UserService getHeaders method

private getHeaders(): HttpHeaders {
  const token = this.authService.getToken();
  
  // Create headers object
  const headersConfig: any = {
    'Content-Type': 'application/json'
  };
  
  // Add Authorization header if token exists
  if (token) {
    headersConfig['Authorization'] = `Bearer ${token}`;
  }
  
  return new HttpHeaders(headersConfig);
}

  /**
   * Get nearby users based on location
   */
  // Add this to your getNearbyUsers method for debugging
// Enhanced UserService method with detailed debugging
getNearbyUsers(latitude: number, longitude: number, radius: number = 50): Observable<NearbyUsersResponse> {
  console.log('🔍 Getting nearby users:', { latitude, longitude, radius });
  
  const params = new HttpParams()
    .set('latitude', latitude.toString())
    .set('longitude', longitude.toString())
    .set('radius', radius.toString());

  const headers = this.getHeaders();
  const fullUrl = `${this.apiUrl}/users/nearby`;
  
  // 🐛 ENHANCED DEBUG: Check all request details
  console.log('🌐 Full Request Details:', {
    'URL': fullUrl,
    'Method': 'GET',
    'Headers': {
      'Authorization': headers.get('Authorization') ? 'Bearer [PRESENT]' : 'MISSING',
      'Content-Type': headers.get('Content-Type')
    },
    'Query Params': {
      'latitude': latitude,
      'longitude': longitude,
      'radius': radius,
      'Raw params': params.toString()
    },
    'User Auth Status': {
      'isAuthenticated': this.authService.isAuthenticated(),
      'currentUser': this.authService.getCurrentUser()
    }
  });

  return this.http.get<NearbyUsersResponse>(fullUrl, {
    headers,
    params
  }).pipe(
    tap(response => {
      console.log('✅ SUCCESS - Full nearby users response:', response);
      console.log('📊 Response breakdown:', {
        'Message': response.message,
        'Users count': response.users ? response.users.length : 'undefined',
        'Total count': response.totalCount,
        'Search params': response.searchParams,
        'Users preview': response.users ? response.users.slice(0, 2) : 'No users'
      });
      
      if (response.users && response.users.length > 0) {
        console.log('👥 First user sample:', {
          'Name': response.users[0].name,
          'Email': response.users[0].email,
          'Latitude': response.users[0].latitude,
          'Longitude': response.users[0].longitude,
          'Has location': !!(response.users[0].latitude && response.users[0].longitude)
        });
      }
      
      if (response.users) {
        this.updateUsers(response.users);
      }
    }),
    catchError((error) => {
      console.error('❌ ERROR - Failed to get nearby users:', error);
      
      // Enhanced error logging
      console.error('🔍 Detailed Error Analysis:', {
        'Status Code': error.status,
        'Status Text': error.statusText,
        'Error Message': error.message,
        'Error Body': error.error,
        'Request URL': fullUrl,
        'Request Params': params.toString(),
        'Headers Sent': {
          'Authorization': headers.get('Authorization') ? 'Bearer [PRESENT]' : 'MISSING'
        }
      });
      
      // Check if it's a backend issue
      if (error.status === 200 && error.error?.users?.length === 0) {
        console.warn('⚠️ Backend returned empty users array - this might be a data/query issue');
      }
      
      return this.handleError(error);
    })
  );
}

  /**
   * Get all users with pagination and search
   */
  getAllUsers(page: number = 1, limit: number = 10, search: string = ''): Observable<UsersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<UsersResponse>(`${this.apiUrl}/users/all`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/users/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get users by status (online/offline)
   */
  getUsersByStatus(status: 'online' | 'offline' = 'online'): Observable<UsersResponse> {
    const params = new HttpParams().set('status', status);

    return this.http.get<UsersResponse>(`${this.apiUrl}/users/status`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Search users by name or bio
   */
  searchUsers(query: string, page: number = 1, limit: number = 10): Observable<UsersResponse> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<UsersResponse>(`${this.apiUrl}/users/search`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Update current user profile
   */
  updateProfile(userData: Partial<User>): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.apiUrl}/auth/profile`, userData, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Upload profile picture
   */
  uploadProfilePicture(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
      // Don't set Content-Type for FormData, let browser set it with boundary
    });

    return this.http.post(`${this.apiUrl}/auth/upload-profile-picture`, formData, {
      headers
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get current user's profile
   */
  getCurrentUserProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/auth/profile`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Update user's online status
   */
  updateOnlineStatus(isOnline: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/auth/status`, { isOnline }, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Update user's location
   */
  updateLocation(latitude: number, longitude: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/auth/location`, { latitude, longitude }, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Block/Unblock user
   */
  toggleBlockUser(userId: string, block: boolean = true): Observable<any> {
    const action = block ? 'block' : 'unblock';
    return this.http.post(`${this.apiUrl}/users/${userId}/${action}`, {}, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Report user
   */
  reportUser(userId: string, reason: string, description?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/${userId}/report`, {
      reason,
      description
    }, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get user's blocked list
   */
  getBlockedUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${this.apiUrl}/users/blocked`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Delete user account
   */
  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/auth/account`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Test API connection
   */
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Utility method to calculate distance between two points
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Distance in meters
  }

  /**
   * Check if coordinates are within a certain radius
   */
  isWithinRadius(lat1: number, lon1: number, lat2: number, lon2: number, radius: number): boolean {
    const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
    return distance <= radius;
  }

  /**
   * Get user's current position using Geolocation API
   */
  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  /**
   * Watch user's position for real-time updates
   */
  watchPosition(callback: (position: GeolocationPosition) => void, errorCallback?: (error: GeolocationPositionError) => void): number {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    return navigator.geolocation.watchPosition(
      callback,
      errorCallback,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  /**
   * Clear position watch
   */
  clearWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Update users list (for local state management)
   */
  updateUsers(users: User[]): void {
    this.usersSubject.next(users);
  }

  /**
   * Get current users from local state
   */
  getCurrentUsers(): User[] {
    return this.usersSubject.value;
  }

  /**
   * Clear users from local state
   */
  clearUsers(): void {
    this.usersSubject.next([]);
  }

  /**
   * Utility method to format user data for display
   */
  formatUserForDisplay(user: User): any {
    return {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      bio: user.bio || 'No bio available',
      contact: user.contact || user.email || 'No contact info',
      profession: user.profession || 'Not specified',
      location: user.location || 'Unknown location',
      interests: user.interests || [],
      isOnline: user.isOnline !== undefined ? user.isOnline : false,
      lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date(),
      latitude: user.latitude,
      longitude: user.longitude,
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
    };
  }

  /**
   * Validate user data
   */
  validateUserData(userData: Partial<User>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (userData.name && userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (userData.bio && userData.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    if (userData.contact && userData.contact.length > 50) {
      errors.push('Contact info must be less than 50 characters');
    }

    if (userData.latitude && (userData.latitude < -90 || userData.latitude > 90)) {
      errors.push('Latitude must be between -90 and 90');
    }

    if (userData.longitude && (userData.longitude < -180 || userData.longitude > 180)) {
      errors.push('Longitude must be between -180 and 180');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('UserService HTTP Error:', error);
    
    let errorMessage = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
        // Don't logout automatically here, let the component handle it
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
      } else {
        errorMessage = `Server returned code ${error.status}`;
      }
    }

    console.error('Error message:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}