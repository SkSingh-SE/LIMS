import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardCardDto } from '../../models/dashboardModels';
import { DashboardErrorHandlerService } from '../../services/dashboard-error-handler.service';

@Component({
  selector: 'app-dashboard-card',
  imports: [CommonModule],
  templateUrl: './dashboard-card.component.html',
  styleUrl: './dashboard-card.component.css'
})
export class DashboardCardComponent implements OnInit {
  @Input() card!: DashboardCardDto;
  @Input() isLoading: boolean = false;
  @Input() isCustomizationMode: boolean = false;
  @Output() cardClick = new EventEmitter<DashboardCardDto>();

  hasError = false;
  errorMessage = '';

  constructor(private errorHandler: DashboardErrorHandlerService) {}

  ngOnInit(): void {
    this.validateInputs();
  }

  /**
   * Validate component inputs
   */
  private validateInputs(): void {
    try {
      if (!this.isLoading && !this.card) {
        this.hasError = true;
        this.errorMessage = 'No card data provided';
        
        this.errorHandler.handleComponentError(
          new Error('Card data is required'),
          {
            component: 'DashboardCardComponent',
            operation: 'Input Validation',
            userMessage: 'Card configuration error',
            silent: true
          }
        );
        return;
      }

      if (this.card && typeof this.card.count !== 'number') {
        this.hasError = true;
        this.errorMessage = 'Invalid card data';
        
        this.errorHandler.handleComponentError(
          new Error('Card count must be a number'),
          {
            component: 'DashboardCardComponent',
            operation: 'Data Validation',
            userMessage: 'Invalid card data format',
            silent: true
          }
        );
        return;
      }

      this.hasError = false;
      this.errorMessage = '';
    } catch (error) {
      this.hasError = true;
      this.errorMessage = 'Card validation failed';
      
      this.errorHandler.handleComponentError(error, {
        component: 'DashboardCardComponent',
        operation: 'Validation Error',
        userMessage: 'Card validation failed'
      });
    }
  }

  /**
   * Handle card click event with error handling
   */
  onCardClick(): void {
    try {
      if (this.hasError) {
        console.warn('Card click ignored due to error state');
        return;
      }

      if (!this.isLoading && this.card && !this.isCustomizationMode) {
        this.cardClick.emit(this.card);
      }
    } catch (error) {
      this.errorHandler.handleComponentError(error, {
        component: 'DashboardCardComponent',
        operation: 'Card Click',
        userMessage: 'Failed to handle card click'
      });
    }
  }

  /**
   * Get status-based CSS class for styling with error handling
   */
  getStatusClass(): string {
    try {
      if (this.hasError) {
        return 'card-status-error';
      }

      if (!this.card?.status) {
        return 'card-status-normal';
      }

      switch (this.card.status) {
        case 'Normal':
          return 'card-status-normal';
        case 'Warning':
          return 'card-status-warning';
        case 'Critical':
          return 'card-status-critical';
        default:
          return 'card-status-normal';
      }
    } catch (error) {
      this.errorHandler.handleComponentError(error, {
        component: 'DashboardCardComponent',
        operation: 'Get Status Class',
        silent: true
      });
      return 'card-status-error';
    }
  }

  /**
   * Get status icon based on card status with error handling
   */
  getStatusIcon(): string {
    try {
      if (this.hasError) {
        return 'ri-error-warning-line';
      }

      if (!this.card?.status) {
        return 'ri-information-line';
      }

      switch (this.card.status) {
        case 'Normal':
          return 'ri-information-line';
        case 'Warning':
          return 'ri-alert-line';
        case 'Critical':
          return 'ri-error-warning-line';
        default:
          return 'ri-information-line';
      }
    } catch (error) {
      this.errorHandler.handleComponentError(error, {
        component: 'DashboardCardComponent',
        operation: 'Get Status Icon',
        silent: true
      });
      return 'ri-error-warning-line';
    }
  }

  /**
   * Format count for display (handles large numbers) with error handling
   */
  formatCount(count: number): string {
    try {
      if (typeof count !== 'number' || isNaN(count)) {
        return '0';
      }
      
      if (count === 0) {
        return '0';
      }
      
      if (count < 1000) {
        return count.toString();
      } else if (count < 1000000) {
        return (count / 1000).toFixed(1) + 'K';
      } else {
        return (count / 1000000).toFixed(1) + 'M';
      }
    } catch (error) {
      this.errorHandler.handleComponentError(error, {
        component: 'DashboardCardComponent',
        operation: 'Format Count',
        silent: true
      });
      return '0';
    }
  }

  /**
   * Check if card has description with error handling
   */
  hasDescription(): boolean {
    try {
      return !!(this.card?.description && this.card.description.trim().length > 0);
    } catch (error) {
      this.errorHandler.handleComponentError(error, {
        component: 'DashboardCardComponent',
        operation: 'Check Description',
        silent: true
      });
      return false;
    }
  }

  /**
   * Get safe card title
   */
  getSafeTitle(): string {
    try {
      return this.card?.title || 'Dashboard Card';
    } catch (error) {
      return 'Dashboard Card';
    }
  }

  /**
   * Get safe card count
   */
  getSafeCount(): number {
    try {
      return typeof this.card?.count === 'number' ? this.card.count : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get safe card description
   */
  getSafeDescription(): string {
    try {
      return this.card?.description || '';
    } catch (error) {
      return '';
    }
  }
}