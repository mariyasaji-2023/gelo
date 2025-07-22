import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
}

@Component({
  selector: 'app-nearby',
  template: `
    <div class="nearby-container" [ngClass]="{'network-mode': viewMode === 'network', 'list-mode': viewMode === 'list'}">
      
      <!-- Network View -->
      <div *ngIf="viewMode === 'network'" class="network-view">
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
              
              <div class="info-section">
                <h3>Interests</h3>
                <div class="interests-grid">
                  <span *ngFor="let interest of selectedUser.interests" class="interest-badge">
                    {{ interest }}
                  </span>
                </div>
              </div>
              
              <div class="info-section">
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

      <!-- List View (Fallback) -->
      <div *ngIf="viewMode === 'list'" class="list-view">
        <div class="list-header">
          <button 
            (click)="setViewMode('network')"
            class="network-switch-btn">
            🌐 Network View
          </button>
          
          <button 
            (click)="logout()"
            class="logout-btn-list">
            🚪 Logout
          </button>
        </div>
        
        <div class="list-content">
          <div *ngFor="let user of filteredUsers" class="list-user-card">
            <h3>{{ user.name }}</h3>
            <p class="user-profession">{{ user.profession }}</p>
            <p class="user-distance">{{ user.distance }}m away</p>
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

    .list-user-card {
      background: white;
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .list-user-card h3 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
      font-size: 1.125rem;
    }

    .list-user-card .user-profession {
      color: #6b7280;
      margin: 0 0 0.5rem 0;
    }

    .list-user-card .user-distance {
      color: #ef4444;
      font-size: 0.875rem;
      margin: 0 0 1rem 0;
    }

    .view-profile-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .view-profile-btn:hover {
      background: #5a67d8;
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
  
  private autoRefreshInterval: any;
  private animationFrame: any;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  // Enhanced users data with network properties (copied from React)
  allUsers: NearbyUser[] = [
    {
      id: '1',
      name: 'Arjun Menon',
      distance: 15,
      bio: 'Software engineer passionate about mobile development',
      contact: '+91-9876543210',
      isOnline: true,
      lastSeen: new Date(),
      profession: 'Engineer',
      location: 'Kochi Marine Drive',
      interests: ['technology', 'mobile', 'ai'],
      connections: ['2', '3'],
      x: 300,
      y: 200,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      image: '🧑‍💻'
    },
    {
      id: '2',
      name: 'Priya Nair',
      distance: 23,
      bio: 'UI/UX Designer. Coffee enthusiast',
      contact: '+91-9876543211',
      isOnline: true,
      lastSeen: new Date(),
      profession: 'Designer',
      location: 'Lulu Mall',
      interests: ['design', 'coffee', 'technology'],
      connections: ['1', '4'],
      x: 600,
      y: 300,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      image: '🎨'
    },
    {
      id: '3',
      name: 'Vikram Kumar',
      distance: 31,
      bio: 'Data scientist and AI enthusiast',
      contact: '+91-9876543212',
      isOnline: false,
      lastSeen: new Date(Date.now() - 300000),
      profession: 'Data Scientist',
      location: 'Infopark',
      interests: ['ai', 'data', 'technology'],
      connections: ['1'],
      x: 400,
      y: 500,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      image: '📊'
    },
    {
      id: '4',
      name: 'Sneha Pillai',
      distance: 45,
      bio: 'Digital marketing specialist. Traveler',
      contact: '+91-9876543213',
      isOnline: true,
      lastSeen: new Date(),
      profession: 'Marketer',
      location: 'Fort Kochi',
      interests: ['marketing', 'travel', 'photography'],
      connections: ['2'],
      x: 700,
      y: 150,
      vx: Math.random() * 2 - 1,
      vy: Math.random() * 2 - 1,
      image: '📸'
    },
    {
      id: 'center',
      name: 'You',
      distance: 0,
      bio: 'Discovering connections nearby',
      contact: '+91-9876543200',
      isOnline: true,
      lastSeen: new Date(),
      profession: 'Explorer',
      location: 'Kochi, Kerala',
      interests: ['networking', 'discovery'],
      connections: ['1', '2', '3', '4'],
      x: 500,
      y: 350,
      vx: 0,
      vy: 0,
      image: '👤',
      isCenter: true
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.currentUser = this.authService.getCurrentUser();
    this.filterUsersByRadius();
    
    // Auto-detect on page load
    setTimeout(() => {
      this.detectNearbyUsers();
    }, 500);
  }

  ngAfterViewInit() {
    if (this.viewMode === 'network') {
      this.initializeCanvas();
    }
  }

  ngOnDestroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
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
    return this.allUsers.filter(user => user.isCenter || user.distance <= this.searchRadius);
  }

  animate = () => {
    if (this.viewMode !== 'network' || !this.ctx || !this.canvas) {
      this.animationFrame = requestAnimationFrame(this.animate);
      return;
    }
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const networkUsers = this.getNetworkUsers();
    
    // Draw connections first (copied from React logic)
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

            // Draw flowing particles (copied from React)
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

    // Draw nodes (copied from React)
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

      // Emoji/Icon - High quality rendering (copied from React)
      this.ctx.font = isCenter ? '32px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' : '24px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      this.ctx.shadowBlur = 2;
      this.ctx.fillText(user.image || '👤', user.x, user.y);
      this.ctx.shadowBlur = 0;

      // Pulsing effect for online users (copied from React)
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

    // Update positions with physics (copied from React)
    this.updatePhysics(networkUsers);

    this.animationFrame = requestAnimationFrame(this.animate);
  }

  updatePhysics(users: NearbyUser[]) {
    users.forEach(user => {
      if (!user.isCenter && user.x !== undefined && user.y !== undefined && 
          user.vx !== undefined && user.vy !== undefined) {
        // Attraction to center (copied from React)
        const centerUser = users.find(u => u.isCenter);
        if (centerUser && centerUser.x !== undefined && centerUser.y !== undefined) {
          const dx = centerUser.x - user.x;
          const dy = centerUser.y - user.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const force = 0.0001;
          user.vx += (dx / distance) * force;
          user.vy += (dy / distance) * force;
        }

        // Repulsion from other nodes (copied from React)
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

        // Apply velocity with damping (copied from React)
        user.vx *= 0.95;
        user.vy *= 0.95;
        user.x += user.vx;
        user.y += user.vy;

        // Boundary constraints (copied from React)
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

  detectNearbyUsers() {
    this.isDetecting = true;
    
    // Simulate API call to backend (copied from React logic)
    setTimeout(() => {
      this.lastUpdateTime = new Date();
      this.isDetecting = false;
    }, 1500);
  }

  onRadiusChange(event: any) {
    const value = event.target ? event.target.value : event;
    this.searchRadius = parseInt(value);
    this.filterUsersByRadius();
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
    // Clean up intervals and animations
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // Reset state
    this.isDetecting = false;
    this.isAutoRefreshEnabled = false;
    this.selectedUser = null;
    this.showLogoutConfirm = false;
    
    // Logout via auth service
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  cancelLogout() {
    this.showLogoutConfirm = false;
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
    this.filteredUsers = this.allUsers.filter(user => !user.isCenter && user.distance <= this.searchRadius);
  }
}