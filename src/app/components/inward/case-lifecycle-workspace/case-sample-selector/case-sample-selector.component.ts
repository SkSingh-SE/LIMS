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

  getPlanStageInfo(sample: any): { label: string; class: string; icon: string; countText?: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    const totalU = sample.universalTestCount || 0;
    const legacy = (sample.generalTestCount || 0) + (sample.chemicalTestCount || 0);
    const total = totalU + legacy;
    if (total > 0) {
      const pend = sample.universalPendingCount || 0;
      if (pend > 0) return { label: 'Planned', class: 'badge-completed', icon: 'bi-check-circle-fill', countText: `${total} Tests` };
      return { label: 'Submitted', class: 'badge-completed', icon: 'bi-check-circle-fill', countText: `${total} Tests` };
    }
    return { label: 'Queue', class: 'badge-pending', icon: 'bi-hourglass' };
  }

  getReviewPlanStageInfo(sample: any): { label: string; class: string; icon: string; countText?: string } {
    return this.getPlanStageInfo(sample);
  }

  getResultStageInfo(sample: any): { label: string; class: string; icon: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    const res = (sample.universalResultStatus || '').toLowerCase();
    const dec = (sample.universalOverallDecision || '').toUpperCase();
    if (res.includes('approv') || res.includes('verif') || res.includes('final')) return { label: 'Evaluated', class: 'badge-completed', icon: 'bi-check-circle-fill' };
    if (res.includes('calculat') || res) return { label: dec || 'Evaluated', class: 'badge-active', icon: 'bi-graph-up' };
    const exec = (sample.latestExecutionStatus || '').toLowerCase();
    if (exec.includes('complet')) return { label: 'Pending', class: 'badge-active', icon: 'bi-clock-fill' };
    return { label: 'Queue', class: 'badge-pending', icon: 'bi-hourglass' };
  }

  getVerificationStageInfo(sample: any): { label: string; class: string; icon: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    const exec = (sample.latestExecutionStatus || '').toLowerCase();
    const res = (sample.universalResultStatus || '').toLowerCase();
    if (exec.includes('approv') || res.includes('approv')) return { label: 'Approved', class: 'badge-completed', icon: 'bi-check-circle-fill' };
    if (exec.includes('verif') || res.includes('verif') || res.includes('final')) return { label: 'Verified', class: 'badge-completed', icon: 'bi-check-circle-fill' };
    if (exec.includes('complet') || res) return { label: 'Pending', class: 'badge-active', icon: 'bi-clock-fill' };
    return { label: 'Queue', class: 'badge-pending', icon: 'bi-hourglass' };
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
    const exec = (sample.latestExecutionStatus || '').toLowerCase();
    if (exec.includes('approv') || exec.includes('verif') || exec.includes('complet') || sample.isTestingCompleted) {
      return { label: 'Completed', class: 'badge-completed', icon: 'bi-check-circle-fill' };
    }
    if (exec.includes('progress') || (sample.universalTestCount || 0) > (sample.universalPendingCount || 0)) {
      return { label: 'Testing', class: 'badge-active', icon: 'bi-flask' };
    }
    if (sample.testResultStatus === 'In Progress' || sample.testResultStatus === 'UNDER_TESTING') {
      return { label: 'Testing', class: 'badge-active', icon: 'bi-flask' };
    }
    return { label: 'Queue', class: 'badge-pending', icon: 'bi-hourglass' };
  }

  getReportingStageInfo(sample: any): { label: string; class: string; icon: string } {
    if (sample.isCancelled) return { label: '—', class: 'badge-muted', icon: 'bi-dash' };
    const uRep = (sample.universalReportStatus || '').toUpperCase();
    if (uRep === 'RELEASED') return { label: 'Released', class: 'badge-completed', icon: 'bi-file-earmark-check-fill' };
    if (uRep === 'GENERATED') return { label: 'Generated', class: 'badge-active', icon: 'bi-file-earmark-text' };
    if (uRep === 'VOID') return { label: 'Void', class: 'badge-muted', icon: 'bi-slash-circle' };
    if (sample.reportHeaderId || sample.universalReportId) {
      return { label: 'Generated', class: 'badge-completed', icon: 'bi-file-earmark-check-fill' };
    }
    return { label: 'Pending', class: 'badge-pending', icon: 'bi-hourglass' };
  }

  getDirectAction(sample: any): { action: string; label: string; icon: string } {
    if (sample.isCancelled) {
      return { action: 'inward', label: 'View Sample', icon: 'bi-eye' };
    }

    if (this.activeTab === 'plan') {
      return { action: 'plan', label: (sample.universalTestCount || 0) > 0 ? 'View Plan' : 'Plan Tests', icon: 'bi-clipboard-plus' };
    }

    if (this.activeTab === 'preparation') {
      return { action: 'preparation', label: 'Prep Status', icon: 'bi-scissors' };
    }

    if (this.activeTab === 'testing') {
      return {
        action: 'testing',
        label: sample.latestExecutionId ? 'Open Execution' : 'Enter Results',
        icon: sample.latestExecutionId ? 'bi-box-arrow-up-right' : 'bi-pencil-square'
      };
    }

    if (this.activeTab === 'result') {
      return { action: 'result', label: 'Evaluate', icon: 'bi-graph-up' };
    }

    if (this.activeTab === 'verification') {
      return { action: 'verification', label: 'Verify', icon: 'bi-patch-check' };
    }

    if (this.activeTab === 'approval') {
      return { action: 'approval', label: 'Approve', icon: 'bi-award' };
    }

    if (this.activeTab === 'reporting') {
      return {
        action: 'reporting',
        label: sample.universalReportId || sample.reportHeaderId ? 'View Report' : 'Draft Report',
        icon: sample.universalReportId || sample.reportHeaderId ? 'bi-file-earmark-text' : 'bi-plus-circle'
      };
    }

    // Default for Overview: Context-aware smart action
    const totalTests = (sample.generalTestCount || 0) + (sample.chemicalTestCount || 0) + (sample.universalTestCount || 0);
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
