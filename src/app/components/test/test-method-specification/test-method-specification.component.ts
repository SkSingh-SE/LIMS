import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Observable } from 'rxjs';
import { StandardOrgnizationService } from '../../../services/standard-orgnization.service';
import { TestMethodSpecificationService } from '../../../services/test-method-specification.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { VersionStatus } from '../../../utility/status_flow/enums/version-status.enum';
import { YearHelper } from '../../../utility/helper/year.helper';

@Component({
  selector: 'app-test-method-specification',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, SearchableDropdownComponent],
  templateUrl: './test-method-specification.component.html',
  styleUrl: './test-method-specification.component.css',
})
export class TestMethodSpecificationComponent implements OnInit {
  testSpecificationForm!: FormGroup;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  yearOptions: number[] = YearHelper.standardYears();
  selectedStandardOrganization: any = {};
  testMethodSpecificationID: number = 0;
  VersionStatus = VersionStatus;

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private standardOrganizationService: StandardOrgnizationService,
    private testMethodService: TestMethodSpecificationService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
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
      this.onActivateVersion(0);
    }
  }

  initForm() {
    this.testSpecificationForm = this.fb.group({
      id: [0],
      isDisabled: [false],
      standardOrganizationID: ['', Validators.required],
      testMethodStandard: ['', Validators.required],
      name: ['', Validators.required],
      part: [''],
      versions: this.fb.array([]),
    });
  }
  get versions(): FormArray {
    return this.testSpecificationForm.get('versions') as FormArray;
  }

  createVersionGroup(flag: boolean = false): FormGroup {
    return this.fb.group({
      id: [0],
      testMethodSpecificationID: [0],
      status: [VersionStatus.Draft],
      version: ['', Validators.required],
      year: [null],
      effectiveDate: [new Date().toISOString().split('T')[0]],
      supersededDate: [null],
      reviewDate: [null],
      changeReason: [''],
      standardFile: ['', Validators.required],
      standardFilePath: [''],
      uploadReferenceID: [null],
      file: [null],
      isVersionAdded: [flag],
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
      const version = this.versions.at(index);
      // Only allow removing Draft versions that haven't been saved
      if (version.get('status')?.value === VersionStatus.Superseded || version.get('status')?.value === VersionStatus.Withdrawn) {
        this.toastService.show('Cannot remove superseded or withdrawn versions.', 'warning');
        return;
      }
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
            part: response.part || '',
            isDisabled: response.isDisabled,
          });
          this.versions.clear();

          // Versions come pre-sorted from API (Active first)
          response.versions.forEach((version: any) => {
            const versionGroup = this.createVersionGroup();
            versionGroup.patchValue({
              id: version.id,
              testMethodSpecificationID: version.testMethodSpecificationID,
              status: version.status,
              version: version.version,
              year: version.year != null ? +version.year : null,
              effectiveDate: version.effectiveDate ? version.effectiveDate.split('T')[0] : null,
              supersededDate: version.supersededDate ? version.supersededDate.split('T')[0] : null,
              reviewDate: version.reviewDate ? version.reviewDate.split('T')[0] : null,
              changeReason: version.changeReason,
              standardFile: version.standardFile,
              standardFilePath: version.standardFilePath,
              uploadReferenceID: version.uploadReferenceID,
            });
            this.versions.push(versionGroup);
          });

          // Disable read-only versions (Superseded/Withdrawn)
          this.applyVersionDisabledState();

          if (this.isViewMode) {
            this.testSpecificationForm.disable();
          }
          if (this.testSpecificationForm.get('isDisabled')?.value) {
            this.testSpecificationForm.disable();
          } else {
            this.testSpecificationForm.enable();
            this.testSpecificationForm.get('isDisabled')?.enable();
            // Re-apply version disabled state after enabling form
            this.applyVersionDisabledState();
          }
        }
      },
      error: (error) => {
        this.toastService.show(error.message, 'error');
      },
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
        'image/png',
      ];

      if (!allowedTypes.includes(file.type)) {
        this.toastService.show('Invalid file type', 'warning');
        event.target.value = '';
        return;
      }
      this.versions.at(index).patchValue({ standardFile: file.name, file: file });
    }
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
      const baseUrl = environment.baseUrl;
      const fullUrl = baseUrl + filePath;
      window.open(fullUrl, '_blank');
    }
  }
  removeFile(index: number): void {
    this.versions.at(index).patchValue({ standardFile: '', standardFilePath: '', file: null, uploadReferenceID: null });
  }

  getCaption(year: any): string {
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
        },
      });
    } else {
      this.testSpecificationForm.get('isDisabled')?.setValue(false);
    }
  }

  applyVersionDisabledState() {
    this.versions.controls.forEach((group, idx) => {
      const status = group.get('status')?.value;
      if (status === VersionStatus.Superseded || status === VersionStatus.Withdrawn) {
        group.disable({ emitEvent: false });
        // Keep status readable for UI badges
        group.get('status')?.enable({ emitEvent: false });
      } else {
        group.enable({ emitEvent: false });
      }
    });
  }

  onActivateVersion(index: number) {
    const versions = this.testSpecificationForm.get('versions') as FormArray;
    versions.controls.forEach((group, idx) => {
      if (idx !== index) {
        const currentStatus = group.get('status')?.value;
        if (currentStatus === VersionStatus.Active) {
          group.get('status')?.setValue(VersionStatus.Superseded, { emitEvent: false });
          group.get('supersededDate')?.setValue(new Date().toISOString().split('T')[0], { emitEvent: false });
        }
      } else {
        group.get('status')?.setValue(VersionStatus.Active, { emitEvent: false });
        group.get('effectiveDate')?.setValue(new Date().toISOString().split('T')[0], { emitEvent: false });
      }
    });
    this.applyVersionDisabledState();
  }

  onWithdrawVersion(index: number) {
    const reason = prompt('Enter reason for withdrawal:');
    if (reason !== null) {
      const version = this.versions.at(index);
      version.get('status')?.setValue(VersionStatus.Withdrawn);
      version.get('changeReason')?.setValue(reason);
      version.get('supersededDate')?.setValue(new Date().toISOString().split('T')[0]);
      this.applyVersionDisabledState();
    }
  }

  isVersionReadOnly(index: number): boolean {
    const status = this.versions.at(index).get('status')?.value;
    return status === VersionStatus.Superseded || status === VersionStatus.Withdrawn;
  }

  getStatusLabel(index: number): string {
    const status = this.versions.at(index).get('status')?.value;
    switch (status) {
      case VersionStatus.Active:
        return 'CURRENT';
      case VersionStatus.Draft:
        return 'DRAFT';
      case VersionStatus.Superseded:
        return 'SUPERSEDED';
      case VersionStatus.Withdrawn:
        return 'WITHDRAWN';
      default:
        return '';
    }
  }

  getStatusBadgeClass(index: number): string {
    const status = this.versions.at(index).get('status')?.value;
    switch (status) {
      case VersionStatus.Active:
        return 'bg-success';
      case VersionStatus.Draft:
        return 'bg-warning text-dark';
      case VersionStatus.Superseded:
        return 'bg-secondary';
      case VersionStatus.Withdrawn:
        return 'bg-danger';
      default:
        return 'bg-light';
    }
  }

  submit() {
    if (this.testSpecificationForm.valid) {
      const raw = this.testSpecificationForm.getRawValue();
      const formData = new FormData();
      formData.append('id', raw.id.toString());
      formData.append('standardOrganizationID', raw.standardOrganizationID);
      formData.append('testMethodStandard', raw.testMethodStandard);
      formData.append('name', raw.name);
      formData.append('part', raw.part || '');
      formData.append('isDisabled', raw.isDisabled ? 'true' : 'false');

      const versionsArray: any[] = [];

      raw.versions.forEach((version: any) => {
        versionsArray.push({
          id: version.id,
          testMethodSpecificationID: version.testMethodSpecificationID,
          status: version.status,
          version: version.version,
          year: version.year,
          effectiveDate: version.effectiveDate,
          supersededDate: version.supersededDate,
          reviewDate: version.reviewDate,
          changeReason: version.changeReason,
          standardFile: version.standardFile,
          standardFilePath: version.standardFilePath,
          uploadReferenceID: version.uploadReferenceID || null,
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
          },
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
          },
        });
      }
    } else {
      this.testSpecificationForm.markAllAsTouched();
    }
  }

  moveVersionUp(index: number): void {
    if (index === 0) return;
    const versions = this.versions;
    const current = versions.at(index);
    versions.removeAt(index);
    versions.insert(index - 1, current);
  }

  moveVersionDown(index: number): void {
    if (index >= this.versions.length - 1) return;
    const versions = this.versions;
    const current = versions.at(index);
    versions.removeAt(index);
    versions.insert(index + 1, current);
  }
}
