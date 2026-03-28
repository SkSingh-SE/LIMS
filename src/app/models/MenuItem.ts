export interface MenuItem {
  id: number;
  title: string;
  route: string;
  parentMenuID: number | null;
  children: MenuItem[];
  permissions: string[];
  icon?: string; // optional for UI
  color?: string;
  isFromRole?: boolean;
}

export function getAllMenuItems(): MenuItem[] {
  return [
    {
      id: 1,
      title: 'Administration',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-people',
      color: '',
      children: [
        { id: 11, title: 'Department Master', route: '/department', parentMenuID: 1, permissions: ['CanReadDepartment'], children: [], color: getRandomColor() },
        { id: 12, title: 'Employee Master', route: '/employee', parentMenuID: 1, permissions: ['CanReadEmployee'], children: [], color: getRandomColor() },
        { id: 13, title: 'Designation Master', route: '/designation', parentMenuID: 1, permissions: ['CanReadDesignation'], children: [], color: getRandomColor() },
        { id: 14, title: 'Tax Master', route: '/tax', parentMenuID: 1, permissions: ['CanReadTax'], children: [], color: getRandomColor() },
        { id: 15, title: 'Bank Master', route: '/bank', parentMenuID: 1, permissions: ['CanReadBank'], children: [], color: getRandomColor() },
        { id: 16, title: 'Courier Master', route: '/courier', parentMenuID: 1, permissions: ['CanReadCourier'], children: [], color: getRandomColor() },
        { id: 17, title: 'TPI Master', route: '/tpi', parentMenuID: 1, permissions: ['CanReadTPI'], children: [], color: getRandomColor() },
        { id: 18, title: 'Supplier Master', route: '/supplier', parentMenuID: 1, permissions: ['CanReadSupplier'], children: [], color: getRandomColor() },
        { id: 19, title: 'Equipment', route: '/equipment', parentMenuID: 1, permissions: ['CanReadEquipment'], children: [], color: getRandomColor() },
        { id: 20, title: 'OEM Master', route: '/oem', parentMenuID: 1, permissions: ['CanReadOEM'], children: [], color: getRandomColor() },
        { id: 21, title: 'Calibration Agency', route: '/calibration-agency', parentMenuID: 1, permissions: ['CanReadCalibrationAgency'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 2,
      title: 'Specification',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-box',
      color: '',
      children: [
        {
          id: 200, title: 'Material Specification', route: '', parentMenuID: 2, permissions: [], children: [
            { id: 31, title: 'Material Specification', route: '/material-specification', parentMenuID: 200, permissions: ['CanReadMaterialSpecification'], children: [], color: getRandomColor() },
            { id: 32, title: 'Custom Material Specification', route: '/custom-material-specification', parentMenuID: 200, permissions: ['CanReadCustomMaterialSpecification'], children: [], color: getRandomColor() },
            {
              id: 201, title: 'Linked Masters', route: '', parentMenuID: 200, permissions: [], children: [
                { id: 28, title: 'Standard Organization', route: '/standard-organization', parentMenuID: 201, permissions: ['CanReadStandardOrganization'], children: [], color: getRandomColor() },
                { id: 30, title: 'Metal Classification', route: '/metal-classification', parentMenuID: 201, permissions: ['CanReadMetalClassification'], children: [], color: getRandomColor() },
                { id: 24, title: 'Chemical Parameter', route: '/chemical-parameter', parentMenuID: 201, permissions: ['CanReadChemicalParameter'], children: [], color: getRandomColor() },
                { id: 25, title: 'Mechanical Parameter', route: '/mechanical-parameter', parentMenuID: 201, permissions: ['CanReadMechanicalParameter'], children: [], color: getRandomColor() },
                { id: 210, title: 'Parameter Unit', route: '/parameter-unit', parentMenuID: 201, permissions: ['CanReadParameterUnit'], children: [], color: getRandomColor() },
                { id: 23, title: 'Heat Treatment', route: '/heat-treatment', parentMenuID: 201, permissions: ['CanReadHeatTreatment'], children: [], color: getRandomColor() },
                { id: 26, title: 'Product Condition', route: '/product-condition', parentMenuID: 201, permissions: ['CanReadProductCondition'], children: [], color: getRandomColor() },
                { id: 27, title: 'Specimen Orientation', route: '/specimen-orientation', parentMenuID: 201, permissions: ['CanReadSpecimenOrientation'], children: [], color: getRandomColor() },
                { id: 22, title: 'Dimensional Factor', route: '/dimesional-factor', parentMenuID: 201, permissions: ['CanReadDimensionalFactors'], children: [], color: getRandomColor() },
                { id: 29, title: 'Universal Code Type', route: '/universal-code-type', parentMenuID: 201, permissions: ['CanReadUniversalCode'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            }
          ], color: getRandomColor()
        },
        {
          id: 202, title: 'Product Specification', route: '', parentMenuID: 2, permissions: [], children: [
            { id: 33, title: 'Product Specification', route: '/product-specification', parentMenuID: 202, permissions: ['CanReadProductSpecification'], children: [], color: getRandomColor() },
            { id: 34, title: 'Custom Product Specification', route: '/custom-product-specification', parentMenuID: 202, permissions: ['CanReadCustomProductSpecification'], children: [], color: getRandomColor() },
          ], color: getRandomColor()
        }
      ]
    },
    {
      id: 3,
      title: 'Test',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-file-earmark',
      color: '',
      children: [
        { id: 35, title: 'Laboratory Test', route: '/test', parentMenuID: 3, permissions: ['CanReadLaboratoryTest'], children: [], color: getRandomColor() },
        { id: 36, title: 'Test Method Specification', route: '/test-specification', parentMenuID: 3, permissions: ['CanReadTestMethodSpecification'], children: [], color: getRandomColor() },
        { id: 37, title: 'Invoice Case', route: '/invoice-case', parentMenuID: 3, permissions: ['CanReadInvoiceCase'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 4,
      title: 'Customer',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-people',
      color: '',
      children: [
        { id: 38, title: 'Company Category', route: '/company-category', parentMenuID: 4, permissions: ['CanReadCompanyCategory'], children: [], color: getRandomColor() },
        { id: 39, title: 'Customer Master', route: '/customer', parentMenuID: 4, permissions: ['CanReadCustomerMaster'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 5,
      title: 'Sample',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-layout-text-sidebar',
      color: '',
      children: [
        { id: 40, title: 'Inward', route: '/sample/inward', parentMenuID: 5, permissions: ['CanReadInward'], children: [], color: getRandomColor() },
        { id: 41, title: 'Plan', route: '/sample/plan', parentMenuID: 5, permissions: ['CanReadPlan'], children: [], color: getRandomColor() },
        { id: 42, title: 'Review', route: '/sample/review', parentMenuID: 5, permissions: ['CanReadReview'], children: [], color: getRandomColor() },
        {
          id: 500, title: 'Sample Preparation', route: '', parentMenuID: 5, permissions: [], children: [
            { id: 43, title: 'Sample Cutting', route: '/sample/cutting', parentMenuID: 500, permissions: ['CanReadSampleCutting'], children: [], color: getRandomColor() },
            { id: 46, title: 'Machining Charges', route: '/sample/machining', parentMenuID: 500, permissions: ['CanReadMachiningChallan'], children: [], color: getRandomColor() },
            { id: 44, title: 'Cutting Price Master', route: '/cutting-price-master', parentMenuID: 500, permissions: ['CanReadCuttingPrice'], children: [], color: getRandomColor() },
          ], color: getRandomColor()
        }
      ]
    },
    {
      id: 6,
      title: 'Invoice',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-receipt-cutoff',
      color: '',
      children: [
        { id: 47, title: 'Invoice Case Config', route: '/invoice-case-config', parentMenuID: 6, permissions: ['CanReadInvoiceCaseConfig'], children: [], color: getRandomColor() },
        { id: 48, title: 'Invoice Case', route: '/invoice-case', parentMenuID: 6, permissions: ['CanReadInvoiceCase'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 7,
      title: 'NABL ISO 17025',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-shield-check',
      color: '',
      children: [
        {
          id: 71, title: 'General Requirements', route: '', parentMenuID: 7, permissions: [], children: [
            { id: 7101, title: 'F-2: Confidentiality Agree.', route: '/supplier-confidentiality-agreement', parentMenuID: 71, permissions: ['CanReadConfidentialityAgreement'], children: [], color: getRandomColor() },
            { id: 7102, title: 'F-4: Impartiality Agree.', route: '/employee/impartiality-agreement', parentMenuID: 71, permissions: ['CanReadImpartialityAgreement'], children: [], color: getRandomColor() },
          ], color: getRandomColor()
        },
        {
          id: 72, title: 'Structural Requirements', route: '', parentMenuID: 7, permissions: [], children: [
            { id: 7201, title: 'Organization Chart', route: '/org-chart', parentMenuID: 72, permissions: ['CanReadOrgChart'], children: [], color: getRandomColor() },
          ], color: getRandomColor()
        },
        {
          id: 73, title: 'Resource Requirements', route: '', parentMenuID: 7, permissions: [], children: [
            {
              id: 7301, title: 'Personnel', route: '', parentMenuID: 73, permissions: [], children: [
                { id: 730101, title: 'F-1: Job Description', route: '/job-description', parentMenuID: 7301, permissions: ['CanReadJobDescription'], children: [], color: getRandomColor() },
                { id: 730102, title: 'F-3: Resp. & Authority', route: '/responsibility-authority', parentMenuID: 7301, permissions: ['CanReadRA'], children: [], color: getRandomColor() },
                { id: 730103, title: 'F-5: Competence Req.', route: '/competence-requirement', parentMenuID: 7301, permissions: ['CanReadCompetenceRequirement'], children: [], color: getRandomColor() },
                { id: 730104, title: 'F-6: Induction Training', route: '/induction-training', parentMenuID: 7301, permissions: ['CanReadInductionTraining'], children: [], color: getRandomColor() },
                { id: 730105, title: 'F-7: Competence Report', route: '/employee/competence', parentMenuID: 7301, permissions: ['CanReadEmployeeCompetence'], children: [], color: getRandomColor() },
                { id: 730106, title: 'F-8: Training Plan', route: '/training-plan', parentMenuID: 7301, permissions: ['CanReadTrainingPlan'], children: [], color: getRandomColor() },
                { id: 730107, title: 'F-9: Training Attendance', route: '/training-attendance', parentMenuID: 7301, permissions: ['CanReadTrainingAttendance'], children: [], color: getRandomColor() },
                { id: 730108, title: 'F-10: Training Effectiv.', route: '/training-effectiveness', parentMenuID: 7301, permissions: ['CanReadTrainingEffectiveness'], children: [], color: getRandomColor() },
                { id: 730109, title: 'F-11: Skill Matrix', route: '/skill-matrix', parentMenuID: 7301, permissions: ['CanReadSkillMatrix'], children: [], color: getRandomColor() },
                { id: 730110, title: 'F-13: Employee Authorization', route: '/employee/equipment-authorization/list', parentMenuID: 7301, permissions: ['CanReadEmployeeAuthorization'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            {
              id: 7302, title: 'Facilities & Environment', route: '', parentMenuID: 73, permissions: [], children: [
                { id: 730201, title: 'F-12: Environment Mon.', route: '/environment-monitoring', parentMenuID: 7302, permissions: ['CanReadEnvironmentMonitoring'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            {
              id: 7303, title: 'Equipment', route: '', parentMenuID: 73, permissions: [], children: [
                { id: 730301, title: 'F-14: Equipment History', route: '/equipment-history-card', parentMenuID: 7303, permissions: ['CanReadEquipmentHistory'], children: [], color: getRandomColor() },
                { id: 730302, title: 'F-15: Calibration Review', route: '/calibration-review', parentMenuID: 7303, permissions: ['CanReadCalibrationReview'], children: [], color: getRandomColor() },
                { id: 730303, title: 'F-16: Intermediate Check', route: '/intermediate-check-records', parentMenuID: 7303, permissions: ['CanReadIntermediateCheck'], children: [], color: getRandomColor() },
                { id: 730304, title: 'F-17: Ref. Material List', route: '/reference-material', parentMenuID: 7303, permissions: ['CanReadReferenceMaterial'], children: [], color: getRandomColor() },
                { id: 730305, title: 'F-18: CRM Consumption', route: '/reference-material-consumption', parentMenuID: 7303, permissions: ['CanReadCRMConsumption'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            {
              id: 7304, title: 'External Products', route: '', parentMenuID: 73, permissions: [], children: [
                { id: 730401, title: 'F-19: Supplier Reg.', route: '/supplier-registration', parentMenuID: 7304, permissions: ['CanReadSupplierRegistration'], children: [], color: getRandomColor() },
                { id: 730402, title: 'F-20: Approved Suppliers', route: '/approved-supplier', parentMenuID: 7304, permissions: ['CanReadApprovedSupplier'], children: [], color: getRandomColor() },
                { id: 730403, title: 'F-21: Purchase Indent', route: '/purchase-indent', parentMenuID: 7304, permissions: ['CanReadPurchaseIndent'], children: [], color: getRandomColor() },
                { id: 730404, title: 'F-22: Purchase Order', route: '/purchase-order', parentMenuID: 7304, permissions: ['CanReadPurchaseOrder'], children: [], color: getRandomColor() },
                { id: 730405, title: 'F-23: Inspection Plan', route: '/product-inspection', parentMenuID: 7304, permissions: ['CanReadProductInspection'], children: [], color: getRandomColor() },
                { id: 730406, title: 'F-24: Incoming Mat. Rec.', route: '/incoming-material', parentMenuID: 7304, permissions: ['CanReadIncomingMaterial'], children: [], color: getRandomColor() },
                { id: 730407, title: 'F-25: Mat. Verification', route: '/purchase-material-verification', parentMenuID: 7304, permissions: ['CanReadMaterialVerification'], children: [], color: getRandomColor() },
                { id: 730408, title: 'F-26: Supplier Eval.', route: '/supplier-evaluation', parentMenuID: 7304, permissions: ['CanReadSupplierEvaluation'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            }
          ], color: getRandomColor()
        },
        {
          id: 74, title: 'Process Requirements', route: '', parentMenuID: 7, permissions: [], children: [
            { id: 7401, title: 'F-27: Test Request', route: '/nabl/test-request', parentMenuID: 74, permissions: ['CanReadTestRequest'], children: [], color: getRandomColor() },
            {
              id: 7402, title: 'Methods Management', route: '', parentMenuID: 74, permissions: [], children: [
                { id: 740201, title: 'F-28: Test Methods', route: '/nabl/test-method', parentMenuID: 7402, permissions: ['CanReadTestMethod'], children: [], color: getRandomColor() },
                { id: 740202, title: 'F-29: Verification', route: '/nabl/method-verification', parentMenuID: 7402, permissions: ['CanReadMethodVerification'], children: [], color: getRandomColor() },
                { id: 740203, title: 'F-30: Validation', route: '/nabl/method-validation', parentMenuID: 7402, permissions: ['CanReadMethodValidation'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            {
              id: 7403, title: 'Sample Handling', route: '', parentMenuID: 74, permissions: [], children: [
                { id: 740301, title: 'F-31: Inward Register', route: '/nabl/sample-inward-register', parentMenuID: 7403, permissions: ['CanReadSampleInwardRegister'], children: [], color: getRandomColor() },
                { id: 740302, title: 'F-32: Muster Register', route: '/nabl/sample-muster-register', parentMenuID: 7403, permissions: ['CanReadSampleMusterRegister'], children: [], color: getRandomColor() },
                { id: 740303, title: 'F-33: Sample Label', route: '/nabl/sample-label', parentMenuID: 7403, permissions: ['CanReadSampleLabel'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            { id: 7404, title: 'F-34: Technical Raw Data', route: '/nabl/technical-raw-data', parentMenuID: 74, permissions: ['CanReadTechnicalRawData'], children: [], color: getRandomColor() },
            { id: 7405, title: 'F-35: Uncertainty Rec.', route: '/measurement-uncertainty', parentMenuID: 74, permissions: ['CanReadUncertainty'], children: [], color: getRandomColor() },
            {
              id: 7406, title: 'Ensuring Validity', route: '', parentMenuID: 74, permissions: [], children: [
                { id: 740601, title: 'F-36: PT / ILC Plan', route: '/pt-ilc-plan', parentMenuID: 7406, permissions: ['CanReadPTPlan'], children: [], color: getRandomColor() },
                { id: 740602, title: 'F-37: QC Plan', route: '/quality-control-plan', parentMenuID: 7406, permissions: ['CanReadQCPlan'], children: [], color: getRandomColor() },
                { id: 740603, title: 'F-38: Retesting Rec.', route: '/retesting-retained-sample', parentMenuID: 7406, permissions: ['CanReadRetesting'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            { id: 7407, title: 'F-39: Test Report', route: '/test-report', parentMenuID: 74, permissions: ['CanReadTestReport'], children: [], color: getRandomColor() },
            { id: 7408, title: 'F-40: Complaint Reg.', route: '/complaint-register', parentMenuID: 74, permissions: ['CanReadComplaintRegister'], children: [], color: getRandomColor() },
            { id: 7409, title: 'F-41: NC Work Records', route: '/non-conforming-work', parentMenuID: 74, permissions: ['CanReadNonConformingWork'], children: [], color: getRandomColor() },
          ], color: getRandomColor()
        },
        {
          id: 75, title: 'Management System', route: '', parentMenuID: 7, permissions: [], children: [
            {
              id: 7501, title: 'Documentation Control', route: '', parentMenuID: 75, permissions: [], children: [
                { id: 750101, title: 'F-43: Master Document', route: '/master-document', parentMenuID: 7501, permissions: ['CanReadMasterDocument'], children: [], color: getRandomColor() },
                { id: 750102, title: 'F-44: Doc. Change Req.', route: '/document-change-request', parentMenuID: 7501, permissions: ['CanReadDocChangeRequest'], children: [], color: getRandomColor() },
                { id: 750103, title: 'F-45: Doc. Review Rec.', route: '/document-review', parentMenuID: 7501, permissions: ['CanReadDocumentReview'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            { id: 7502, title: 'F-46: Risk Assessment', route: '/risk-assessment', parentMenuID: 75, permissions: ['CanReadRiskAssessment'], children: [], color: getRandomColor() },
            {
              id: 7503, title: 'Improvement & Actions', route: '', parentMenuID: 75, permissions: [], children: [
                { id: 750301, title: 'F-47: Cust. Feedback', route: '/customer-feedback', parentMenuID: 7503, permissions: ['CanReadCustomerFeedback'], children: [], color: getRandomColor() },
                { id: 750302, title: 'F-48: Feedback Analys.', route: '/feedback-analysis', parentMenuID: 7503, permissions: ['CanReadFeedbackAnalysis'], children: [], color: getRandomColor() },
                { id: 750303, title: 'F-42: NC & Corr. Action', route: '/nc-corrective-action', parentMenuID: 7503, permissions: ['CanReadNCAction'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            {
              id: 7504, title: 'Internal Audits', route: '', parentMenuID: 75, permissions: [], children: [
                { id: 750401, title: 'F-49: Internal Auditors', route: '/internal-auditor', parentMenuID: 7504, permissions: ['CanReadInternalAuditor'], children: [], color: getRandomColor() },
                { id: 750402, title: 'F-50: Audit Plan', route: '/audit-plan', parentMenuID: 7504, permissions: ['CanReadAuditPlan'], children: [], color: getRandomColor() },
                { id: 750403, title: 'F-51: Audit Checklist', route: '/audit-checklist', parentMenuID: 7504, permissions: ['CanReadAuditChecklist'], children: [], color: getRandomColor() },
                { id: 750404, title: 'F-52: Audit Summary', route: '/audit-summary', parentMenuID: 7504, permissions: ['CanReadAuditSummary'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            },
            {
              id: 7505, title: 'Management Review', route: '', parentMenuID: 75, permissions: [], children: [
                { id: 750501, title: 'F-53: Meeting Agenda', route: '/meeting-agenda', parentMenuID: 7505, permissions: ['CanReadMeetingAgenda'], children: [], color: getRandomColor() },
                { id: 750502, title: 'F-54: Meeting Minutes', route: '/meeting-minutes', parentMenuID: 7505, permissions: ['CanReadMeetingMinutes'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            }
          ], color: getRandomColor()
        },
        { id: 49, title: 'Lab Scope Master', route: '/scope', parentMenuID: 7, permissions: ['CanReadLabScopeMaster'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 8,
      title: 'User Management',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-person-fill-gear',
      color: '',
      children: [
        { id: 50, title: 'Lab Employee Master', route: '/nabl/lab-employee', parentMenuID: 8, permissions: ['CanReadLabEmployeeMaster'], children: [], color: getRandomColor() },
        { id: 51, title: 'Lab Score Master', route: '/nabl/lab-score', parentMenuID: 8, permissions: ['CanReadLabScore'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 9,
      title: 'Testing',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-dropbox',
      color: '',
      children: [
        { id: 56, title: 'Testing Dashboard', route: '/testing/dashboard', parentMenuID: 9, permissions: ['CanReadTestingDashboard'], children: [], color: getRandomColor() },
        { id: 57, title: 'Perform Test', route: '/testing/perform/:id', parentMenuID: 9, permissions: ['CanReadPerformTest'], children: [], color: getRandomColor() },
        { id: 58, title: 'Long Term Tracking', route: '/testing/longterm', parentMenuID: 9, permissions: ['CanReadLongTermTracking'], children: [], color: getRandomColor() },
        { id: 59, title: 'Test Results', route: '/testing/results/:id', parentMenuID: 9, permissions: ['CanReadTestResults'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 10,
      title: 'Configuration',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-gear',
      color: '',
      children: [
        { id: 60, title: 'Configuration Manager', route: '/config', parentMenuID: 10, permissions: ['CanReadConfiguration'], children: [], color: getRandomColor() },
        { id: 61, title: 'Menu Management', route: '/menu', parentMenuID: 10, permissions: ['CanReadMenuManagement'], children: [], color: getRandomColor() },
        { id: 62, title: 'Menu Permission', route: '/menu-permission', parentMenuID: 10, permissions: ['CanReadMenuPermission'], children: [], color: getRandomColor() },
        { id: 63, title: 'Role Management', route: '/role', parentMenuID: 10, permissions: ['CanReadRoleManagement'], children: [], color: getRandomColor() },
        { id: 64, title: 'User Permission', route: '/user-permission', parentMenuID: 10, permissions: ['CanReadUserPermission'], children: [], color: getRandomColor() },
        { id: 65, title: 'Workflow', route: '/workflow', parentMenuID: 10, permissions: ['CanReadWorkflow'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 11,
      title: 'Reporting',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-file-text',
      color: '',
      children: [
        { id: 66, title: 'Reporting Dashboard', route: '/reporting/dashboard', parentMenuID: 11, permissions: ['CanReadReporting'], children: [], color: getRandomColor() }
      ]
    },
    {
      id: 12,
      title: 'Accounts',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-wallet2',
      color: '',
      children: [
        { id: 121, title: 'Accounts Dashboard', route: '/accounts/dashboard', parentMenuID: 12, permissions: ['CanReadAccountsDashboard'], children: [], color: getRandomColor() },
        { id: 122, title: 'Case Accounts', route: '/accounts/cases', parentMenuID: 12, permissions: ['CanReadCaseAccounts'], children: [], color: getRandomColor() },
        { id: 123, title: 'Customer Ledger', route: '/account/ledger', parentMenuID: 12, permissions: ['CanReadCustomerLedger'], children: [], color: getRandomColor() },
        { id: 124, title: 'Record Payment', route: '/account/record-payment', parentMenuID: 12, permissions: ['CanReadRecordPayment'], children: [], color: getRandomColor() },
        { id: 125, title: 'Aging Report', route: '/account/aging-report', parentMenuID: 12, permissions: ['CanReadAgingReport'], children: [], color: getRandomColor() },
        { id: 126, title: 'Outstanding Report', route: '/account/outstanding-report', parentMenuID: 12, permissions: ['CanReadOutstandingReport'], children: [], color: getRandomColor() }
      ]
    }
  ];
}
function getRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
