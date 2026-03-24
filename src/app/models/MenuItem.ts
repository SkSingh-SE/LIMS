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
        { id: 11, title: 'Department Master', route: '/department', parentMenuID: 1, permissions: ['CanReadDepartment'], children: [], color: getRandomColor() }
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
        { id: 36, title: 'Test Method Specification', route: '/test-specification', parentMenuID: 3, permissions: ['CanReadTestMethodSpecification'], children: [], color: getRandomColor() }
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
        { id: 49, title: 'Lab Scope Master', route: '/scope', parentMenuID: 7, permissions: ['CanReadLabScopeMaster'], children: [], color: getRandomColor() }
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
