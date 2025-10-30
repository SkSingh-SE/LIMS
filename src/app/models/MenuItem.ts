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
  return[
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
        { id: 22, title: 'Dimensional Factors Master', route: '/dimesional-factor', parentMenuID: 2, permissions: ['CanReadDimensionalFactors'], children: [], color: getRandomColor() },
        { id: 23, title: 'Heat Treatment Master', route: '/heat-treatment', parentMenuID: 2, permissions: ['CanReadHeatTreatment'], children: [], color: getRandomColor() },
        { id: 24, title: 'Chemical Parameter Master', route: '/chemical-parameter', parentMenuID: 2, permissions: ['CanReadChemicalParameter'], children: [], color: getRandomColor() },
        { id: 25, title: 'Mechanical Parameter Master', route: '/mechanical-parameter', parentMenuID: 2, permissions: ['CanReadMechanicalParameter'], children: [], color: getRandomColor() },
        { id: 26, title: 'Product Condition Master', route: '/product-condition', parentMenuID: 2, permissions: ['CanReadProductCondition'], children: [], color: getRandomColor() },
        { id: 27, title: 'Specimen Orientation Master', route: '/specimen-orientation', parentMenuID: 2, permissions: ['CanReadSpecimenOrientation'], children: [], color: getRandomColor() },
        { id: 28, title: 'Standard Organization Master', route: '/standard-organization', parentMenuID: 2, permissions: ['CanReadStandardOrganization'], children: [], color: getRandomColor() },
        { id: 29, title: 'Universal Code Type Master', route: '/universal-code-type', parentMenuID: 2, permissions: ['CanReadUniversalCode'], children: [], color: getRandomColor() },
        { id: 30, title: 'Metal Classification', route: '/metal-classification', parentMenuID: 2, permissions: ['CanReadMetalClassification'], children: [], color: getRandomColor() },
        { id: 31, title: 'Material Specification', route: '/material-specification', parentMenuID: 2, permissions: ['CanReadMaterialSpecification'], children: [], color: getRandomColor() },
        { id: 32, title: 'Custom Material Specification', route: '/custom-material-specification', parentMenuID: 2, permissions: ['CanReadCustomMaterialSpecification'], children: [], color: getRandomColor() },
        { id: 33, title: 'Product Specification', route: '/product-specification', parentMenuID: 2, permissions: ['CanReadProductSpecification'], children: [], color: getRandomColor() },
        { id: 34, title: 'Custom Product Specification', route: '/custom-product-specification', parentMenuID: 2, permissions: ['CanReadCustomProductSpecification'], children: [], color: getRandomColor() }
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
        { id: 43, title: 'Preparation', route: '/sample/preparation', parentMenuID: 5, permissions: ['CanReadPreparation'], children: [], color: getRandomColor() },
        { id: 44, title: 'Cutting Price Master', route: '/cutting-price-master', parentMenuID: 5, permissions: ['CanReadCuttingPrice'], children: [], color: getRandomColor() },
        { id: 45, title: 'Sample Cutting', route: '/sample/cutting', parentMenuID: 5, permissions: ['CanReadSampleCutting'], children: [], color: getRandomColor() },
        { id: 46, title: 'Machining Challan', route: '/sample/machining', parentMenuID: 5, permissions: ['CanReadMachiningChallan'], children: [], color: getRandomColor() }
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
      route: '/iso-17025',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-shield-check',
      color: '',
      children: [
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
        { id: 51, title: 'Lab Score Master', route: '/nabl/lab-score', parentMenuID: 8, permissions: ['CanReadLabScore'], children: [], color: getRandomColor() },
        { id: 52, title: 'Quality Control Plan', route: '/nabl/quality-control', parentMenuID: 8, permissions: ['CanReadQualityControlPlan'], children: [], color: getRandomColor() },
        {
          id: 53,
          title: 'Customer Feedback',
          route: '/nabl/customer-feedback',
          parentMenuID: 8,
          permissions: ['CanReadCustomerFeedback'],
          color: getRandomColor(),
          children: [
            { id: 54, title: 'CF - Lab Employee', route: '/nabl/lab-employee', parentMenuID: 53, permissions: ['CanReadLabEmployeeMaster'], children: [], color: getRandomColor() }
          ]
        }
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
