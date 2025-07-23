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
            <img src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=138,fit=crop,q=95/Yyv20Pge6osev85z/gelo-logo-white-m5KLvDo7Nrt0W8y6.png" 
                 alt="Gelo" 
                 class="app-logo-only"
                 loading="lazy"
                 onerror="this.style.display='none'">
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
              logout
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

      <!-- List View with Compact Tabs -->
      <div *ngIf="viewMode === 'list' && !isLoading && !error" class="list-view">
        <!-- Header -->
        <div class="list-header">
          <button 
            (click)="setViewMode('network')"
            class="network-switch-btn">
            Network View
          </button>
          
          <div class="list-controls">
            <button 
              (click)="detectNearbyUsers()"
              [disabled]="isDetecting"
              class="refresh-btn">
              {{ isDetecting ? 'Refreshing...' : 'Refresh' }}
            </button>
            
            <button 
              (click)="logout()"
              class="logout-btn-list">
              Logout
            </button>
          </div>
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stats-item">
            Found: <span class="stats-number">{{ filteredUsers.length }}</span> users nearby
          </div>
          <div class="stats-item">
            Range: <span class="stats-number">{{ searchRadius }}m</span>
          </div>
        </div>
        
        <!-- Content Grid with Compact Tabs -->
        <div class="list-content">
          <div *ngIf="filteredUsers.length === 0" class="no-users">
            <h3>No users found nearby</h3>
            <p>Try adjusting your search radius or refresh to check again.</p>
          </div>
          
          <!-- FIXED: Compact User Tabs -->
          <div *ngFor="let user of filteredUsers" class="user-tab">
            <div class="tab-header">
              <div class="user-avatar-small">
                <span class="user-initials">{{ getUserInitials(user.name) }}</span>
                <div class="online-indicator-small" [class.online]="user.isOnline"></div>
              </div>
              <div class="user-details">
                <h3 class="user-name">{{ user.name }}</h3>
                <p class="user-title" *ngIf="user.profession">{{ user.profession }}</p>
              </div>
              <div class="distance-badge">{{ user.distance }}m</div>
            </div>
            <div class="tab-footer">
              <p class="user-bio-short" *ngIf="user.bio">{{ user.bio }}</p>
              <!-- FIXED: Only button has click handler now -->
              <button (click)="viewUserProfile(user, $event)" class="view-btn-small">View</button>
            </div>
          </div>
        </div>

        <!-- FIXED: Profile Modal for List View -->
        <div *ngIf="selectedUser" class="modal-overlay list-modal-overlay" (click)="closeProfile()">
          <div class="modal-content list-modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header-list">
              <div>
                <h2>{{ selectedUser.name }}</h2>
                <p class="user-profession">{{ selectedUser.profession }}</p>
              </div>
              <button (click)="closeProfile()" class="close-btn-list">×</button>
            </div>
            
            <div class="modal-body-list">
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

      <!-- Logout Confirmation Modal -->
      <div *ngIf="showLogoutConfirm" class="modal-overlay logout-modal-overlay" (click)="cancelLogout()">
        <div class="modal-content logout-modal-content" (click)="$event.stopPropagation()">
          <div class="logout-modal-header">
            <h2>Logout</h2>
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
.app-logo-only {
  height: 2.5rem;
  width: auto;
  max-width: 200px;
  object-fit: contain;
  
  /* Convert white logo to red (#dc2626 / #ef4444) */
  filter: 
    brightness(0) /* Make it black first */
    saturate(100%) /* Ensure full saturation */
    invert(27%) /* Adjust for red hue */
    sepia(98%) /* Add color */
    saturate(1844%) /* Boost saturation */
    hue-rotate(346deg) /* Rotate to red */
    brightness(95%) /* Adjust brightness */
    contrast(101%) /* Fine-tune contrast */
    drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3)); /* Keep the shadow */
  
  transition: all 0.3s ease;
  cursor: pointer;
}

.app-logo-only:hover {
  filter: 
    brightness(0)
    saturate(100%)
    invert(27%)
    sepia(98%)
    saturate(1844%)
    hue-rotate(346deg)
    brightness(110%) /* Brighter on hover */
    contrast(101%)
    drop-shadow(0 4px 8px rgba(220, 38, 38, 0.4));
  transform: scale(1.05);
}

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

    /* List View Styles - Updated with Dark Theme */
    .list-view {
      min-height: 100vh;
      background: #000000;
      color: white;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #374151;
      background: #000000;
    }

    .list-controls {
      display: flex;
      gap: 0.75rem;
    }

    .network-switch-btn {
      padding: 0.4rem 0.8rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .network-switch-btn:hover {
      background: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }

    .refresh-btn, .logout-btn-list {
      padding: 0.4rem 0.8rem;
      background: transparent;
      color: #ef4444;
      border: 1px solid #dc2626;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .refresh-btn:hover:not(:disabled), .logout-btn-list:hover {
      background: #dc2626;
      color: white;
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Stats Bar */
    .stats-bar {
      padding: 0.75rem 1.5rem;
      background: #1f2937;
      border-bottom: 1px solid #374151;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }

    .stats-item {
      color: #9ca3af;
    }

    .stats-number {
      color: #ef4444;
      font-weight: 600;
    }

    /* Content Grid */
    .list-content {
      padding: 1.5rem;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .no-users {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
      grid-column: 1 / -1;
    }

    /* Compact User Tabs */
    .user-tab {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      padding: 1rem;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      height: 120px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .user-tab::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 3px;
      height: 100%;
      background: #dc2626;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .user-tab:hover {
      background: #253342;
      border-color: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(220, 38, 38, 0.15);
    }

    .user-tab:hover::before {
      opacity: 1;
    }

    /* Tab Header */
    .tab-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .user-avatar-small {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 0.875rem;
      border: 2px solid #374151;
      flex-shrink: 0;
    }

    .user-avatar-small:hover {
      border-color: #dc2626;
      box-shadow: 0 0 15px rgba(220, 38, 38, 0.3);
    }

    .online-indicator-small {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #6b7280;
      border: 2px solid #1f2937;
      transition: all 0.3s ease;
    }

    .online-indicator-small.online {
      background: #10b981;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
      animation: subtle-pulse 2s ease-in-out infinite;
    }

    .user-details {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      color: #ffffff;
      font-size: 1rem;
      font-weight: 500;
      margin: 0 0 0.25rem 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-title {
      color: #9ca3af;
      font-size: 0.75rem;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .distance-badge {
      background: rgba(220, 38, 38, 0.1);
      color: #ef4444;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      align-self: flex-start;
    }

    /* Tab Footer */
    .tab-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 0.75rem;
    }

    .user-bio-short {
      color: #9ca3af;
      font-size: 0.75rem;
      line-height: 1.3;
      opacity: 0.8;
      flex: 1;
      margin-right: 0.75rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .view-btn-small {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      border: none;
      padding: 0.375rem 0.75rem;
      border-radius: 0.25rem;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
      transition: all 0.3s ease;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
    }

    .view-btn-small:hover {
      background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }

    .view-btn-small:active {
      transform: translateY(0);
      box-shadow: 0 1px 4px rgba(220, 38, 38, 0.3);
    }

    /* FIXED: List Modal Styles */
    .list-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .list-modal-content {
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 0.5rem;
      padding: 2rem;
      max-width: 28rem;
      width: 90%;
      margin: 0 1rem;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header-list {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .modal-header-list h2 {
      font-size: 1.25rem;
      font-weight: 300;
      color: white;
      margin: 0;
    }

    .close-btn-list {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
    }

    .close-btn-list:hover {
      color: white;
    }

    .modal-body-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* Updated Logout Modal Styles - Black & Red Theme */
    .logout-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .logout-modal-content {
      background: #000000;
      border: 2px solid #dc2626;
      border-radius: 16px;
      max-width: 400px;
      width: 90%;
      box-shadow: 
        0 20px 60px rgba(220, 38, 38, 0.3),
        0 0 0 1px rgba(220, 38, 38, 0.1),
        inset 0 1px 0 rgba(220, 38, 38, 0.1);
      overflow: hidden;
      animation: subtle-glow 3s ease-in-out infinite alternate;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
    }

    .logout-modal-header {
      padding: 2rem 2rem 1rem;
      border-bottom: 1px solid #dc2626;
      background: linear-gradient(135deg, #1a0000 0%, #000000 100%);
    }

    .logout-modal-header h2 {
      margin: 0;
      color: #ffffff;
      font-size: 1.25rem;
      text-align: center;
      font-weight: 400;
      letter-spacing: 0.02em;
      text-shadow: 0 0 10px rgba(220, 38, 38, 0.5);
    }

    .logout-modal-body {
      padding: 2rem;
      text-align: center;
      background: #000000;
    }

    .logout-modal-body p {
      color: #e5e7eb;
      font-size: 0.95rem;
      margin-bottom: 2rem;
      line-height: 1.4;
      font-weight: 400;
      letter-spacing: 0.01em;
    }

    .logout-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-cancel {
      background: #1f2937;
      color: #e5e7eb;
      border: 1px solid #374151;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 400;
      letter-spacing: 0.01em;
      transition: all 0.3s ease;
      min-width: 90px;
      font-family: inherit;
    }

    .btn-cancel:hover {
      background: #374151;
      color: #ffffff;
      border-color: #4b5563;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .btn-confirm {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: #ffffff;
      border: 1px solid #dc2626;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 400;
      letter-spacing: 0.01em;
      transition: all 0.3s ease;
      min-width: 90px;
      font-family: inherit;
      box-shadow: 
        0 4px 12px rgba(220, 38, 38, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .btn-confirm:hover {
      background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
      border-color: #b91c1c;
      transform: translateY(-1px);
      box-shadow: 
        0 6px 20px rgba(220, 38, 38, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    .btn-confirm:active {
      transform: translateY(0);
      box-shadow: 
        0 2px 8px rgba(220, 38, 38, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    /* Animations */
    @keyframes subtle-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @keyframes subtle-glow {
      0% {
        box-shadow: 
          0 20px 60px rgba(220, 38, 38, 0.2),
          0 0 0 1px rgba(220, 38, 38, 0.1),
          inset 0 1px 0 rgba(220, 38, 38, 0.1);
      }
      100% {
        box-shadow: 
          0 20px 60px rgba(220, 38, 38, 0.4),
          0 0 0 1px rgba(220, 38, 38, 0.2),
          inset 0 1px 0 rgba(220, 38, 38, 0.2);
      }
    }

    /* Responsive Styles */
    @media (max-width: 1200px) {
      .list-content {
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      }
    }

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

      .list-header {
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
      }

      .list-controls {
        flex-direction: row;
        width: 100%;
        justify-content: center;
      }

      .list-content {
        padding: 1rem;
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .user-tab {
        height: auto;
        min-height: 100px;
      }

      .tab-footer {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
      }

      .view-btn-small {
        width: 100%;
        justify-content: center;
      }

      .logout-actions {
        flex-direction: column;
      }

      .logout-modal-content {
        width: 95%;
        margin: 0 0.5rem;
      }

      .logout-modal-header {
        padding: 1.5rem 1.5rem 1rem;
      }

      .logout-modal-body {
        padding: 1.5rem;
      }

      .btn-cancel,
      .btn-confirm {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .tab-header {
        gap: 0.5rem;
      }

      .user-avatar-small {
        width: 35px;
        height: 35px;
        font-size: 0.75rem;
      }

      .user-name {
        font-size: 0.9rem;
      }
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: #1f2937;
    }

    ::-webkit-scrollbar-thumb {
      background: #374151;
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #4b5563;
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
  ) { }

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
      console.log('🔍 Starting location permission request...');

      // FORCE LOCATION PERMISSION REQUEST - This will definitely trigger the popup
      if (navigator.geolocation) {
        console.log('✅ Geolocation API is available');
        
        // Use a Promise to ensure we handle the permission request properly
        const requestLocationPermission = () => {
          return new Promise<boolean>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('✅ Location permission GRANTED (ignoring coordinates)');
                console.log('📍 Device coordinates (not using):', {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy
                });
                resolve(true);
              },
              (error) => {
                console.warn('⚠️ Location permission DENIED or failed:', {
                  code: error.code,
                  message: error.message
                });
                
                // Log the specific error type
                switch(error.code) {
                  case error.PERMISSION_DENIED:
                    console.log('🚫 User denied location permission');
                    break;
                  case error.POSITION_UNAVAILABLE:
                    console.log('📍 Location information unavailable');
                    break;
                  case error.TIMEOUT:
                    console.log('⏰ Location request timed out');
                    break;
                }
                
                resolve(false);
              },
              {
                enableHighAccuracy: false, // Don't need accuracy since we're not using it
                timeout: 10000, // Increased timeout to 10 seconds
                maximumAge: 0 // Force fresh request to trigger permission
              }
            );
          });
        };

        // Request permission and wait for result
        console.log('🔄 Requesting location permission...');
        const permissionGranted = await requestLocationPermission();
        
        console.log(`📋 Permission result: ${permissionGranted ? 'GRANTED' : 'DENIED'}`);
        
        // Continue with database profile regardless of permission result
        this.getUserProfileFromDatabase();
        
      } else {
        console.warn('⚠️ Geolocation API not supported by this browser');
        this.getUserProfileFromDatabase();
      }

    } catch (error) {
      console.error('❌ Location permission request failed:', error);
      this.getUserProfileFromDatabase();
    }
  }

  // Extract the database profile logic into a separate method:
  private getUserProfileFromDatabase() {
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
    const φ1 = this.userLocation.latitude * Math.PI / 180;
    const φ2 = lat * Math.PI / 180;
    const Δφ = (lat - this.userLocation.latitude) * Math.PI / 180;
    const Δλ = (lng - this.userLocation.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

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

  // ========================================
  // ENHANCED NETWORK FUNCTIONS
  // ========================================

  // FUNCTION 1: Initialize Network Positions
  private initializeNetworkPositions() {
    if (this.allUsers.length === 0) return;

    console.log('Initializing enhanced network positions for', this.allUsers.length, 'users');

    const centerX = this.canvas?.width ? this.canvas.width / 2 : 500;
    const centerY = this.canvas?.height ? this.canvas.height / 2 : 350;
    
    // Dynamic spacing based on canvas size and user count
    const canvasWidth = this.canvas?.width || 1000;
    const canvasHeight = this.canvas?.height || 700;
    const availableRadius = Math.min(canvasWidth, canvasHeight) * 0.4; // Use 40% of available space
    
    const nonCenterUsers = this.allUsers.filter(u => !u.isCenter);
    const userCount = nonCenterUsers.length;

    this.allUsers.forEach((user, index) => {
      if (user.isCenter) {
        user.x = centerX;
        user.y = centerY;
        user.vx = 0;
        user.vy = 0;
      } else {
        const userIndex = nonCenterUsers.findIndex(u => u.id === user.id);
        
        // SPIDER WEB DISTRIBUTION - Multiple concentric rings
        const ringsCount = Math.ceil(Math.sqrt(userCount)); // Dynamic ring count
        const ring = Math.floor(userIndex / Math.ceil(userCount / ringsCount));
        const positionInRing = userIndex % Math.ceil(userCount / ringsCount);
        const usersInThisRing = Math.min(Math.ceil(userCount / ringsCount), userCount - ring * Math.ceil(userCount / ringsCount));
        
        // Calculate radius for this ring (expanding outward)
        const minRadius = availableRadius * 0.3; // 30% of available space for inner ring
        const maxRadius = availableRadius * 0.9; // 90% of available space for outer ring
        const ringRadius = minRadius + (maxRadius - minRadius) * (ring / Math.max(ringsCount - 1, 1));
        
        // Calculate angle with better distribution
        const angleStep = (2 * Math.PI) / usersInThisRing;
        const baseAngle = positionInRing * angleStep;
        
        // Add spiral offset to create more organic web-like structure
        const spiralOffset = ring * 0.5; // Offset each ring slightly
        const finalAngle = baseAngle + spiralOffset;
        
        // Add some controlled randomization for organic feel (smaller than before)
        const radiusVariation = (Math.random() - 0.5) * (ringRadius * 0.15); // 15% variation
        const angleVariation = (Math.random() - 0.5) * (angleStep * 0.2); // 20% of angle step
        
        const finalRadius = Math.max(minRadius * 0.8, ringRadius + radiusVariation);
        const finalAngleWithVariation = finalAngle + angleVariation;
        
        // Calculate final position
        user.x = centerX + Math.cos(finalAngleWithVariation) * finalRadius;
        user.y = centerY + Math.sin(finalAngleWithVariation) * finalRadius;
        
        // Initialize with very gentle velocities for smooth movement
        const velocityMagnitude = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
        const velocityAngle = Math.random() * 2 * Math.PI;
        user.vx = Math.cos(velocityAngle) * velocityMagnitude;
        user.vy = Math.sin(velocityAngle) * velocityMagnitude;
      }
    });
  }

  // FUNCTION 2: Enhanced Physics with smoother, more distributed movement
  updatePhysics(users: NearbyUser[]) {
    const centerUser = users.find(u => u.isCenter);
    const time = Date.now() * 0.001;
    
    // Dynamic canvas dimensions
    const canvasWidth = this.canvas?.width || 1000;
    const canvasHeight = this.canvas?.height || 700;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    users.forEach(user => {
      if (!user.isCenter && user.x !== undefined && user.y !== undefined &&
          user.vx !== undefined && user.vy !== undefined) {

        // 1. GENTLE ORBITAL ATTRACTION - keeps users in web-like structure
        if (centerUser && centerUser.x !== undefined && centerUser.y !== undefined) {
          const dx = centerUser.x - user.x;
          const dy = centerUser.y - user.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            // Dynamic optimal distance based on canvas size and user count
            const optimalDistance = Math.min(canvasWidth, canvasHeight) * 0.25; // 25% of smaller dimension
            const distanceError = distance - optimalDistance;
            const attractionForce = 0.005 * (distanceError / optimalDistance); // Gentler force
            
            user.vx += (dx / distance) * attractionForce;
            user.vy += (dy / distance) * attractionForce;
          }
        }

        // 2. SMART REPULSION - prevents clustering while maintaining web structure
        users.forEach(other => {
          if (other.id !== user.id && other.x !== undefined && other.y !== undefined) {
            const dx = user.x! - other.x;
            const dy = user.y! - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Dynamic repulsion distance based on space availability
            const repulsionDistance = Math.min(canvasWidth, canvasHeight) * 0.08; // 8% of smaller dimension
            
            if (distance < repulsionDistance && distance > 0) {
              const repulsionForce = (repulsionDistance - distance) / repulsionDistance * 0.01;
              user.vx! += (dx / distance) * repulsionForce;
              user.vy! += (dy / distance) * repulsionForce;
            }
          }
        });

        // 3. GENTLE BROWNIAN MOTION - creates organic, soothing movement
        const personalOffset = user.id.charCodeAt(0) % 100; // Personal offset for each user
        const slowTime = time * 0.5; // Slower time for gentler movement
        
        const brownianX = Math.sin(slowTime + personalOffset) * 0.003;
        const brownianY = Math.cos(slowTime * 1.3 + personalOffset) * 0.003;
        const noiseX = (Math.random() - 0.5) * 0.001;
        const noiseY = (Math.random() - 0.5) * 0.001;
        
        user.vx += brownianX + noiseX;
        user.vy += brownianY + noiseY;

        // 4. ORBITAL DRIFT - adds slow circular motion for web-like feel
        const distanceFromCenter = Math.sqrt((user.x - centerX) ** 2 + (user.y - centerY) ** 2);
        if (distanceFromCenter > 0) {
          const orbitalSpeed = 0.002; // Very slow orbital motion
          const orbitalForceX = -(user.y - centerY) / distanceFromCenter * orbitalSpeed;
          const orbitalForceY = (user.x - centerX) / distanceFromCenter * orbitalSpeed;
          
          user.vx += orbitalForceX;
          user.vy += orbitalForceY;
        }

        // 5. ENHANCED DAMPING for smooth motion
        const dampingFactor = 0.95; // Less aggressive damping
        user.vx *= dampingFactor;
        user.vy *= dampingFactor;

        // 6. VELOCITY LIMITING for consistent smooth movement
        const maxVelocity = 0.8; // Slower maximum velocity
        const currentSpeed = Math.sqrt(user.vx * user.vx + user.vy * user.vy);
        if (currentSpeed > maxVelocity) {
          const scale = maxVelocity / currentSpeed;
          user.vx *= scale;
          user.vy *= scale;
        }

        // Apply velocity
        user.x += user.vx;
        user.y += user.vy;

        // 7. SOFT BOUNDARY CONSTRAINTS with space utilization
        const margin = Math.min(canvasWidth, canvasHeight) * 0.05; // 5% margin
        const bounceForce = 0.3; // Gentler bouncing
        
        if (user.x < margin) { 
          user.x = margin; 
          user.vx = Math.abs(user.vx) * bounceForce;
        }
        if (user.x > canvasWidth - margin) { 
          user.x = canvasWidth - margin; 
          user.vx = -Math.abs(user.vx) * bounceForce;
        }
        if (user.y < margin) { 
          user.y = margin; 
          user.vy = Math.abs(user.vy) * bounceForce;
        }
        if (user.y > canvasHeight - margin) { 
          user.y = canvasHeight - margin; 
          user.vy = -Math.abs(user.vy) * bounceForce;
        }
      }
    });
  }

  // FUNCTION 3: Enhanced connection generation for better web structure
  private generateConnections(userId: string, allUsers: NearbyUser[]): string[] {
    const connections: string[] = [];
    const currentUser = allUsers.find(u => u.id === userId);
    
    if (!currentUser) return connections;

    // Always connect to center user if this isn't the center user
    if (userId !== 'center') {
      connections.push('center');
    }

    // ENHANCED WEB-LIKE CONNECTIONS
    const otherUsers = allUsers.filter(u => u.id !== userId && u.id !== 'center');
    
    // Calculate distances to all other users for intelligent connections
    const userDistances = otherUsers.map(user => {
      if (!currentUser.x || !currentUser.y || !user.x || !user.y) {
        return { user, distance: Infinity };
      }
      
      const dx = currentUser.x - user.x;
      const dy = currentUser.y - user.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return { user, distance };
    }).sort((a, b) => a.distance - b.distance);

    // Connect to closest neighbors (creates local clusters in the web)
    const nearbyConnections = Math.min(2, userDistances.length);
    for (let i = 0; i < nearbyConnections; i++) {
      if (userDistances[i] && userDistances[i].distance < 200) { // Only connect if reasonably close
        connections.push(userDistances[i].user.id);
      }
    }

    // Add some random long-distance connections for web-like structure
    const longDistanceCount = Math.random() > 0.7 ? 1 : 0; // 30% chance of long connection
    if (longDistanceCount > 0 && userDistances.length > 3) {
      const randomIndex = Math.floor(Math.random() * Math.min(userDistances.length, 6)) + 3; // Connect to someone 3-6 positions away
      if (userDistances[randomIndex] && !connections.includes(userDistances[randomIndex].user.id)) {
        connections.push(userDistances[randomIndex].user.id);
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

  initializeCanvas() {
    if (this.networkCanvas && this.networkCanvas.nativeElement) {
      this.canvas = this.networkCanvas.nativeElement;
      this.ctx = this.canvas.getContext('2d')!;
      this.resizeCanvas();
      this.animate();

      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  // FUNCTION 4: Enhanced Animation Method
  animate = () => {
    if (this.viewMode !== 'network' || !this.ctx || !this.canvas) {
      this.animationFrame = requestAnimationFrame(this.animate);
      return;
    }

    // Clear with subtle gradient background
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
    );
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#000000');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const networkUsers = this.getNetworkUsers();
    const time = Date.now() * 0.001;

    // ENHANCED WEB-LIKE CONNECTIONS
    networkUsers.forEach(user => {
      if (user.connections) {
        user.connections.forEach(connId => {
          const connectedUser = networkUsers.find(u => u.id === connId);
          if (connectedUser && user.x !== undefined && user.y !== undefined &&
            connectedUser.x !== undefined && connectedUser.y !== undefined) {
            
            const isHighlighted = this.hoveredUser === user.id || this.hoveredUser === connId;
            const distance = Math.sqrt(
              (user.x - connectedUser.x) ** 2 + (user.y - connectedUser.y) ** 2
            );
            
            // Dynamic connection styling based on distance
            const maxDistance = Math.min(this.canvas.width, this.canvas.height) * 0.5;
            const opacity = Math.max(0.1, 1 - (distance / maxDistance));
            
            this.ctx.beginPath();
            this.ctx.moveTo(user.x, user.y);
            this.ctx.lineTo(connectedUser.x, connectedUser.y);
            
            if (isHighlighted) {
              // Highlighted connections with pulsing effect
              const pulseOpacity = 0.6 + Math.sin(time * 3) * 0.3;
              this.ctx.strokeStyle = `rgba(220, 38, 38, ${pulseOpacity})`;
              this.ctx.lineWidth = 2.5;
              this.ctx.shadowColor = '#dc2626';
              this.ctx.shadowBlur = 8;
            } else {
              // Regular connections with distance-based opacity
              this.ctx.strokeStyle = `rgba(55, 65, 81, ${opacity * 0.6})`;
              this.ctx.lineWidth = 1;
              this.ctx.shadowBlur = 0;
            }
            
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Flowing particles on highlighted connections
            if (isHighlighted) {
              const progress = (Math.sin(time * 2 + user.id.charCodeAt(0)) + 1) / 2;
              const particleX = user.x + (connectedUser.x - user.x) * progress;
              const particleY = user.y + (connectedUser.y - user.y) * progress;

              this.ctx.beginPath();
              this.ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
              this.ctx.fillStyle = `rgba(220, 38, 38, ${0.8 + Math.sin(time * 4) * 0.2})`;
              this.ctx.shadowColor = '#dc2626';
              this.ctx.shadowBlur = 6;
              this.ctx.fill();
              this.ctx.shadowBlur = 0;
            }
          }
        });
      }
    });

    // ENHANCED NODE RENDERING
    networkUsers.forEach(user => {
      if (user.x === undefined || user.y === undefined) return;

      const isHovered = this.hoveredUser === user.id;
      const isCenter = user.isCenter;
      const nodeSize = isCenter ? 35 : 25; // Slightly smaller for better distribution

      // Subtle breathing effect for all nodes
      const breathingScale = 1 + Math.sin(time * 1.5 + user.id.charCodeAt(0)) * 0.03;
      const finalSize = nodeSize * breathingScale;

      // Multi-layered hover effect
      if (isHovered) {
        // Outer glow ring
        const glowRadius = finalSize + 15 + Math.sin(time * 2) * 5;
        const glowGradient = this.ctx.createRadialGradient(
          user.x, user.y, finalSize,
          user.x, user.y, glowRadius
        );
        glowGradient.addColorStop(0, 'rgba(220, 38, 38, 0.3)');
        glowGradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
        
        this.ctx.beginPath();
        this.ctx.arc(user.x, user.y, glowRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = glowGradient;
        this.ctx.fill();

        // Pulsing ring
        const ringRadius = finalSize + 8 + Math.sin(time * 3) * 3;
        this.ctx.beginPath();
        this.ctx.arc(user.x, user.y, ringRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(220, 38, 38, ${0.4 + Math.sin(time * 2) * 0.3})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }

      // Node background with gradient
      const nodeGradient = this.ctx.createRadialGradient(
        user.x - finalSize * 0.3, user.y - finalSize * 0.3, 0,
        user.x, user.y, finalSize
      );
      
      if (isCenter) {
        nodeGradient.addColorStop(0, '#374151');
        nodeGradient.addColorStop(1, '#1f2937');
      } else if (isHovered) {
        nodeGradient.addColorStop(0, '#ef4444');
        nodeGradient.addColorStop(1, '#dc2626');
      } else {
        nodeGradient.addColorStop(0, '#4b5563');
        nodeGradient.addColorStop(1, '#374151');
      }
      
      this.ctx.beginPath();
      this.ctx.arc(user.x, user.y, finalSize, 0, Math.PI * 2);
      this.ctx.fillStyle = nodeGradient;
      this.ctx.fill();

      // Node border with dynamic styling
      this.ctx.beginPath();
      this.ctx.arc(user.x, user.y, finalSize, 0, Math.PI * 2);
      
      if (user.isOnline) {
        if (isHovered) {
          const pulseIntensity = 0.6 + Math.sin(time * 4) * 0.4;
          this.ctx.strokeStyle = `rgba(220, 38, 38, ${pulseIntensity})`;
          this.ctx.lineWidth = isCenter ? 3 : 2.5;
        } else {
          this.ctx.strokeStyle = '#dc2626';
          this.ctx.lineWidth = isCenter ? 2.5 : 2;
        }
      } else {
        this.ctx.strokeStyle = '#6b7280';
        this.ctx.lineWidth = isCenter ? 2 : 1.5;
      }
      
      this.ctx.stroke();

      // Emoji/Icon with enhanced rendering
      this.ctx.font = `${Math.round(finalSize * 0.6)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ffffff';
      
      if (isHovered) {
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 8;
      }
      
      this.ctx.fillText(user.image || '👤', user.x, user.y);
      this.ctx.shadowBlur = 0;

      // Online status indicator with gentle pulsing
      if (user.isOnline && !isCenter) {
        const dotX = user.x + finalSize * 0.6;
        const dotY = user.y - finalSize * 0.6;
        const dotSize = 3 + Math.sin(time * 4) * 0.5;
        
        const dotGradient = this.ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotSize);
        dotGradient.addColorStop(0, '#10b981');
        dotGradient.addColorStop(1, '#059669');
        
        this.ctx.beginPath();
        this.ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
        this.ctx.fillStyle = dotGradient;
        this.ctx.shadowColor = '#10b981';
        this.ctx.shadowBlur = 4;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    });

    // Update physics and continue animation
    this.updatePhysics(networkUsers);
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  // FUNCTION 5: Resize Canvas
  resizeCanvas() {
    if (!this.canvas) return;

    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // If canvas size changed significantly, reinitialize positions
    const widthChange = oldWidth > 0 ? Math.abs(this.canvas.width - oldWidth) / oldWidth : 1;
    const heightChange = oldHeight > 0 ? Math.abs(this.canvas.height - oldHeight) / oldHeight : 1;
    
    if (widthChange > 0.1 || heightChange > 0.1) { // If more than 10% change
      this.initializeNetworkPositions();
    } else {
      // Just update center user position for minor changes
      const centerUser = this.getNetworkUsers().find(u => u.isCenter);
      if (centerUser) {
        centerUser.x = this.canvas.width / 2;
        centerUser.y = this.canvas.height / 2;
      }
    }
  }

  // ========================================
  // OTHER COMPONENT METHODS
  // ========================================

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

  getNetworkUsers(): NearbyUser[] {
    // ✅ Fix: Return all users within radius OR center user
    return this.allUsers.filter(user =>
      user.isCenter || user.distance <= this.searchRadius
    );
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
      console.log('🔄 Refresh: Requesting location permission again...');
      
      // FORCE LOCATION PERMISSION REQUEST on refresh
      if (navigator.geolocation) {
        const requestRefreshPermission = () => {
          return new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('✅ Refresh: Location permission confirmed (ignoring data)');
                console.log('📍 Current device location (not updating):', {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                });
                resolve();
              },
              (error) => {
                console.warn('⚠️ Refresh: Location access denied/failed:', error.message);
                resolve(); // Continue anyway
              },
              {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0 // Force fresh request
              }
            );
          });
        };
        
        await requestRefreshPermission();
      }

      // Load nearby users using stored database location (not device location)
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

  // FIXED: View User Profile Method
  viewUserProfile(user: NearbyUser, event?: Event) {
    // Prevent event bubbling if called from button
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    console.log('Opening profile for:', user.name);
    this.selectedUser = user;
  }

  // FIXED: Close Profile Method
  closeProfile() {
    console.log('Closing profile modal');
    this.selectedUser = null;
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
    this.filteredUsers = this.allUsers.filter(currentUser => {
      const isNotCenter = !currentUser.isCenter;
      const isWithinRadius = currentUser.distance <= this.searchRadius;

      console.log(`User ${currentUser.name}: isNotCenter=${isNotCenter}, distance=${currentUser.distance}, radius=${this.searchRadius}, withinRadius=${isWithinRadius}`);

      return isNotCenter && isWithinRadius;
    });

    console.log('Filtered users for list view:', this.filteredUsers.length);
    console.log('Filtered users:', this.filteredUsers.map(u => ({ name: u.name, distance: u.distance })));
  }

  // Additional debugging method - call this from browser console to test
  public testLocationPermission() {
    console.log('🧪 Testing location permission manually...');
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Manual test: Permission granted');
        console.log('📍 Manual test coordinates:', position.coords);
      },
      (error) => {
        console.error('❌ Manual test: Permission denied/failed:', error);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }
}