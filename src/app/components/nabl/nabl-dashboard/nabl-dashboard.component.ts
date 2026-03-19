import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NablAuditService, NablDashboardDto } from '../../../services/nabl-audit.service';

@Component({
    selector: 'app-nabl-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './nabl-dashboard.component.html',
    styleUrl: './nabl-dashboard.component.css',
})
export class NablDashboardComponent implements OnInit {
    dashboard: NablDashboardDto | null = null;
    errorMessage = '';

    constructor(private nablAuditService: NablAuditService) {}

    ngOnInit() {
        this.loadDashboard();
    }

    loadDashboard() {
        this.errorMessage = '';
        this.nablAuditService.getDashboard().subscribe({
            next: (data) => {
                this.dashboard = data;
            },
            error: (err) => {
                console.error('Error loading NABL dashboard:', err);
                this.errorMessage = 'Failed to load dashboard data.';
            },
        });
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
        // Convert PascalCase to spaced string
        return formType.replace(/([A-Z])/g, ' $1').trim();
    }
}
