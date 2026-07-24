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
        { id: 21, title: 'Calibration Agency', route: '/calibration-agency', parentMenuID: 1, permissions: ['CanReadCalibrationAgency'], children: [], color: getRandomColor() },
        { id: 29, title: 'Inventory Management', route: '/inventory-management', parentMenuID: 1, permissions: ['CanReadInventoryManagement'], children: [], color: getRandomColor() }
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
                // { id: 29, title: 'Universal Code Type', route: '/universal-code-type', parentMenuID: 201, permissions: ['CanReadUniversalCode'], children: [], color: getRandomColor() },
                { id: 220, title: 'Product Form', route: '/product-form', parentMenuID: 201, permissions: ['CanReadProductForm'], children: [], color: getRandomColor() },
                { id: 221, title: 'Product Size', route: '/product-size-master', parentMenuID: 201, permissions: ['CanReadProductSize'], children: [], color: getRandomColor() },
                { id: 222, title: 'Product Condition Category', route: '/product-condition-category', parentMenuID: 201, permissions: ['CanReadProductConditionCategory'], children: [], color: getRandomColor() },
                { id: 223, title: 'Specimen Orientation Category', route: '/specimen-orientation-category', parentMenuID: 201, permissions: ['CanReadSpecimenOrientationCategory'], children: [], color: getRandomColor() },
                { id: 224, title: 'Property Type', route: '/property-type', parentMenuID: 201, permissions: ['CanReadPropertyType'], children: [], color: getRandomColor() },
                { id: 225, title: 'Heat Treatment Category', route: '/heat-treatment-category', parentMenuID: 201, permissions: ['CanReadHeatTreatmentCategory'], children: [], color: getRandomColor() },
                { id: 226, title: 'Cooling Medium', route: '/cooling-medium', parentMenuID: 201, permissions: ['CanReadCoolingMedium'], children: [], color: getRandomColor() },
                { id: 227, title: 'Parameter Category', route: '/parameter-category', parentMenuID: 201, permissions: ['CanReadParameterCategory'], children: [], color: getRandomColor() },
                { id: 228, title: 'Tolerance Master', route: '/tolerance-master', parentMenuID: 201, permissions: ['CanReadTolerance'], children: [], color: getRandomColor() },
                { id: 229, title: 'Hardness Equivalence', route: '/hardness-equivalence', parentMenuID: 201, permissions: ['CanReadHardnessEquivalence'], children: [], color: getRandomColor() },
              ], color: getRandomColor()
            }
          ], color: getRandomColor()
        },
        {
          id: 202, title: 'Product Specification', route: '', parentMenuID: 2, permissions: [], children: [
            { id: 33, title: 'Product Specification', route: '/product-specification', parentMenuID: 202, permissions: ['CanReadProductSpecification'], children: [], color: getRandomColor() },
            { id: 34, title: 'Custom Product Specification', route: '/custom-product-specification', parentMenuID: 202, permissions: ['CanReadCustomProductSpecification'], children: [], color: getRandomColor() },
            { id: 340, title: 'Product Master', route: '/product-master', parentMenuID: 202, permissions: ['PRODUCT_MASTER_VIEW', 'CanReadProductMaster'], children: [], color: getRandomColor() },
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
        { id: 37, title: 'Invoice Case', route: '/invoice-case', parentMenuID: 3, permissions: ['CanReadInvoiceCase'], children: [], color: getRandomColor() },
        { id: 371, title: 'Price Dimension Type', route: '/master/price-dimension-type', parentMenuID: 3, permissions: ['CanReadPriceDimensionType'], children: [], color: getRandomColor() },
        { id: 372, title: 'Analysis Technique', route: '/analysis-technique', parentMenuID: 3, permissions: ['CanReadAnalysisTechnique'], children: [], color: getRandomColor() },
        { id: 373, title: 'Chemical Sample Category', route: '/chemical-sample-category', parentMenuID: 3, permissions: ['CanReadChemicalSampleCategory'], children: [], color: getRandomColor() },
        { id: 49, title: 'Lab Scope Master', route: '/scope', parentMenuID: 3, permissions: ['CanReadLabScopeMaster'], children: [], color: getRandomColor() }
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
            { id: 130, title: 'Preparation Queue', route: '/sample/preparation', parentMenuID: 500, permissions: [], children: [], color: getRandomColor() },
            { id: 44, title: 'Cutting Price Master', route: '/cutting-price-master', parentMenuID: 500, permissions: ['CanReadCuttingPrice'], children: [], color: getRandomColor() },
            { id: 47, title: 'Machining Charge Master', route: '/machining-charge-master', parentMenuID: 500, permissions: ['CanReadMachiningCharge'], children: [], color: getRandomColor() },
            { id: 48, title: 'Sample Preparation Master', route: '/sample-preparation-master', parentMenuID: 500, permissions: ['CanReadSamplePreparationMaster'], children: [], color: getRandomColor() },
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
    // ── NABL ISO 17025 section commented out ──
    // { id: 49, title: 'Lab Scope Master', route: '/scope', parentMenuID: 7, permissions: ['CanReadLabScopeMaster'], children: [], color: getRandomColor() }
    // ── moved Lab Scope Master to Test section ──
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
        // { id: 57, title: 'Perform Test', route: '/testing/perform/:id', parentMenuID: 9, permissions: ['CanReadPerformTest'], children: [], color: getRandomColor() },
        { id: 60, title: 'Test Verification', route: '/testing/verification', parentMenuID: 9, permissions: ['CanReadTestVerification'], children: [], color: getRandomColor() },
        { id: 58, title: 'Long Term Tracking', route: '/testing/longterm', parentMenuID: 9, permissions: ['CanReadLongTermTracking'], children: [], color: getRandomColor() },
        { id: 61, title: 'Test Result', route: '/test-result', parentMenuID: 9, permissions: ['CanReadTestResult'], children: [], color: getRandomColor() },
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
        // { id: 60, title: 'Configuration Manager', route: '/config', parentMenuID: 10, permissions: ['CanReadConfiguration'], children: [], color: getRandomColor() },
        // { id: 61, title: 'Menu Management', route: '/menu', parentMenuID: 10, permissions: ['CanReadMenuManagement'], children: [], color: getRandomColor() },
        // { id: 62, title: 'Menu Permission', route: '/menu-permission', parentMenuID: 10, permissions: ['CanReadMenuPermission'], children: [], color: getRandomColor() },
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
        { id: 66, title: 'Reporting Dashboard', route: '/reporting/dashboard', parentMenuID: 11, permissions: ['CanReadReporting'], children: [], color: getRandomColor() },
        { id: 67, title: 'Report Formats', route: '/report-format', parentMenuID: 11, permissions: ['CanReadReportFormat'], children: [], color: getRandomColor() }
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
        { id: 123, title: 'Customer Ledger', route: '/accounts/ledger', parentMenuID: 12, permissions: ['CanReadCustomerLedger'], children: [], color: getRandomColor() },
        { id: 124, title: 'Record Payment', route: '/accounts/record-payment', parentMenuID: 12, permissions: ['CanReadRecordPayment'], children: [], color: getRandomColor() },
        { id: 125, title: 'Aging Report', route: '/accounts/aging-report', parentMenuID: 12, permissions: ['CanReadAgingReport'], children: [], color: getRandomColor() },
        { id: 126, title: 'Outstanding Report', route: '/accounts/outstanding-report', parentMenuID: 12, permissions: ['CanReadOutstandingReport'], children: [], color: getRandomColor() },
        { id: 127, title: 'Customer Purchase Orders', route: '/accounts/purchase-orders', parentMenuID: 12, permissions: ['CanReadCustomerPO'], children: [], color: getRandomColor() }
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