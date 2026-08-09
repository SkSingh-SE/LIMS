import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { MainDashboardComponent } from './components/main-dashboard/main-dashboard.component';
import { ListDesignationComponent } from './components/designation/list-designation/list-designation.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { EmployeeListComponent } from './components/employee/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employee/employee-form/employee-form.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';
import { unsavedChangesGuard } from './guards/unsaved-changes.guard';
import { DepartmentListComponent } from './components/department/department-list/department-list.component';
import { DepartmentFormComponent } from './components/department/department-form/department-form.component';
import { DesignationFormComponent } from './components/designation/designation-form/designation-form.component';
import { LaboratoryTestComponent } from './components/test/laboratory-test/laboratory-test.component';
import { CustomerFormComponent } from './components/customer/customer-form/customer-form.component';
import { CompanyCategoryComponent } from './components/company-category/company-category.component';
import { CustomerListComponent } from './components/customer/customer-list/customer-list.component';
import { TaxComponent } from './components/tax/tax.component';
import { BankComponent } from './components/bank/bank.component';
import { CourierComponent } from './components/courier/courier.component';
import { TPIComponent } from './components/tpi/tpi.component';
import { DimensionalFactorComponent } from './components/dimensional-factor/dimensional-factor.component';
import { HeatTreatmentComponent } from './components/heat-treatment/heat-treatment.component';
import { HeatTreatmentCategoryComponent } from './components/heat-treatment-category/heat-treatment-category.component';
import { CoolingMediumComponent } from './components/cooling-medium/cooling-medium.component';
import { ParameterCategoryComponent } from './components/parameter-category/parameter-category.component';
import { ProductFormComponent } from './components/product-form/product-form.component';
import { SpecimenOrientationCategoryComponent } from './components/specimen-orientation-category/specimen-orientation-category.component';
import { ProductConditionCategoryComponent } from './components/product-condition-category/product-condition-category.component';
import { PropertyTypeComponent } from './components/property-type/property-type.component';
import { ProductConditionComponent } from './components/product-condition/product-condition.component';
import { SpecimenOrientationComponent } from './components/specimen-orientation/specimen-orientation.component';
import { ChemicalParameterComponent } from './components/parameter/chemical-parameter/chemical-parameter.component';
import { MechanicalParameterComponent } from './components/parameter/mechanical-parameter/mechanical-parameter.component';
import { StandardOrgnizationComponent } from './components/standard-orgnization/standard-orgnization.component';
import { UniversalCodeTypeComponent } from './components/universal-code-type/universal-code-type.component';
import { InvoiceCaseComponent } from './components/test/invoice-case/invoice-case.component';
import { MetalClassificationComponent } from './components/metal-classification/metal-classification.component';
import { MaterialSpecificationFormComponent } from './components/material-specification/material-specification-form/material-specification-form.component';
import { MaterialSpecificationListComponent } from './components/material-specification/material-specification-list/material-specification-list.component';
import { CustomMaterialSpecificationListComponent } from './components/material-specification/custom-material-specification-list/custom-material-specification-list.component';
import { CustomMaterialSpecificationFormComponent } from './components/material-specification/custom-material-specification-form/custom-material-specification-form.component';
import { ToleranceMasterComponent } from './components/tolerance-master/tolerance-master.component';
import { HardnessEquivalenceComponent } from './components/hardness-equivalence/hardness-equivalence.component';
import { ParameterUnitComponent } from './components/parameter-unit/parameter-unit.component';
import { SupplierListComponent } from './components/supplier/supplier-list/supplier-list.component';
import { SupplierFormComponent } from './components/supplier/supplier-form/supplier-form.component';
import { LaboratoryTestListComponent } from './components/test/laboratory-test-list/laboratory-test-list.component';
import { TestMethodSpecificationComponent } from './components/test/test-method-specification/test-method-specification.component';
import { TestMethodSpecificationListComponent } from './components/test/test-method-specification-list/test-method-specification-list.component';
import { ScopeComponent } from './components/iso/scope/scope.component';
import { ScopeListComponent } from './components/iso/scope-list/scope-list.component';
import { OEMFormComponent } from './components/equipment/oem-form/oem-form.component';
import { OemListComponent } from './components/equipment/oem-list/oem-list.component';
import { EquipmentFormComponent } from './components/equipment/equipment-form/equipment-form.component';
import { EquipmentListComponent } from './components/equipment/equipment-list/equipment-list.component';
import { InvoiceCaseConfigurationsComponent } from './components/test/invoice-case-configurations/invoice-case-configurations.component';
import { InvoiceCaseListComponent } from './components/test/invoice-case-list/invoice-case-list.component';
import { CalibrationAgencyFormComponent } from './components/equipment/calibration-agency-form/calibration-agency-form.component';
import { CalibrationAgencyComponent } from './components/equipment/calibration-agency/calibration-agency.component';
import { CuttingPriceMasterComponent } from './components/sample-prepration/cutting-price-master/cutting-price-master.component';
import { CuttingSampleFormComponent } from './components/sample-prepration/cutting-sample-form/cutting-sample-form.component';
import { MachiningChallanComponent } from './components/sample-prepration/machining-challan/machining-challan.component';
import { SampleInwardFormComponent } from './components/inward/sample-inward-form/sample-inward-form.component';
import { ConfigManagerComponent } from './components/configuration/configuration.component';
import { MenuManagementComponent } from './components/menu/menu-management/menu-management.component';
import { MenuManagementListComponent } from './components/menu/menu-management-list/menu-management-list.component';
import { RoleFormComponent } from './components/role/role-form/role-form.component';
import { UserPermissionComponent } from './components/employee/user-permission/user-permission.component';
import { MenuPermissionComponent } from './components/menu/menu-permission/menu-permission.component';
import { SampleInwardListComponent } from './components/inward/sample-inward-list/sample-inward-list.component';
import { PlanFormComponent } from './components/plan/plan-form/plan-form.component';
import { ReviewOfRequestComponent } from './components/inward/review-of-request/review-of-request.component';
import { WorkflowFormComponent } from './components/workflow/workflow-form/workflow-form.component';
import { WorkflowListComponent } from './components/workflow/workflow-list/workflow-list.component';

import { PlanListComponent } from './components/plan/plan-list/plan-list.component';
import { ReviewOfRequestFormComponent } from './components/inward/review-of-request-form/review-of-request-form.component';
import { CuttingSamplesComponent } from './components/sample-prepration/cutting-samples/cutting-samples.component';
import { TestResultComponent } from './components/TestResult/test-result/test-result.component';
import { LongTermTrackingComponent } from './components/TestResult/long-term-tracking/long-term-tracking.component';
import { ReportingListComponent } from './components/report/reporting-list/reporting-list.component';
import { ReportingPreviewComponent } from './components/report/reporting-preview/reporting-preview.component';
import { TestResultEntryFormComponent } from './components/TestResult/test-result-entry-form/test-result-entry-form.component';
import { ReportAmendComponent } from './components/report/report-amend/report-amend.component';
import { PaymentComponent } from './components/public-access/payment/payment.component';
import { AccountDashboardComponent } from './components/account/account-dashboard/account-dashboard.component';
import { CaseAccountListComponent } from './components/account/case-account-list/case-account-list.component';
import { CaseAccountDetailComponent } from './components/account/case-account-detail/case-account-detail.component';
import { InvoicePreviewComponent } from './components/account/invoice-preview/invoice-preview.component';
import { CustomerLedgerComponent } from './components/account/customer-ledger/customer-ledger.component';
import { RecordPaymentComponent } from './components/account/record-payment/record-payment.component';
import { AgingReportComponent } from './components/account/aging-report/aging-report.component';
import { OutstandingReportComponent } from './components/account/outstanding-report/outstanding-report.component';
import { SettingsComponent } from './components/settings/settings.component';
import { JobDescriptionListComponent } from './components/nabl/job-description-list/job-description-list.component';
import { JobDescriptionFormComponent } from './components/nabl/job-description-form/job-description-form.component';
import { JobDescriptionPreviewComponent } from './components/nabl/job-description-preview/job-description-preview.component';
import { ResponsibilityAuthorityListComponent } from './components/nabl/responsibility-authority-list/responsibility-authority-list.component';
import { ResponsibilityAuthorityFormComponent } from './components/nabl/responsibility-authority-form/responsibility-authority-form.component';
import { ResponsibilityAuthorityPreviewComponent } from './components/nabl/responsibility-authority-preview/responsibility-authority-preview.component';
import { ImpartialityAgreementPreviewComponent } from './components/nabl/impartiality-agreement-preview/impartiality-agreement-preview.component';
import { EmployeeCompetencePreviewComponent } from './components/nabl/employee-competence-preview/employee-competence-preview.component';
import { EmployeeTrainingPreviewComponent } from './components/nabl/employee-training-preview/employee-training-preview.component';
import { EmployeeAuthorizationPreviewComponent } from './components/nabl/employee-authorization-preview/employee-authorization-preview.component';
import { SkillMatrixPreviewComponent } from './components/designation/skill-matrix/skill-matrix-preview/skill-matrix-preview.component';
import { SkillMatrixListComponent } from './components/designation/skill-matrix/skill-matrix-list/skill-matrix-list.component';
import { SkillMatrixFormComponent } from './components/designation/skill-matrix/skill-matrix-form/skill-matrix-form.component';
import { TrainingPlanListComponent } from './components/training/training-plan/training-plan-list.component';
import { TrainingPlanFormComponent } from './components/training/training-plan/training-plan-form.component';
import { TrainingPlanPreviewComponent } from './components/training/training-plan/training-plan-preview.component';
import { TrainingEffectivenessListComponent } from './components/training/training-effectiveness/training-effectiveness-list.component';
import { TrainingEffectivenessFormComponent } from './components/training/training-effectiveness/training-effectiveness-form.component';
import { TrainingEffectivenessPreviewComponent } from './components/training/training-effectiveness/training-effectiveness-preview.component';
import { EnvironmentMonitoringListComponent } from './components/environment-monitoring/environment-monitoring-list.component';
import { EnvironmentMonitoringFormComponent } from './components/environment-monitoring/environment-monitoring-form.component';
import { EnvironmentMonitoringPreviewComponent } from './components/environment-monitoring/environment-monitoring-preview.component';
import { TestRequestNablListComponent } from './components/nabl/test-request-nabl/test-request-list/test-request-list.component';
import { TestRequestNablFormComponent } from './components/nabl/test-request-nabl/test-request-form/test-request-form.component';
import { TestRequestNablPreviewComponent } from './components/nabl/test-request-nabl/test-request-preview/test-request-preview.component';
import { TestMethodNablListComponent } from './components/nabl/test-method-nabl/test-method-list/test-method-list.component';
import { TestMethodNablFormComponent } from './components/nabl/test-method-nabl/test-method-form/test-method-form.component';
import { TestMethodNablPreviewComponent } from './components/nabl/test-method-nabl/test-method-preview/test-method-preview.component';
import { MethodVerificationNablListComponent } from './components/nabl/method-verification-nabl/method-verification-list/method-verification-list.component';
import { MethodVerificationNablFormComponent } from './components/nabl/method-verification-nabl/method-verification-form/method-verification-form.component';
import { MethodVerificationNablPreviewComponent } from './components/nabl/method-verification-nabl/method-verification-preview/method-verification-preview.component';
import { MethodValidationNablListComponent } from './components/nabl/method-validation-nabl/method-validation-list/method-validation-list.component';
import { MethodValidationNablFormComponent } from './components/nabl/method-validation-nabl/method-validation-form/method-validation-form.component';
import { MethodValidationNablPreviewComponent } from './components/nabl/method-validation-nabl/method-validation-preview/method-validation-preview.component';
import { SampleInwardRegisterNablListComponent } from './components/nabl/sample-inward-register-nabl/sample-inward-register-list/sample-inward-register-list.component';
import { SampleInwardRegisterNablFormComponent } from './components/nabl/sample-inward-register-nabl/sample-inward-register-form/sample-inward-register-form.component';
import { SampleInwardRegisterNablPreviewComponent } from './components/nabl/sample-inward-register-nabl/sample-inward-register-preview/sample-inward-register-preview.component';
import { SampleMusterRegisterNablListComponent } from './components/nabl/sample-muster-register-nabl/sample-muster-register-list/sample-muster-register-list.component';
import { SampleMusterRegisterNablFormComponent } from './components/nabl/sample-muster-register-nabl/sample-muster-register-form/sample-muster-register-form.component';
import { SampleMusterRegisterNablPreviewComponent } from './components/nabl/sample-muster-register-nabl/sample-muster-register-preview/sample-muster-register-preview.component';
import { SampleLabelNablListComponent } from './components/nabl/sample-label-nabl/sample-label-list/sample-label-list.component';
import { SampleLabelNablFormComponent } from './components/nabl/sample-label-nabl/sample-label-form/sample-label-form.component';
import { SampleLabelNablPreviewComponent } from './components/nabl/sample-label-nabl/sample-label-preview/sample-label-preview.component';
import { TechnicalRawDataListComponent } from './components/nabl/technical-raw-data-nabl/technical-raw-data-list/technical-raw-data-list.component';
import { TechnicalRawDataFormComponent } from './components/nabl/technical-raw-data-nabl/technical-raw-data-form/technical-raw-data-form.component';
import { TechnicalRawDataPreviewComponent } from './components/nabl/technical-raw-data-nabl/technical-raw-data-preview/technical-raw-data-preview.component';
// Removed direct imports for lazy loading





export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    // Public route — QR code scan opens this (no auth required)
    { path: 'report/verify/:reportNo', loadComponent: () => import('./components/report/report-verify/report-verify.component').then(m => m.ReportVerifyComponent) },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', component: MainDashboardComponent }, // Default route - main dashboard
            { path: 'designation', component: ListDesignationComponent },
            { path: 'designation/create', component: DesignationFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'designation/edit/:id', component: DesignationFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'designation/details/:id', component: DesignationFormComponent },
            { path: 'file-upload', component: FileUploadComponent },
            { path: 'employee', component: EmployeeListComponent },
            { path: 'employee/create', component: EmployeeFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'employee/edit/:id', component: EmployeeFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'employee/details/:id', component: EmployeeFormComponent },
            { path: 'department', component: DepartmentListComponent },
            { path: 'department/create', component: DepartmentFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'department/edit/:id', component: DepartmentFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'department/details/:id', component: DepartmentFormComponent },
            { path: 'company-category', component: CompanyCategoryComponent },
            { path: 'customer', component: CustomerListComponent },
            { path: 'customer/create', component: CustomerFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'customer/edit/:id', component: CustomerFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'customer/details/:id', component: CustomerFormComponent },
            { path: 'tax', component: TaxComponent },
            { path: 'test', component: LaboratoryTestListComponent },
            { path: 'test/create', component: LaboratoryTestComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'test/edit/:id', component: LaboratoryTestComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'test/details/:id', component: LaboratoryTestComponent },
            { path: 'bank', component: BankComponent },
            { path: 'courier', component: CourierComponent },
            { path: 'product-size-master', loadComponent: () => import('./components/product-size-master/product-size-master.component').then(m => m.ProductSizeMasterComponent) },
            { path: 'chemical-sample-category', loadComponent: () => import('./components/chemical-sample-category/chemical-sample-category.component').then(m => m.ChemicalSampleCategoryComponent) },
            { path: 'analysis-technique', loadComponent: () => import('./components/analysis-technique/analysis-technique.component').then(m => m.AnalysisTechniqueComponent) },
            { path: 'tpi', component: TPIComponent },
            { path: 'tpi-inspection', loadComponent: () => import('./components/tpi/tpi-inspection/tpi-inspection-list.component').then(m => m.TpiInspectionListComponent) },
            { path: 'tpi-inspection/create', loadComponent: () => import('./components/tpi/tpi-inspection/tpi-inspection-form/tpi-inspection-form.component').then(m => m.TpiInspectionFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'tpi-inspection/details/:id', loadComponent: () => import('./components/tpi/tpi-inspection/tpi-inspection-form/tpi-inspection-form.component').then(m => m.TpiInspectionFormComponent) },
            { path: 'dimesional-factor', component: DimensionalFactorComponent },
            { path: 'heat-treatment', component: HeatTreatmentComponent },
            { path: 'heat-treatment-category', component: HeatTreatmentCategoryComponent },
            { path: 'cooling-medium', component: CoolingMediumComponent },
            { path: 'parameter-category', component: ParameterCategoryComponent },
            { path: 'product-form', component: ProductFormComponent },
            { path: 'specimen-orientation-category', component: SpecimenOrientationCategoryComponent },
            { path: 'product-condition-category', component: ProductConditionCategoryComponent },
            { path: 'property-type', component: PropertyTypeComponent },
            { path: 'product-condition', component: ProductConditionComponent },
            { path: 'product-master', loadComponent: () => import('./components/product-master/product-master-list.component').then(m => m.ProductMasterListComponent) },
            { path: 'product-master/create', loadComponent: () => import('./components/product-master/product-master-form.component').then(m => m.ProductMasterFormComponent), canDeactivate: [unsavedChangesGuard] },
            { path: 'product-master/edit/:id', loadComponent: () => import('./components/product-master/product-master-form.component').then(m => m.ProductMasterFormComponent), canDeactivate: [unsavedChangesGuard] },
            { path: 'product-master/details/:id', loadComponent: () => import('./components/product-master/product-master-form.component').then(m => m.ProductMasterFormComponent) },
            { path: 'specimen-orientation', component: SpecimenOrientationComponent },
            { path: 'chemical-parameter', component: ChemicalParameterComponent },
            { path: 'mechanical-parameter', component: MechanicalParameterComponent },
            { path: 'job-description', component: JobDescriptionListComponent },
            { path: 'job-description/create', component: JobDescriptionFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'job-description/edit/:id', component: JobDescriptionFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'job-description/details/:id', component: JobDescriptionFormComponent },
            { path: 'job-description/preview/:id', component: JobDescriptionPreviewComponent },
            { path: 'employee/impartiality-agreement/:id', component: ImpartialityAgreementPreviewComponent },
            { path: 'employee/competence-report/:id', component: EmployeeCompetencePreviewComponent, data: { mode: 'employee-report' } },
            { path: 'employee/training-record/:id', component: EmployeeTrainingPreviewComponent, data: { mode: 'employee-report' } },
            { path: 'employee/equipment-authorization', component: EmployeeAuthorizationPreviewComponent },
            { path: 'employee/equipment-authorization/list', loadComponent: () => import('./components/nabl/employee-authorization-list/employee-authorization-list.component').then(m => m.EmployeeAuthorizationListComponent) },
            { path: 'employee/equipment-authorization/create', loadComponent: () => import('./components/nabl/employee-authorization-form/employee-authorization-form.component').then(m => m.EmployeeAuthorizationFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'employee/equipment-authorization/edit/:id', loadComponent: () => import('./components/nabl/employee-authorization-form/employee-authorization-form.component').then(m => m.EmployeeAuthorizationFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'employee/equipment-authorization/details/:id', loadComponent: () => import('./components/nabl/employee-authorization-form/employee-authorization-form.component').then(m => m.EmployeeAuthorizationFormComponent) },

            { path: 'employee/competence', loadComponent: () => import('./components/nabl/employee-competence-list/employee-competence-list.component').then(m => m.EmployeeCompetenceListComponent) },
            { path: 'employee/competence/create', loadComponent: () => import('./components/nabl/employee-competence-form/employee-competence-form.component').then(m => m.EmployeeCompetenceFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'employee/competence/edit/:id', loadComponent: () => import('./components/nabl/employee-competence-form/employee-competence-form.component').then(m => m.EmployeeCompetenceFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'employee/competence/details/:id', loadComponent: () => import('./components/nabl/employee-competence-form/employee-competence-form.component').then(m => m.EmployeeCompetenceFormComponent) },
            { path: 'employee/competence/preview/:id', loadComponent: () => import('./components/nabl/employee-competence-preview/employee-competence-preview.component').then(m => m.EmployeeCompetencePreviewComponent) },
            { path: 'employee/skill-matrix', component: SkillMatrixPreviewComponent },
            { path: 'skill-matrix', component: SkillMatrixListComponent },
            { path: 'skill-matrix/create', component: SkillMatrixFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'skill-matrix/details/:id', component: SkillMatrixFormComponent },
            { path: 'skill-matrix/edit/:id', component: SkillMatrixFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'skill-matrix/preview/:id', component: SkillMatrixPreviewComponent },
            { path: 'responsibility-authority', component: ResponsibilityAuthorityListComponent },
            { path: 'responsibility-authority/create', component: ResponsibilityAuthorityFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'responsibility-authority/edit/:id', component: ResponsibilityAuthorityFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'responsibility-authority/details/:id', component: ResponsibilityAuthorityFormComponent },
            { path: 'responsibility-authority/preview/:id', component: ResponsibilityAuthorityPreviewComponent },
            { path: 'competence-requirement', loadComponent: () => import('./components/nabl/competence-requirement-list/competence-requirement-list.component').then(m => m.CompetenceRequirementListComponent) },
            { path: 'competence-requirement/create', loadComponent: () => import('./components/nabl/competence-requirement-form/competence-requirement-form.component').then(m => m.CompetenceRequirementFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'competence-requirement/edit/:id', loadComponent: () => import('./components/nabl/competence-requirement-form/competence-requirement-form.component').then(m => m.CompetenceRequirementFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'competence-requirement/details/:id', loadComponent: () => import('./components/nabl/competence-requirement-form/competence-requirement-form.component').then(m => m.CompetenceRequirementFormComponent) },
            { path: 'competence-requirement/preview/:id', loadComponent: () => import('./components/nabl/competence-requirement-preview/competence-requirement-preview.component').then(m => m.CompetenceRequirementPreviewComponent) },

            { path: 'induction-training', loadComponent: () => import('./components/nabl/induction-training-list/induction-training-list.component').then(m => m.InductionTrainingListComponent) },
            { path: 'induction-training/create', loadComponent: () => import('./components/nabl/induction-training-form/induction-training-form.component').then(m => m.InductionTrainingFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'induction-training/edit/:id', loadComponent: () => import('./components/nabl/induction-training-form/induction-training-form.component').then(m => m.InductionTrainingFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'induction-training/details/:id', loadComponent: () => import('./components/nabl/induction-training-form/induction-training-form.component').then(m => m.InductionTrainingFormComponent) },
            { path: 'induction-training/preview/:id', loadComponent: () => import('./components/nabl/induction-training-preview/induction-training-preview.component').then(m => m.InductionTrainingPreviewComponent) },


            // Training Plan Routes (F-8)
            { path: 'training-plan', component: TrainingPlanListComponent },
            { path: 'training-plan/create', component: TrainingPlanFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'training-plan/edit/:id', component: TrainingPlanFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'training-plan/details/:id', component: TrainingPlanFormComponent },
            { path: 'training-plan/preview/:id', component: TrainingPlanPreviewComponent },
            // Supplier Evaluation Record (F-26)
            { path: 'supplier-evaluation', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-list/supplier-evaluation-record-list.component').then(m => m.SupplierEvaluationRecordListComponent) },
            { path: 'supplier-evaluation/create', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-form/supplier-evaluation-record-form.component').then(m => m.SupplierEvaluationRecordFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-evaluation/edit/:id', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-form/supplier-evaluation-record-form.component').then(m => m.SupplierEvaluationRecordFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-evaluation/details/:id', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-form/supplier-evaluation-record-form.component').then(m => m.SupplierEvaluationRecordFormComponent) },
            { path: 'supplier-evaluation/preview/:id', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-preview/supplier-evaluation-record-preview.component').then(m => m.SupplierEvaluationRecordPreviewComponent) },
            // Test Request & Sample Receipt (F-27)
            { path: 'nabl/test-request', component: TestRequestNablListComponent },
            { path: 'nabl/test-request/create', component: TestRequestNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/test-request/edit/:id', component: TestRequestNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/test-request/details/:id', component: TestRequestNablFormComponent },
            { path: 'nabl/test-request/preview/:id', component: TestRequestNablPreviewComponent },
            // F-28: List of Test Methods & External Documents
            { path: 'nabl/test-method', component: TestMethodNablListComponent },
            { path: 'nabl/test-method/create', component: TestMethodNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/test-method/edit/:id', component: TestMethodNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/test-method/details/:id', component: TestMethodNablFormComponent },
            { path: 'nabl/test-method/preview/:id', component: TestMethodNablPreviewComponent },
            // F-29: Method Verification Records
            { path: 'nabl/method-verification', component: MethodVerificationNablListComponent },
            { path: 'nabl/method-verification/create', component: MethodVerificationNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/method-verification/edit/:id', component: MethodVerificationNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/method-verification/details/:id', component: MethodVerificationNablFormComponent },
            { path: 'nabl/method-verification/preview/:id', component: MethodVerificationNablPreviewComponent },
            // F-30: Method Validation Records
            { path: 'nabl/method-validation', component: MethodValidationNablListComponent },
            { path: 'nabl/method-validation/create', component: MethodValidationNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/method-validation/edit/:id', component: MethodValidationNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/method-validation/details/:id', component: MethodValidationNablFormComponent },
            { path: 'nabl/method-validation/preview/:id', component: MethodValidationNablPreviewComponent },
            // F-31: Sample Inward Register
            { path: 'nabl/sample-inward-register', component: SampleInwardRegisterNablListComponent },
            { path: 'nabl/sample-inward-register/create', component: SampleInwardRegisterNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/sample-inward-register/edit/:id', component: SampleInwardRegisterNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/sample-inward-register/details/:id', component: SampleInwardRegisterNablFormComponent },
            { path: 'nabl/sample-inward-register/preview/:id', component: SampleInwardRegisterNablPreviewComponent },
            // F-32: Sample Muster Register
            { path: 'nabl/sample-muster-register', component: SampleMusterRegisterNablListComponent },
            { path: 'nabl/sample-muster-register/create', component: SampleMusterRegisterNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/sample-muster-register/edit/:id', component: SampleMusterRegisterNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/sample-muster-register/details/:id', component: SampleMusterRegisterNablFormComponent },
            { path: 'nabl/sample-muster-register/preview/:id', component: SampleMusterRegisterNablPreviewComponent },
            // F-33: Sample Label
            { path: 'nabl/sample-label', component: SampleLabelNablListComponent },
            { path: 'nabl/sample-label/create', component: SampleLabelNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/sample-label/edit/:id', component: SampleLabelNablFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/sample-label/details/:id', component: SampleLabelNablFormComponent },
            { path: 'nabl/sample-label/preview/:id', component: SampleLabelNablPreviewComponent },
            // F-34: Technical Raw Data
            { path: 'nabl/technical-raw-data', component: TechnicalRawDataListComponent },
            { path: 'nabl/technical-raw-data/create', component: TechnicalRawDataFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/technical-raw-data/edit/:id', component: TechnicalRawDataFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'nabl/technical-raw-data/details/:id', component: TechnicalRawDataFormComponent },
            { path: 'nabl/technical-raw-data/preview/:id', component: TechnicalRawDataPreviewComponent },
            // Training Effectiveness Routes (F-10)
            { path: 'training-effectiveness', component: TrainingEffectivenessListComponent },
            { path: 'training-effectiveness/create', component: TrainingEffectivenessFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'training-effectiveness/edit/:id', component: TrainingEffectivenessFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'training-effectiveness/details/:id', component: TrainingEffectivenessFormComponent },
            { path: 'training-effectiveness/preview/:id', component: TrainingEffectivenessPreviewComponent },
            // Training Attendance Routes (F-9)
            { path: 'training-attendance', loadComponent: () => import('./components/training/training-attendance/training-attendance-list.component').then(m => m.TrainingAttendanceListComponent) },
            { path: 'training-attendance/create', loadComponent: () => import('./components/training/training-attendance/training-attendance-form.component').then(m => m.TrainingAttendanceFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'training-attendance/edit/:id', loadComponent: () => import('./components/training/training-attendance/training-attendance-form.component').then(m => m.TrainingAttendanceFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'training-attendance/details/:id', loadComponent: () => import('./components/training/training-attendance/training-attendance-form.component').then(m => m.TrainingAttendanceFormComponent) },
            { path: 'training-attendance/preview/:id', loadComponent: () => import('./components/training/training-attendance/training-attendance-preview.component').then(m => m.TrainingAttendancePreviewComponent) },
            // Environment Monitoring Routes (F-12)
            { path: 'environment-monitoring', component: EnvironmentMonitoringListComponent },
            { path: 'environment-monitoring/create', component: EnvironmentMonitoringFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'environment-monitoring/edit/:id', component: EnvironmentMonitoringFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'environment-monitoring/details/:id', component: EnvironmentMonitoringFormComponent },
            { path: 'environment-monitoring/preview/:id', component: EnvironmentMonitoringPreviewComponent },
            { path: 'standard-organization', component: StandardOrgnizationComponent },
            { path: 'universal-code-type', component: UniversalCodeTypeComponent },
            { path: 'material-specification', component: MaterialSpecificationListComponent },
            { path: 'material-specification/create', component: MaterialSpecificationFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'material-specification/edit/:id', component: MaterialSpecificationFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'material-specification/details/:id', component: MaterialSpecificationFormComponent },
            { path: 'custom-material-specification', component: CustomMaterialSpecificationListComponent },
            { path: 'custom-material-specification/create', component: CustomMaterialSpecificationFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'custom-material-specification/edit/:id', component: CustomMaterialSpecificationFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'custom-material-specification/details/:id', component: CustomMaterialSpecificationFormComponent },
            { path: 'metal-classification', component: MetalClassificationComponent },
            { path: 'tolerance-master', component: ToleranceMasterComponent },
            { path: 'hardness-equivalence', component: HardnessEquivalenceComponent },
            { path: 'parameter-unit', component: ParameterUnitComponent },
            { path: 'supplier', component: SupplierListComponent },
            { path: 'supplier/create', component: SupplierFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier/edit/:id', component: SupplierFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier/details/:id', component: SupplierFormComponent },
            { path: 'test-specification', component: TestMethodSpecificationListComponent },
            { path: 'test-specification/create', component: TestMethodSpecificationComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'test-specification/edit/:id', component: TestMethodSpecificationComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'test-specification/details/:id', component: TestMethodSpecificationComponent },
            { path: 'scope', component: ScopeListComponent },
            { path: 'scope/create', component: ScopeComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'scope/edit/:id', component: ScopeComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'scope/details/:id', component: ScopeComponent },
            { path: 'oem', component: OemListComponent },
            { path: 'oem/create', component: OEMFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'oem/edit/:id', component: OEMFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'oem/details/:id', component: OEMFormComponent },
            { path: 'equipment', component: EquipmentListComponent },
            { path: 'equipment/create', component: EquipmentFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'equipment/edit/:id', component: EquipmentFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'equipment/details/:id', component: EquipmentFormComponent },
            { path: 'invoice-case-config', component: InvoiceCaseConfigurationsComponent },
            { path: 'master/price-dimension-type', loadComponent: () => import('./components/test/price-dimension-type/price-dimension-type.component').then(m => m.PriceDimensionTypeComponent) },
            { path: 'invoice-case', component: InvoiceCaseListComponent },
            { path: 'invoice-case/create', component: InvoiceCaseComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'invoice-case/edit/:id', component: InvoiceCaseComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'invoice-case/details/:id', component: InvoiceCaseComponent },
            { path: 'calibration-agency', component: CalibrationAgencyComponent },
            { path: 'calibration-agency/create', component: CalibrationAgencyFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'calibration-agency/edit/:id', component: CalibrationAgencyFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'calibration-agency/details/:id', component: CalibrationAgencyFormComponent },
            // Equipment History Card Routes (F-14)
            { path: 'equipment-history-card', loadComponent: () => import('./components/equipment/equipment-history-card/equipment-history-list.component').then(m => m.EquipmentHistoryListComponent) },
            { path: 'equipment-history-card/create', loadComponent: () => import('./components/equipment/equipment-history-card/equipment-history-form.component').then(m => m.EquipmentHistoryFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'equipment-history-card/edit/:id', loadComponent: () => import('./components/equipment/equipment-history-card/equipment-history-form.component').then(m => m.EquipmentHistoryFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'equipment-history-card/details/:id', loadComponent: () => import('./components/equipment/equipment-history-card/equipment-history-form.component').then(m => m.EquipmentHistoryFormComponent) },
            { path: 'equipment-history-card/preview/:id', loadComponent: () => import('./components/equipment/equipment-history-card/equipment-history-preview.component').then(m => m.EquipmentHistoryPreviewComponent) },
            // Supplier Confidentiality Agreement Routes (F-2)
            { path: 'supplier-confidentiality-agreement', loadComponent: () => import('./components/nabl/supplier-confidentiality/supplier-confidentiality-list.component').then(m => m.SupplierConfidentialityListComponent) },
            { path: 'supplier-confidentiality-agreement/create', loadComponent: () => import('./components/nabl/supplier-confidentiality/supplier-confidentiality-form.component').then(m => m.SupplierConfidentialityFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-confidentiality-agreement/edit/:id', loadComponent: () => import('./components/nabl/supplier-confidentiality/supplier-confidentiality-form.component').then(m => m.SupplierConfidentialityFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-confidentiality-agreement/details/:id', loadComponent: () => import('./components/nabl/supplier-confidentiality/supplier-confidentiality-form.component').then(m => m.SupplierConfidentialityFormComponent) },
            { path: 'supplier-confidentiality-agreement/preview/:id', loadComponent: () => import('./components/nabl/supplier-confidentiality/supplier-confidentiality-preview.component').then(m => m.SupplierConfidentialityPreviewComponent) },
            // Calibration Review Routes (F-15)
            { path: 'calibration-review', loadComponent: () => import('./components/equipment/calibration-review/calibration-review-list.component').then(m => m.CalibrationReviewListComponent) },
            { path: 'calibration-review/create', loadComponent: () => import('./components/equipment/calibration-review/calibration-review-form.component').then(m => m.CalibrationReviewFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'calibration-review/edit/:id', loadComponent: () => import('./components/equipment/calibration-review/calibration-review-form.component').then(m => m.CalibrationReviewFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'calibration-review/details/:id', loadComponent: () => import('./components/equipment/calibration-review/calibration-review-form.component').then(m => m.CalibrationReviewFormComponent) },
            { path: 'calibration-review/preview/:id', loadComponent: () => import('./components/equipment/calibration-review/calibration-review-preview.component').then(m => m.CalibrationReviewPreviewComponent) },
            // Intermediate Check Records Routes (F-16)
            { path: 'intermediate-check-records', loadComponent: () => import('./components/nabl/intermediate-check/intermediate-check-list.component').then(m => m.IntermediateCheckListComponent) },
            { path: 'intermediate-check-records/create', loadComponent: () => import('./components/nabl/intermediate-check/intermediate-check-form.component').then(m => m.IntermediateCheckFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'intermediate-check-records/edit/:id', loadComponent: () => import('./components/nabl/intermediate-check/intermediate-check-form.component').then(m => m.IntermediateCheckFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'intermediate-check-records/details/:id', loadComponent: () => import('./components/nabl/intermediate-check/intermediate-check-form.component').then(m => m.IntermediateCheckFormComponent) },
            { path: 'intermediate-check-records/preview/:id', loadComponent: () => import('./components/nabl/intermediate-check/intermediate-check-preview.component').then(m => m.IntermediateCheckPreviewComponent) },
            // Reference Material list Routes (F-17)
            { path: 'reference-material', loadComponent: () => import('./components/nabl/reference-material/reference-material-list.component').then(m => m.ReferenceMaterialListComponent) },
            { path: 'reference-material/create', loadComponent: () => import('./components/nabl/reference-material/reference-material-form.component').then(m => m.ReferenceMaterialFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'reference-material/edit/:id', loadComponent: () => import('./components/nabl/reference-material/reference-material-form.component').then(m => m.ReferenceMaterialFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'reference-material/details/:id', loadComponent: () => import('./components/nabl/reference-material/reference-material-form.component').then(m => m.ReferenceMaterialFormComponent) },
            { path: 'reference-material/preview/:id', loadComponent: () => import('./components/nabl/reference-material/reference-material-preview.component').then(m => m.ReferenceMaterialPreviewComponent) },
            // Reference Material Consumption Routes (F-18)
            { path: 'reference-material-consumption', loadComponent: () => import('./components/nabl/crm-consumption/crm-consumption-list.component').then(m => m.CrmConsumptionListComponent) },
            { path: 'reference-material-consumption/create', loadComponent: () => import('./components/nabl/crm-consumption/crm-consumption-form.component').then(m => m.CrmConsumptionFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'reference-material-consumption/edit/:id', loadComponent: () => import('./components/nabl/crm-consumption/crm-consumption-form.component').then(m => m.CrmConsumptionFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'reference-material-consumption/details/:id', loadComponent: () => import('./components/nabl/crm-consumption/crm-consumption-form.component').then(m => m.CrmConsumptionFormComponent) },
            { path: 'reference-material-consumption/preview/:id', loadComponent: () => import('./components/nabl/crm-consumption/crm-consumption-preview.component').then(m => m.CrmConsumptionPreviewComponent) },
            // Supplier Registration (F-19)
            { path: 'supplier-registration', loadComponent: () => import('./components/nabl/supplier-registration/supplier-registration-list.component').then(m => m.SupplierRegistrationListComponent) },
            { path: 'supplier-registration/create', loadComponent: () => import('./components/nabl/supplier-registration/supplier-registration-form.component').then(m => m.SupplierRegistrationFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-registration/edit/:id', loadComponent: () => import('./components/nabl/supplier-registration/supplier-registration-form.component').then(m => m.SupplierRegistrationFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-registration/details/:id', loadComponent: () => import('./components/nabl/supplier-registration/supplier-registration-form.component').then(m => m.SupplierRegistrationFormComponent) },
            { path: 'supplier-registration/preview/:id', loadComponent: () => import('./components/nabl/supplier-registration/supplier-registration-preview.component').then(m => m.SupplierRegistrationPreviewComponent) },
            // Approved List of Suppliers (F-20)
            { path: 'approved-supplier', loadComponent: () => import('./components/nabl/approved-supplier-list/approved-supplier-list.component').then(m => m.ApprovedSupplierListComponent) },
            { path: 'approved-supplier/create', loadComponent: () => import('./components/nabl/approved-supplier-form/approved-supplier-form.component').then(m => m.ApprovedSupplierFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'approved-supplier/edit/:id', loadComponent: () => import('./components/nabl/approved-supplier-form/approved-supplier-form.component').then(m => m.ApprovedSupplierFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'approved-supplier/details/:id', loadComponent: () => import('./components/nabl/approved-supplier-form/approved-supplier-form.component').then(m => m.ApprovedSupplierFormComponent) },
            { path: 'approved-supplier/preview/:id', loadComponent: () => import('./components/nabl/approved-supplier-preview/approved-supplier-preview.component').then(m => m.ApprovedSupplierPreviewComponent) },
            // Purchase Indent / Request Routes (F-21)
            { path: 'purchase-indent', loadComponent: () => import('./components/nabl/purchase-indent-list/purchase-indent-list.component').then(m => m.PurchaseIndentListComponent) },
            { path: 'purchase-indent/create', loadComponent: () => import('./components/nabl/purchase-indent-form/purchase-indent-form.component').then(m => m.PurchaseIndentFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'purchase-indent/edit/:id', loadComponent: () => import('./components/nabl/purchase-indent-form/purchase-indent-form.component').then(m => m.PurchaseIndentFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'purchase-indent/details/:id', loadComponent: () => import('./components/nabl/purchase-indent-form/purchase-indent-form.component').then(m => m.PurchaseIndentFormComponent) },
            { path: 'purchase-indent/preview/:id', loadComponent: () => import('./components/nabl/purchase-indent-preview/purchase-indent-preview.component').then(m => m.PurchaseIndentPreviewComponent) },
            // Purchase Order Routes (F-22)
            { path: 'purchase-order', loadComponent: () => import('./components/nabl/purchase-order-list/purchase-order-list.component').then(m => m.PurchaseOrderListComponent) },
            { path: 'purchase-order/create', loadComponent: () => import('./components/nabl/purchase-order-form/purchase-order-form.component').then(m => m.PurchaseOrderFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'purchase-order/edit/:id', loadComponent: () => import('./components/nabl/purchase-order-form/purchase-order-form.component').then(m => m.PurchaseOrderFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'purchase-order/details/:id', loadComponent: () => import('./components/nabl/purchase-order-form/purchase-order-form.component').then(m => m.PurchaseOrderFormComponent) },
            { path: 'purchase-order/preview/:id', loadComponent: () => import('./components/nabl/purchase-order-preview/purchase-order-preview.component').then(m => m.PurchaseOrderPreviewComponent) },
            // Product & Service Inspection Plan Routes (F-23)
            { path: 'product-inspection', loadComponent: () => import('./components/nabl/product-inspection-list/product-inspection-list.component').then(m => m.ProductInspectionListComponent) },
            { path: 'product-inspection/create', loadComponent: () => import('./components/nabl/product-inspection-form/product-inspection-form.component').then(m => m.ProductInspectionFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'product-inspection/edit/:id', loadComponent: () => import('./components/nabl/product-inspection-form/product-inspection-form.component').then(m => m.ProductInspectionFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'product-inspection/details/:id', loadComponent: () => import('./components/nabl/product-inspection-form/product-inspection-form.component').then(m => m.ProductInspectionFormComponent) },
            { path: 'product-inspection/preview/:id', loadComponent: () => import('./components/nabl/product-inspection-preview/product-inspection-preview.component').then(m => m.ProductInspectionPreviewComponent) },
            // Incoming Material Inspection Record Routes (F-24)
            { path: 'incoming-material', loadComponent: () => import('./components/nabl/incoming-material-list/incoming-material-list.component').then(m => m.IncomingMaterialListComponent) },
            { path: 'incoming-material/create', loadComponent: () => import('./components/nabl/incoming-material-form/incoming-material-form.component').then(m => m.IncomingMaterialFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'incoming-material/edit/:id', loadComponent: () => import('./components/nabl/incoming-material-form/incoming-material-form.component').then(m => m.IncomingMaterialFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'incoming-material/details/:id', loadComponent: () => import('./components/nabl/incoming-material-form/incoming-material-form.component').then(m => m.IncomingMaterialFormComponent) },
            { path: 'incoming-material/preview/:id', loadComponent: () => import('./components/nabl/incoming-material-preview/incoming-material-preview.component').then(m => m.IncomingMaterialPreviewComponent) },
            // Purchase Material Verification Records (F-25)
            { path: 'purchase-material-verification', loadComponent: () => import('./components/nabl/purchase-material-verification/purchase-material-verification-list/purchase-material-verification-list.component').then(m => m.PurchaseMaterialVerificationListComponent) },
            { path: 'purchase-material-verification/create', loadComponent: () => import('./components/nabl/purchase-material-verification/purchase-material-verification-form/purchase-material-verification-form.component').then(m => m.PurchaseMaterialVerificationFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'purchase-material-verification/edit/:id', loadComponent: () => import('./components/nabl/purchase-material-verification/purchase-material-verification-form/purchase-material-verification-form.component').then(m => m.PurchaseMaterialVerificationFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'purchase-material-verification/details/:id', loadComponent: () => import('./components/nabl/purchase-material-verification/purchase-material-verification-form/purchase-material-verification-form.component').then(m => m.PurchaseMaterialVerificationFormComponent) },
            { path: 'purchase-material-verification/preview/:id', loadComponent: () => import('./components/nabl/purchase-material-verification/purchase-material-verification-preview/purchase-material-verification-preview.component').then(m => m.PurchaseMaterialVerificationPreviewComponent) },
            // Supplier Evaluation Record (F-26)
            { path: 'supplier-evaluation', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-list/supplier-evaluation-record-list.component').then(m => m.SupplierEvaluationRecordListComponent) },
            { path: 'supplier-evaluation/create', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-form/supplier-evaluation-record-form.component').then(m => m.SupplierEvaluationRecordFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-evaluation/edit/:id', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-form/supplier-evaluation-record-form.component').then(m => m.SupplierEvaluationRecordFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'supplier-evaluation/details/:id', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-form/supplier-evaluation-record-form.component').then(m => m.SupplierEvaluationRecordFormComponent) },
            { path: 'supplier-evaluation/preview/:id', loadComponent: () => import('./components/nabl/supplier-evaluation-record/supplier-evaluation-record-preview/supplier-evaluation-record-preview.component').then(m => m.SupplierEvaluationRecordPreviewComponent) },

            // F-35: Measurement of Uncertainty Records
            { path: 'measurement-uncertainty', loadComponent: () => import('./components/nabl/measurement-uncertainty-nabl/measurement-uncertainty-list/measurement-uncertainty-list.component').then(m => m.MeasurementUncertaintyListComponent) },
            { path: 'measurement-uncertainty/create', loadComponent: () => import('./components/nabl/measurement-uncertainty-nabl/measurement-uncertainty-form/measurement-uncertainty-form.component').then(m => m.MeasurementUncertaintyFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'measurement-uncertainty/edit/:id', loadComponent: () => import('./components/nabl/measurement-uncertainty-nabl/measurement-uncertainty-form/measurement-uncertainty-form.component').then(m => m.MeasurementUncertaintyFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'measurement-uncertainty/details/:id', loadComponent: () => import('./components/nabl/measurement-uncertainty-nabl/measurement-uncertainty-form/measurement-uncertainty-form.component').then(m => m.MeasurementUncertaintyFormComponent) },
            { path: 'measurement-uncertainty/preview/:id', loadComponent: () => import('./components/nabl/measurement-uncertainty-nabl/measurement-uncertainty-preview/measurement-uncertainty-preview.component').then(m => m.MeasurementUncertaintyPreviewComponent) },

            // F-36: PT / ILC Plan
            { path: 'pt-ilc-plan', loadComponent: () => import('./components/nabl/pt-ilc-plan-nabl/pt-ilc-plan-list/pt-ilc-plan-list.component').then(m => m.PtIlcPlanListComponent) },
            { path: 'pt-ilc-plan/create', loadComponent: () => import('./components/nabl/pt-ilc-plan-nabl/pt-ilc-plan-form/pt-ilc-plan-form.component').then(m => m.PtIlcPlanFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'pt-ilc-plan/edit/:id', loadComponent: () => import('./components/nabl/pt-ilc-plan-nabl/pt-ilc-plan-form/pt-ilc-plan-form.component').then(m => m.PtIlcPlanFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'pt-ilc-plan/details/:id', loadComponent: () => import('./components/nabl/pt-ilc-plan-nabl/pt-ilc-plan-form/pt-ilc-plan-form.component').then(m => m.PtIlcPlanFormComponent) },
            { path: 'pt-ilc-plan/preview/:id', loadComponent: () => import('./components/nabl/pt-ilc-plan-nabl/pt-ilc-plan-preview/pt-ilc-plan-preview.component').then(m => m.PtIlcPlanPreviewComponent) },

            // F-37: Quality Assurance / Control Plan
            { path: 'quality-control-plan', loadComponent: () => import('./components/nabl/quality-control-plan-nabl/quality-control-plan-list/quality-control-plan-list.component').then(m => m.QualityControlPlanListComponent) },
            { path: 'quality-control-plan/create', loadComponent: () => import('./components/nabl/quality-control-plan-nabl/quality-control-plan-form/quality-control-plan-form.component').then(m => m.QualityControlPlanFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'quality-control-plan/edit/:id', loadComponent: () => import('./components/nabl/quality-control-plan-nabl/quality-control-plan-form/quality-control-plan-form.component').then(m => m.QualityControlPlanFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'quality-control-plan/details/:id', loadComponent: () => import('./components/nabl/quality-control-plan-nabl/quality-control-plan-form/quality-control-plan-form.component').then(m => m.QualityControlPlanFormComponent) },
            { path: 'quality-control-plan/preview/:id', loadComponent: () => import('./components/nabl/quality-control-plan-nabl/quality-control-plan-preview/quality-control-plan-preview.component').then(m => m.QualityControlPlanPreviewComponent) },

            // F-38: Retesting of Retained Sample
            { path: 'retesting-retained-sample', loadComponent: () => import('./components/nabl/retesting-of-retained-sample-nabl/retesting-of-retained-sample-list/retesting-of-retained-sample-list.component').then(m => m.RetestingOfRetainedSampleListComponent) },
            { path: 'retesting-retained-sample/create', loadComponent: () => import('./components/nabl/retesting-of-retained-sample-nabl/retesting-of-retained-sample-form/retesting-of-retained-sample-form.component').then(m => m.RetestingOfRetainedSampleFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'retesting-retained-sample/edit/:id', loadComponent: () => import('./components/nabl/retesting-of-retained-sample-nabl/retesting-of-retained-sample-form/retesting-of-retained-sample-form.component').then(m => m.RetestingOfRetainedSampleFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'retesting-retained-sample/details/:id', loadComponent: () => import('./components/nabl/retesting-of-retained-sample-nabl/retesting-of-retained-sample-form/retesting-of-retained-sample-form.component').then(m => m.RetestingOfRetainedSampleFormComponent) },
            { path: 'retesting-retained-sample/preview/:id', loadComponent: () => import('./components/nabl/retesting-of-retained-sample-nabl/retesting-of-retained-sample-preview/retesting-of-retained-sample-preview.component').then(m => m.RetestingOfRetainedSamplePreviewComponent) },

            // F-39: Test Report
            { path: 'test-report', loadComponent: () => import('./components/nabl/test-report-nabl/test-report-list/test-report-list.component').then(m => m.TestReportListComponent) },
            { path: 'test-report/create', loadComponent: () => import('./components/nabl/test-report-nabl/test-report-form/test-report-form.component').then(m => m.TestReportFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'test-report/edit/:id', loadComponent: () => import('./components/nabl/test-report-nabl/test-report-form/test-report-form.component').then(m => m.TestReportFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'test-report/details/:id', loadComponent: () => import('./components/nabl/test-report-nabl/test-report-form/test-report-form.component').then(m => m.TestReportFormComponent) },
            { path: 'test-report/preview/:id', loadComponent: () => import('./components/nabl/test-report-nabl/test-report-preview/test-report-preview.component').then(m => m.TestReportPreviewComponent) },

            // F-40: Complaint Register
            { path: 'complaint-register', loadComponent: () => import('./components/nabl/complaint-register-nabl/complaint-list/complaint-list.component').then(m => m.ComplaintListComponent) },
            { path: 'complaint-register/create', loadComponent: () => import('./components/nabl/complaint-register-nabl/complaint-form/complaint-form.component').then(m => m.ComplaintFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'complaint-register/edit/:id', loadComponent: () => import('./components/nabl/complaint-register-nabl/complaint-form/complaint-form.component').then(m => m.ComplaintFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'complaint-register/details/:id', loadComponent: () => import('./components/nabl/complaint-register-nabl/complaint-form/complaint-form.component').then(m => m.ComplaintFormComponent) },
            { path: 'complaint-register/preview/:id', loadComponent: () => import('./components/nabl/complaint-register-nabl/complaint-preview/complaint-preview.component').then(m => m.ComplaintPreviewComponent) },

            // F-41: Non-Conforming Work Records
            { path: 'non-conforming-work', loadComponent: () => import('./components/nabl/non-conforming-work-nabl/non-conforming-work-list/non-conforming-work-list.component').then(m => m.NonConformingWorkListComponent) },
            { path: 'non-conforming-work/create', loadComponent: () => import('./components/nabl/non-conforming-work-nabl/non-conforming-work-form/non-conforming-work-form.component').then(m => m.NonConformingWorkFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'non-conforming-work/edit/:id', loadComponent: () => import('./components/nabl/non-conforming-work-nabl/non-conforming-work-form/non-conforming-work-form.component').then(m => m.NonConformingWorkFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'non-conforming-work/details/:id', loadComponent: () => import('./components/nabl/non-conforming-work-nabl/non-conforming-work-form/non-conforming-work-form.component').then(m => m.NonConformingWorkFormComponent) },
            { path: 'non-conforming-work/preview/:id', loadComponent: () => import('./components/nabl/non-conforming-work-nabl/non-conforming-work-preview/non-conforming-work-preview.component').then(m => m.NonConformingWorkPreviewComponent) },

            // F-42: NC & Corrective Action Report
            { path: 'nc-corrective-action', loadComponent: () => import('./components/nabl/nc-corrective-action-nabl/nc-corrective-action-list/nc-corrective-action-list.component').then(m => m.NcCorrectiveActionListComponent) },
            { path: 'nc-corrective-action/create', loadComponent: () => import('./components/nabl/nc-corrective-action-nabl/nc-corrective-action-form/nc-corrective-action-form.component').then(m => m.NcCorrectiveActionFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'nc-corrective-action/edit/:id', loadComponent: () => import('./components/nabl/nc-corrective-action-nabl/nc-corrective-action-form/nc-corrective-action-form.component').then(m => m.NcCorrectiveActionFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'nc-corrective-action/details/:id', loadComponent: () => import('./components/nabl/nc-corrective-action-nabl/nc-corrective-action-form/nc-corrective-action-form.component').then(m => m.NcCorrectiveActionFormComponent) },
            { path: 'nc-corrective-action/preview/:id', loadComponent: () => import('./components/nabl/nc-corrective-action-nabl/nc-corrective-action-preview/nc-corrective-action-preview.component').then(m => m.NcCorrectiveActionPreviewComponent) },

            // F-43: Master List of Documents
            { path: 'master-document', loadComponent: () => import('./components/nabl/master-document-nabl/master-document-list/master-document-list.component').then(m => m.MasterDocumentListComponent) },
            { path: 'master-document/create', loadComponent: () => import('./components/nabl/master-document-nabl/master-document-form/master-document-form.component').then(m => m.MasterDocumentFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'master-document/edit/:id', loadComponent: () => import('./components/nabl/master-document-nabl/master-document-form/master-document-form.component').then(m => m.MasterDocumentFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'master-document/details/:id', loadComponent: () => import('./components/nabl/master-document-nabl/master-document-form/master-document-form.component').then(m => m.MasterDocumentFormComponent) },
            { path: 'master-document/preview', loadComponent: () => import('./components/nabl/master-document-nabl/master-document-preview/master-document-preview.component').then(m => m.MasterDocumentPreviewComponent) },

            // F-44: Document Change Request Form
            { path: 'document-change-request', loadComponent: () => import('./components/nabl/document-change-request-nabl/document-change-request-list/document-change-request-list.component').then(m => m.DocumentChangeRequestListComponent) },
            { path: 'document-change-request/create', loadComponent: () => import('./components/nabl/document-change-request-nabl/document-change-request-form/document-change-request-form.component').then(m => m.DocumentChangeRequestFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'document-change-request/edit/:id', loadComponent: () => import('./components/nabl/document-change-request-nabl/document-change-request-form/document-change-request-form.component').then(m => m.DocumentChangeRequestFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'document-change-request/details/:id', loadComponent: () => import('./components/nabl/document-change-request-nabl/document-change-request-form/document-change-request-form.component').then(m => m.DocumentChangeRequestFormComponent) },
            { path: 'document-change-request/preview/:id', loadComponent: () => import('./components/nabl/document-change-request-nabl/document-change-request-preview/document-change-request-preview.component').then(m => m.DocumentChangeRequestPreviewComponent) },

            // F-45: Document Review Record
            { path: 'document-review', loadComponent: () => import('./components/nabl/document-review-nabl/document-review-list/document-review-list.component').then(m => m.DocumentReviewListComponent) },
            { path: 'document-review/create', loadComponent: () => import('./components/nabl/document-review-nabl/document-review-form/document-review-form.component').then(m => m.DocumentReviewFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'document-review/edit/:id', loadComponent: () => import('./components/nabl/document-review-nabl/document-review-form/document-review-form.component').then(m => m.DocumentReviewFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'document-review/details/:id', loadComponent: () => import('./components/nabl/document-review-nabl/document-review-form/document-review-form.component').then(m => m.DocumentReviewFormComponent) },
            { path: 'document-review/preview', loadComponent: () => import('./components/nabl/document-review-nabl/document-review-preview/document-review-preview.component').then(m => m.DocumentReviewPreviewComponent) },

            // F-46: Risk & Opportunity Assessment
            { path: 'risk-assessment', loadComponent: () => import('./components/nabl/risk-assessment-nabl/risk-assessment-list/risk-assessment-list.component').then(m => m.RiskAssessmentListComponent) },
            { path: 'risk-assessment/create', loadComponent: () => import('./components/nabl/risk-assessment-nabl/risk-assessment-form/risk-assessment-form.component').then(m => m.RiskAssessmentFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'risk-assessment/edit/:id', loadComponent: () => import('./components/nabl/risk-assessment-nabl/risk-assessment-form/risk-assessment-form.component').then(m => m.RiskAssessmentFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'risk-assessment/details/:id', loadComponent: () => import('./components/nabl/risk-assessment-nabl/risk-assessment-form/risk-assessment-form.component').then(m => m.RiskAssessmentFormComponent) },
            { path: 'risk-assessment/preview/:id', loadComponent: () => import('./components/nabl/risk-assessment-nabl/risk-assessment-preview/risk-assessment-preview.component').then(m => m.RiskAssessmentPreviewComponent) },

            // F-47: Customer Feedback Form
            { path: 'customer-feedback', loadComponent: () => import('./components/nabl/customer-feedback-nabl/customer-feedback-list/customer-feedback-list.component').then(m => m.CustomerFeedbackListComponent) },
            { path: 'customer-feedback/create', loadComponent: () => import('./components/nabl/customer-feedback-nabl/customer-feedback-form/customer-feedback-form.component').then(m => m.CustomerFeedbackFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'customer-feedback/edit/:id', loadComponent: () => import('./components/nabl/customer-feedback-nabl/customer-feedback-form/customer-feedback-form.component').then(m => m.CustomerFeedbackFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'customer-feedback/details/:id', loadComponent: () => import('./components/nabl/customer-feedback-nabl/customer-feedback-form/customer-feedback-form.component').then(m => m.CustomerFeedbackFormComponent) },
            { path: 'customer-feedback/preview/:id', loadComponent: () => import('./components/nabl/customer-feedback-nabl/customer-feedback-preview/customer-feedback-preview.component').then(m => m.CustomerFeedbackPreviewComponent) },

            // F-48: Customer Feedback Analysis
            { path: 'feedback-analysis', loadComponent: () => import('./components/nabl/feedback-analysis-nabl/feedback-analysis-list/feedback-analysis-list.component').then(m => m.FeedbackAnalysisListComponent) },
            { path: 'feedback-analysis/create', loadComponent: () => import('./components/nabl/feedback-analysis-nabl/feedback-analysis-form/feedback-analysis-form.component').then(m => m.FeedbackAnalysisFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'feedback-analysis/edit/:id', loadComponent: () => import('./components/nabl/feedback-analysis-nabl/feedback-analysis-form/feedback-analysis-form.component').then(m => m.FeedbackAnalysisFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'feedback-analysis/details/:id', loadComponent: () => import('./components/nabl/feedback-analysis-nabl/feedback-analysis-form/feedback-analysis-form.component').then(m => m.FeedbackAnalysisFormComponent) },
            { path: 'feedback-analysis/preview/:id', loadComponent: () => import('./components/nabl/feedback-analysis-nabl/feedback-analysis-preview/feedback-analysis-preview.component').then(m => m.FeedbackAnalysisPreviewComponent) },

            // F-49: Trained Internal Auditors List
            { path: 'internal-auditor', loadComponent: () => import('./components/nabl/internal-auditor-nabl/internal-auditor-list/internal-auditor-list.component').then(m => m.InternalAuditorListComponent) },
            { path: 'internal-auditor/create', loadComponent: () => import('./components/nabl/internal-auditor-nabl/internal-auditor-form/internal-auditor-form.component').then(m => m.InternalAuditorFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'internal-auditor/edit/:id', loadComponent: () => import('./components/nabl/internal-auditor-nabl/internal-auditor-form/internal-auditor-form.component').then(m => m.InternalAuditorFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'internal-auditor/details/:id', loadComponent: () => import('./components/nabl/internal-auditor-nabl/internal-auditor-form/internal-auditor-form.component').then(m => m.InternalAuditorFormComponent) },
            { path: 'internal-auditor/preview', loadComponent: () => import('./components/nabl/internal-auditor-nabl/internal-auditor-preview/internal-auditor-preview.component').then(m => m.InternalAuditorPreviewComponent) },

            // F-50: Audit Schedule & Plan
            { path: 'audit-plan', loadComponent: () => import('./components/nabl/audit-plan-nabl/audit-plan-list/audit-plan-list.component').then(m => m.AuditPlanListComponent) },
            { path: 'audit-plan/create', loadComponent: () => import('./components/nabl/audit-plan-nabl/audit-plan-form/audit-plan-form.component').then(m => m.AuditPlanFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'audit-plan/edit/:id', loadComponent: () => import('./components/nabl/audit-plan-nabl/audit-plan-form/audit-plan-form.component').then(m => m.AuditPlanFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'audit-plan/details/:id', loadComponent: () => import('./components/nabl/audit-plan-nabl/audit-plan-form/audit-plan-form.component').then(m => m.AuditPlanFormComponent) },
            { path: 'audit-plan/preview', loadComponent: () => import('./components/nabl/audit-plan-nabl/audit-plan-preview/audit-plan-preview.component').then(m => m.AuditPlanPreviewComponent) },

            // F-51: Audit Checklist & Observation
            { path: 'audit-checklist', loadComponent: () => import('./components/nabl/audit-checklist-nabl/audit-checklist-list/audit-checklist-list.component').then(m => m.AuditChecklistListComponent) },
            { path: 'audit-checklist/create', loadComponent: () => import('./components/nabl/audit-checklist-nabl/audit-checklist-form/audit-checklist-form.component').then(m => m.AuditChecklistFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'audit-checklist/edit/:id', loadComponent: () => import('./components/nabl/audit-checklist-nabl/audit-checklist-form/audit-checklist-form.component').then(m => m.AuditChecklistFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'audit-checklist/details/:id', loadComponent: () => import('./components/nabl/audit-checklist-nabl/audit-checklist-form/audit-checklist-form.component').then(m => m.AuditChecklistFormComponent) },
            { path: 'audit-checklist/preview/:id', loadComponent: () => import('./components/nabl/audit-checklist-nabl/audit-checklist-preview/audit-checklist-preview.component').then(m => m.AuditChecklistPreviewComponent) },

            // F-52: Audit Summary Report
            { path: 'audit-summary', loadComponent: () => import('./components/nabl/audit-summary-nabl/audit-summary-list/audit-summary-list.component').then(m => m.AuditSummaryListComponent) },
            { path: 'audit-summary/create', loadComponent: () => import('./components/nabl/audit-summary-nabl/audit-summary-form/audit-summary-form.component').then(m => m.AuditSummaryFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'audit-summary/edit/:id', loadComponent: () => import('./components/nabl/audit-summary-nabl/audit-summary-form/audit-summary-form.component').then(m => m.AuditSummaryFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'audit-summary/details/:id', loadComponent: () => import('./components/nabl/audit-summary-nabl/audit-summary-form/audit-summary-form.component').then(m => m.AuditSummaryFormComponent) },
            { path: 'audit-summary/preview/:id', loadComponent: () => import('./components/nabl/audit-summary-nabl/audit-summary-preview/audit-summary-preview.component').then(m => m.AuditSummaryPreviewComponent) },

            // F-53: Meeting Notice / Agenda for MRM
            { path: 'meeting-agenda', loadComponent: () => import('./components/nabl/meeting-agenda-nabl/meeting-agenda-list/meeting-agenda-list.component').then(m => m.MeetingAgendaListComponent) },
            { path: 'meeting-agenda/create', loadComponent: () => import('./components/nabl/meeting-agenda-nabl/meeting-agenda-form/meeting-agenda-form.component').then(m => m.MeetingAgendaFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'meeting-agenda/edit/:id', loadComponent: () => import('./components/nabl/meeting-agenda-nabl/meeting-agenda-form/meeting-agenda-form.component').then(m => m.MeetingAgendaFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'meeting-agenda/details/:id', loadComponent: () => import('./components/nabl/meeting-agenda-nabl/meeting-agenda-form/meeting-agenda-form.component').then(m => m.MeetingAgendaFormComponent) },
            { path: 'meeting-agenda/preview/:id', loadComponent: () => import('./components/nabl/meeting-agenda-nabl/meeting-agenda-preview/meeting-agenda-preview.component').then(m => m.MeetingAgendaPreviewComponent) },

            // F-54: Minutes of Management Review Meeting
            { path: 'meeting-minutes', loadComponent: () => import('./components/nabl/meeting-minutes-nabl/meeting-minutes-list/meeting-minutes-list.component').then(m => m.MeetingMinutesListComponent) },
            { path: 'meeting-minutes/create', loadComponent: () => import('./components/nabl/meeting-minutes-nabl/meeting-minutes-form/meeting-minutes-form.component').then(m => m.MeetingMinutesFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'meeting-minutes/edit/:id', loadComponent: () => import('./components/nabl/meeting-minutes-nabl/meeting-minutes-form/meeting-minutes-form.component').then(m => m.MeetingMinutesFormComponent) , canDeactivate: [unsavedChangesGuard]},
            { path: 'meeting-minutes/details/:id', loadComponent: () => import('./components/nabl/meeting-minutes-nabl/meeting-minutes-form/meeting-minutes-form.component').then(m => m.MeetingMinutesFormComponent) },
            { path: 'meeting-minutes/preview/:id', loadComponent: () => import('./components/nabl/meeting-minutes-nabl/meeting-minutes-preview/meeting-minutes-preview.component').then(m => m.MeetingMinutesPreviewComponent) },

            // Training Effectiveness Routes (F-10)
            { path: 'cutting-price-master', component: CuttingPriceMasterComponent },
            { path: 'machining-charge-master', loadComponent: () => import('./components/sample-prepration/machining-charge-master/machining-charge-master.component').then(m => m.MachiningChargeMasterComponent) },
            { path: 'sample-preparation-master', loadComponent: () => import('./components/sample-prepration/sample-preparation-master/sample-preparation-master.component').then(m => m.SamplePreparationMasterComponent) },
            { path: 'sample/prepration', component: CuttingSamplesComponent },
            // Old cutting/machining routes — replaced by unified /sample/preparation
            // { path: 'sample/cutting', component: CuttingSamplesComponent },
            // { path: 'sample/cutting/raw-format', loadComponent: () => import('./components/sample-prepration/sample-cutting-raw-format/sample-cutting-raw-format.component').then(m => m.SampleCuttingRawFormatComponent) },
            // { path: 'sample/cutting/create/:id', component: CuttingSampleFormComponent , canDeactivate: [unsavedChangesGuard]},
            // { path: 'sample/cutting/edit/:id', component: CuttingSampleFormComponent , canDeactivate: [unsavedChangesGuard]},
            // { path: 'sample/cutting/details/:id', component: CuttingSampleFormComponent },
            // { path: 'sample/machining', component: MachiningChallanComponent },
            { path: 'sample/preparation', loadComponent: () => import('./components/sample-prepration/sample-preparation-list/sample-preparation-list.component').then(m => m.SamplePreparationListComponent) },
            { path: 'sample/preparation/create/:id', loadComponent: () => import('./components/sample-prepration/sample-preparation-form/sample-preparation-form.component').then(m => m.SamplePreparationFormComponent) },
            { path: 'sample/preparation/edit/:id', loadComponent: () => import('./components/sample-prepration/sample-preparation-form/sample-preparation-form.component').then(m => m.SamplePreparationFormComponent) },
            { path: 'sample/preparation/details/:id', loadComponent: () => import('./components/sample-prepration/sample-preparation-form/sample-preparation-form.component').then(m => m.SamplePreparationFormComponent) },
            { path: 'sample/plan', component: PlanListComponent },
            { path: 'sample/plan/edit/:id', component: PlanFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'sample/review', component: ReviewOfRequestComponent },
            { path: 'sample/review/:id', component: ReviewOfRequestFormComponent },
            { path: 'sample/inward', component: SampleInwardListComponent },
            { path: 'sample/inward/create', component: SampleInwardFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'sample/inward/edit/:id', component: SampleInwardFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'sample/inward/details/:id', component: SampleInwardFormComponent },
            { path: 'profile', loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent) },
            { path: 'settings', component: SettingsComponent },
            { path: 'config', component: ConfigManagerComponent },
            { path: 'menu', component: MenuManagementListComponent },
            { path: 'menu-permission', component: MenuPermissionComponent },
            { path: 'role', component: RoleFormComponent },
            { path: 'menu/create', component: MenuManagementComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'menu/edit/:id', component: MenuManagementComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'menu/details/:id', component: MenuManagementComponent },
            { path: 'user-permission', component: UserPermissionComponent },
            { path: 'workflow', component: WorkflowListComponent },
            { path: 'workflow/create', component: WorkflowFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'workflow/edit/:id', component: WorkflowFormComponent , canDeactivate: [unsavedChangesGuard]},
            { path: 'workflow/details/:id', component: WorkflowFormComponent },

            { path: 'org-chart', loadComponent: () => import('./components/org-chart/org-chart.component').then(m => m.OrgChartComponent) },
            // Testing Department routes
            { path: 'testing/dashboard', component: TestResultComponent },
            // { path: 'testing/perform/:id', component: TestResultEntryFormComponent, canDeactivate: [unsavedChangesGuard] },
            { path: 'testing/longterm', component: LongTermTrackingComponent },
            { path: 'testing/results/:id', component: TestResultEntryFormComponent, canDeactivate: [unsavedChangesGuard] },
            { path: 'testing/verification', loadComponent: () => import('./components/TestResult/test-result-verification/test-result-verification.component').then(m => m.TestResultVerificationComponent) },
            { path: 'test-result', component: TestResultComponent },
            // Reporting routes
            { path: 'reporting/dashboard', component: ReportingListComponent },
            { path: 'reporting/preview/:sampleId', component: ReportingPreviewComponent },
            { path: 'reporting/amend/:id', component: ReportAmendComponent },
            { path: 'report-template-builder', loadComponent: () => import('./components/report-template-builder/report-template-builder.component').then(m => m.ReportTemplateBuilderComponent) },
            { path: 'report-template-builder/edit/:id', loadComponent: () => import('./components/report-template-builder/report-template-builder.component').then(m => m.ReportTemplateBuilderComponent) , canDeactivate: [unsavedChangesGuard]},
            // Report Format Designer (parallel to existing reporting)
            { path: 'report-format', loadComponent: () => import('./components/report-format/report-format-list/report-format-list.component').then(m => m.ReportFormatListComponent) },
            { path: 'report-format/designer', loadComponent: () => import('./components/report-format/report-format-designer/report-format-designer.component').then(m => m.ReportFormatDesignerComponent), canDeactivate: [unsavedChangesGuard] },
            { path: 'report-format/designer/:id', loadComponent: () => import('./components/report-format/report-format-designer/report-format-designer.component').then(m => m.ReportFormatDesignerComponent), canDeactivate: [unsavedChangesGuard] },
            // Account routes
            { path: 'accounts/dashboard', component: AccountDashboardComponent },
            { path: 'accounts/cases', component: CaseAccountListComponent },
            { path: 'accounts/cases/:id', component: CaseAccountDetailComponent },
            { path: 'accounts/invoices/:id/preview', component: InvoicePreviewComponent },
            { path: 'accounts/ledger', component: CustomerLedgerComponent },
            { path: 'accounts/record-payment', component: RecordPaymentComponent },
            { path: 'accounts/aging-report', component: AgingReportComponent },
            { path: 'accounts/outstanding-report', component: OutstandingReportComponent },
            { path: 'accounts/purchase-orders', loadComponent: () => import('./components/account/customer-po/customer-po.component').then(m => m.CustomerPOComponent) },

            // NABL Dashboard & Audit
            { path: 'nabl/dashboard', loadComponent: () => import('./components/nabl/nabl-dashboard/nabl-dashboard.component').then(m => m.NablDashboardComponent) },
            { path: 'nabl/audit-print', loadComponent: () => import('./components/nabl/nabl-audit-print/nabl-audit-print.component').then(m => m.NablAuditPrintComponent) },
        ]
    },
    { path: 'payment/:token', component: PaymentComponent },
    { path: '**', redirectTo: '/login' }
];
