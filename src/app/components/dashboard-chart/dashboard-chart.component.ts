import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartData, ChartType, registerables } from 'chart.js';
import { DashboardChartDto, DashboardChartDataPoint } from '../../models/dashboardModels';
import { DashboardErrorHandlerService } from '../../services/dashboard-error-handler.service';
import {
  createBarChartConfig,
  createLineChartConfig,
  createPieChartConfig,
  createDoughnutChartConfig,
  DashboardChartConfig
} from '../../models/chartConfig';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-chart',
  imports: [CommonModule],
  templateUrl: './dashboard-chart.component.html',
  styleUrl: './dashboard-chart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardChartComponent implements OnInit, OnDestroy, OnChanges {
  @Input() chartData!: DashboardChartDto;

  @ViewChild('chartCanvas')
  set chartCanvasRef(ref: ElementRef<HTMLCanvasElement>) {
    if (ref) {
      this.chartCanvas = ref;
      this.createChart(); // SAFE: canvas exists
      this.setupResizeObserver();
    }
  }

  chartCanvas!: ElementRef<HTMLCanvasElement>;


  chart: Chart | null = null;
  isVisible = false;
  hasError = false;
  errorMessage = '';
  isLoading = false;

  // Responsive behavior
  private resizeObserver?: ResizeObserver;
  private currentScreenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  private debounceTimer?: number;

  constructor(
    private errorHandler: DashboardErrorHandlerService
  ) { }

  ngOnInit(): void {
    try {
      this.validateInputs();
      this.checkVisibility();
      this.detectScreenSize();
    } catch (error) {
      this.handleChartError(error, 'Chart initialization failed');
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] && !changes['chartData'].firstChange) {
      this.refreshChart();
    }
  }

  ngOnDestroy(): void {
    try {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
    } catch (error) {
      console.error('Error destroying chart:', error);
    }
  }

  /**
   * Listen for window resize events
   */
  @HostListener('window:resize', ['$event'])
  onWindowResize(event: Event): void {
    this.handleResize();
  }

  /**
   * Handle orientation change on mobile devices
   */
  @HostListener('window:orientationchange', ['$event'])
  onOrientationChange(event: Event): void {
    // Delay to allow orientation change to complete
    setTimeout(() => {
      this.handleResize();
    }, 300);
  }

  /**
   * Detect current screen size for responsive behavior
   */
  private detectScreenSize(): void {
    const width = window.innerWidth;

    if (width < 768) {
      this.currentScreenSize = 'mobile';
    } else if (width < 992) {
      this.currentScreenSize = 'tablet';
    } else {
      this.currentScreenSize = 'desktop';
    }
  }

  /**
   * Setup ResizeObserver for container-based responsive behavior
   */
  private setupResizeObserver(): void {
    if (!this.chartCanvas?.nativeElement) return;

    try {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.handleContainerResize(entry.contentRect);
        }
      });

      const container = this.chartCanvas.nativeElement.parentElement;
      if (container) {
        this.resizeObserver.observe(container);
      }
    } catch (error) {
      console.warn('ResizeObserver not supported, falling back to window resize events');
    }
  }

  /**
   * Handle container resize with debouncing
   */
  private handleContainerResize(rect: DOMRectReadOnly): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.resizeChart();
    }, 150);
  }

  /**
   * Handle window resize with debouncing
   */
  private handleResize(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.detectScreenSize();
      this.resizeChart();
    }, 150);
  }

  /**
   * Resize chart for responsive behavior
   */
  private resizeChart(): void {
    if (!this.chart) return;

    try {
      // Update chart options for current screen size
      const responsiveOptions = this.getResponsiveOptions();

      // Update chart configuration
      Object.assign(this.chart.options, responsiveOptions);

      // Trigger chart resize
      this.chart.resize();
      this.chart.update('none'); // Use 'none' for immediate update without animation

      console.log(`Chart resized for ${this.currentScreenSize} screen`);
    } catch (error) {
      console.error('Error resizing chart:', error);
    }
  }

  /**
   * Get responsive options based on screen size
   */
  private getResponsiveOptions(): any {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index' as const
      }
    };

    switch (this.currentScreenSize) {
      case 'mobile':
        return {
          ...baseOptions,
          plugins: {
            legend: {
              display: this.chartData.chartType.toLowerCase() === 'pie' || this.chartData.chartType.toLowerCase() === 'doughnut',
              position: 'bottom' as const,
              labels: {
                boxWidth: 12,
                padding: 10,
                font: {
                  size: 10
                }
              }
            },
            tooltip: {
              titleFont: {
                size: 12
              },
              bodyFont: {
                size: 11
              },
              padding: 8
            }
          },
          scales: this.getMobileScaleOptions()
        };

      case 'tablet':
        return {
          ...baseOptions,
          plugins: {
            legend: {
              display: true,
              position: this.chartData.chartType.toLowerCase() === 'pie' || this.chartData.chartType.toLowerCase() === 'doughnut' ? 'bottom' : 'top',
              labels: {
                boxWidth: 14,
                padding: 12,
                font: {
                  size: 11
                }
              }
            },
            tooltip: {
              titleFont: {
                size: 13
              },
              bodyFont: {
                size: 12
              },
              padding: 10
            }
          },
          scales: this.getTabletScaleOptions()
        };

      default: // desktop
        return {
          ...baseOptions,
          plugins: {
            legend: {
              display: true,
              position: 'top' as const,
              labels: {
                boxWidth: 16,
                padding: 15,
                font: {
                  size: 12
                }
              }
            },
            tooltip: {
              titleFont: {
                size: 14
              },
              bodyFont: {
                size: 13
              },
              padding: 12
            }
          },
          scales: this.getDesktopScaleOptions()
        };
    }
  }

  /**
   * Get mobile-optimized scale options
   */
  private getMobileScaleOptions(): any {
    if (this.chartData.chartType.toLowerCase() === 'pie' || this.chartData.chartType.toLowerCase() === 'doughnut') {
      return {};
    }

    return {
      x: {
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          font: {
            size: 10
          },
          maxTicksLimit: 5
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    };
  }

  /**
   * Get tablet-optimized scale options
   */
  private getTabletScaleOptions(): any {
    if (this.chartData.chartType.toLowerCase() === 'pie' || this.chartData.chartType.toLowerCase() === 'doughnut') {
      return {};
    }

    return {
      x: {
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 30,
          minRotation: 0
        }
      },
      y: {
        ticks: {
          font: {
            size: 11
          },
          maxTicksLimit: 6
        }
      }
    };
  }

  /**
   * Get desktop-optimized scale options
   */
  private getDesktopScaleOptions(): any {
    if (this.chartData.chartType.toLowerCase() === 'pie' || this.chartData.chartType.toLowerCase() === 'doughnut') {
      return {};
    }

    return {
      x: {
        ticks: {
          font: {
            size: 12
          },
          maxRotation: 0
        }
      },
      y: {
        ticks: {
          font: {
            size: 12
          }
        }
      }
    };
  }

  /**
   * Validate chart type with case-insensitive normalization
   */
  private validateChartType(): void {
    try {
      if (!this.chartData || !this.chartData.chartType) {
        this.hasError = true;
        this.errorMessage = 'Chart type is required';
        return;
      }

      // Normalize chart type to lowercase for case-insensitive comparison
      const normalizedType = this.chartData.chartType.toLowerCase().trim();

      // Map backend variations to standard Chart.js types
      const supportedTypes = {
        'bar': 'Bar',
        'line': 'Line',
        'pie': 'Pie',
        'doughnut': 'Doughnut'
      };

      if (!supportedTypes[normalizedType as keyof typeof supportedTypes]) {
        this.hasError = true;
        this.errorMessage = `Unsupported chart type: ${this.chartData.chartType}`;

        this.errorHandler.handleComponentError(
          new Error(`Unsupported chart type: ${this.chartData.chartType} (normalized: ${normalizedType})`),
          {
            component: 'DashboardChartComponent',
            operation: 'Chart Type Validation',
            userMessage: 'Invalid chart configuration',
            silent: true
          }
        );
        return;
      }

      // Update chart data with normalized type
      this.chartData.chartType = supportedTypes[normalizedType as keyof typeof supportedTypes] as any;
      this.hasError = false;
      this.errorMessage = '';

      console.log(`Chart type validated: ${this.chartData.chartType}`);
    } catch (error) {
      this.handleChartError(error, 'Chart type validation failed');
    }
  }

  /**
   * Validate component inputs
   */
  private validateInputs(): void {
    if (!this.chartData) {
      this.hasError = true;
      this.errorMessage = 'No chart data provided';

      this.errorHandler.handleComponentError(
        new Error('Chart data is required'),
        {
          component: 'DashboardChartComponent',
          operation: 'Input Validation',
          userMessage: 'Chart configuration error',
          silent: true
        }
      );
      return;
    }

    this.validateChartType();
  }

  private checkVisibility(): void {
    try {
      if (!this.chartData) {
        this.isVisible = false;
        return;
      }

      // Always show charts when data exists - no role restrictions
      this.isVisible = true;
      console.log(`Chart '${this.chartData.title}' is visible`);
    } catch (error) {
      this.handleChartError(error, 'Failed to check chart visibility');
      this.isVisible = false;
    }
  }

  private createChart(): void {
    try {
      this.isLoading = true;

      if (!this.chartCanvas?.nativeElement) {
        this.handleChartError(new Error('Chart canvas not available'), 'Chart canvas not available');
        return;
      }

      if (!this.chartData.dataPoints || this.isEmptyData(this.chartData.dataPoints)) {
        this.handleChartError(new Error('No chart data available'), 'No data available for chart');
        return;
      }

      const config = this.getChartConfig();
      if (!config) {
        this.handleChartError(new Error(`Unsupported chart type: ${this.chartData.chartType}`), 'Unsupported chart type');
        return;
      }

      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (!ctx) {
        this.handleChartError(new Error('Unable to get chart context'), 'Unable to get chart context');
        return;
      }

      // Destroy existing chart if it exists
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      // Get responsive options for current screen size
      const responsiveOptions = this.getResponsiveOptions();

      this.chart = new Chart(ctx, {
        type: config.type,
        data: config.data,
        options: {
          ...config.options,
          ...responsiveOptions,
          plugins: {
            ...config.options?.plugins,
            ...responsiveOptions.plugins,
            title: {
              display: true,
              text: this.chartData.title,
              font: {
                size: 13,
                weight: '500' as const
              }
            }
          },
          // Add error handling for chart interactions
          onHover: (event, elements) => {
            try {
              // Handle hover events safely
              const target = event.native?.target as HTMLElement;
              if (target && elements && elements.length > 0) {
                target.style.cursor = 'pointer';
              } else if (target) {
                target.style.cursor = 'default';
              }
            } catch (error) {
              console.warn('Chart hover error:', error);
            }
          }
        }
      });

      this.hasError = false;
      this.errorMessage = '';
      this.isLoading = false;
      console.log(`Chart '${this.chartData.title}' created successfully for ${this.currentScreenSize} screen`);
    } catch (error) {
      this.isLoading = false;
      this.handleChartError(error, 'Failed to render chart');
    }
  }

  private getChartConfig(): DashboardChartConfig | null {
    const chartData = this.transformChartData(this.chartData);

    switch (this.chartData.chartType.toLowerCase()) {
      case 'bar':
        return createBarChartConfig(chartData);
      case 'line':
        return createLineChartConfig(chartData);
      case 'pie':
        return createPieChartConfig(chartData);
      case 'doughnut':
        return createDoughnutChartConfig(chartData);
      default:
        return null;
    }
  }

  /**
   * Check if chart has data to display
   */
  hasData(): boolean {
    if (!this.chartData || !this.chartData.dataPoints) return false;
    return this.chartData.dataPoints.length > 0;
  }

  /**
   * Transformation logic for chart data
   */
  private transformChartData(chartData: DashboardChartDto): ChartData {
    const dataPoints = chartData.dataPoints || [];
    const labels = dataPoints.map(p => p.label);
    const values = dataPoints.map(p => p.value);

    // Theme Red (DA261C)
    const primaryRed = '#DA261C';
    const softRed = 'rgba(218, 38, 28, 0.7)';

    // RED-based palette for Pie/Doughnut
    const redPalette = [
      '#DA261C', // Primary Red
      '#EF4444', // Lighter Red
      '#F87171', // Even Lighter
      '#FECACA', // Softest Red
      '#991B1B', // Darker Red
      '#7F1D1D', // Darkest Red
      '#CBD5E1', // Slate 300 (Gray contrast)
      '#94A3B8'  // Slate 400 (Gray contrast)
    ];

    const isPieOrDoughnut = chartData.chartType.toLowerCase() === 'pie' || chartData.chartType.toLowerCase() === 'doughnut';
    const backgroundColors = isPieOrDoughnut
      ? dataPoints.map((_, i) => redPalette[i % redPalette.length])
      : dataPoints.map(p => p.metadata?.['Color'] || primaryRed);

    return {
      labels: labels,
      datasets: [
        {
          label: chartData.title,
          data: values,
          backgroundColor: chartData.chartType.toLowerCase() === 'line' ? softRed : backgroundColors,
          borderColor: isPieOrDoughnut ? '#FFFFFF' : primaryRed,
          borderWidth: isPieOrDoughnut ? 2 : 2,
          fill: chartData.chartType.toLowerCase() === 'line',
          tension: 0.4
        }
      ]
    };
  }

  private isEmptyData(data: any): boolean {
    if (!data) return true;

    if (data.labels && data.datasets) {
      return data.labels.length === 0 || data.datasets.length === 0;
    }

    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.keys(data).length === 0;
    }

    if (Array.isArray(data)) {
      return data.length === 0;
    }

    return true;
  }

  private getDefaultColors(count: number): string[] {
    const colors = [
      'rgba(54, 162, 235, 0.6)',   // Blue
      'rgba(255, 99, 132, 0.6)',   // Red
      'rgba(255, 205, 86, 0.6)',   // Yellow
      'rgba(75, 192, 192, 0.6)',   // Green
      'rgba(153, 102, 255, 0.6)',  // Purple
      'rgba(255, 159, 64, 0.6)',   // Orange
      'rgba(199, 199, 199, 0.6)',  // Grey
      'rgba(83, 102, 255, 0.6)'    // Indigo
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  private getDefaultBorderColors(count: number): string[] {
    const colors = [
      'rgba(54, 162, 235, 1)',   // Blue
      'rgba(255, 99, 132, 1)',   // Red
      'rgba(255, 205, 86, 1)',   // Yellow
      'rgba(75, 192, 192, 1)',   // Green
      'rgba(153, 102, 255, 1)',  // Purple
      'rgba(255, 159, 64, 1)',   // Orange
      'rgba(199, 199, 199, 1)',  // Grey
      'rgba(83, 102, 255, 1)'    // Indigo
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  /**
   * Refresh chart
   */
  refreshChart(): void {
    try {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      this.hasError = false;
      this.errorMessage = '';

      this.validateInputs();

      if (!this.hasError) {
        this.createChart();
      }
    } catch (error) {
      this.handleChartError(error, 'Failed to refresh chart');
    }
  }

  /**
   * Handle chart-specific errors
   */
  private handleChartError(error: any, message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.isLoading = false;

    this.errorHandler.handleComponentError(error, {
      component: 'DashboardChartComponent',
      operation: 'Chart Operation',
      userMessage: message,
      technicalDetails: {
        chartTitle: this.chartData?.title,
        chartType: this.chartData?.chartType,
        hasData: !!this.chartData?.dataPoints,
        screenSize: this.currentScreenSize
      }
    });
  }

  /**
   * Get safe chart title
   */
  getSafeTitle(): string {
    try {
      return this.chartData?.title || 'Chart';
    } catch (error) {
      return 'Chart';
    }
  }

  /**
   * Check if chart can be retried
   */
  canRetry(): boolean {
    return this.hasError && !this.isEmptyData(this.chartData?.dataPoints);
  }

  /**
   * Retry chart creation
   */
  retryChart(): void {
    this.hasError = false;
    this.errorMessage = '';
    this.refreshChart();
  }

  /**
   * Get current screen size for debugging
   */
  getCurrentScreenSize(): string {
    return this.currentScreenSize;
  }

  /**
   * Download chart as image
   */
  downloadChart(): void {
    if (!this.chart || !this.chartCanvas) return;

    try {
      const link = document.createElement('a');
      link.download = `${this.getSafeTitle().replace(/\s+/g, '_').toLowerCase()}_chart.png`;
      link.href = this.chart.toBase64Image();
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading chart:', error);
      this.handleChartError(error, 'Failed to download chart');
    }
  }
}
