import { Component, OnInit, OnDestroy, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { DashboardLayoutService } from '../../services/dashboard-layout.service';
import { SignalRService } from '../../services/signal-r.service';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';
import { DashboardChartComponent } from '../dashboard-chart/dashboard-chart.component';
import { DashboardNotificationPanelComponent } from '../dashboard-notification-panel/dashboard-notification-panel.component';
import {
  DashboardCardDto,
  DashboardChartDto,
  DashboardNotificationDto,
  DashboardState,
  CardLayout
} from '../../models/dashboardModels';

export interface WorkflowStep {
  key: string;
  label: string;
  count: number;
  urgent: boolean;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-main-dashboard',
  imports: [CommonModule, DragDropModule, DashboardCardComponent, DashboardChartComponent, DashboardNotificationPanelComponent],
  templateUrl: './main-dashboard.component.html',
  styleUrl: './main-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private realtimeRefresh$ = new Subject<void>();

  // State signals
  error = signal<string | null>(null);
  isLoading = signal<boolean>(true);
  isLive = signal<boolean>(false);
  liveEventCount = signal<number>(0);
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

  // Card icon / route metadata (single source for design consistency)
  private readonly cardMeta: Record<string, { icon: string; route: string }> = {
    'pending-sample-inward': { icon: 'bi-box-arrow-in-down', route: '/sample/inward' },
    'todays-samples': { icon: 'bi-calendar-check', route: '/sample/inward' },
    'overdue-samples': { icon: 'bi-alarm', route: '/sample/inward' },
    'pending-plan-approval': { icon: 'bi-clipboard-check', route: '/sample/plan' },
    'samples-under-testing': { icon: 'bi-flask', route: '/testing/dashboard' },
    'results-pending-review': { icon: 'bi-eye', route: '/testing/verification' },
    'reports-pending-dispatch': { icon: 'bi-send', route: '/reporting/dashboard' },
    'standards-due-review': { icon: 'bi-journal-text', route: '/test-method-specification' },
    'pending-invoices': { icon: 'bi-receipt', route: '/accounts/cases' },
    'paid-invoices': { icon: 'bi-cash-coin', route: '/accounts/cases' },
    'payment-summary': { icon: 'bi-wallet2', route: '/accounts/cases' }
  };

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private layoutService: DashboardLayoutService,
    private signalR: SignalRService
  ) {
    this.currentUser = this.authService.getUserData();
  }

  ngOnInit(): void {
    this.initializeLayout();
    this.subscribeToDashboardState();
    this.subscribeToRealtime();
    this.isLoading.set(true);
    this.loadDashboardData();
    this.startAutoRefresh();
    this.setupAutoRefreshStatusMonitoring();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dashboardService.stopAutoRefresh();
  }

  private initializeDashboard(): void {
    this.initializeLayout();
    this.loadDashboardData();
  }

  /**
   * Load dashboard data — always applies server payload (fixes prior
   * inverted loadTime-target guard that left cards at 0).
   */
  private loadDashboardData(): void {
    this.error.set(null);
    this.isLoading.set(true);
    const startTime = performance.now();

    this.dashboardService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const loadTime = performance.now() - startTime;
          this.cards.set(data.cards ?? []);
          this.charts.set(data.charts ?? []);
          this.notifications.set(data.notifications ?? []);
          this.lastRefresh.set(new Date());
          this.updateDisplayCards();
          this.isLoading.set(false);
          if (loadTime > 3000) {
            console.warn(`Dashboard load time (${loadTime.toFixed(0)}ms) exceeds 3000ms target`);
          }
        },
        error: (error) => {
          console.error('Error loading dashboard:', error);
          this.error.set('Failed to load dashboard data');
          this.isLoading.set(false);
          this.toastService.show('Failed to load dashboard data', 'error');
        }
      });
  }

  /**
   * Silent refresh used by auto-refresh + SignalR live events (no toast spam).
   */
  private silentRefresh(reason: string): void {
    this.dashboardService.getDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.cards.set(data.cards ?? []);
          this.charts.set(data.charts ?? []);
          this.notifications.set(data.notifications ?? []);
          this.lastRefresh.set(new Date());
          this.updateDisplayCards();
          this.isLoading.set(false);
          this.error.set(null);
          console.log(`Dashboard silently refreshed (${reason})`);
        },
        error: (error) => {
          console.warn(`Silent dashboard refresh failed (${reason}):`, error);
        }
      });
  }

  /**
   * Subscribe to dashboard state changes
   */
  private subscribeToDashboardState(): void {
    this.dashboardService.dashboardState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: DashboardState) => {
        this.error.set(state.error);
        this.cards.set(state.cards ?? []);
        this.charts.set(state.charts ?? []);
        this.notifications.set(state.notifications ?? []);
        this.lastRefresh.set(state.lastRefresh);
        this.isLoading.set(state.isLoading);

        // Update display cards when cards change
        this.updateDisplayCards();
      });
  }

  /**
   * Realtime wiring: SignalR live events invalidate cache and refresh KPIs.
   */
  private subscribeToRealtime(): void {
    this.signalR.startConnection();

    this.signalR.connected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(connected => this.isLive.set(connected));

    // Debounce bursts (e.g. bulk inward uploads) into a single refresh.
    this.realtimeRefresh$
      .pipe(debounceTime(1500), takeUntil(this.destroy$))
      .subscribe(() => {
        this.dashboardService.invalidateCache();
        this.silentRefresh('signalr');
      });

    this.signalR.dashboardUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.liveEventCount.update(v => v + 1);
        this.realtimeRefresh$.next();
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
    }
  }

  /**
   * Start auto-refresh mechanism (30s live polling + SignalR instant).
   */
  private startAutoRefresh(): void {
    this.dashboardService.startAutoRefresh();
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
    this.dashboardService.invalidateCache();
    this.isLoading.set(true);
    this.loadDashboardData();
    this.toastService.show('Dashboard refreshed successfully', 'success');
  }

  /**
   * Get auto-refresh retry attempts
   */
  getAutoRefreshRetryAttempts(): number {
    return this.autoRefreshStatus().retryAttempts;
  }

  getUrgentCount(): number {
    return this.displayCards().filter(c => (c.metadata?.['HasUrgent'] as boolean) === true).length;
  }

  getTotalPending(): number {
    return this.displayCards().reduce((sum, c) => sum + (typeof c.count === 'number' ? c.count : 0), 0);
  }

  private cardCount(key: string): number {
    return this.cards().find(c => c.key === key)?.count ?? 0;
  }

  private cardUrgent(key: string): boolean {
    return (this.cards().find(c => c.key === key)?.metadata?.['HasUrgent'] as boolean) === true;
  }

  /**
   * Lab workflow pipeline derived from live KPI cards.
   */
  workflowSteps(): WorkflowStep[] {
    return [
      { key: 'inward', label: 'Inward', count: this.cardCount('pending-sample-inward'), urgent: this.cardUrgent('pending-sample-inward'), route: '/sample/inward', icon: 'bi-box-arrow-in-down' },
      { key: 'plan', label: 'Plan', count: this.cardCount('pending-plan-approval'), urgent: this.cardUrgent('pending-plan-approval'), route: '/sample/plan', icon: 'bi-clipboard-check' },
      { key: 'testing', label: 'Testing', count: this.cardCount('samples-under-testing'), urgent: this.cardUrgent('samples-under-testing'), route: '/testing/dashboard', icon: 'bi-flask' },
      { key: 'verify', label: 'Verify', count: this.cardCount('results-pending-review'), urgent: this.cardUrgent('results-pending-review'), route: '/testing/verification', icon: 'bi-eye' },
      { key: 'dispatch', label: 'Dispatch', count: this.cardCount('reports-pending-dispatch'), urgent: this.cardUrgent('reports-pending-dispatch'), route: '/reporting/dashboard', icon: 'bi-send' },
      { key: 'billing', label: 'Billing', count: this.cardCount('pending-invoices'), urgent: false, route: '/accounts/cases', icon: 'bi-receipt' }
    ];
  }

  goToStep(step: WorkflowStep): void {
    this.router.navigate([step.route]);
  }

  getCardIcon(card: DashboardCardDto): string {
    return this.cardMeta[card.key]?.icon ?? 'bi-grid-3x3-gap';
  }

  getCardAccent(card: DashboardCardDto): string {
    if ((card.metadata?.['HasUrgent'] as boolean) === true || card.status === 'Critical') return 'accent-critical';
    if (card.status === 'Warning') return 'accent-warning';
    if (card.key.includes('invoice') || card.key.includes('payment')) return 'accent-billing';
    if (card.key.includes('overdue') || card.key.includes('due')) return 'accent-alert';
    return 'accent-normal';
  }

  getCardRoute(card: DashboardCardDto): string {
    if (card.metadata?.['route']) return card.metadata['route'];
    return this.cardMeta[card.key]?.route ?? '';
  }

  /**
   * Handle card click navigation
   */
  onCardClick(card: DashboardCardDto): void {
    const route = this.getCardRoute(card);
    if (route) {
      this.router.navigate([route]);
      return;
    }
    const routeMap: { [key: string]: string } = {
      'pending-samples': '/sample/inward',
      'pending-tests': '/testing/dashboard',
      'pending-reports': '/reporting/dashboard',
      'pending-invoices': '/accounts/cases',
      'equipment-due': '/equipment',
      'calibration-due': '/calibration-agency',
      'standards-due-review': '/test-method-specification'
    };

    const fallback = routeMap[card.key];
    if (fallback) {
      this.router.navigate([fallback]);
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
    }
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
