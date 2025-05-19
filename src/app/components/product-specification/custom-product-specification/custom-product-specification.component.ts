import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductSpecificationService } from '../../../services/product-specification.service';
import { ToastService } from '../../../services/toast.service';
import { MaterialSpecificationService } from '../../../services/material-specification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-custom-product-specification',
  imports: [CommonModule,ReactiveFormsModule,FormsModule,SearchableDropdownComponent],
  templateUrl: './custom-product-specification.component.html',
  styleUrl: './custom-product-specification.component.css'
})
export class CustomProductSpecificationComponent implements OnInit {

  specificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute, private productSpecificationService: ProductSpecificationService, private toastService: ToastService, private materialSpecificationService: MaterialSpecificationService) { }

  ngOnInit(): void {
    this.initForm();
  }
  initForm() {
    this.specificationForm = this.fb.group({
      id: [0],
      specificationName: ['', [Validators.required, Validators.maxLength(100)]],
      aliasName: ['', [Validators.maxLength(100)]],
      specificationCode: ['', [Validators.maxLength(100)]],
      materialMapping: this.fb.array([]),
      testMapping: this.fb.array([])
    });
  }
  get materialMapping(): FormArray {
    return this.specificationForm.get('materialMapping') as FormArray;
  }

  get testMapping(): FormArray {
    return this.specificationForm.get('testMapping') as FormArray;
  }

  addMaterial(material: any = {}): void {
    this.materialMapping.push(this.fb.group({
      specificationID: [material.specificationID || null],
      materialID: [material.materialID || null],
      materialName: [material.materialName || '']
    }));
  }

  removeMaterial(index: number): void {
    this.materialMapping.removeAt(index);
  }

  addTest(test: any = {}): void {
    this.testMapping.push(this.fb.group({
      specificationID: [test.specificationID || null],
      testID: [test.testID || null],
      testName: [test.testName || ''],
      testRequired: [test.testRequired || ''],
      perBatchTesting: [test.perBatchTesting || 0],
      testMethod: [test.testMethod || ''],
      year: [test.year || ''],
    }));
  }

  removeTest(index: number): void {
    this.testMapping.removeAt(index);
  }

  onSubmit(): void {
    if (this.specificationForm.valid) {
      const payload = this.specificationForm.value;
      console.log('Submit payload:', payload);
      // Submit to backend
    } else {
      this.specificationForm.markAllAsTouched();
    }
  }
   getMaterialSpecification = (term: string, page: number, pageSize: number): Observable<any[]> => {
      return this.materialSpecificationService.getMaterialSpecificationDropdown(term, page, pageSize);
    };
    onMaterialSelected(item: any, index: number) {
      const materialGroup = this.materialMapping.at(index) as FormGroup;
      materialGroup.patchValue({
        materialID: item.id,
        materialName: item.name
      });
    }
}
