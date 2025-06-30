import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../services/toast.service';
import { InvoiceCaseConfigurationService } from '../../../services/invoice-case-configuration.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-invoice-case-configuration',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invoice-case-configuration.component.html',
  styleUrl: './invoice-case-configuration.component.css'
})
export class InvoiceCaseConfigurationComponent implements OnInit {
  invoiceForm!: FormGroup;
  invoiceId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;

  selectionTypes = [
    { label: 'Element', value: 'Element' },
    { label: 'Hours', value: 'Hours' },
    { label: 'Size', value: 'Size' },
    { label: 'Weight', value: 'Weight' },
    { label: 'Temprature', value: 'Temprature' },
    { label: 'Hours Range', value: 'HoursRange' },
    { label: 'Size Range', value: 'SizeRange' },
    { label: 'Weight Range', value: 'WeightRange' },
    { label: 'Temprature Range', value: 'TempratureRange' },
    { label: 'Spectro Combination', value: 'SpectroCombination' }
  ];

  unitMap: { [key: string]: string } = {
    Element: 'Element',
    Hours: 'hr',
    Size: 'mm',
    Weight: 'kn',
    Temprature: '°C',
    HoursRange: 'hr',
    SizeRange: 'mm',
    WeightRange: 'kn',
    TempratureRange: '°C',
  };

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private router: Router, private toastService: ToastService, private invoiceCaseConfig: InvoiceCaseConfigurationService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.invoiceId = Number(params.get('id'));
    });
    const state = history.state as { mode?: string };

    if (state) {
      if (state.mode === 'view') {
        this.isViewMode = true;
      }
      if (state.mode === 'edit') {
        this.isEditMode = true;
      }
    }
    this.initForm();
    if (this.invoiceId > 0) {
      this.fetchInvoiceConfig(this.invoiceId);
    } else {
      this.addConfiguration(); // one row to start
    }
  }

  initForm() {
    this.invoiceForm = this.fb.group({
      configurations: this.fb.array([]),
    });
  }
  get configurations(): FormArray {
    return this.invoiceForm.get('configurations') as FormArray;
  }

  createAliasNameGroup(configIndex: number | null): FormGroup {
    let id = 0
    if (configIndex) {
      id = this.configurations.at(configIndex).get('id')?.value;
    }
    return this.fb.group({
      id: [0],
      invoiceConfigurationID: [id],
      name: ['']
    });
  }
  addConfiguration(): void {
    this.configurations.push(
      this.fb.group({
        id: [0],
        selectionType: ['', Validators.required],
        name: [''],
        aliasName: [''],
        aliasNames: this.fb.array([this.createAliasNameGroup(null)]),
        value: [''],
        start: [''],
        end: [''],
        unit: ['']
      })
    );
  }
  getAliasNames(configIndex: number): FormArray {
    return this.configurations.at(configIndex).get('aliasNames') as FormArray;
  }

  addAlias(configIndex: number): void {
    this.getAliasNames(configIndex).push(this.createAliasNameGroup(configIndex));
  }

  removeAlias(configIndex: number, aliasIndex: number): void {
    this.getAliasNames(configIndex).removeAt(aliasIndex);
  }

  onTypeChange(index: number): void {
    const group = this.configurations.at(index) as FormGroup;
    const type = group.get('selectionType')?.value;

    // type is now the value string from the object
    const isRange = type.toLowerCase().includes('range');
    group.patchValue({
      value: '',
      start: '',
      end: '',
      unit: this.unitMap[type] || ''
    });

    if (isRange) {
      group.get('start')?.setValidators([Validators.required]);
      group.get('end')?.setValidators([Validators.required]);
      group.get('value')?.clearValidators();
    } else {
      group.get('value')?.setValidators([Validators.required]);
      group.get('start')?.clearValidators();
      group.get('end')?.clearValidators();
    }

    group.get('value')?.updateValueAndValidity();
    group.get('start')?.updateValueAndValidity();
    group.get('end')?.updateValueAndValidity();
  }

  updateName(index: number): void {
    const group = this.configurations.at(index) as FormGroup;
    let name = group.get('value')?.value;
    name = name + " " + group.get('unit')?.value;
    group.patchValue({ name: name });

  }
  updateRangeName(index: number): void {
    const group = this.configurations.at(index) as FormGroup;
    let name = group.get('start')?.value + " - " + group.get('end')?.value;
    name = name + " " + group.get('unit')?.value;
    group.patchValue({ name: name });
  }
  submit(): void {
    if (this.invoiceForm.valid) {
      const payload = this.invoiceForm.getRawValue();
      payload.configurations?.forEach((x: any) => {
        let aliasNames = x.aliasNames;
        // Convert array of objects to comma separated string of names
        x.aliasName = aliasNames.map((a: any) => a.name).join(', ');
      })
      console.log(payload);
      if (this.invoiceId > 0) {
        this.invoiceCaseConfig.updateInvoiceCaseConfig(payload.configurations).subscribe({
          next: (res: any) => {
            this.toastService.show(res.message, 'success');
          },
          error: (err: any) => {
            this.toastService.show(err.error.message, 'error');
          }
        })
      } else {
        this.invoiceCaseConfig.createInvoiceCaseConfig(payload.configurations).subscribe({
          next: (res: any) => {
            this.toastService.show(res.message, 'success');
          },
          error: (err: any) => {
            this.toastService.show(err.error.message, 'error');
          }
        })
      }
    } else {
      this.invoiceForm.markAllAsTouched();
    }


  }

  removeConfiguration(index: number): void {
    this.configurations.removeAt(index);
  }
  fetchInvoiceConfig(id: number) {
    this.invoiceCaseConfig.getInvoiceCaseConfigById(id).subscribe({
      next: (res: any) => {
        if (res) {
          const aliasArray: FormArray<FormGroup> = this.fb.array<FormGroup>([]);

          (res.aliasNames || []).forEach((alias: any) => {
            const aliasGroup = this.fb.group({
              id: [alias.id],
              invoiceConfigurationID: [alias.invoiceConfigurationID],
              name: [alias.name]
            });
            aliasArray.push(aliasGroup);
          });
            const configGroup = this.fb.group({
              id: [res.id],
              selectionType: [res.selectionType, Validators.required],
              name: [res.name],
              aliasName: [res.aliasName],
              aliasNames: aliasArray,
              value: [res.value],
              start: [res.start],
              end: [res.end],
              unit: [res.unit]
            });
            this.configurations.push(configGroup);
          
        }
      },
      error: (err: any) => {
        this.toastService.show(err.error.message, 'error');
      }
    })
  }
}
