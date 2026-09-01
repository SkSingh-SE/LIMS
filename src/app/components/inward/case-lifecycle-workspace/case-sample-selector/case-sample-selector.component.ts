import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestStatusBadgeComponent } from '../../../TestResult/test-status-badge/test-status-badge.component';

@Component({
  selector: 'app-case-sample-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './case-sample-selector.component.html',
  styleUrls: ['./case-sample-selector.component.css']
})
export class CaseSampleSelectorComponent {
  @Input() samples: any[] = [];
  @Input() activeTab: string = 'overview';
  @Input() selectedSampleId: number | null = null;
  @Input() isReadOnly: boolean = false;

  @Output() sampleAction = new EventEmitter<{ sampleId: number; action: string }>();

  onTriggerAction(sampleId: number, action: string): void {
    this.sampleAction.emit({ sampleId, action });
  }

  getInwardStageInfo(sample: any): { label: string; class: string; icon: string } {
    if (sample.isCancelled) return { label: 'Cancelled', class: 'badge-cancelled', icon: 'bi-x-circle' };
    return { label: 'Received', class: 'badge-completed', icon: 'bi-check-circle-fill' };
  }

  getReviewPlanStageInfo(sample: any): { label: string; class: string; icon: string; countText?: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    const total = (sample.generalTestCount || 0) + (sample.chemicalTestCount || 0);
    if (total > 0) {
      return { label: 'Planned', class: 'badge-completed', icon: 'bi-check-circle-fill', countText: `${total} Tests` };
    }
    return { label: 'In Review', class: 'badge-active', icon: 'bi-clock-fill' };
  }

  getPrepStageInfo(sample: any): { label: string; class: string; icon: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    if (!sample.preparationRequired && !sample.machiningRequired) {
      return { label: 'N/A', class: 'badge-na', icon: 'bi-slash-circle' };
    }
    if (sample.preparationStatus === 'Completed') {
      return { label: 'Done', class: 'badge-completed', icon: 'bi-check-circle-fill' };
    }
    return { label: 'Pending', class: 'badge-pending', icon: 'bi-hourglass-split' };
  }

  getTestingStageInfo(sample: any): { label: string; class: string; icon: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    if (sample.isTestingCompleted || sample.testResultStatus === 'Completed') {
      return { label: 'Completed', class: 'badge-completed', icon: 'bi-check-circle-fill' };
    }
    if (sample.testResultStatus === 'In Progress' || sample.testResultStatus === 'UNDER_TESTING') {
      return { label: 'Testing', class: 'badge-active', icon: 'bi-flask' };
    }
    return { label: 'Queue', class: 'badge-pending', icon: 'bi-hourglass' };
  }

  getReportingStageInfo(sample: any): { label: string; class: string; icon: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    if (sample.reportHeaderId) {
      return { label: 'Generated', class: 'badge-completed', icon: 'bi-file-earmark-check-fill' };
    }
    return { label: 'Pending', class: 'badge-pending', icon: 'bi-hourglass' };
  }

  getDirectAction(sample: any): { action: string; label: string; icon: string } {
    if (sample.isCancelled) {
      return { action: 'inward', label: 'View Sample', icon: 'bi-eye' };
    }

    if (this.activeTab === 'testing') {
      return {
        action: 'testing',
        label: sample.isTestingCompleted ? 'View Results' : 'Enter Results',
        icon: sample.isTestingCompleted ? 'bi-eye' : 'bi-pencil-square'
      };
    }

    if (this.activeTab === 'reporting') {
      return {
        action: 'reporting',
        label: sample.reportHeaderId ? 'View Report' : 'Draft Report',
        icon: sample.reportHeaderId ? 'bi-file-earmark-text' : 'bi-plus-circle'
      };
    }

    // Default for Overview: Context-aware smart action
    const totalTests = (sample.generalTestCount || 0) + (sample.chemicalTestCount || 0);
    if (totalTests === 0) {
      return { action: 'review-plan', label: 'Plan Tests', icon: 'bi-clipboard-plus' };
    }
    if (!sample.isTestingCompleted && sample.testResultStatus !== 'Completed') {
      return { action: 'testing', label: 'Enter Results', icon: 'bi-pencil-square' };
    }
    if (!sample.reportHeaderId) {
      return { action: 'reporting', label: 'Create Report', icon: 'bi-file-earmark-plus' };
    }
    return { action: 'reporting', label: 'View Report', icon: 'bi-file-earmark-text' };
  }
}
