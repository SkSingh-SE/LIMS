import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, timer, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap, takeUntil, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { 
  DashboardResponseDto, 
  DashboardCardDto, 
  DashboardChartDto, 
  DashboardNotificationDto,
  DashboardState 
} from '../models/dashboardModels';
import { ToastService } from './toast.service';
import { DashboardErrorHandlerService, ErrorContext } from './dashboard-error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = environment.apiUrl + "/dashboard";
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
  private autoRefreshInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second initial delay
  
  // Performance optimization settings
  private requestTimeout = 10000; // 10 seconds timeout for API requests
  private slowNetworkThreshold = 3000; // 3 seconds - consider network slow if requests take longer
  private fastNetworkThreshold = 1000; // 1 second - consider network fast if requests complete faster
  private performanceMetrics = {
    averageResponseTime: 0,
    requestCount: 0,
    slowRequestCount: 0,
    isSlowNetwork: false
  };

  // Cache storage
  private dashboardCache: {
    data: DashboardResponseDto | null;
    timestamp: number;
  } = {
    data: null,
    timestamp: 0
  };

  // State management
  private dashboardStateSubject = new BehaviorSubject<DashboardState>({
    cards: [],
    charts: [],
    notifications: [],
    isLoading: false,
    error: null,
    lastRefresh: new Date(),
    customLayout: []
  });

  public dashboardState$ = this.dashboardStateSubject.asObservable();

  // Auto-refresh control
  private autoRefreshSubscription: any;
  private isAutoRefreshActive = false;
  private tabVisibilitySubscription: any;
  private retryAttempts = 0;
  private userInteractionState: any = {};

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    private errorHandler: DashboardErrorHandlerService
  ) {
    this.loadCustomLayout();
    this.setupTabVisibilityListener();
  }

  /**
   * Get complete dashboard data with caching and enhanced error handling
   */
  getDashboard(): Observable<DashboardResponseDto> {
    // Check cache first
    if (this.isCacheValid()) {
      return of(this.dashboardCache.data!);
    }

    this.updateLoadingState(true);
    const startTime = performance.now();

    const context: ErrorContext = {
      component: 'DashboardService',
      operation: 'Get Dashboard Data',
      userMessage: 'Failed to load dashboard data'
    };

    return this.http.get<DashboardResponseDto>(this.apiUrl).pipe(
      timeout(this.requestTimeout),
      this.errorHandler.handleApiError(context, {
        maxRetries: this.maxRetries,
        delayMs: this.retryDelay
      }),
      this.errorHandler.handleNetworkFailure(this.getCachedDataOrEmpty(), {
        component: 'DashboardService',
        operation: 'Network Fallback'
      }),
      tap(data => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Update performance metrics
        this.updatePerformanceMetrics(responseTime);
        
        // Adjust caching strategy based on network performance
        this.adjustCachingStrategy(responseTime);
        
        this.updateCache(data);
        this.updateDashboardState(data);
        this.updateLoadingState(false);
        
        console.log(`Dashboard loaded in ${responseTime.toFixed(2)}ms`);
      }),
      catchError(error => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Track failed request performance
        this.updatePerformanceMetrics(responseTime, true);
        
        this.updateLoadingState(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get dashboard cards with enhanced error handling
   */
  getDashboardCards(): Observable<DashboardCardDto[]> {
    const context: ErrorContext = {
      component: 'DashboardService',
      operation: 'Get Dashboard Cards',
      userMessage: 'Failed to load dashboard cards'
    };

    return this.http.get<DashboardCardDto[]>(`${this.apiUrl}/cards`).pipe(
      this.errorHandler.handleNetworkFailure<DashboardCardDto[]>([], {
        component: 'DashboardService',
        operation: 'Cards Network Fallback'
      }),
      this.errorHandler.handleApiError(context)
    );
  }

  /**
   * Get dashboard charts with enhanced error handling
   */
  getDashboardCharts(): Observable<DashboardChartDto[]> {
    const context: ErrorContext = {
      component: 'DashboardService',
      operation: 'Get Dashboard Charts',
      userMessage: 'Failed to load dashboard charts'
    };

    return this.http.get<DashboardChartDto[]>(`${this.apiUrl}/charts`).pipe(
      this.errorHandler.handleNetworkFailure<DashboardChartDto[]>([], {
        component: 'DashboardService',
        operation: 'Charts Network Fallback'
      }),
      this.errorHandler.handleApiError(context)
    );
  }

  /**
   * Get dashboard notifications with enhanced error handling
   */
  getDashboardNotifications(): Observable<DashboardNotificationDto[]> {
    const context: ErrorContext = {
      component: 'DashboardService',
      operation: 'Get Dashboard Notifications',
      userMessage: 'Failed to load notifications'
    };

    return this.http.get<DashboardNotificationDto[]>(`${this.apiUrl}/notifications`).pipe(
      this.errorHandler.handleNetworkFailure<DashboardNotificationDto[]>([], {
        component: 'DashboardService',
        operation: 'Notifications Network Fallback'
      }),
      this.errorHandler.handleApiError(context)
    );
  }

  /**
   * Manually refresh dashboard data with enhanced error handling
   */
  refreshDashboard(): void {
    console.log('Manual refresh triggered');
    
    // Preserve user interaction state
    this.preserveUserInteractionState();
    
    // Clear cache to force fresh data
    this.clearCache();
    
    // Reset retry attempts for manual refresh
    this.retryAttempts = 0;
    
    const context: ErrorContext = {
      component: 'DashboardService',
      operation: 'Manual Refresh',
      userMessage: 'Failed to refresh dashboard'
    };

    this.errorHandler.createErrorBoundary(
      () => this.getDashboard(),
      context
    ).subscribe({
      next: (data) => {
        this.toastService.show('Dashboard refreshed successfully', 'success');
        this.restoreUserInteractionState();
      },
      error: (error) => {
        console.error('Manual refresh failed:', error);
        // Error already handled by error boundary
        this.restoreUserInteractionState();
      }
    });
  }

  /**
   * Start auto-refresh mechanism
   */
  startAutoRefresh(): void {
    if (this.isAutoRefreshActive) {
      return;
    }

    this.isAutoRefreshActive = true;
    this.retryAttempts = 0;
    
    // Start the auto-refresh timer
    this.autoRefreshSubscription = timer(this.autoRefreshInterval, this.autoRefreshInterval).pipe(
      switchMap(() => {
        // Skip refresh when tab is not active
        if (document.hidden) {
          console.log('Skipping auto-refresh: tab is not active');
          return of(null);
        }
        
        // Preserve user interaction state before refresh
        this.preserveUserInteractionState();
        
        console.log('Auto-refreshing dashboard data...');
        return this.getDashboard().pipe(
          tap(() => {
            this.retryAttempts = 0; // Reset retry attempts on success
            this.restoreUserInteractionState();
          }),
          catchError(error => {
            console.error('Auto-refresh failed:', error);
            this.handleAutoRefreshError(error);
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (data) => {
        if (data) {
          console.log('Auto-refresh completed successfully');
        }
      },
      error: (error) => {
        console.error('Auto-refresh subscription error:', error);
        this.handleAutoRefreshError(error);
      }
    });
  }

  /**
   * Stop auto-refresh mechanism
   */
  stopAutoRefresh(): void {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
      this.autoRefreshSubscription = null;
    }
    
    if (this.tabVisibilitySubscription) {
      this.tabVisibilitySubscription.unsubscribe();
      this.tabVisibilitySubscription = null;
    }
    
    this.isAutoRefreshActive = false;
    this.retryAttempts = 0;
    console.log('Auto-refresh stopped');
  }

  /**
   * Get current dashboard state
   */
  getCurrentState(): DashboardState {
    return this.dashboardStateSubject.value;
  }

  /**
   * Save custom card layout
   */
  saveCustomLayout(layout: any[]): void {
    const customLayout = layout.map((item, index) => ({
      cardKey: item.key,
      position: index,
      visible: true
    }));
    
    localStorage.setItem('dashboardLayout', JSON.stringify(customLayout));
    
    const currentState = this.dashboardStateSubject.value;
    this.dashboardStateSubject.next({
      ...currentState,
      customLayout
    });
  }

  /**
   * Load custom card layout from localStorage
   */
  private loadCustomLayout(): void {
    const savedLayout = localStorage.getItem('dashboardLayout');
    if (savedLayout) {
      try {
        const customLayout = JSON.parse(savedLayout);
        const currentState = this.dashboardStateSubject.value;
        this.dashboardStateSubject.next({
          ...currentState,
          customLayout
        });
      } catch (error) {
        console.error('Failed to load custom layout:', error);
      }
    }
  }

  /**
   * Reset to default layout
   */
  resetLayout(): void {
    localStorage.removeItem('dashboardLayout');
    const currentState = this.dashboardStateSubject.value;
    this.dashboardStateSubject.next({
      ...currentState,
      customLayout: []
    });
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(): boolean {
    return this.dashboardCache.data !== null && 
           (Date.now() - this.dashboardCache.timestamp) < this.cacheTimeout;
  }

  /**
   * Update cache with new data
   */
  private updateCache(data: DashboardResponseDto): void {
    this.dashboardCache = {
      data,
      timestamp: Date.now()
    };
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.dashboardCache = {
      data: null,
      timestamp: 0
    };
  }

  /**
   * Update dashboard state
   */
  private updateDashboardState(data: DashboardResponseDto): void {
    const currentState = this.dashboardStateSubject.value;
    
    console.log('Dashboard state updated:', {
      cards: data.cards.length,
      charts: data.charts.length,
      notifications: data.notifications.length
    });
    
    this.dashboardStateSubject.next({
      ...currentState,
      cards: data.cards,
      charts: data.charts,
      notifications: data.notifications,
      error: null,
      lastRefresh: new Date()
    });
  }

  /**
   * Update loading state
   */
  private updateLoadingState(isLoading: boolean): void {
    const currentState = this.dashboardStateSubject.value;
    this.dashboardStateSubject.next({
      ...currentState,
      isLoading
    });
  }

  /**
   * Get user information (simplified)
   */
  getUserInfo(): any {
    return { name: 'User', id: 'user-1' };
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): Observable<DashboardResponseDto> {
    return this.getDashboard();
  }

  /**
   * Get dashboard cards
   */
  getCards(): Observable<DashboardCardDto[]> {
    return this.getDashboardCards();
  }

  /**
   * Get dashboard summary information
   */
  getDashboardSummary(): Observable<{
    cards: number;
    charts: number;
    notifications: number;
  }> {
    return this.getDashboard().pipe(
      map(data => ({
        cards: data.cards.length,
        charts: data.charts.length,
        notifications: data.notifications.length
      }))
    );
  }

  /**
   * Get cached data or empty structure for fallback
   */
  private getCachedDataOrEmpty(): DashboardResponseDto {
    if (this.dashboardCache.data) {
      return this.dashboardCache.data;
    }
    
    return {
      cards: [],
      charts: [],
      notifications: [],
      generatedAt: new Date()
    };
  }

  /**
   * Preload critical dashboard data for better perceived performance
   */
  preloadCriticalData(): Observable<boolean> {
    console.log('Preloading critical dashboard data');
    
    // Load cards first as they are most important
    return this.getDashboardCards().pipe(
      switchMap(cards => {
        // Update state with cards immediately
        const currentState = this.dashboardStateSubject.value;
        this.dashboardStateSubject.next({
          ...currentState,
          cards: cards,
          isLoading: false
        });
        
        // Then load charts and notifications in parallel
        return forkJoin([
          this.getDashboardCharts(),
          this.getDashboardNotifications()
        ]);
      }),
      map(([charts, notifications]) => {
        // Update state with remaining data
        const currentState = this.dashboardStateSubject.value;
        this.dashboardStateSubject.next({
          ...currentState,
          charts: charts,
          notifications: notifications,
          lastRefresh: new Date()
        });
        
        console.log('Critical dashboard data preloaded successfully');
        return true;
      }),
      catchError(error => {
        console.error('Failed to preload critical dashboard data:', error);
        return of(false);
      })
    );
  }

  /**
   * Get dashboard load time target based on network conditions
   */
  getLoadTimeTarget(): number {
    if (this.performanceMetrics.isSlowNetwork) {
      return 5000; // 5 seconds for slow networks
    } else {
      return 3000; // 3 seconds for normal/fast networks
    }
  }

  /**
   * Check if dashboard meets performance targets
   */
  meetsPerformanceTargets(): boolean {
    const target = this.getLoadTimeTarget();
    return this.performanceMetrics.averageResponseTime <= target;
  }

  /**
   * Update performance metrics based on request response time
   */
  private updatePerformanceMetrics(responseTime: number, failed: boolean = false): void {
    this.performanceMetrics.requestCount++;
    
    if (!failed) {
      // Update average response time
      const totalTime = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.requestCount - 1);
      this.performanceMetrics.averageResponseTime = (totalTime + responseTime) / this.performanceMetrics.requestCount;
      
      // Track slow requests
      if (responseTime > this.slowNetworkThreshold) {
        this.performanceMetrics.slowRequestCount++;
      }
      
      // Determine if network is slow (more than 30% of requests are slow)
      const slowRequestRatio = this.performanceMetrics.slowRequestCount / this.performanceMetrics.requestCount;
      this.performanceMetrics.isSlowNetwork = slowRequestRatio > 0.3;
      
      console.log('Performance metrics updated:', {
        averageResponseTime: this.performanceMetrics.averageResponseTime.toFixed(2) + 'ms',
        slowRequestRatio: (slowRequestRatio * 100).toFixed(1) + '%',
        isSlowNetwork: this.performanceMetrics.isSlowNetwork
      });
    }
  }

  /**
   * Adjust caching strategy based on network performance
   */
  private adjustCachingStrategy(responseTime: number): void {
    if (this.performanceMetrics.isSlowNetwork) {
      // Extend cache timeout for slow networks
      this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
      this.autoRefreshInterval = 10 * 60 * 1000; // 10 minutes
      console.log('Adjusted caching for slow network: extended to 10 minutes');
    } else if (responseTime < this.fastNetworkThreshold) {
      // Use shorter cache for fast networks
      this.cacheTimeout = 3 * 60 * 1000; // 3 minutes
      this.autoRefreshInterval = 3 * 60 * 1000; // 3 minutes
      console.log('Adjusted caching for fast network: reduced to 3 minutes');
    } else {
      // Default caching strategy
      this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
      this.autoRefreshInterval = 5 * 60 * 1000; // 5 minutes
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): {
    averageResponseTime: number;
    requestCount: number;
    slowRequestCount: number;
    isSlowNetwork: boolean;
    cacheTimeout: number;
    autoRefreshInterval: number;
  } {
    return {
      ...this.performanceMetrics,
      cacheTimeout: this.cacheTimeout,
      autoRefreshInterval: this.autoRefreshInterval
    };
  }

  /**
   * Optimize dashboard loading for slow networks
   */
  optimizeForSlowNetwork(): void {
    console.log('Optimizing dashboard for slow network conditions');
    
    // Extend cache timeout
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes
    this.autoRefreshInterval = 15 * 60 * 1000; // 15 minutes
    
    // Reduce request timeout for faster failure detection
    this.requestTimeout = 8000; // 8 seconds
    
    // Increase retry delay
    this.retryDelay = 2000; // 2 seconds
    
    // Mark as slow network
    this.performanceMetrics.isSlowNetwork = true;
    
    this.toastService.show('Dashboard optimized for slow network', 'info');
  }

  /**
   * Reset performance optimizations
   */
  resetPerformanceOptimizations(): void {
    console.log('Resetting dashboard performance optimizations');
    
    // Reset to default values
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.autoRefreshInterval = 5 * 60 * 1000; // 5 minutes
    this.requestTimeout = 10000; // 10 seconds
    this.retryDelay = 1000; // 1 second
    
    // Reset metrics
    this.performanceMetrics = {
      averageResponseTime: 0,
      requestCount: 0,
      slowRequestCount: 0,
      isSlowNetwork: false
    };
    
    this.toastService.show('Dashboard performance settings reset', 'info');
  }

  /**
   * Retry auto-refresh with exponential backoff
   */
  private retryAutoRefresh(attempt: number = 1): void {
    if (attempt > this.maxRetries) {
      this.toastService.show('Auto-refresh failed after multiple attempts', 'error');
      return;
    }

    const delay = this.retryDelay * Math.pow(2, attempt - 1);
    
    timer(delay).subscribe(() => {
      this.getDashboard().subscribe({
        next: () => {
          // Retry successful
        },
        error: () => {
          this.retryAutoRefresh(attempt + 1);
        }
      });
    });
  }

  /**
   * Setup tab visibility listener for auto-refresh control
   */
  private setupTabVisibilityListener(): void {
    // Listen for visibility change events
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Tab became inactive - auto-refresh will be paused');
      } else {
        console.log('Tab became active - auto-refresh will resume');
        // Optionally trigger immediate refresh when tab becomes active
        if (this.isAutoRefreshActive && this.shouldRefreshOnTabActive()) {
          console.log('Triggering refresh due to tab becoming active');
          this.refreshDashboard();
        }
      }
    });
  }

  /**
   * Check if we should refresh when tab becomes active
   */
  private shouldRefreshOnTabActive(): boolean {
    const timeSinceLastRefresh = Date.now() - this.dashboardCache.timestamp;
    // Refresh if more than 2 minutes have passed since last refresh
    return timeSinceLastRefresh > (2 * 60 * 1000);
  }

  /**
   * Preserve user interaction state before refresh
   */
  private preserveUserInteractionState(): void {
    try {
      this.userInteractionState = {
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        },
        focusedElement: document.activeElement?.id || null,
        expandedSections: this.getExpandedSections(),
        timestamp: Date.now()
      };
      console.log('User interaction state preserved:', this.userInteractionState);
    } catch (error) {
      console.warn('Failed to preserve user interaction state:', error);
    }
  }

  /**
   * Restore user interaction state after refresh
   */
  private restoreUserInteractionState(): void {
    try {
      if (!this.userInteractionState.timestamp) {
        return;
      }

      // Restore scroll position with a small delay to allow DOM updates
      setTimeout(() => {
        if (this.userInteractionState.scrollPosition) {
          window.scrollTo(
            this.userInteractionState.scrollPosition.x,
            this.userInteractionState.scrollPosition.y
          );
        }

        // Restore focus if element still exists
        if (this.userInteractionState.focusedElement) {
          const element = document.getElementById(this.userInteractionState.focusedElement);
          if (element && element instanceof HTMLElement) {
            element.focus();
          }
        }

        // Restore expanded sections
        this.restoreExpandedSections(this.userInteractionState.expandedSections);
        
        console.log('User interaction state restored');
      }, 100);
    } catch (error) {
      console.warn('Failed to restore user interaction state:', error);
    }
  }

  /**
   * Get currently expanded sections (placeholder for future implementation)
   */
  private getExpandedSections(): string[] {
    // This would be implemented based on specific UI components that can be expanded/collapsed
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Restore expanded sections (placeholder for future implementation)
   */
  private restoreExpandedSections(expandedSections: string[]): void {
    // This would be implemented based on specific UI components that can be expanded/collapsed
    // For now, this is a placeholder
    if (expandedSections && expandedSections.length > 0) {
      console.log('Would restore expanded sections:', expandedSections);
    }
  }

  /**
   * Handle auto-refresh errors with enhanced retry logic
   */
  private handleAutoRefreshError(error: any): void {
    this.retryAttempts++;
    
    const context: ErrorContext = {
      component: 'DashboardService',
      operation: 'Auto Refresh',
      userMessage: `Auto-refresh failed (attempt ${this.retryAttempts}/${this.maxRetries})`,
      silent: this.retryAttempts < this.maxRetries
    };
    
    if (this.retryAttempts <= this.maxRetries) {
      const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);
      console.log(`Auto-refresh failed (attempt ${this.retryAttempts}/${this.maxRetries}). Retrying in ${delay}ms...`);
      
      timer(delay).subscribe(() => {
        if (this.isAutoRefreshActive && !document.hidden) {
          this.preserveUserInteractionState();
          
          this.errorHandler.createErrorBoundary(
            () => this.getDashboard(),
            {
              component: 'DashboardService',
              operation: 'Auto Refresh Retry',
              silent: true
            }
          ).subscribe({
            next: () => {
              this.retryAttempts = 0;
              this.restoreUserInteractionState();
              console.log('Auto-refresh retry successful');
            },
            error: (retryError) => {
              console.error('Auto-refresh retry failed:', retryError);
              this.handleAutoRefreshError(retryError);
            }
          });
        }
      });
    } else {
      console.error('Auto-refresh failed after maximum retry attempts');
      this.errorHandler.handleComponentError(error, {
        component: 'DashboardService',
        operation: 'Auto Refresh Final Failure',
        userMessage: `Auto-refresh failed after ${this.maxRetries} attempts. Please refresh manually.`
      });
      this.retryAttempts = 0;
    }
  }

  /**
   * Get auto-refresh status for debugging
   */
  getAutoRefreshStatus(): {
    isActive: boolean;
    retryAttempts: number;
    lastRefresh: Date;
    nextRefresh: Date | null;
  } {
    const currentState = this.dashboardStateSubject.value;
    const nextRefresh = this.isAutoRefreshActive 
      ? new Date(currentState.lastRefresh.getTime() + this.autoRefreshInterval)
      : null;

    return {
      isActive: this.isAutoRefreshActive,
      retryAttempts: this.retryAttempts,
      lastRefresh: currentState.lastRefresh,
      nextRefresh
    };
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }
}