import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NablAuditService, NablDashboardDto } from '../../../services/nabl-audit.service';
import { NablWorkflowService } from '../../../services/nabl-workflow.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
    selector: 'app-nabl-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, BaseChartDirective],
    templateUrl: './nabl-dashboard.component.html',
    styleUrl: './nabl-dashboard.component.css',
})
export class NablDashboardComponent implements OnInit {
    dashboard: NablDashboardDto | null = null;
    errorMessage = '';
    userRole = '';

    // Chart data
    statusChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
    statusChartOptions: ChartOptions<'doughnut'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }
        }
    };

    constructor(
        private nablAuditService: NablAuditService,
        private workflowService: NablWorkflowService,
        private toastService: ToastService,
        private authService: AuthService
    ) {}

    ngOnInit() {
        const userData = this.authService.getUserData();
        this.userRole = userData?.roles?.[0] || '';
        this.loadDashboard();
    }

    loadDashboard() {
        this.errorMessage = '';
        this.nablAuditService.getDashboard().subscribe({
            next: (data) => {
                this.dashboard = data;
                this.buildChart(data);
            },
            error: (err) => {
                console.error('Error loading NABL dashboard:', err);
                this.errorMessage = 'Failed to load dashboard data.';
            },
        });
    }

    private buildChart(data: NablDashboardDto): void {
        this.statusChartData = {
            labels: ['Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected'],
            datasets: [{
                data: [
                    data.draftCount,
                    data.submittedCount,
                    data.reviewedCount,
                    data.approvedCount,
                    data.rejectedCount
                ],
                backgroundColor: ['#6c757d', '#0dcaf0', '#ffc107', '#198754', '#dc3545'],
                borderWidth: 1
            }]
        };
    }

    // Workflow actions from dashboard
    doReview(item: any): void {
        if (!confirm(`Review ${item.formCode} - ${item.documentNo || 'N/A'}?`)) return;
        this.workflowService.review(item.formType, item.id).subscribe({
            next: () => {
                this.toastService.show('Reviewed successfully', 'success');
                this.loadDashboard();
            },
            error: (err) => this.toastService.show(err.error?.message || 'Review failed', 'error')
        });
    }

    doApprove(item: any): void {
        if (!confirm(`Approve ${item.formCode} - ${item.documentNo || 'N/A'}?`)) return;
        this.workflowService.approve(item.formType, item.id).subscribe({
            next: () => {
                this.toastService.show('Approved successfully', 'success');
                this.loadDashboard();
            },
            error: (err) => this.toastService.show(err.error?.message || 'Approval failed', 'error')
        });
    }

    canReview(): boolean {
        const reviewRoles = ['Admin', 'LabManager', 'Reviewer', 'QualityManager'];
        return reviewRoles.some(r => this.userRole.toLowerCase().includes(r.toLowerCase()));
    }

    canApprove(): boolean {
        const approveRoles = ['Admin', 'Approver', 'Director', 'ManagingDirector'];
        return approveRoles.some(r => this.userRole.toLowerCase().includes(r.toLowerCase()));
    }

    getFormRouteBase(formType: string): string {
        const routeMap: { [key: string]: string } = {
            JobDescription: '/job-description',
            ResponsibilityAuthority: '/responsibility-authority',
            EmployeeCompetence: '/employee-competence',
            EmployeeAuthorization: '/employee-authorization',
            CompetenceRequirement: '/competence-requirement',
            InductionTraining: '/induction-training',
            SkillMatrix: '/skill-matrix',
            TrainingPlan: '/training-plan',
            TrainingAttendance: '/training-attendance',
            TrainingEffectiveness: '/training-effectiveness',
            EnvironmentMonitoring: '/environment-monitoring',
            QualityControlPlan: '/quality-control-plan',
            TestRequest: '/test-request-nabl',
            TestMethod: '/test-method',
            MethodVerification: '/method-verification',
            MethodValidation: '/method-validation',
            SampleInwardRegister: '/sample-inward-register',
            SampleMusterRegister: '/sample-muster-register',
            SampleLabel: '/sample-label',
            TechnicalRawData: '/technical-raw-data',
            TestReport: '/test-report-nabl',
            EquipmentHistory: '/equipment-history',
            CalibrationReview: '/calibration-review',
            IntermediateCheck: '/intermediate-check',
            ReferenceMaterial: '/reference-material',
            CrmConsumption: '/crm-consumption',
            SupplierRegistration: '/supplier-registration',
            SupplierEvaluation: '/supplier-evaluation',
            ApprovedSupplier: '/approved-supplier',
            SupplierConfidentiality: '/supplier-confidentiality',
            IncomingMaterial: '/incoming-material',
            ProductInspection: '/product-inspection',
            PurchaseIndent: '/purchase-indent',
            PurchaseOrder: '/purchase-order',
            PurchaseMaterialVerification: '/purchase-material-verification',
            Complaint: '/complaint',
            CustomerFeedback: '/customer-feedback',
            FeedbackAnalysis: '/feedback-analysis',
            AuditPlan: '/audit-plan',
            AuditChecklist: '/audit-checklist',
            AuditSummary: '/audit-summary',
            InternalAuditor: '/internal-auditor',
            MeetingAgenda: '/meeting-agenda',
            MeetingMinutes: '/meeting-minutes',
            NonConformingWork: '/non-conforming-work',
            NcCorrectiveAction: '/nc-corrective-action',
            Retesting: '/retesting-retained-sample',
            RiskAssessment: '/risk-assessment',
            DocumentChangeRequest: '/document-change-request',
            DocumentReview: '/document-review',
            MasterDocument: '/master-document',
            MeasurementUncertainty: '/measurement-uncertainty',
            PtIlcPlan: '/pt-ilc-plan',
        };
        return routeMap[formType] || '/';
    }

    getFormDisplayName(formType: string): string {
        return formType.replace(/([A-Z])/g, ' $1').trim();
    }
}
