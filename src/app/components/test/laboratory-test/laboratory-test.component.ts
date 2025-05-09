import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
interface InvoiceOption {
  label: string;
  value: string | number;
  basePrice: number;
  range?: number[];  // Only present for range-type invoice cases
}

interface InvoiceCase {
  label: string;
  type: 'element-count' | 'fixed' | 'range' | 'custom';
  options: InvoiceOption[];
}

interface SubGroup {
  name: string;
  invoiceCases: InvoiceCase[];
}

interface TestMethod {
  name: string;
  subGroups: SubGroup[];
}

interface LabDepartment {
  name: string;
  testMethods: TestMethod[];
}

@Component({
  selector: 'app-laboratory-test',
  templateUrl: './laboratory-test.component.html',
  styleUrl: './laboratory-test.component.css',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],

})
export class LaboratoryTestComponent {
  labTestForm: FormGroup;

  labDepartments: LabDepartment[] = [
    {
      name: 'Chemical Lab',
      testMethods: [
        {
          name: 'ROHS Test',
          subGroups: [
            {
              name: 'ROHS Test SubGroup',
              invoiceCases: [
                {
                  label: 'Element Count',
                  type: 'element-count',
                  options: [
                    { label: '1 Element', value: 1, basePrice: 500 },
                    { label: '2 Element', value: 2, basePrice: 600 },
                    { label: '3 Element', value: 3, basePrice: 700 },
                    { label: '4 Element', value: 4, basePrice: 800 },
                    { label: '5 Element', value: 5, basePrice: 900 },
                    { label: '6 Element', value: 6, basePrice: 1000 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Coatings & Thin-Film Lab',
      testMethods: [
        {
          name: 'Cathodic Disbondment Test',
          subGroups: [
            {
              name: 'Cathodic Disbondment Test SubGroup',
              invoiceCases: [
                {
                  label: 'Duration',
                  type: 'fixed',
                  options: [
                    { label: '24hr@RT', value: '24hr@RT', basePrice: 1000 },
                    { label: '24hr@HT', value: '24hr@HT', basePrice: 1200 },
                    { label: '28days@RT', value: '28days@RT', basePrice: 1500 },
                    { label: '28days@HT', value: '28days@HT', basePrice: 1800 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Corrosion Lab',
      testMethods: [
        {
          name: 'IGC Test',
          subGroups: [
            {
              name: 'IGC A262 (Practice C) HNO3 Test (Austenite SS)',
              invoiceCases: [
                {
                  label: 'Standard Test',
                  type: 'fixed',
                  options: [
                    { label: 'Basic Test', value: 'basic', basePrice: 1500 }
                  ]
                }
              ]
            },
            {
              name: 'IGC A262 (Practice E) Cu - CuSO4 H2SO4 Test (Austenite SS)',
              invoiceCases: [
                {
                  label: 'With Photograph',
                  type: 'fixed',
                  options: [
                    { label: 'With Photograph', value: 'with-photo', basePrice: 2000 }
                  ]
                },
                {
                  label: 'Without Photograph',
                  type: 'fixed',
                  options: [
                    { label: 'Without Photograph', value: 'without-photo', basePrice: 1500 }
                  ]
                }
              ]
            },
            {
              name: 'IGC A262 (Practice F) Cu - CuSO4 50% H2SO4 Test (Austenite SS)',
              invoiceCases: [
                {
                  label: 'Standard Test',
                  type: 'fixed',
                  options: [
                    { label: 'Basic Test', value: 'basic', basePrice: 1600 }
                  ]
                }
              ]
            },
            {
              name: 'IGC A763 (Practice W) Oxalic Acid Etch Test (Ferrite SS)',
              invoiceCases: [
                {
                  label: 'Standard Test',
                  type: 'fixed',
                  options: [
                    { label: 'Basic Test', value: 'basic', basePrice: 1700 }
                  ]
                }
              ]
            },
            {
              name: 'IGC A763 (Practice X) FeSO4 - H2SO4 (Ferrite SS)',
              invoiceCases: [
                {
                  label: 'Time Duration',
                  type: 'range',
                  options: [
                    { label: '24 Hrs', value: '24', basePrice: 2000, range: [24, 24] },
                    { label: '72 Hrs', value: '72', basePrice: 2500, range: [72, 72] },
                    { label: '120 Hrs', value: '120', basePrice: 3000, range: [120, 120] }
                  ]
                }
              ]
            },
            {
              name: 'IGC A763 (Practice Y) Cu - CuSO4 50% H2SO4 Test (Ferrite SS)',
              invoiceCases: [
                {
                  label: 'Time Duration',
                  type: 'range',
                  options: [
                    { label: '96 Hrs', value: '96', basePrice: 2500, range: [96, 96] },
                    { label: '120 Hrs', value: '120', basePrice: 3000, range: [120, 120] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Mechanical Department',
      testMethods: [
        {
          name: 'Adhesion Test',
          subGroups: [
            {
              name: 'Adhesion Test SubGroup',
              invoiceCases: [
                {
                  label: 'Standard Test',
                  type: 'fixed',
                  options: [
                    { label: 'Dolly Test', value: 'dolly', basePrice: 1500 }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'Bend Test',
          subGroups: [
            {
              name: 'Bend + Rebend Test (TMT)',
              invoiceCases: [
                {
                  label: 'Diameter',
                  type: 'range',
                  options: [
                    { label: '10, 12mm', value: '10-12', basePrice: 2000 },
                    { label: '16, 20mm', value: '16-20', basePrice: 2500 },
                    { label: '25, 28mm', value: '25-28', basePrice: 3000 },
                    { label: '32mm', value: '32', basePrice: 3500 }
                  ]
                }
              ]
            },
            {
              name: 'Bend Test (Flat)',
              invoiceCases: [
                {
                  label: 'Thickness',
                  type: 'range',
                  options: [
                    { label: '<25mm', value: '<25', basePrice: 2000 },
                    { label: '25mm to 50mm', value: '25-50', basePrice: 2500 }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'Charpy Impact Test',
          subGroups: [
            {
              name: 'Charpy Impact Test (3 pcs) (ASTM)',
              invoiceCases: [
                {
                  label: 'Temperature Range',
                  type: 'fixed',
                  options: [
                    { label: 'ASTM@RT', value: 'RT', basePrice: 1500 },
                    { label: 'ASTM@0°C', value: '0', basePrice: 1800 },
                    { label: 'ASTM@-1to-50°C', value: '-1to-50', basePrice: 2100 },
                    { label: 'ASTM@-51to-196°C', value: '-51to-196', basePrice: 2500 }
                  ]
                }
              ]
            },
            {
              name: 'Charpy Impact Test (Multiple) (ASTM)',
              invoiceCases: [
                {
                  label: 'Temperature Range',
                  type: 'fixed',
                  options: [
                    { label: 'ASTM@RT', value: 'RT', basePrice: 1500 },
                    { label: 'ASTM@0°C', value: '0', basePrice: 1800 },
                    { label: 'ASTM@-1to-50°C', value: '-1to-50', basePrice: 2100 },
                    { label: 'ASTM@-51to-196°C', value: '-51to-196', basePrice: 2500 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Metallurgy Department',
      testMethods: [
        {
          name: 'Inclusion Content Analysis',
          subGroups: [
            {
              name: 'Inclusion Content Analysis SubGroup',
              invoiceCases: [
                {
                  label: 'Method',
                  type: 'fixed',
                  options: [
                    { label: 'E45 Method A', value: 'E45-A', basePrice: 1200 },
                    { label: 'E45 Method D', value: 'E45-D', basePrice: 1500 },
                    { label: 'ISO 643', value: 'ISO-643', basePrice: 1800 }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'Microhardness Testing (Vickers / Knoop)',
          subGroups: [
            {
              name: 'Microhardness Testing SubGroup',
              invoiceCases: [
                {
                  label: 'Testing Type',
                  type: 'fixed',
                  options: [
                    { label: 'Single Point', value: 'single-point', basePrice: 1000 },
                    { label: 'Multi Point', value: 'multi-point', basePrice: 1500 }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'Phase Volume Fraction (Image Analyzer / Colour Separation)',
          subGroups: [
            {
              name: 'Phase Volume Fraction SubGroup',
              invoiceCases: [
                {
                  label: 'Number of Fields',
                  type: 'range',
                  options: [
                    { label: '5 Field', value: '5', basePrice: 1200, range: [5, 5] },
                    { label: '10 Field', value: '10', basePrice: 1500, range: [10, 10] },
                    { label: '15 Field', value: '15', basePrice: 1800, range: [15, 15] },
                    { label: '30 Field', value: '30', basePrice: 2500, range: [30, 30] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'Spectro Lab',
      testMethods: [
        {
          name: 'Fe Spectro',
          subGroups: [
            {
              name: 'Fe Spectro full',
              invoiceCases: [
                {
                  label: 'Full Spectrum Type',
                  type: 'fixed',
                  options: [
                    { label: 'Full', value: 'full', basePrice: 2000 },
                    { label: 'Full + N', value: 'full+N', basePrice: 2200 },
                    { label: 'Full + B', value: 'full+B', basePrice: 2300 },
                    { label: 'Full + Ca', value: 'full+Ca', basePrice: 2400 },
                    { label: 'Full + N + B', value: 'full+N+B', basePrice: 2500 },
                    { label: 'Full + N + Ca', value: 'full+N+Ca', basePrice: 2600 },
                    { label: 'Full + B + Ca', value: 'full+B+Ca', basePrice: 2700 },
                    { label: 'Full + B + N + Ca', value: 'full+B+N+Ca', basePrice: 2800 }
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'Non-Fe Spectro',
          subGroups: [
            {
              name: 'Non-Fe Spectro full',
              invoiceCases: [
                {
                  label: 'Full Spectrum Type',
                  type: 'fixed',
                  options: [
                    { label: 'Full', value: 'full', basePrice: 2000 },
                    { label: 'Full + N', value: 'full+N', basePrice: 2200 },
                    { label: 'Full + B', value: 'full+B', basePrice: 2300 },
                    { label: 'Full + Ca', value: 'full+Ca', basePrice: 2400 },
                    { label: 'Full + N + B', value: 'full+N+B', basePrice: 2500 },
                    { label: 'Full + N + Ca', value: 'full+N+Ca', basePrice: 2600 },
                    { label: 'Full + B + Ca', value: 'full+B+Ca', basePrice: 2700 },
                    { label: 'Full + B + N + Ca', value: 'full+B+N+Ca', basePrice: 2800 }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ];
  
  
  

  constructor(private fb: FormBuilder) {
    this.labTestForm = this.fb.group({
      selections: this.fb.array([])
    });
  }

  get selections(): FormArray {
    return this.labTestForm.get('selections') as FormArray;
  }

  addTest() {
    this.selections.push(
      this.fb.group({
        department: [''],
        method: [''],
        subGroupName: [''],
        selectedInvoiceOptions: this.fb.group({})
      })
    );
  }

  calculateTotalPrice(selectionIndex: number): number {
    const selection = this.selections.at(selectionIndex).value;
    let total = 0;
    const selectedInvoiceOptions = selection.selectedInvoiceOptions;
    for (const key in selectedInvoiceOptions) {
      const value = selectedInvoiceOptions[key];
      const department = this.labDepartments.find(d => d.name === selection.department);
      const method = department?.testMethods.find(m => m.name === selection.method);
      const subgroup = method?.subGroups.find(sg => sg.name === selection.subGroupName);
      const invoiceCase = subgroup?.invoiceCases.find(ic => ic.label === key);
      const option = invoiceCase?.options.find((opt: any) => opt.value === value);
      if (option) total += option.basePrice;
    }
    return total;
  }
  get testMethodsForSelectedDepartment() {
    const department = this.selections.at(0)?.value.department;
    const dept = this.labDepartments.find(d => d.name === department);
    return dept?.testMethods || [];
  }
  get selectedDepartment() {
    const firstSelection = this.selections.at(0)?.value;
    return this.labDepartments.find(d => d.name === firstSelection?.department);
  }
  
  get selectedMethod() {
    const firstSelection = this.selections.at(0)?.value;
    return this.selectedDepartment?.testMethods.find(m => m.name === firstSelection?.method);
  }
  
  get selectedSubGroup() {
    const firstSelection = this.selections.at(0)?.value;
    return this.selectedMethod?.subGroups.find(sg => sg.name === firstSelection?.subGroupName);
  }
  
  
}
