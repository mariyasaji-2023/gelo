import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UserService } from '../services/user.service';

interface NearbyUser {
  id: string;
  name: string;
  distance: number;
  bio: string;
  contact: string;
  isOnline: boolean;
  lastSeen: Date;
  location?: string;
  profession?: string;
  interests?: string[];
  connections?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  image?: string;
  isCenter?: boolean;
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-nearby',
  template: `
    <div class="nearby-container" [ngClass]="{'network-mode': viewMode === 'network', 'list-mode': viewMode === 'list'}">
      
      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-overlay">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>Finding nearby users...</p>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-overlay">
        <div class="error-content">
          <h3>⚠️ Error</h3>
          <p>{{ error }}</p>
          <button (click)="retryLoadUsers()" class="retry-btn">Try Again</button>
        </div>
      </div>

      <!-- Network View -->
      <div *ngIf="viewMode === 'network' && !isLoading && !error" class="network-view">
        <!-- Header -->
        <div class="network-header">
          <div class="header-controls">
            <button 
              (click)="setViewMode('list')"
              class="control-btn">
              connections
            </button>
          </div>
          
          <div class="header-center">
            <h1 class="app-title">🌍 Gelo</h1>
          </div>
          
          <div class="header-actions">
            <button 
              (click)="detectNearbyUsers()"
              [disabled]="isDetecting"
              class="control-btn">
              {{ isDetecting ? 'scanning...' : 'nearby' }}
            </button>
            <button 
              (click)="logout()"
              class="logout-btn">
              🚪 logout
            </button>
          </div>
        </div>

        <!-- Network Canvas -->
        <canvas 
          #networkCanvas
          (click)="handleCanvasClick($event)"
          (mousemove)="handleCanvasMouseMove($event)"
          class="network-canvas">
        </canvas>

        <!-- Info Panel -->
        <div *ngIf="hoveredUser" class="info-panel">
          <div class="info-content">
            <h3>{{ getHoveredUserData()?.name }}</h3>
            <p class="profession">{{ getHoveredUserData()?.profession }}</p>
            <p class="distance">{{ getHoveredUserData()?.distance }}m away</p>
            <div class="interests-tags">
              <span 
                *ngFor="let interest of getHoveredUserData()?.interests" 
                class="interest-tag">
                {{ interest }}
              </span>
            </div>
          </div>
        </div>

        <!-- Controls Panel -->
        <div class="controls-panel">
          <div class="control-group">
            <label class="control-label">
              Range: {{ searchRadius }}m
            </label>
            <input
              type="range"
              min="20"
              max="100"
              step="10"
              [value]="searchRadius"
              (input)="onRadiusChange($event)"
              class="range-slider">
          </div>
          
          <div class="control-group">
            <label class="checkbox-control">
              <input
                type="checkbox"
                [checked]="isAutoRefreshEnabled"
                (change)="toggleAutoRefresh($event)">
              Auto-refresh
            </label>
          </div>

          <!-- User Count Display -->
          <div class="control-group">
            <label class="control-label">
              Found: {{ allUsers.length }} users
            </label>
          </div>
        </div>

        <!-- Profile Modal for Network View -->
        <div *ngIf="selectedUser" class="modal-overlay network-modal" (click)="closeProfile()">
          <div class="modal-content network-modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header-network">
              <div>
                <h2>{{ selectedUser.name }}</h2>
                <p class="user-profession">{{ selectedUser.profession }}</p>
              </div>
              <button (click)="closeProfile()" class="close-btn-network">×</button>
            </div>
            
            <div class="modal-body-network">
              <div class="info-section">
                <h3>About</h3>
                <p>{{ selectedUser.bio }}</p>
              </div>
              
              <div class="info-grid">
                <div class="info-item">
                  <h3>Distance</h3>
                  <p>{{ selectedUser.distance }}m</p>
                </div>
                <div class="info-item">
                  <h3>Status</h3>
                  <p [class]="selectedUser.isOnline ? 'online-status' : 'offline-status'">
                    {{ selectedUser.isOnline ? 'Online' : getTimeAgo(selectedUser.lastSeen) }}
                  </p>
                </div>
              </div>
              
              <div class="info-section" *ngIf="selectedUser.interests?.length">
                <h3>Interests</h3>
                <div class="interests-grid">
                  <span *ngFor="let interest of selectedUser.interests" class="interest-badge">
                    {{ interest }}
                  </span>
                </div>
              </div>
              
              <div class="info-section" *ngIf="selectedUser.location">
                <h3>Location</h3>
                <p>{{ selectedUser.location }}</p>
              </div>
              
              <div class="info-section">
                <h3>Contact</h3>
                <p class="contact-info">{{ selectedUser.contact }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div *ngIf="viewMode === 'list' && !isLoading && !error" class="list-view">
        <div class="list-header">
          <button 
            (click)="setViewMode('network')"
            class="network-switch-btn">
            🌐 Network View
          </button>
          
          <div class="list-controls">
            <button 
              (click)="detectNearbyUsers()"
              [disabled]="isDetecting"
              class="refresh-btn">
              {{ isDetecting ? 'Refreshing...' : '🔄 Refresh' }}
            </button>
            
            <button 
              (click)="logout()"
              class="logout-btn-list">
              🚪 Logout
            </button>
          </div>
        </div>
        
        <div class="list-content">
          <div *ngIf="filteredUsers.length === 0" class="no-users">
            <h3>No users found nearby</h3>
            <p>Try adjusting your search radius or refresh to check again.</p>
          </div>
          
          <div *ngFor="let user of filteredUsers" class="list-user-card">
            <div class="user-avatar">
              <span class="user-initials">{{ getUserInitials(user.name) }}</span>
              <div class="online-indicator" [class.online]="user.isOnline"></div>
            </div>
            <div class="user-info">
              <h3>{{ user.name }}</h3>
              <p class="user-profession" *ngIf="user.profession">{{ user.profession }}</p>
              <p class="user-distance">{{ user.distance }}m away</p>
              <p class="user-bio" *ngIf="user.bio">{{ user.bio }}</p>
            </div>
            <button (click)="viewUserProfile(user)" class="view-profile-btn">View Profile</button>
          </div>
        </div>
      </div>

      <!-- Logout Confirmation Modal -->
      <div *ngIf="showLogoutConfirm" class="modal-overlay logout-modal-overlay" (click)="cancelLogout()">
        <div class="modal-content logout-modal-content" (click)="$event.stopPropagation()">
          <div class="logout-modal-header">
            <h2>🚪 Logout</h2>
          </div>
          <div class="logout-modal-body">
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
    /* Base Styles */
    .nearby-container {
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    }

    /* Loading Styles */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .loading-spinner {
      text-align: center;
      color: white;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #374151;
      border-top: 4px solid #dc2626;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Error Styles */
    .error-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .error-content {
      text-align: center;
      color: white;
      padding: 2rem;
      border: 1px solid #dc2626;
      border-radius: 0.5rem;
      background: #1f2937;
    }

    .error-content h3 {
      color: #ef4444;
      margin-bottom: 1rem;
    }

    .retry-btn {
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      margin-top: 1rem;
    }

    .retry-btn:hover {
      background: #b91c1c;
    }

    /* Network View Styles */
    .network-view {
      min-height: 100vh;
      background: #000000;
      color: white;
      position: relative;
      overflow: hidden;
    }

    .network-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 20;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
    }

    .header-center {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .app-title {
      margin: 0;
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .control-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #dc2626;
      background: transparent;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .control-btn:hover:not(:disabled) {
      background: #dc2626;
      color: white;
    }

    .control-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .logout-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #dc2626;
      background: transparent;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.9rem;
    }

    .logout-btn:hover {
      background: #dc2626;
      color: white;
    }

    .network-canvas {
      position: absolute;
      inset: 0;
      cursor: pointer;
      background: radial-gradient(circle at center, #1a1a1a 0%, #000000 100%);
    }

    .info-panel {
      position: absolute;
      bottom: 1.5rem;
      left: 1.5rem;
      background: #1f2937;
      border: 1px solid #374151;
      padding: 1rem;
      border-radius: 0.5rem;
      max-width: 20rem;
      z-index: 20;
    }

    .info-content h3 {
      font-weight: 500;
      color: white;
      margin: 0 0 0.5rem 0;
    }

    .info-content .profession {
      font-size: 0.875rem;
      color: #9ca3af;
      margin: 0 0 0.5rem 0;
    }

    .info-content .distance {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0 0 0.5rem 0;
    }

    .interests-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .interest-tag {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: #7f1d1d;
      color: #fecaca;
      border-radius: 0.25rem;
    }

    .controls-panel {
      position: absolute;
      bottom: 1.5rem;
      right: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      z-index: 20;
    }

    .control-group {
      border: 1px solid #dc2626;
      padding: 1rem;
      border-radius: 0.25rem;
      background: transparent;
    }

    .control-label {
      display: block;
      font-size: 0.75rem;
      color: #ef4444;
      margin-bottom: 0.5rem;
    }

    .range-slider {
      width: 100%;
      accent-color: #dc2626;
    }

    .checkbox-control {
      display: flex;
      align-items: center;
      font-size: 0.75rem;
      color: #ef4444;
      cursor: pointer;
    }

    .checkbox-control input {
      margin-right: 0.5rem;
      accent-color: #dc2626;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }

    .network-modal-content {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      padding: 2rem;
      max-width: 28rem;
      width: 90%;
      margin: 0 1rem;
    }

    .modal-header-network {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .modal-header-network h2 {
      font-size: 1.25rem;
      font-weight: 300;
      color: white;
      margin: 0;
    }

    .user-profession {
      color: #9ca3af;
      font-size: 0.875rem;
      margin: 0;
    }

    .close-btn-network {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
    }

    .close-btn-network:hover {
      color: white;
    }

    .modal-body-network {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-section h3 {
      font-size: 0.75rem;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.25rem 0;
    }

    .info-section p {
      color: #d1d5db;
      font-size: 0.875rem;
      margin: 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .info-item h3 {
      font-size: 0.75rem;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.25rem 0;
    }

    .info-item p {
      color: white;
      margin: 0;
    }

    .online-status {
      color: #f87171 !important;
    }

    .offline-status {
      color: #9ca3af !important;
    }

    .interests-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .interest-badge {
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      background: #7f1d1d;
      color: #fecaca;
      border-radius: 0.25rem;
    }

    .contact-info {
      font-family: monospace !important;
    }

    /* List View Styles */
    .list-view {
      min-height: 100vh;
      background: #f5f5f5;
      padding: 2rem;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .list-controls {
      display: flex;
      gap: 1rem;
    }

    .network-switch-btn {
      padding: 0.5rem 1rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .network-switch-btn:hover {
      background: #b91c1c;
    }

    .refresh-btn {
      padding: 0.5rem 1rem;
      background: #059669;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .refresh-btn:hover:not(:disabled) {
      background: #047857;
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .logout-btn-list {
      padding: 0.5rem 1rem;
      background: #6b7280;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .logout-btn-list:hover {
      background: #4b5563;
    }

    .list-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .no-users {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
    }

    .list-user-card {
      background: white;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-avatar {
      position: relative;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }

    .user-initials {
      font-size: 1.2rem;
    }

    .online-indicator {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #6b7280;
      border: 2px solid white;
    }

    .online-indicator.online {
      background: #10b981;
    }

    .user-info {
      flex: 1;
    }

    .user-info h3 {
      margin: 0 0 0.25rem 0;
      color: #1f2937;
      font-size: 1.125rem;
    }

    .user-info .user-profession {
      color: #6b7280;
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
    }

    .user-info .user-distance {
      color: #ef4444;
      font-size: 0.75rem;
      font-weight: 500;
      margin: 0 0 0.25rem 0;
    }

    .user-info .user-bio {
      color: #9ca3af;
      font-size: 0.8rem;
      margin: 0;
      line-height: 1.3;
    }

    .view-profile-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .view-profile-btn:hover {
      background: #5a67d8;
    }

    /* Logout Modal Styles */
    .logout-modal-overlay {
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(3px);
    }

    .logout-modal-content {
      background: white;
      border-radius: 16px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .logout-modal-header {
      padding: 2rem 2rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .logout-modal-header h2 {
      margin: 0;
      color: #1f2937;
      font-size: 1.5rem;
      text-align: center;
    }

    .logout-modal-body {
      padding: 2rem;
      text-align: center;
    }

    .logout-modal-body p {
      color: #6b7280;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }

    .logout-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-cancel {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .btn-cancel:hover {
      background: #4b5563;
    }

    .btn-confirm {
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      transition: background 0.3s ease;
    }

    .btn-confirm:hover {
      background: #b91c1c;
    }

    /* Responsive Styles */
    @media (max-width: 768px) {
      .network-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
        padding: 1rem;
      }

      .header-center {
        order: -1;
      }

      .header-actions {
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
      }

      .header-actions .control-btn,
      .header-actions .logout-btn {
        width: 100%;
      }

      .info-panel {
        left: 1rem;
        right: 1rem;
        max-width: none;
      }

      .controls-panel {
        left: 1rem;
        right: 1rem;
        bottom: 6rem;
      }

      .network-modal-content {
        width: 95%;
        margin: 0 0.5rem;
        padding: 1.5rem;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .list-view {
        padding: 1rem;
      }

      .list-header {
        flex-direction: column;
        gap: 1rem;
      }

      .list-controls {
        flex-direction: column;
        width: 100%;
      }

      .list-user-card {
        flex-direction: column;
        text-align: center;
        gap: 0.5rem;
      }

      .logout-actions {
        flex-direction: column;
      }
    }
  `]
})
export class NearbyComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('networkCanvas', { static: false }) networkCanvas!: ElementRef<HTMLCanvasElement>;
  
  currentUser: any = null;
  lastUpdateTime = new Date();
  searchRadius = 50;
  isDetecting = false;
  isAutoRefreshEnabled = false;
  selectedUser: NearbyUser | null = null;
  filteredUsers: NearbyUser[] = [];
  viewMode: 'network' | 'list' = 'network';
  hoveredUser: string | null = null;
  showLogoutConfirm = false;
  isLoading = true;
  error: string | null = null;
  
  // User location
  userLocation: { latitude: number; longitude: number } | null = null;
  
  private autoRefreshInterval: any;
  private animationFrame: any;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private apiUrl = environment.apiUrl || 'http://localhost:3000/api';

  // Users from backend
  allUsers: NearbyUser[] = [];
  constructor(
  private router: Router,
  private authService: AuthService,
  private userService: UserService
) {}

  ngOnInit() {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.currentUser = this.authService.getCurrentUser();
    this.initializeLocation();
  }

  ngAfterViewInit() {
    if (this.viewMode === 'network' && !this.isLoading && !this.error) {
      this.initializeCanvas();
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private cleanup() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

 private async initializeLocation() {
  try {
    console.log('🔍 Getting user coordinates from database...');
    
    // Get current user's profile from database to get their stored location
    this.userService.getCurrentUserProfile().subscribe({
      next: (response) => {
        console.log('👤 User profile from database:', response);
        
        if (response.user) {
          let userLat: number | undefined;
          let userLng: number | undefined;
          
          // ✅ FIXED: Proper type checking for location
          // Check if user has location in database - handle both object and string types
          if (response.user.location && typeof response.user.location === 'object' && 
              'latitude' in response.user.location && 'longitude' in response.user.location) {
            // Handle nested location structure (object)
            userLat = response.user.location.latitude;
            userLng = response.user.location.longitude;
            console.log('✅ Found nested location in database:', { userLat, userLng });
          } else if (response.user.latitude && response.user.longitude) {
            // Handle flat location structure
            userLat = response.user.latitude;
            userLng = response.user.longitude;
            console.log('✅ Found flat location in database:', { userLat, userLng });
          }
          
          if (userLat && userLng) {
            this.userLocation = {
              latitude: userLat,
              longitude: userLng
            };
            console.log('🗺️ Using coordinates from database:', this.userLocation);
            this.loadNearbyUsers();
          } else {
            console.warn('⚠️ User has no location stored in database');
            this.showLocationError();
          }
        } else {
          console.error('❌ No user data received from database');
          this.showLocationError();
        }
      },
      error: (error) => {
        console.error('❌ Failed to get user profile from database:', error);
        this.showLocationError();
      }
    });

  } catch (error) {
    console.error('Location initialization error:', error);
    this.error = 'Failed to initialize location. Please refresh and allow location access.';
    this.isLoading = false;
  }
}

private showLocationError() {
  this.error = 'No location found in your profile. Please update your location in settings.';
  this.isLoading = false;
}
private async loadNearbyUsers() {
  if (!this.userLocation) {
    this.error = 'Location not available';
    this.isLoading = false;
    return;
  }

  try {
    this.isLoading = true;
    this.error = null;

    console.log('🔍 Loading nearby users from backend...', {
      latitude: this.userLocation.latitude,
      longitude: this.userLocation.longitude,
      radius: this.searchRadius
    });

    // Get nearby users from backend
    const response = await this.userService.getNearbyUsers(
      this.userLocation.latitude,
      this.userLocation.longitude,
      this.searchRadius
    ).toPromise();

    console.log('✅ Backend response received:', response);

    if (response && response.users && Array.isArray(response.users)) {
      console.log('📊 Raw backend users:', response.users.length);
      console.log('📋 Backend users data:', response.users.map(u => ({ 
        name: u.name, 
        email: u.email, 
        lat: u.latitude, 
        lng: u.longitude 
      })));
      
      // ✅ Process all users correctly
      this.allUsers = this.processBackendUsers(response.users);
      
      console.log('🔄 After processing - allUsers:', this.allUsers.length);
      console.log('📝 All users details:', this.allUsers.map(u => ({ 
        name: u.name, 
        distance: u.distance, 
        isCenter: u.isCenter 
      })));
      
      this.filterUsersByRadius();
      
      console.log('🎯 After filtering - filteredUsers:', this.filteredUsers.length);
      
      this.initializeNetworkPositions();
      
      // Initialize canvas after data is loaded
      if (this.viewMode === 'network') {
        setTimeout(() => {
          this.initializeCanvas();
        }, 100);
      }
    } else {
      console.warn('⚠️ Invalid response format or no users array');
      this.allUsers = [];
      this.filteredUsers = [];
    }

  } catch (error: any) {
    console.error('❌ Error loading nearby users:', error);
    
    if (error.message.includes('Cannot connect to server')) {
      this.error = 'Cannot connect to server. Please make sure the backend is running on http://localhost:3000';
    } else if (error.message.includes('Authentication failed')) {
      this.error = 'Authentication failed. Redirecting to login...';
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 2000);
      return;
    } else {
      this.error = error.message || 'Failed to load nearby users. Please try again.';
    }
  } finally {
    this.isLoading = false;
  }
}


private processBackendUsers(users: any[]): NearbyUser[] {
  console.log('Processing users from backend:', users.length);
  
  // ✅ Fix: Process all backend users first
  const processedUsers: NearbyUser[] = [];
  
  // Add center user (current user) FIRST
  const centerUser: NearbyUser = {
    id: 'center',
    name: 'You',
    distance: 0,
    bio: 'Discovering connections nearby',
    contact: this.currentUser?.email || '+91-9876543200',
    isOnline: true,
    lastSeen: new Date(),
    profession: 'Explorer',
    location: 'Current Location',
    interests: ['networking', 'discovery'],
    connections: [], // Will be set after all users are processed
    x: 500,
    y: 350,
    vx: 0,
    vy: 0,
    image: '👤',
    isCenter: true
  };
  
  processedUsers.push(centerUser);
  
 // ✅ Process backend users and add them to the array
  users.forEach((user, index) => {
    // 🐛 DEBUG: Log the comparison details
    console.log('🔍 User comparison debug:', {
      'Backend user email': user.email,
      'Backend user id': user.id || user._id,
      'Current user email': this.currentUser?.email,
      'Current user id': this.currentUser?.id,
      'Email match': user.email === this.currentUser?.email,
      'ID match': (user.id || user._id) === this.currentUser?.id
    });

    // 🚫 TEMPORARILY DISABLED: Skip current user check
    // if (user.email === this.currentUser?.email || user.id === this.currentUser?.id) {
    //   console.log('Skipping current user from backend list:', user.name);
    //   return;
    // }
    
    // ✅ FIXED: Handle nested location structure from backend
    let userLatitude: number;
    let userLongitude: number;
    let distance: number;
    
    if (user.location && user.location.latitude && user.location.longitude) {
      // Backend format: user.location.latitude, user.location.longitude
      userLatitude = user.location.latitude;
      userLongitude = user.location.longitude;
      distance = user.distance || this.calculateDistance(userLatitude, userLongitude);
    } else if (user.latitude && user.longitude) {
      // Flat format: user.latitude, user.longitude (fallback)
      userLatitude = user.latitude;
      userLongitude = user.longitude;
      distance = user.distance || this.calculateDistance(userLatitude, userLongitude);
    } else {
      console.warn('User has no valid location data:', user.name);
      return; // Skip users without location
    }
    
    const processedUser: NearbyUser = {
      id: user.id || user._id,
      name: user.name,
      distance: distance,
      bio: user.bio || 'No bio available',
      contact: user.contact || user.email || 'No contact info',
      isOnline: user.isOnline !== undefined ? user.isOnline : Math.random() > 0.3,
      lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date(),
      profession: user.profession || this.getRandomProfession(),
      location: user.location?.address || 'Unknown location',
      interests: user.interests || this.getRandomInterests(),
      connections: [], // Will be set after all users are processed
      latitude: userLatitude,
      longitude: userLongitude,
      // Network visualization properties
      x: 0, // Will be set in initializeNetworkPositions
      y: 0,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      image: this.getUserEmoji(user.name, user.profession)
    };
    
    console.log(`✅ Processed user: ${processedUser.name} at (${userLatitude}, ${userLongitude}) - ${distance}m away`);
    processedUsers.push(processedUser);
  });
  // ✅ Generate connections after all users are processed
  processedUsers.forEach(user => {
    if (user.isCenter) {
      // Center user connects to all other users
      user.connections = processedUsers.filter(u => !u.isCenter).map(u => u.id);
    } else {
      // Other users connect to center and some random users
      user.connections = this.generateConnections(user.id, processedUsers);
    }
  });

  console.log('Total processed users (including center):', processedUsers.length);
  console.log('Backend users processed:', processedUsers.length - 1); // Exclude center user
  console.log('Processed users summary:', processedUsers.map(u => ({
    name: u.name,
    isCenter: u.isCenter,
    distance: u.distance,
    hasLocation: !!(u.latitude && u.longitude)
  })));
  
  return processedUsers;
}

  private calculateDistance(lat: number, lng: number): number {
    if (!this.userLocation) return 0;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = this.userLocation.latitude * Math.PI/180;
    const φ2 = lat * Math.PI/180;
    const Δφ = (lat - this.userLocation.latitude) * Math.PI/180;
    const Δλ = (lng - this.userLocation.longitude) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Distance in meters
  }

  private getRandomProfession(): string {
    const professions = [
      'Software Engineer', 'Designer', 'Data Scientist', 'Product Manager',
      'Marketing Specialist', 'Consultant', 'Entrepreneur', 'Developer',
      'Analyst', 'Architect', 'Manager', 'Freelancer'
    ];
    return professions[Math.floor(Math.random() * professions.length)];
  }

  private getRandomInterests(): string[] {
    const allInterests = [
      'technology', 'design', 'travel', 'photography', 'music', 'art',
      'sports', 'reading', 'cooking', 'gaming', 'fitness', 'movies',
      'startups', 'ai', 'mobile', 'web', 'data', 'marketing'
    ];
    
    const count = Math.floor(Math.random() * 4) + 2; // 2-5 interests
    const shuffled = allInterests.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  
private generateConnections(userId: string, allUsers: NearbyUser[]): string[] {
  // Generate random connections (simulate mutual interests or proximity)
  const connections: string[] = [];
  const maxConnections = Math.min(3, allUsers.length - 1); // Exclude self
  
  // Always connect to center user if this isn't the center user
  if (userId !== 'center') {
    connections.push('center');
  }
  
  // Add random connections to other users
  const otherUsers = allUsers.filter(u => u.id !== userId && u.id !== 'center');
  const shuffledUsers = otherUsers.sort(() => 0.5 - Math.random());
  
  const additionalConnections = Math.min(
    Math.floor(Math.random() * maxConnections), 
    shuffledUsers.length
  );
  
  for (let i = 0; i < additionalConnections; i++) {
    if (!connections.includes(shuffledUsers[i].id)) {
      connections.push(shuffledUsers[i].id);
    }
  }
  
  return connections;
}


  private getUserEmoji(name: string, profession?: string): string {
    // Simple emoji assignment based on name or profession
    const emojis = ['👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🎨', '👩‍🎨', '🧑‍🔬', '👨‍🏫', '👩‍🏫', '🧑‍⚕️', '👨‍🚀'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return emojis[hash % emojis.length];
  }
private initializeNetworkPositions() {
  if (this.allUsers.length === 0) return;
  
  console.log('Initializing network positions for', this.allUsers.length, 'users');
  
  // Position users in a circle around center
  const centerX = 500;
  const centerY = 350;
  const baseRadius = 200;
  
  this.allUsers.forEach((user, index) => {
    if (user.isCenter) {
      user.x = centerX;
      user.y = centerY;
    } else {
      // Calculate angle for this user
      const nonCenterUsers = this.allUsers.filter(u => !u.isCenter);
      const userIndex = nonCenterUsers.findIndex(u => u.id === user.id);
      const angle = (userIndex * 2 * Math.PI) / nonCenterUsers.length;
      
      // Add some randomness to the radius
      const radius = baseRadius + Math.random() * 100;
      
      user.x = centerX + Math.cos(angle) * radius;
      user.y = centerY + Math.sin(angle) * radius;
    }
  });
}


  initializeCanvas() {
    if (this.networkCanvas && this.networkCanvas.nativeElement) {
      this.canvas = this.networkCanvas.nativeElement;
      this.ctx = this.canvas.getContext('2d')!;
      this.resizeCanvas();
      this.animate();
      
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Update center user position
    const centerUser = this.getNetworkUsers().find(u => u.isCenter);
    if (centerUser) {
      centerUser.x = this.canvas.width / 2;
      centerUser.y = this.canvas.height / 2;
    }
  }

  
getNetworkUsers(): NearbyUser[] {
  // ✅ Fix: Return all users within radius OR center user
  return this.allUsers.filter(user => 
    user.isCenter || user.distance <= this.searchRadius
  );
}

  animate = () => {
    if (this.viewMode !== 'network' || !this.ctx || !this.canvas) {
      this.animationFrame = requestAnimationFrame(this.animate);
      return;
    }
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const networkUsers = this.getNetworkUsers();
    
    // Draw connections first
    networkUsers.forEach(user => {
      if (user.connections) {
        user.connections.forEach(connId => {
          const connectedUser = networkUsers.find(u => u.id === connId);
          if (connectedUser && user.x !== undefined && user.y !== undefined && 
              connectedUser.x !== undefined && connectedUser.y !== undefined) {
            const strength = this.getConnectionStrength(user.id, connId);
            const isHighlighted = this.hoveredUser === user.id || this.hoveredUser === connId;
            
            this.ctx.beginPath();
            this.ctx.moveTo(user.x, user.y);
            this.ctx.lineTo(connectedUser.x, connectedUser.y);
            this.ctx.strokeStyle = isHighlighted ? '#dc2626' : '#374151';
            this.ctx.lineWidth = isHighlighted ? 2 : 0.5;
            this.ctx.globalAlpha = isHighlighted ? 0.8 : 0.3;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;

            // Draw flowing particles
            if (isHighlighted) {
              const time = Date.now() * 0.001;
              const progress = (Math.sin(time + user.id.charCodeAt(0)) + 1) / 2;
              const particleX = user.x + (connectedUser.x - user.x) * progress;
              const particleY = user.y + (connectedUser.y - user.y) * progress;
              
              this.ctx.beginPath();
              this.ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
              this.ctx.fillStyle = '#dc2626';
              this.ctx.fill();
            }
          }
        });
      }
    });

    // Draw nodes
    networkUsers.forEach(user => {
      if (user.x === undefined || user.y === undefined) return;
      
      const isHovered = this.hoveredUser === user.id;
      const isCenter = user.isCenter;
      
      // Node background
      this.ctx.beginPath();
      this.ctx.arc(user.x, user.y, isCenter ? 40 : 30, 0, Math.PI * 2);
      this.ctx.fillStyle = isCenter ? '#1f2937' : (isHovered ? '#dc2626' : '#374151');
      this.ctx.fill();
      
      // Node border
      this.ctx.beginPath();
      this.ctx.arc(user.x, user.y, isCenter ? 40 : 30, 0, Math.PI * 2);
      this.ctx.strokeStyle = user.isOnline ? '#dc2626' : '#6b7280';
      this.ctx.lineWidth = isCenter ? 3 : 2;
      this.ctx.stroke();

      // Emoji/Icon
      this.ctx.font = isCenter ? '32px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' : '24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      this.ctx.shadowBlur = 2;
      this.ctx.fillText(user.image || '👤', user.x, user.y);
      this.ctx.shadowBlur = 0;

      // Pulsing effect for online users
      if (user.isOnline && isHovered) {
        const pulseRadius = 50 + Math.sin(Date.now() * 0.005) * 10;
        this.ctx.beginPath();
        this.ctx.arc(user.x, user.y, pulseRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#dc2626';
        this.ctx.lineWidth = 1;
        this.ctx.globalAlpha = 0.3;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
      }
    });

    // Update positions with physics
    this.updatePhysics(networkUsers);

    this.animationFrame = requestAnimationFrame(this.animate);
  }

  updatePhysics(users: NearbyUser[]) {
    users.forEach(user => {
      if (!user.isCenter && user.x !== undefined && user.y !== undefined && 
          user.vx !== undefined && user.vy !== undefined) {
        // Attraction to center
        const centerUser = users.find(u => u.isCenter);
        if (centerUser && centerUser.x !== undefined && centerUser.y !== undefined) {
          const dx = centerUser.x - user.x;
          const dy = centerUser.y - user.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const force = 0.0001;
          user.vx += (dx / distance) * force;
          user.vy += (dy / distance) * force;
        }

        // Repulsion from other nodes
        users.forEach(other => {
          if (other.id !== user.id && other.x !== undefined && other.y !== undefined) {
            const dx = user.x! - other.x;
            const dy = user.y! - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 100) {
              const force = 0.5;
              user.vx! += (dx / distance) * force;
              user.vy! += (dy / distance) * force;
            }
          }
        });

        // Apply velocity with damping
        user.vx *= 0.95;
        user.vy *= 0.95;
        user.x += user.vx;
        user.y += user.vy;

        // Boundary constraints
        const margin = 50;
        if (user.x < margin) { user.x = margin; user.vx = 0; }
        if (user.x > this.canvas.width - margin) { user.x = this.canvas.width - margin; user.vx = 0; }
        if (user.y < margin) { user.y = margin; user.vy = 0; }
        if (user.y > this.canvas.height - margin) { user.y = this.canvas.height - margin; user.vy = 0; }
      }
    });
  }

  handleCanvasClick(event: MouseEvent) {
    if (!this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.getNetworkUsers().forEach(user => {
      if (user.x !== undefined && user.y !== undefined) {
        const distance = Math.sqrt((x - user.x) ** 2 + (y - user.y) ** 2);
        if (distance < (user.isCenter ? 40 : 30) && !user.isCenter) {
          this.selectedUser = user;
        }
      }
    });
  }

  handleCanvasMouseMove(event: MouseEvent) {
    if (!this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let foundHover: string | null = null;
    this.getNetworkUsers().forEach(user => {
      if (user.x !== undefined && user.y !== undefined) {
        const distance = Math.sqrt((x - user.x) ** 2 + (y - user.y) ** 2);
        if (distance < (user.isCenter ? 40 : 30)) {
          foundHover = user.id;
        }
      }
    });

    this.hoveredUser = foundHover;
  }

  setViewMode(mode: 'network' | 'list') {
    this.viewMode = mode;
    
    if (mode === 'network') {
      setTimeout(() => {
        this.initializeCanvas();
      }, 100);
    } else if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  getConnectionStrength(user1Id: string, user2Id: string): number {
    const user1 = this.allUsers.find(u => u.id === user1Id);
    const user2 = this.allUsers.find(u => u.id === user2Id);
    if (!user1 || !user2) return 0;
    
    const sharedInterests = this.getSharedInterests(user1, user2);
    const distanceFactor = user1.distance === 0 ? 1 : 1 - Math.min(user1.distance / 100, 1);
    return Math.max(0.2, sharedInterests.length * 0.4 + distanceFactor * 0.6);
  }

  getSharedInterests(user1: NearbyUser, user2: NearbyUser): string[] {
    if (!user1.interests || !user2.interests) return [];
    return user1.interests.filter(interest => user2.interests!.includes(interest));
  }

  getHoveredUserData(): NearbyUser | null {
    if (!this.hoveredUser) return null;
    return this.getNetworkUsers().find(u => u.id === this.hoveredUser) || null;
  }


async detectNearbyUsers() {
  this.isDetecting = true;
  
  try {
    // Update location first if needed
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          
          // Update backend with new location
          this.userService.updateLocation(
            this.userLocation.latitude,
            this.userLocation.longitude
          ).subscribe({
            next: () => console.log('Location updated on backend'),
            error: (error) => console.warn('Failed to update location:', error)
          });
        },
        (error) => console.warn('Geolocation error:', error)
      );
    }

    await this.loadNearbyUsers();
    this.lastUpdateTime = new Date();
  } catch (error) {
    console.error('Error detecting nearby users:', error);
  } finally {
    this.isDetecting = false;
  }
}

async testBackendConnection() {
  try {
    const health = await this.userService.testConnection().toPromise();
    console.log('Backend health check:', health);
    return true;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
}

  async onRadiusChange(event: any) {
    const value = event.target ? event.target.value : event;
    this.searchRadius = parseInt(value);
    this.filterUsersByRadius();
    
    // Reload users with new radius
    await this.loadNearbyUsers();
  }

  toggleAutoRefresh(event: any) {
    const checked = event.target ? event.target.checked : event;
    this.isAutoRefreshEnabled = checked;
    
    if (this.isAutoRefreshEnabled) {
      this.autoRefreshInterval = setInterval(() => {
        this.detectNearbyUsers();
      }, 5000);
    } else {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval);
        this.autoRefreshInterval = null;
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
    this.cleanup();
    
    // Reset state
    this.isDetecting = false;
    this.isAutoRefreshEnabled = false;
    this.selectedUser = null;
    this.showLogoutConfirm = false;
    this.allUsers = [];
    this.filteredUsers = [];
    
    // Logout via auth service
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
  }

  retryLoadUsers() {
    this.error = null;
    this.loadNearbyUsers();
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    return `${Math.floor(diffMins / 60)}h`;
  }

private filterUsersByRadius() {
  // ✅ Fix: Filter for list view (exclude center user)
  this.filteredUsers = this.allUsers.filter(user => {
    const isNotCenter = !user.isCenter;
    const isWithinRadius = user.distance <= this.searchRadius;
    
    console.log(`User ${user.name}: isNotCenter=${isNotCenter}, distance=${user.distance}, radius=${this.searchRadius}, withinRadius=${isWithinRadius}`);
    
    return isNotCenter && isWithinRadius;
  });
  
  console.log('Filtered users for list view:', this.filteredUsers.length);
  console.log('Filtered users:', this.filteredUsers.map(u => ({ name: u.name, distance: u.distance })));
}
}