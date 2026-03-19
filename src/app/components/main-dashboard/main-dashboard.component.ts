import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, timer, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { DashboardLayoutService } from '../../services/dashboard-layout.service';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';
import { DashboardChartComponent } from '../dashboard-chart/dashboard-chart.component';
import { DashboardNotificationPanelComponent } from '../dashboard-notification-panel/dashboard-notification-panel.component';
import {
  DashboardState,
  DashboardCardDto,
  DashboardChartDto,
  DashboardNotificationDto,
  CardLayout
} from '../../models/dashboardModels';

@Component({
  selector: 'app-main-dashboard',
  imports: [CommonModule, DragDropModule, DashboardCardComponent, DashboardChartComponent, DashboardNotificationPanelComponent],
  templateUrl: './main-dashboard.component.html',
  styleUrl: './main-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State signals
  error = signal<string | null>(null);
  lastRefresh = signal<Date>(new Date());
  autoRefreshStatus = signal<any>({
    isActive: false,
    retryAttempts: 0,
    lastRefresh: new Date(),
    nextRefresh: null
  });

  // Data signals
  cards = signal<DashboardCardDto[]>([]);
  charts = signal<DashboardChartDto[]>([]);
  notifications = signal<DashboardNotificationDto[]>([]);

  // Layout and customization signals
  isCustomizationMode = signal(false);
  customLayout = signal<CardLayout[]>([]);
  displayCards = signal<DashboardCardDto[]>([]);

  // User info
  currentUser: any;

  // Signal for time until next refresh to avoid NG0100 error
  timeUntilNextRefresh = signal<string>('');

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private layoutService: DashboardLayoutService
  ) {
    this.currentUser = this.authService.getUserData();
  }

  ngOnInit(): void {
    this.initializeDashboard();
    this.subscribeToDashboardState();
    this.startAutoRefresh();
    this.setupAutoRefreshStatusMonitoring();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dashboardService.stopAutoRefresh();
  }

  /**
   * Initialize dashboard by loading data
   */
  private initializeDashboard(): void {
    this.initializeLayout();
    this.detectSlowNetwork();
    this.loadDashboardDataWithOptimization();
    this.logUserInfo();
  }

  /**
   * Load dashboard data with performance optimization
   */
  private loadDashboardDataWithOptimization(): void {
    const startTime = performance.now();

    // Show loading state immediately
    this.error.set(null);

    // Check if we should optimize for slow network
    const connectionType = this.getConnectionType();
    if (connectionType === 'slow-2g' || connectionType === '2g') {
      this.optimizeForSlowNetwork();
    }

    // Preload critical data first for better perceived performance
    this.preloadCriticalData().subscribe({
      next: (success) => {
        if (success) {
          console.log('Critical data preloaded successfully');
        }

        // Then load complete dashboard
        this.loadCompleteData(startTime);
      },
      error: (error) => {
        console.warn('Critical data preload failed, loading normally:', error);
        this.loadCompleteData(startTime);
      }
    });
  }

  /**
   * Load complete dashboard data
   */
  private loadCompleteData(startTime: number): void {
    this.dashboardService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const loadTime = performance.now() - startTime;
          console.log(`Dashboard loaded in ${loadTime.toFixed(2)}ms`);

          // Check if we meet performance targets
          const target = this.getLoadTimeTarget();
          if (loadTime > target) {
            console.warn(`Dashboard load time (${loadTime.toFixed(2)}ms) exceeds target (${target}ms)`);

            // Load dashboard data without role filtering
            this.cards.set(data.cards);
            this.charts.set(data.charts);
            this.notifications.set(data.notifications);
            console.log('Dashboard data loaded:', {
              cards: data.cards.length,
              charts: data.charts.length,
              notifications: data.notifications.length
            });
          }

          console.log('Dashboard data loaded:', {
            cards: data.cards.length,
            charts: data.charts.length,
            notifications: data.notifications.length
          });
        },
        error: (error) => {
          const loadTime = performance.now() - startTime;
          console.error(`Dashboard failed to load after ${loadTime.toFixed(2)}ms:`, error);

          this.error.set('Failed to load dashboard data');
          this.toastService.show('Failed to load dashboard data', 'error');
        }
      });
  }

  /**
   * Detect slow network conditions
   */
  private detectSlowNetwork(): void {
    // Use Network Information API if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (connection) {
      console.log('Network information:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      });

      // Optimize for slow networks
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' || connection.downlink < 0.5) {
        console.log('Slow network detected, optimizing dashboard');
        this.optimizeForSlowNetwork();
      }

      // Listen for network changes
      connection.addEventListener('change', () => {
        console.log('Network conditions changed:', connection.effectiveType);
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          this.optimizeForSlowNetwork();
        }
      });
    }
  }

  /**
   * Get connection type for optimization
   */
  private getConnectionType(): string {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return connection?.effectiveType || 'unknown';
  }

  /**
   * Get load time target for performance monitoring
   */
  private getLoadTimeTarget(): number {
    // Return 3 seconds as default target
    return 3000;
  }

  /**
   * Preload critical data for better perceived performance
   */
  private preloadCriticalData(): Observable<boolean> {
    return new Observable(observer => {
      // Simulate preloading critical data
      setTimeout(() => {
        observer.next(true);
        observer.complete();
      }, 100);
    });
  }

  /**
   * Optimize dashboard for slow network conditions
   */
  private optimizeForSlowNetwork(): void {
    console.log('Applying slow network optimizations');
    // Reduce auto-refresh frequency for slow networks
    this.dashboardService.stopAutoRefresh();
    // Start with reduced frequency by restarting auto-refresh (service will handle interval)
    setTimeout(() => {
      this.dashboardService.startAutoRefresh();
    }, 1000);
  }

  /**
   * Show performance warning for slow loading
   */
  private showPerformanceWarning(actualTime: number, targetTime: number): void {
    const message = `Dashboard loaded slower than expected (${actualTime.toFixed(0)}ms vs ${targetTime}ms target). Consider optimizing for slow network.`;

    // Only show warning if significantly slower
    if (actualTime > targetTime * 1.5) {
      console.warn(message);

      // Optionally show user notification for very slow loading
      if (actualTime > 10000) { // More than 10 seconds
        this.toastService.show('Dashboard is loading slowly due to network conditions', 'warning');
      }
    }
  }

  /**
   * Log user information for debugging
   */
  private logUserInfo(): void {
    console.log('Dashboard initialized for user:', this.currentUser);
  }

  /**
   * Subscribe to dashboard state changes
   */
  private subscribeToDashboardState(): void {
    this.dashboardService.dashboardState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: DashboardState) => {
        this.error.set(state.error);
        this.cards.set(state.cards);
        this.charts.set(state.charts);
        this.notifications.set(state.notifications);
        this.lastRefresh.set(state.lastRefresh);

        // Update display cards when cards change
        this.updateDisplayCards();
      });
  }

  /**
   * Update display cards based on current layout
   */
  private updateDisplayCards(): void {
    const currentCards = this.cards();
    const currentLayout = this.customLayout();

    if (currentLayout.length > 0) {
      const sortedCards = this.layoutService.applyLayoutToCards(currentCards, currentLayout);
      this.displayCards.set(sortedCards);
    } else {
      this.displayCards.set(currentCards);
    }
  }

  /**
   * Initialize layout from localStorage
   */
  private initializeLayout(): void {
    const savedLayout = this.layoutService.getLayout();
    if (savedLayout) {
      this.customLayout.set(savedLayout);
      console.log('Loaded custom layout:', savedLayout);
    }
  }

  /**
   * Load dashboard data
   */
  private loadDashboardData(): void {
    this.error.set(null);

    this.dashboardService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Dashboard data loaded:', {
            cards: data.cards.length,
            charts: data.charts.length,
            notifications: data.notifications.length
          });
        },
        error: (error) => {
          console.error('Error loading dashboard:', error);
          this.error.set('Failed to load dashboard data');
          this.toastService.show('Failed to load dashboard data', 'error');
        }
      });
  }

  /**
   * Start auto-refresh mechanism
   */
  private startAutoRefresh(): void {
    this.dashboardService.startAutoRefresh();
    console.log('Auto-refresh started from main dashboard component');
  }

  /**
   * Setup auto-refresh status monitoring
   */
  private setupAutoRefreshStatusMonitoring(): void {
    // Update auto-refresh status every second
    timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const status = this.dashboardService.getAutoRefreshStatus();
        this.autoRefreshStatus.set(status);

        // Update time until next refresh signal
        this.updateTimeUntilNextRefresh();
      });
  }

  /**
   * Update time until next refresh signal
   */
  private updateTimeUntilNextRefresh(): void {
    const status = this.autoRefreshStatus();
    if (!status.isActive || !status.nextRefresh) {
      this.timeUntilNextRefresh.set('');
      return;
    }

    const now = new Date();
    const nextRefresh = new Date(status.nextRefresh);
    const diffMs = nextRefresh.getTime() - now.getTime();

    if (diffMs <= 0) {
      this.timeUntilNextRefresh.set('Refreshing...');
      return;
    }

    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);

    if (minutes > 0) {
      this.timeUntilNextRefresh.set(`${minutes}m ${seconds}s`);
    } else {
      this.timeUntilNextRefresh.set(`${seconds}s`);
    }
  }

  /**
   * Check if auto-refresh is active
   */
  isAutoRefreshActive(): boolean {
    const status = this.autoRefreshStatus();
    return status.isActive;
  }

  /**
   * Manual refresh handler
   */
  onRefresh(): void {
    console.log('Manual refresh triggered from UI');
    this.dashboardService.refreshDashboard();
  }

  /**
   * Get auto-refresh retry attempts
   */
  getAutoRefreshRetryAttempts(): number {
    return this.autoRefreshStatus().retryAttempts;
  }

  /**
   * Handle card click navigation
   */
  onCardClick(card: DashboardCardDto): void {
    if (card.metadata?.['route']) {
      this.router.navigate([card.metadata['route']]);
    } else {
      // Default route mapping based on card key
      const routeMap: { [key: string]: string } = {
        'pending-samples': '/sample/inward',
        'pending-tests': '/testing/dashboard',
        'pending-reports': '/reporting/dashboard',
        'pending-invoices': '/accounts/cases',
        'equipment-due': '/equipment',
        'calibration-due': '/calibration-agency'
      };

      const route = routeMap[card.key];
      if (route) {
        this.router.navigate([route]);
      }
    }
  }

  /**
   * Handle notification click navigation
   */
  onNotificationClick(notification: DashboardNotificationDto): void {
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
    }
  }

  /**
   * Handle view all notifications click
   */
  onViewAllNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  /**
   * Get notification priority CSS class
   */
  getNotificationPriorityClass(priority: string): string {
    switch (priority) {
      case 'Info':
        return 'notification-info';
      case 'Warning':
        return 'notification-warning';
      case 'Critical':
        return 'notification-critical';
      default:
        return 'notification-info';
    }
  }

  /**
   * Apply custom layout to cards
   */
  private applyCustomLayout(cards: DashboardCardDto[]): DashboardCardDto[] {
    const customLayout = this.layoutService.getLayout();
    if (customLayout && customLayout.length > 0) {
      // Apply custom layout
      const layoutCards = this.layoutService.applyLayoutToCards(cards, customLayout);
      this.displayCards.set(layoutCards);
      console.log('Applied custom layout:', customLayout);
      return layoutCards;
    } else {
      // Use default layout (original order)
      this.displayCards.set(cards);
      return cards;
    }
  }

  /**
   * Filter cards based on user roles
   */
  private filterCardsByRole(cards: DashboardCardDto[]): DashboardCardDto[] {
    const userRoles = this.authService.getUserRoles();

    if (userRoles.length === 0) {
      console.warn('User has no roles assigned, showing all cards');
      return cards;
    }

    return cards.filter(card => {
      // If card has no role restrictions, show to all users
      if (!card.allowedRoles || card.allowedRoles.length === 0) {
        return true;
      }

      // Check if user has any of the allowed roles
      return this.authService.hasAnyRole(card.allowedRoles);
    });
  }

  /**
   * Filter charts based on user roles
   */
  private filterChartsByRole(charts: DashboardChartDto[]): DashboardChartDto[] {
    const userRoles = this.authService.getUserRoles();

    if (userRoles.length === 0) {
      console.warn('User has no roles assigned, showing all charts');
      return charts;
    }

    return charts.filter(chart => {
      // If chart has no role restrictions, show to all users
      if (!chart.allowedRoles || chart.allowedRoles.length === 0) {
        return true;
      }

      // Check if user has any of the allowed roles
      return this.authService.hasAnyRole(chart.allowedRoles);
    });
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: Date): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Get skeleton loading array for UI
   */
  getSkeletonArray(count: number): number[] {
    return Array(count).fill(0).map((_, i) => i);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasRequiredRoles(allowedRoles: string[]): boolean {
    return this.authService.hasAnyRole(allowedRoles);
  }

  /**
   * TrackBy functions for performance optimization
   */
  trackByCardKey(index: number, card: DashboardCardDto): string {
    return card.key;
  }

  trackByChartKey(index: number, chart: DashboardChartDto): string {
    return chart.key;
  }

  trackByNotificationId(index: number, notification: DashboardNotificationDto): string {
    return notification.id.toString();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  // Layout Customization Methods

  /**
   * Toggle customization mode
   */
  toggleCustomizationMode(): void {
    const newMode = !this.isCustomizationMode();
    this.isCustomizationMode.set(newMode);

    if (newMode) {
      // Entering customization mode - ensure we have a layout
      this.ensureLayoutExists();
      this.toastService.show('Drag cards to rearrange them', 'info');
    } else {
      // Exiting customization mode - save current layout
      this.saveCurrentLayout();
      this.toastService.show('Layout saved', 'success');
    }

    console.log('Customization mode:', newMode);
  }

  /**
   * Handle card drop event
   */
  onCardDrop(event: CdkDragDrop<DashboardCardDto[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const currentCards = [...this.displayCards()];
      const currentLayout = [...this.customLayout()];

      // Move the card in the display array
      moveItemInArray(currentCards, event.previousIndex, event.currentIndex);
      this.displayCards.set(currentCards);

      // Update the layout positions
      const updatedLayout = this.layoutService.updateLayoutPositions(
        currentLayout,
        event.previousIndex,
        event.currentIndex
      );
      this.customLayout.set(updatedLayout);

      console.log('Card moved from', event.previousIndex, 'to', event.currentIndex);
      console.log('Updated layout:', updatedLayout);
    }
  }

  /**
   * Reset layout to default
   */
  resetLayout(): void {
    this.layoutService.resetLayout();
    this.customLayout.set([]);
    this.isCustomizationMode.set(false);
    this.updateDisplayCards();
    this.toastService.show('Layout reset to default', 'success');
    console.log('Layout reset to default');
  }

  /**
   * Check if user has custom layout
   */
  hasCustomLayout(): boolean {
    return this.layoutService.hasCustomLayout();
  }

  /**
   * Ensure layout exists for current cards
   */
  private ensureLayoutExists(): void {
    const currentCards = this.cards();
    let currentLayout = this.customLayout();

    if (currentLayout.length === 0 && currentCards.length > 0) {
      // Create default layout
      const cardKeys = currentCards.map(card => card.key);
      currentLayout = this.layoutService.createDefaultLayout(cardKeys);
      this.customLayout.set(currentLayout);
      console.log('Created default layout:', currentLayout);
    } else if (currentLayout.length > 0 && currentCards.length > 0) {
      // Ensure all current cards are in the layout
      const layoutKeys = new Set(currentLayout.map(l => l.cardKey));
      const missingCards = currentCards.filter(card => !layoutKeys.has(card.key));

      if (missingCards.length > 0) {
        const maxPosition = Math.max(...currentLayout.map(l => l.position), -1);
        const newLayoutItems: CardLayout[] = missingCards.map((card, index) => ({
          cardKey: card.key,
          position: maxPosition + index + 1,
          visible: true
        }));

        const updatedLayout = [...currentLayout, ...newLayoutItems];
        this.customLayout.set(updatedLayout);
        console.log('Added missing cards to layout:', newLayoutItems);
      }
    }
  }

  /**
   * Save current layout to localStorage
   */
  private saveCurrentLayout(): void {
    const currentLayout = this.customLayout();
    if (currentLayout && currentLayout.length > 0) {
      this.layoutService.saveLayout(currentLayout);
      console.log('Layout saved to localStorage');
    }
  }

  /**
   * Get performance metrics for debugging
   */
  getPerformanceMetrics(): any {
    return {
      loadTimeTarget: this.getLoadTimeTarget(),
      autoRefreshInterval: this.autoRefreshStatus().isActive ? '5 minutes' : 'inactive',
      networkInfo: this.getNetworkInfo(),
      cacheStatus: 'enabled',
      retryAttempts: this.getAutoRefreshRetryAttempts()
    };
  }

  /**
   * Check if dashboard meets performance targets
   */
  meetsPerformanceTargets(): boolean {
    // Simple check - if auto-refresh is working and no excessive retries
    return this.getAutoRefreshRetryAttempts() < 3;
  }

  /**
   * Get current network connection info
   */
  getNetworkInfo(): any {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }

    return { effectiveType: 'unknown' };
  }

  /**
   * Optimize dashboard for current network conditions
   */
  /**
   * Optimize dashboard for current network conditions
   */
  optimizeForNetwork(): void {
    const networkInfo = this.getNetworkInfo();

    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g' || networkInfo.saveData) {
      this.optimizeForSlowNetwork();
      this.toastService.show('Dashboard optimized for slow network', 'info');
    } else {
      // this.resetPerformanceOptimizations();
      this.toastService.show('Dashboard performance settings reset', 'info');
    }
  }

  /**
   * Get dynamic sidebar column class based on data presence
   */
  getSidebarClass(): string {
    const hasCharts = this.charts().length > 0;
    const hasNotifications = this.notifications().length > 0;

    if (hasCharts && hasNotifications) {
      return 'col-lg-3'; // 3rd of 3-6-3
    }

    if (hasCharts && !hasNotifications) {
      return 'col-lg-4'; // 4th of 4-8
    }

    if (!hasCharts && hasNotifications) {
      return 'col-lg-5';
    }

    return 'col-lg-12';
  }

  /**
   * Get dynamic main content column class based on data presence
   */
  getMainContentClass(): string {
    const hasNotifications = this.notifications().length > 0;
    const hasCards = this.displayCards().length > 0;

    if (hasNotifications && hasCards) {
      return 'col-lg-6';
    }

    if (!hasNotifications && !hasCards) {
      return 'col-lg-12';
    }

    return 'col-lg-8';
  }

  /**
   * Get chart grid class based on chart count
   */
  getChartGridClass(): string {
    const chartCount = this.charts().length;
    if (chartCount === 1) return 'charts-full-width';
    if (chartCount === 2) return 'charts-dual-grid';
    return 'charts-stack-compact';
  }
}
