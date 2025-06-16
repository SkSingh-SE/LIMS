import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-test-method-specification',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownComponent],
  templateUrl: './test-method-specification.component.html',
  styleUrl: './test-method-specification.component.css'
})
export class TestMethodSpecificationComponent implements OnInit {
  testSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  selectedStandardOrganization: any = {};
  testMethodSpecificationID: number = 0;

  constructor(private fb: FormBuilder, private toastService: ToastService, private standardOrganizationService: StandardOrgnizationService, private testMethodService: TestMethodSpecificationService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.testMethodSpecificationID = Number(params.get('id'));
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
    if (this.testMethodSpecificationID > 0) {
      this.loadTestMethodSpecification(this.testMethodSpecificationID);
    } else {
      this.addVersion(true);
      this.onDefaultChange(0);
    }
  }

  initForm() {
    this.testSpecificationForm = this.fb.group({
      id: [0],
      isDisabled: [false],
      standardOrganizationID: ['', Validators.required],
      testMethodStandard: ['', Validators.required],
      name: ['', Validators.required],
      part:[''],
      versions: this.fb.array([])
    });
  }
  get versions(): FormArray {
    return this.testSpecificationForm.get('versions') as FormArray;
  }

  createVersionGroup(flag: boolean = false): FormGroup {
    return this.fb.group({
      id: [0],
      testMethodSpecificationID: [0],
      default: [false],
      version: ['', Validators.required],
      standardFile: ['', Validators.required],
      standardFilePath: [''],
      uploadReferenceID: [null],
      file: [null],
      isVersionAdded: [flag]
    });
  }

  addVersion(flag: boolean = false): void {
    if (flag) {
      this.versions.insert(0, this.createVersionGroup(flag));
    } else {
      this.versions.push(this.createVersionGroup(flag));
    }
  }

  removeVersion(index: number): void {
    if (this.versions.length > 1) {
      this.versions.removeAt(index);
    }
  }

  showaddVersionButton(): boolean {
    let isVersionAdded = false;
    this.versions.controls.forEach((group: any) => {
      if (group.get('isVersionAdded')?.value) {
        isVersionAdded = true;
      }
    });
    return !isVersionAdded;
  }

  loadTestMethodSpecification(id: number) {
    this.testMethodService.getTestMethodSpecificationById(id).subscribe({
      next: (response) => {
        if (response) {
          this.testSpecificationForm.patchValue({
            id: response.id,
            standardOrganizationID: response.standardOrganizationID,
            testMethodStandard: response.testMethodStandard,
            name: response.name,
            isDisabled: response.isDisabled
          });
          this.versions.clear();

          // Ensure only one default is true and put default version at the top
          let defaultFound = false;
          response.versions.forEach((version: any) => {
            if (version.default && !defaultFound) {
              defaultFound = true;
              const versionGroup = this.createVersionGroup();
              versionGroup.patchValue(version);
              this.versions.insert(0, versionGroup); // insert default version at top
            } else {
              version.default = false;
              const versionGroup = this.createVersionGroup();
              versionGroup.patchValue(version);
              this.versions.push(versionGroup);
            }
          });

          if (this.isViewMode) {
            this.testSpecificationForm.disable();
          }
          if (this.testSpecificationForm.get('isDisabled')?.value) {
            this.testSpecificationForm.disable();
          } else {
            this.testSpecificationForm.enable();
            this.testSpecificationForm.get('isDisabled')?.enable(); // Keep checkbox enabled
          }
        }
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
      }
    });
  }

  getStandardOrganization = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.standardOrganizationService.getStandardOrganizationDropdown(term, page, pageSize);
  };
  onOrganizationSelected(item: any) {
    this.testSpecificationForm.patchValue({ standardOrganizationID: item.id });
    this.selectedStandardOrganization = item;
  }

  onFileChange(event: any, index: number) {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.toastService.show(`File size  should be less than 5 MB.`, 'warning');
        event.target.value = '';
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.type)) {
        this.toastService.show('Invalid file type', 'warning');
        event.target.value = '';
        return;
      }
      let previewUrl = '';
      const reader = new FileReader();
      reader.onload = () => {
        previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
      this.versions.at(index).patchValue({ standardFile: file.name, file: file });
    }
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
      const baseUrl = 'https://localhost:7049/';
      const fullUrl = baseUrl + filePath;
      window.open(fullUrl, '_blank');
    } else {

    }
  }
  removeFile(index: number): void {
    this.versions.at(index).patchValue({ standardFile: '', file: null });
  }

  getCaption(year: string): string {
    const org = this.selectedStandardOrganization?.name;
    const std = this.testSpecificationForm.get('testMethodStandard')?.value;
    return org && std && year ? `${org} ${std} - ${year}` : '';
  }

  onDisable() {
    if (confirm('Are you sure you want to disable this test method specification?')) {
      this.testMethodService.enable_disableTestMethodSpecification(this.testMethodSpecificationID).subscribe({
        next: (response) => {
          this.testMethodSpecificationID = response.id;
          this.toastService.show(response.message, 'success');
          this.router.navigate(['/test-specification']);
        },
        error: (error) => {
          console.error(error);
          this.toastService.show(error.message, 'error');
        }
      });
    } else {
      this.testSpecificationForm.get('isDisabled')?.setValue(false);
    }


  }

  submit() {
    if (this.testSpecificationForm.valid) {
      console.log(this.testSpecificationForm.value);
      const raw = this.testSpecificationForm.getRawValue();
      const formData = new FormData();
      formData.append('id', raw.id.toString());
      formData.append('standardOrganizationID', raw.standardOrganizationID);
      formData.append('testMethodStandard', raw.testMethodStandard);
      formData.append('name', raw.name);
      formData.append('isDisabled', raw.isDisabled ? 'true' : 'false');

      const versionsArray: any[] = [];

      raw.versions.forEach((version: any) => {
        versionsArray.push({
          id: version.id,
          testMethodSpecificationID: version.testMethodSpecificationID,
          default: version.default,
          version: version.version,
          year: version.year,
          standardFile: version.standardFile,
          standardFilePath: version.standardFilePath,
          uploadReferenceID: version.uploadReferenceID || null
        });

        if (version.file) {
          formData.append('files', version.file, version.standardFile);
        }
      });
      formData.append('versions', JSON.stringify(versionsArray));

      if (this.testMethodSpecificationID > 0) {
        this.testMethodService.updateTestMethodSpecification(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.testSpecificationForm.reset();
            this.versions.clear();
            this.router.navigate(['/test-specification']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        });
      } else {
        this.testMethodService.createTestMethodSpecification(formData).subscribe({
          next: (response) => {
            this.toastService.show(response.message, 'success');
            this.testSpecificationForm.reset();
            this.versions.clear();
            this.versions.push(this.createVersionGroup());
            this.router.navigate(['/test-specification']);
          },
          error: (error) => {
            this.toastService.show(error.message, 'error');
          }
        });
      }

    } else {
      this.testSpecificationForm.markAllAsTouched();
    }
  }
  onDefaultChange(selectedIndex: number) {
    const versions = this.testSpecificationForm.get('versions') as FormArray;
    versions.controls.forEach((group, idx) => {
      if (idx !== selectedIndex) {
        group.get('default')?.setValue(false, { emitEvent: false });
      }else{
        group.get('default')?.setValue(true, { emitEvent: false });
      }
    });
  }
  moveVersionUp(index: number): void {
    if (index === 0) return;
    const versions = this.versions;
    const current = versions.at(index);
    versions.removeAt(index);
    versions.insert(index - 1, current);
    this.onDefaultChange(index - 1);
  }

  moveVersionDown(index: number): void {
    if (index >= this.versions.length - 1) return;
    const versions = this.versions;
    const current = versions.at(index);
    versions.removeAt(index);
    versions.insert(index + 1, current);
    this.onDefaultChange(index + 1);
  }


}