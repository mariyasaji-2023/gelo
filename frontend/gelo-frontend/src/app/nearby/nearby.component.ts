import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface NearbyUser {
  id: string;
  name: string;
  distance: number;
  bio: string;
  contact: string;
  isOnline: boolean;
  lastSeen: Date;
  location: {
    latitude: number;
    longitude: number;
  };
}

@Component({
  selector: 'app-nearby',
  template: `
    <div class="nearby-container">
      <!-- Header -->
      <header class="header">
        <div class="header-content">
          <h1>🌍 Gelo</h1>
          <div class="user-info">
            <span>Welcome, {{ currentUser?.name || 'User' }}!</span>
            <button class="logout-btn" (click)="logout()" title="Logout">
              🚪 Logout
            </button>
          </div>
        </div>
        <div class="location-info">
          <p>📍 Current Location: Kochi, Kerala (9.9312, 76.2673)</p>
          <p class="last-update">Last updated: {{ formatTime(lastUpdateTime) }}</p>
        </div>
      </header>

      <!-- Status Cards -->
      <div class="status-section">
        <div class="status-card">
          <h3>📍 Location Status</h3>
          <p class="status-active">GPS Active</p>
          <small>Permission granted</small>
        </div>
        <div class="status-card">
          <h3>👥 Users Nearby</h3>
          <p class="status-count">{{ filteredUsers.length }}</p>
          <small>Within {{ searchRadius }}m radius</small>
        </div>
        <div class="status-card">
          <h3>🔄 Auto Refresh</h3>
          <p class="status-active">{{ isAutoRefreshEnabled ? 'ON' : 'OFF' }}</p>
          <small>Every 5 seconds</small>
        </div>
      </div>

      <!-- Main Action Button -->
      <div class="action-section">
        <button class="detect-btn" (click)="detectNearbyUsers()" [disabled]="isDetecting">
          {{ isDetecting ? '🔄 Detecting...' : '🔍 Detect Nearby Users' }}
        </button>
        
        <!-- Controls -->
        <div class="controls">
          <label class="auto-refresh-control">
            <input type="checkbox" #autoRefreshCheckbox (change)="toggleAutoRefresh(autoRefreshCheckbox.checked)">
            Auto-refresh every 5 seconds
          </label>
          
          <div class="radius-control">
            <label>Search Radius: {{ searchRadius }}m</label>
            <input type="range" #radiusSlider [value]="searchRadius" min="20" max="100" step="10" 
                   (input)="onRadiusChange(radiusSlider.value)" class="radius-slider">
            <div class="radius-labels">
              <span>20m</span>
              <span>50m</span>
              <span>100m</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Nearby Users List -->
      <div class="users-section">
        <h2>👥 People Near You</h2>
        
        <!-- Loading State -->
        <div class="loading" *ngIf="isDetecting">
          <div class="spinner"></div>
          <p>🔍 Searching for nearby users...</p>
        </div>

        <!-- Users List -->
        <div class="users-list" *ngIf="!isDetecting && filteredUsers.length > 0">
          <div class="user-card" *ngFor="let user of filteredUsers" (click)="viewUserProfile(user)">
            <div class="user-avatar" [style.background]="getUserAvatarColor(user.id)">
              {{ getUserInitials(user.name) }}
            </div>
            <div class="user-info">
              <div class="user-header">
                <h3>{{ user.name }}</h3>
                <div class="status-badge" [class.online]="user.isOnline" [class.offline]="!user.isOnline">
                  <span class="status-dot"></span>
                  {{ user.isOnline ? 'Online' : 'Offline' }}
                </div>
              </div>
              <p class="user-bio">{{ user.bio }}</p>
              <div class="user-details">
                <span class="distance">📍 {{ user.distance }}m away</span>
                <span class="contact">📱 {{ user.contact }}</span>
              </div>
              <div class="last-seen" *ngIf="!user.isOnline">
                Last seen: {{ getTimeAgo(user.lastSeen) }}
              </div>
            </div>
            <div class="user-actions">
              <button class="view-btn">View Profile</button>
            </div>
          </div>
        </div>

        <!-- No Users Found -->
        <div class="no-users" *ngIf="!isDetecting && filteredUsers.length === 0">
          <div class="no-users-icon">🔍</div>
          <h3>No users found</h3>
          <p>No people within {{ searchRadius }}m radius</p>
          <button class="retry-btn" (click)="detectNearbyUsers()">Try Again</button>
        </div>
      </div>

      <!-- User Profile Modal -->
      <div class="modal-overlay" *ngIf="selectedUser" (click)="closeProfile()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ selectedUser?.name }}</h2>
            <button class="close-btn" (click)="closeProfile()">×</button>
          </div>
          <div class="modal-body">
            <div class="profile-avatar" [style.background]="getUserAvatarColor(selectedUser?.id || '')">
              {{ getUserInitials(selectedUser?.name || '') }}
            </div>
            <div class="profile-info">
              <p><strong>📝 Bio:</strong> {{ selectedUser?.bio }}</p>
              <p><strong>📱 Contact:</strong> {{ selectedUser?.contact }}</p>
              <p><strong>📍 Distance:</strong> {{ selectedUser?.distance }}m away</p>
              <p><strong>🟢 Status:</strong> 
                <span [class.online]="selectedUser?.isOnline" [class.offline]="!selectedUser?.isOnline">
                  {{ selectedUser?.isOnline ? 'Online' : 'Offline' }}
                </span>
              </p>
              <p *ngIf="!selectedUser?.isOnline">
                <strong>⏰ Last Seen:</strong> {{ getTimeAgo(selectedUser?.lastSeen || getCurrentDate()) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Logout Confirmation Modal -->
      <div class="modal-overlay" *ngIf="showLogoutConfirm" (click)="cancelLogout()">
        <div class="modal logout-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🚪 Logout</h2>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to logout?</p>
            <div class="logout-actions">
              <button class="btn-cancel" (click)="cancelLogout()">Cancel</button>
              <button class="btn-confirm" (click)="confirmLogout()">Yes, Logout</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nearby-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    }

    /* Header */
    .header {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 1.5rem 2rem;
      color: white;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .header h1 {
      margin: 0;
      font-size: 2.2rem;
      font-weight: 700;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 1.1rem;
    }

    .logout-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .logout-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .location-info {
      font-size: 0.95rem;
      opacity: 0.9;
    }

    .last-update {
      margin: 0.25rem 0 0 0;
      font-size: 0.85rem;
    }

    /* Status Section */
    .status-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
    }

    .status-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
    }

    .status-card:hover {
      transform: translateY(-2px);
    }

    .status-card h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.1rem;
    }

    .status-active {
      color: #4CAF50;
      font-weight: bold;
      font-size: 1.3rem;
      margin: 0.5rem 0;
    }

    .status-count {
      color: #667eea;
      font-weight: bold;
      font-size: 2rem;
      margin: 0.5rem 0;
    }

    .status-card small {
      color: #666;
      font-size: 0.9rem;
    }

    /* Action Section */
    .action-section {
      padding: 0 2rem 2rem;
      text-align: center;
    }

    .detect-btn {
      background: linear-gradient(135deg, #FF6B35, #E55A2B);
      color: white;
      border: none;
      padding: 1.2rem 2.5rem;
      font-size: 1.2rem;
      font-weight: 600;
      border-radius: 50px;
      cursor: pointer;
      margin-bottom: 2rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
    }

    .detect-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #E55A2B, #CC4E23);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
    }

    .detect-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .controls {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: center;
    }

    .auto-refresh-control {
      color: white;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
    }

    .auto-refresh-control input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }

    .radius-control {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      padding: 1.5rem;
      border-radius: 12px;
      min-width: 300px;
    }

    .radius-control label {
      color: white;
      display: block;
      margin-bottom: 1rem;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .radius-slider {
      width: 100%;
      margin: 0.5rem 0;
    }

    .radius-labels {
      display: flex;
      justify-content: space-between;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    /* Users Section */
    .users-section {
      padding: 0 2rem 2rem;
    }

    .users-section h2 {
      color: white;
      text-align: center;
      margin-bottom: 2rem;
      font-size: 1.8rem;
      font-weight: 600;
    }

    /* Loading */
    .loading {
      text-align: center;
      color: white;
      padding: 3rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Users List */
    .users-list {
      display: grid;
      gap: 1.2rem;
    }

    .user-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .user-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .user-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
    }

    .user-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .user-header h3 {
      margin: 0;
      color: #333;
      font-size: 1.2rem;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
    }

    .status-badge.online {
      background: rgba(76, 175, 80, 0.1);
      color: #4CAF50;
    }

    .status-badge.offline {
      background: rgba(158, 158, 158, 0.1);
      color: #9E9E9E;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .user-bio {
      color: #666;
      margin: 0 0 0.5rem 0;
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .user-details {
      display: flex;
      gap: 1.5rem;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .distance {
      color: #FF6B35;
      font-weight: 500;
    }

    .contact {
      color: #667eea;
      font-weight: 500;
    }

    .last-seen {
      font-size: 0.8rem;
      color: #999;
      font-style: italic;
    }

    .user-actions {
      flex-shrink: 0;
    }

    .view-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.3s ease;
    }

    .view-btn:hover {
      background: #5a6fd8;
    }

    /* No Users */
    .no-users {
      text-align: center;
      color: white;
      padding: 3rem 2rem;
    }

    .no-users-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .no-users h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }

    .no-users p {
      margin: 0 0 1.5rem 0;
      opacity: 0.8;
    }

    .retry-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .retry-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(3px);
    }

    .modal {
      background: white;
      border-radius: 16px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .logout-modal {
      max-width: 400px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem 2rem 1rem;
      border-bottom: 1px solid #eee;
    }

    .modal-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.5rem;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #666;
      line-height: 1;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-body {
      padding: 2rem;
      text-align: center;
    }

    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 2rem;
      margin: 0 auto 2rem;
    }

    .profile-info {
      text-align: left;
    }

    .profile-info p {
      margin: 1rem 0;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .profile-info strong {
      color: #333;
    }

    .profile-info .online {
      color: #4CAF50;
      font-weight: bold;
    }

    .profile-info .offline {
      color: #9E9E9E;
      font-weight: bold;
    }

    /* Logout Modal */
    .logout-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }

    .btn-cancel {
      background: #6c757d;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .btn-cancel:hover {
      background: #5a6268;
    }

    .btn-confirm {
      background: #dc3545;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .btn-confirm:hover {
      background: #c82333;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header {
        padding: 1rem;
      }
      
      .header-content {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
      
      .status-section {
        grid-template-columns: 1fr;
        padding: 1rem;
      }
      
      .users-section {
        padding: 0 1rem 1rem;
      }

      .user-card {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .user-header {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }

      .user-details {
        justify-content: center;
      }

      .controls {
        gap: 1rem;
      }

      .radius-control {
        min-width: auto;
        width: 100%;
      }

      .modal {
        margin: 1rem;
      }

      .modal-body {
        padding: 1.5rem;
      }

      .logout-actions {
        flex-direction: column;
      }
    }
  `]
})
export class NearbyComponent implements OnInit, OnDestroy {
  currentUser: any = null;
  lastUpdateTime = new Date();
  searchRadius = 50;
  isDetecting = false;
  isAutoRefreshEnabled = false;
  selectedUser: NearbyUser | null = null;
  filteredUsers: NearbyUser[] = [];
  showLogoutConfirm = false;
  
  private autoRefreshInterval: any;

  // Mock users data (as per assignment requirement: 5+ users)
  allUsers: NearbyUser[] = [
    {
      id: '1',
      name: 'Arjun Menon',
      distance: 15,
      bio: 'Software engineer passionate about mobile development. Love exploring new places and meeting new people!',
      contact: '+91-9876543210',
      isOnline: true,
      lastSeen: new Date(),
      location: { latitude: 9.9313, longitude: 76.2674 }
    },
    {
      id: '2',
      name: 'Priya Nair',
      distance: 23,
      bio: 'UI/UX Designer and coffee enthusiast. Always looking for design inspiration and creative collaborations.',
      contact: '+91-9876543211',
      isOnline: true,
      lastSeen: new Date(),
      location: { latitude: 9.9310, longitude: 76.2675 }
    },
    {
      id: '3',
      name: 'Vikram Kumar',
      distance: 31,
      bio: 'Data scientist and AI enthusiast. Building the future with machine learning and deep analytics.',
      contact: '+91-9876543212',
      isOnline: false,
      lastSeen: new Date(Date.now() - 300000), // 5 minutes ago
      location: { latitude: 9.9315, longitude: 76.2671 }
    },
    {
      id: '4',
      name: 'Sneha Pillai',
      distance: 45,
      bio: 'Digital marketing specialist, traveler, and foodie. Always up for a good conversation and new adventures!',
      contact: '+91-9876543213',
      isOnline: true,
      lastSeen: new Date(),
      location: { latitude: 9.9309, longitude: 76.2670 }
    },
    {
      id: '5',
      name: 'Rahul Sharma',
      distance: 38,
      bio: 'Full-stack developer and tech blogger. Open source contributor and passionate about clean code.',
      contact: '+91-9876543214',
      isOnline: false,
      lastSeen: new Date(Date.now() - 1800000), // 30 minutes ago
      location: { latitude: 9.9314, longitude: 76.2676 }
    },
    {
      id: '6',
      name: 'Anjali Thomas',
      distance: 28,
      bio: 'Product manager with a passion for user experience. Love hiking, photography, and weekend getaways.',
      contact: '+91-9876543215',
      isOnline: true,
      lastSeen: new Date(),
      location: { latitude: 9.9311, longitude: 76.2672 }
    },
    {
      id: '7',
      name: 'Karthik Krishnan',
      distance: 42,
      bio: 'Cybersecurity expert and gamer. Always learning new technologies and security best practices.',
      contact: '+91-9876543216',
      isOnline: false,
      lastSeen: new Date(Date.now() - 900000), // 15 minutes ago
      location: { latitude: 9.9308, longitude: 76.2677 }
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Get current user from auth service
    this.currentUser = this.authService.getCurrentUser();
    
    // If no user data, try to get from localStorage
    if (!this.currentUser) {
      const userData = localStorage.getItem('gelo_user');
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
          this.router.navigate(['/login']);
          return;
        }
      } else {
        this.router.navigate(['/login']);
        return;
      }
    }
    
    this.filterUsersByRadius();
    
    // Auto-detect on page load
    setTimeout(() => {
      this.detectNearbyUsers();
    }, 500);
  }

  ngOnDestroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
  }

  detectNearbyUsers() {
    this.isDetecting = true;
    
    // Simulate API call to backend
    setTimeout(() => {
      this.lastUpdateTime = new Date();
      this.simulateUserMovement();
      this.filterUsersByRadius();
      this.isDetecting = false;
    }, 2000);
  }

  onRadiusChange(value: string) {
    this.searchRadius = parseInt(value);
    this.filterUsersByRadius();
  }

  toggleAutoRefresh(checked: boolean) {
    this.isAutoRefreshEnabled = checked;
    
    if (this.isAutoRefreshEnabled) {
      this.autoRefreshInterval = setInterval(() => {
        this.detectNearbyUsers();
      }, 5000); // Every 5 seconds as per assignment requirement
    } else {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
      }
    }
  }

  viewUserProfile(user: NearbyUser) {
    this.selectedUser = user;
  }

  closeProfile() {
    this.selectedUser = null;
  }

  logout() {
    this.showLogoutConfirm = true;
  }

  confirmLogout() {
    // Clear auto-refresh interval
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
    
    // Stop any ongoing detection
    this.isDetecting = false;
    this.isAutoRefreshEnabled = false;
    
    // Clear any selected user
    this.selectedUser = null;
    this.showLogoutConfirm = false;
    
    console.log('User logged out successfully');
    
    // Call auth service logout (clears tokens and redirects to login)
    this.authService.logout();
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getUserAvatarColor(userId: string): string {
    const colors = [
      'linear-gradient(135deg, #667eea, #764ba2)',
      'linear-gradient(135deg, #f093fb, #f5576c)',
      'linear-gradient(135deg, #4facfe, #00f2fe)',
      'linear-gradient(135deg, #43e97b, #38f9d7)',
      'linear-gradient(135deg, #fa709a, #fee140)',
      'linear-gradient(135deg, #a8edea, #fed6e3)',
      'linear-gradient(135deg, #ff9a9e, #fecfef)'
    ];
    
    const index = parseInt(userId) % colors.length;
    return colors[index];
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  getCurrentDate(): Date {
    return new Date();
  }

  formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private filterUsersByRadius() {
    this.filteredUsers = this.allUsers.filter(user => user.distance <= this.searchRadius);
  }

  private simulateUserMovement() {
    // Simulate slight changes in user distances and online status
    this.allUsers.forEach(user => {
      // Slight distance variation (±5 meters)
      const variation = (Math.random() - 0.5) * 10;
      user.distance = Math.max(5, Math.min(100, user.distance + variation));
      user.distance = Math.round(user.distance);
      
      // Randomly change online status (10% chance)
      if (Math.random() < 0.1) {
        user.isOnline = !user.isOnline;
        if (!user.isOnline) {
          user.lastSeen = new Date();
        }
      }
    });
  }
}