import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  bio: string;
  contact: string;
  profession: string;
  location: string;
  interests: string[];
  image: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  bio: string;
  contact: string;
  profession: string;
  location: string;
  interests: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  currentUser$ = this.currentUserSubject.asObservable();
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Mock user database
  private users: (AuthUser & { password: string })[] = [
    {
      id: '1',
      username: 'arjun.menon',
      password: 'password123',
      name: 'Arjun Menon',
      bio: 'Software engineer passionate about mobile development',
      contact: '+91-9876543210',
      profession: 'Engineer',
      location: 'Kochi Marine Drive',
      interests: ['technology', 'mobile', 'ai'],
      image: '🧑‍💻'
    },
    {
      id: '2',
      username: 'priya.nair',
      password: 'password123',
      name: 'Priya Nair',
      bio: 'UI/UX Designer. Coffee enthusiast',
      contact: '+91-9876543211',
      profession: 'Designer',
      location: 'Lulu Mall',
      interests: ['design', 'coffee', 'technology'],
      image: '🎨'
    },
    {
      id: '3',
      username: 'demo',
      password: 'demo',
      name: 'Demo User',
      bio: 'Demo account for testing the application',
      contact: '+91-9999999999',
      profession: 'Tester',
      location: 'Kochi, Kerala',
      interests: ['testing', 'technology', 'networking'],
      image: '👤'
    }
  ];

  constructor() {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(credentials: LoginCredentials): Observable<{ success: boolean; message: string; user?: AuthUser }> {
    return new Observable(observer => {
      setTimeout(() => {
        const user = this.users.find(u => 
          u.username === credentials.username && u.password === credentials.password
        );

        if (user) {
          const authUser: AuthUser = {
            id: user.id,
            username: user.username,
            name: user.name,
            bio: user.bio,
            contact: user.contact,
            profession: user.profession,
            location: user.location,
            interests: user.interests,
            image: user.image
          };

          this.currentUserSubject.next(authUser);
          this.isAuthenticatedSubject.next(true);
          localStorage.setItem('currentUser', JSON.stringify(authUser));

          observer.next({ 
            success: true, 
            message: 'Login successful', 
            user: authUser 
          });
        } else {
          observer.next({ 
            success: false, 
            message: 'Invalid username or password' 
          });
        }
        observer.complete();
      }, 1000); // Simulate API delay
    });
  }

  register(userData: RegisterData): Observable<{ success: boolean; message: string; user?: AuthUser }> {
    return new Observable(observer => {
      setTimeout(() => {
        // Check if username already exists
        const existingUser = this.users.find(u => u.username === userData.username);
        if (existingUser) {
          observer.next({ 
            success: false, 
            message: 'Username already exists' 
          });
          observer.complete();
          return;
        }

        // Create new user
        const newUser = {
          id: Date.now().toString(),
          username: userData.username,
          password: userData.password,
          name: userData.name,
          bio: userData.bio,
          contact: userData.contact,
          profession: userData.profession,
          location: userData.location,
          interests: userData.interests,
          image: this.getRandomUserImage()
        };

        this.users.push(newUser);

        const authUser: AuthUser = {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          bio: newUser.bio,
          contact: newUser.contact,
          profession: newUser.profession,
          location: newUser.location,
          interests: newUser.interests,
          image: newUser.image
        };

        this.currentUserSubject.next(authUser);
        this.isAuthenticatedSubject.next(true);
        localStorage.setItem('currentUser', JSON.stringify(authUser));

        observer.next({ 
          success: true, 
          message: 'Registration successful', 
          user: authUser 
        });
        observer.complete();
      }, 1000);
    });
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    localStorage.removeItem('currentUser');
  }

  updateProfile(updates: Partial<AuthUser>): Observable<{ success: boolean; message: string; user?: AuthUser }> {
    return new Observable(observer => {
      setTimeout(() => {
        const currentUser = this.currentUserSubject.value;
        if (!currentUser) {
          observer.next({ 
            success: false, 
            message: 'No user logged in' 
          });
          observer.complete();
          return;
        }

        const updatedUser = { ...currentUser, ...updates };
        
        // Update in mock database
        const userIndex = this.users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
          this.users[userIndex] = { 
            ...this.users[userIndex], 
            ...updates 
          };
        }

        this.currentUserSubject.next(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        observer.next({ 
          success: true, 
          message: 'Profile updated successfully', 
          user: updatedUser 
        });
        observer.complete();
      }, 500);
    });
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  private getRandomUserImage(): string {
    const images = ['👤', '🧑‍💻', '👩‍💼', '🧑‍🎨', '👨‍🔬', '👩‍🏫', '🧑‍⚕️', '👨‍🍳'];
    return images[Math.floor(Math.random() * images.length)];
  }

  // Demo credentials helper
  getDemoCredentials(): LoginCredentials[] {
    return [
      { username: 'demo', password: 'demo' },
      { username: 'arjun.menon', password: 'password123' },
      { username: 'priya.nair', password: 'password123' }
    ];
  }
}