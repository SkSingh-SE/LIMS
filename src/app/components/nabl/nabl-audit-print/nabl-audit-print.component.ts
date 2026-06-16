import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NablAuditService, AuditSummaryItem } from '../../../services/nabl-audit.service';
import { ToastService } from '../../../services/toast.service';

interface FormTypeOption {
    key: string;
    code: string;
    name: string;
    selected: boolean;
}

@Component({
    selector: 'app-nabl-audit-print',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './nabl-audit-print.component.html',
    styleUrl: './nabl-audit-print.component.css',
})
export class NablAuditPrintComponent implements OnInit {
    formTypes: FormTypeOption[] = [
        { key: 'JobDescription', code: 'F-3', name: 'Job Description', selected: false },
        { key: 'ResponsibilityAuthority', code: 'F-4', name: 'Responsibility & Authority', selected: false },
        { key: 'EmployeeCompetence', code: 'F-7', name: 'Employee Competence', selected: false },
        { key: 'EmployeeAuthorization', code: 'F-5', name: 'Employee Authorization', selected: false },
        { key: 'CompetenceRequirement', code: 'F-4', name: 'Competence Requirement', selected: false },
        { key: 'InductionTraining', code: 'F-6', name: 'Induction Training', selected: false },
        { key: 'SkillMatrix', code: 'F-6', name: 'Skill Matrix', selected: false },
        { key: 'SkillMatrixDecision', code: 'F-6A', name: 'Skill Matrix Decision', selected: false },
        { key: 'TrainingPlan', code: 'F-8', name: 'Training Plan', selected: false },
        { key: 'TrainingAttendance', code: 'F-9', name: 'Training Attendance', selected: false },
        { key: 'TrainingEffectiveness', code: 'F-10', name: 'Training Effectiveness', selected: false },
        { key: 'EnvironmentMonitoring', code: 'F-11', name: 'Environment Monitoring', selected: false },
        { key: 'QualityControlPlan', code: 'F-12', name: 'Quality Control Plan', selected: false },
        { key: 'TestRequest', code: 'F-13', name: 'Test Request', selected: false },
        { key: 'TestMethod', code: 'F-14', name: 'Test Method', selected: false },
        { key: 'MethodVerification', code: 'F-15', name: 'Method Verification', selected: false },
        { key: 'MethodValidation', code: 'F-16', name: 'Method Validation', selected: false },
        { key: 'SampleInwardRegister', code: 'F-17', name: 'Sample Inward Register', selected: false },
        { key: 'SampleMusterRegister', code: 'F-18', name: 'Sample Muster Register', selected: false },
        { key: 'SampleLabel', code: 'F-19', name: 'Sample Label', selected: false },
        { key: 'TechnicalRawData', code: 'F-20', name: 'Technical Raw Data', selected: false },
        { key: 'TestReport', code: 'F-21', name: 'Test Report', selected: false },
        { key: 'EquipmentHistory', code: 'F-22', name: 'Equipment History', selected: false },
        { key: 'CalibrationReview', code: 'F-23', name: 'Calibration Review', selected: false },
        { key: 'IntermediateCheck', code: 'F-24', name: 'Intermediate Check', selected: false },
        { key: 'ReferenceMaterial', code: 'F-25', name: 'Reference Material', selected: false },
        { key: 'CrmConsumption', code: 'F-26', name: 'CRM Consumption', selected: false },
        { key: 'SupplierRegistration', code: 'F-27', name: 'Supplier Registration', selected: false },
        { key: 'SupplierEvaluation', code: 'F-28', name: 'Supplier Evaluation', selected: false },
        { key: 'ApprovedSupplier', code: 'F-29', name: 'Approved Supplier', selected: false },
        { key: 'SupplierConfidentiality', code: 'F-30', name: 'Supplier Confidentiality', selected: false },
        { key: 'IncomingMaterial', code: 'F-31', name: 'Incoming Material', selected: false },
        { key: 'ProductInspection', code: 'F-32', name: 'Product Inspection', selected: false },
        { key: 'PurchaseIndent', code: 'F-33', name: 'Purchase Indent', selected: false },
        { key: 'PurchaseOrder', code: 'F-34', name: 'Purchase Order', selected: false },
        { key: 'PurchaseMaterialVerification', code: 'F-35', name: 'Purchase Material Verification', selected: false },
        { key: 'Complaint', code: 'F-36', name: 'Complaint', selected: false },
        { key: 'CustomerFeedback', code: 'F-37', name: 'Customer Feedback', selected: false },
        { key: 'FeedbackAnalysis', code: 'F-38', name: 'Feedback Analysis', selected: false },
        { key: 'AuditPlan', code: 'F-39', name: 'Audit Plan', selected: false },
        { key: 'AuditChecklist', code: 'F-40', name: 'Audit Checklist', selected: false },
        { key: 'AuditSummary', code: 'F-41', name: 'Audit Summary', selected: false },
        { key: 'InternalAuditor', code: 'F-42', name: 'Internal Auditor', selected: false },
        { key: 'MeetingAgenda', code: 'F-43', name: 'Meeting Agenda', selected: false },
        { key: 'MeetingMinutes', code: 'F-44', name: 'Meeting Minutes', selected: false },
        { key: 'NonConformingWork', code: 'F-45', name: 'Non Conforming Work', selected: false },
        { key: 'NcCorrectiveAction', code: 'F-46', name: 'NC Corrective Action', selected: false },
        { key: 'Retesting', code: 'F-47', name: 'Retesting', selected: false },
        { key: 'RiskAssessment', code: 'F-48', name: 'Risk Assessment', selected: false },
        { key: 'DocumentChangeRequest', code: 'F-49', name: 'Document Change Request', selected: false },
        { key: 'DocumentReview', code: 'F-50', name: 'Document Review', selected: false },
        { key: 'MasterDocument', code: 'F-51', name: 'Master Document', selected: false },
        { key: 'MeasurementUncertainty', code: 'F-52', name: 'Measurement Uncertainty', selected: false },
        { key: 'PtIlcPlan', code: 'F-53', name: 'PT / ILC Plan', selected: false },
    ];

    auditSummary: AuditSummaryItem[] = [];
    dateFrom = '';
    dateTo = '';
    isGenerating = false;
    isLoadingSummary = true;
    selectAll = false;

    constructor(
        private nablAuditService: NablAuditService,
        private toastService: ToastService
    ) {}

    ngOnInit() {
        this.loadAuditSummary();
    }

    loadAuditSummary() {
        this.isLoadingSummary = true;
        this.nablAuditService.getAuditSummary().subscribe({
            next: (data) => {
                this.auditSummary = data;
                this.isLoadingSummary = false;
            },
            error: () => {
                this.isLoadingSummary = false;
            },
        });
    }

    toggleSelectAll() {
        this.formTypes.forEach((ft) => (ft.selected = this.selectAll));
    }

    onFormTypeChange() {
        this.selectAll = this.formTypes.every((ft) => ft.selected);
    }

    get selectedCount(): number {
        return this.formTypes.filter((ft) => ft.selected).length;
    }

    getFormCount(formType: string): number {
        const item = this.auditSummary.find((s) => s.formType === formType);
        return item?.total ?? 0;
    }

    generateAuditPackage() {
        const selectedTypes = this.formTypes.filter((ft) => ft.selected).map((ft) => ft.key);

        if (selectedTypes.length === 0) {
            this.toastService.show('Please select at least one form type.', 'error');
            return;
        }

        this.isGenerating = true;

        const request = {
            formTypes: selectedTypes,
            from: this.dateFrom || undefined,
            to: this.dateTo || undefined,
        };

        this.nablAuditService.generateAuditPackage(request).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `NABL_Audit_Package_${new Date().toISOString().slice(0, 10)}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
                this.toastService.show('Audit package generated successfully.', 'success');
                this.isGenerating = false;
            },
            error: (err) => {
                console.error('Error generating audit package:', err);
                this.toastService.show('Failed to generate audit package.', 'error');
                this.isGenerating = false;
            },
        });
    }
}
