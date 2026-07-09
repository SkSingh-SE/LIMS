import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownModalComponent } from '../../../utility/components/searchable-dropdown-modal/searchable-dropdown-modal.component';
import { Observable } from 'rxjs';
import { DepartmentService } from '../../../services/department.service';
import { OEMService } from '../../../services/oem.service';
import { CalibrationAgencyService } from '../../../services/calibration-agency.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { MultiSelectDropdownComponent } from '../../../utility/components/multi-select-dropdown/multi-select-dropdown.component';
import { Modal } from 'bootstrap';
import { EquipmentTypeService } from '../../../services/equipment-type.service';
import { EquipmentService } from '../../../services/equipment.service';
import { EquipmentReferenceMaterialService } from '../../../services/equipment-reference-material.service';
import { AnalysisTechniqueService } from '../../../services/analysis-technique.service';
import { environment } from '../../../../environments/environment';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { noWhitespaceValidator } from '../../../utility/validators/custom-validators';
import { FormValidationHelper } from '../../../utility/helper/form-validation.helper';
import { FormFieldErrorComponent } from '../../../utility/components/form-field-error/form-field-error.component';

@Component({
  selector: 'app-equipment-form',
  imports: [FormsModule, CommonModule, ReactiveFormsModule, RouterLink, SearchableDropdownComponent, SearchableDropdownModalComponent, MultiSelectDropdownComponent, FormFieldErrorComponent],
  templateUrl: './equipment-form.component.html',
  styleUrl: './equipment-form.component.css',
})
export class EquipmentFormComponent implements OnInit, CanComponentDeactivate {
  saved = false;
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;

  equipmentForm!: FormGroup;
  submitted = false;
  calibrationForm!: FormGroup;
  maintenanceForm!: FormGroup;
  sopAttachmentForm!: FormGroup;
  sopVideoForm!: FormGroup;
  equipmentId: number = 0;
  isViewMode: boolean = false;
  isEditMode: boolean = false;
  calibrationDue = false;
  maintenanceDue = false;
  modalVisible = false;
  intervalOptions: string[] = ['3 Months', '4 Months', '6 Months', '1 Year', '2 Years'];

  intermediateCheckintervalOptions: string[] = ['EveryDay', 'Weekly', '1 Month', '3 Months', '4 Months', '6 Months', '1 Year', '2 Years'];

  sopAttachments: Array<{ id: number; title: string; name: string; type: string; url: string }> = [];
  sopVideos: Array<{ id: number; title: string; name: string; type: string; url: string }> = [];

  referenceMaterials: any[] = [];
  refMaterialForm!: FormGroup;
  materialTypeOptions: string[] = ['CRM', 'SUS'];

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private departmentService: DepartmentService,
    private oemService: OEMService,
    private agencyService: CalibrationAgencyService,
    private equipmentTypeService: EquipmentTypeService,
    private equipmentService: EquipmentService,
    private refMaterialService: EquipmentReferenceMaterialService,
    private analysisTechniqueService: AnalysisTechniqueService,
    private route: ActivatedRoute,
    private router: Router,
    private unsavedChangesService: UnsavedChangesService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.equipmentId = Number(params.get('id'));
    });

    const urlPath = this.route.snapshot.url.map(s => s.path).join('/');
    const state = history.state as { mode?: string };
    const stateMode = state?.mode;

    if (urlPath.includes('edit') || stateMode === 'edit') {
      this.isEditMode = true;
    } else if (urlPath.includes('details') || urlPath.includes('view') || stateMode === 'view') {
      this.isViewMode = true;
    }
    this.initForm();
    this.initCalibrationForm();
    this.initMaintenanceForm();
    this.initSOPForms();
    this.initRefMaterialForm();
    this.setupAutoDueDateCalculation();
    this.checkDueDates();
    this.listenToDueDateChanges();
    if (this.equipmentId > 0) {
      this.loadEquipment(this.equipmentId);
      this.loadReferenceMaterials();
    }
  }

  initForm(): void {
    this.equipmentForm = this.fb.group({
      id: [0],
      name: ['', [Validators.required, Validators.maxLength(200), noWhitespaceValidator()]],
      equipmentNo: ['', [Validators.required, Validators.maxLength(50), noWhitespaceValidator()]],
      departmentID: ['', Validators.required],
      equipmentTypeID: ['', Validators.required],
      oemID: ['', Validators.required],
      modelNo: [''],
      purchaseDate: ['', Validators.required],
      calibrationRequired: [false],
      nextCalibrationDueDate: [null],
      maintenanceRequired: [false],
      maintenanceInterval: [''],
      nextMaintenanceDueDate: [null],
      internalExternal: ['', Validators.required],
      intermediateCheckRequired: [true],
      intermediateCheckInterval: [''],
      lastCalibrationDate: [null],
      calibrationFrequencyDays: [null],
      maintenanceSchedule: [''],
      techniqueIds: [[]],
      analysisTechniques: this.fb.array([]),
      calibrations: this.fb.array([]),
      maintenances: this.fb.array([]),
      sops: this.fb.array([]),
    });
  }
  initCalibrationForm(): void {
    this.calibrationForm = this.fb.group({
      id: [0],
      equipmentID: [this.equipmentId],
      calibrationDate: [''],
      calibrationDueDate: [''],
      certificate: [''],
      certificatePath: [''],
      agency: [''],
      calibrationAgencyID: [null],
      file: [File],
      isReviewed: [false],
    });
  }
  initMaintenanceForm(): void {
    this.maintenanceForm = this.fb.group({
      id: [0],
      equipmentID: [this.equipmentId],
      maintenanceDate: [''],
      certificate: [''],
      certificatePath: [''],
      file: [File],
    });
  }
  initSOPForms(): void {
    this.sopAttachmentForm = this.fb.group({
      id: [0],
      equipmentID: [this.equipmentId],
      title: ['', Validators.required],
      fileName: ['', Validators.required],
      filePath: [''],
      file: [null, Validators.required],
      type: ['attachment'],
    });

    this.sopVideoForm = this.fb.group({
      id: [0],
      equipmentID: [this.equipmentId],
      title: ['', Validators.required],
      fileName: ['', Validators.required],
      filePath: [''],
      file: [null, Validators.required],
      type: ['video'],
    });
  }
  get equipmentFormGroup(): FormGroup {
    return this.equipmentForm;
  }
  get calibrationFormGroup(): FormGroup {
    return this.calibrationForm;
  }
  get maintenanceFormGroup(): FormGroup {
    return this.maintenanceForm;
  }
  get calibrationRecords(): FormArray {
    return this.equipmentForm.get('calibrations') as FormArray;
  }
  get maintenanceRecords(): FormArray {
    return this.equipmentForm.get('maintenances') as FormArray;
  }
  get sopAttachmentsArray(): FormArray {
    return this.equipmentForm.get('sops') as FormArray;
  }
  loadEquipment(id: number): void {
    this.equipmentService.getEquipmentById(id).subscribe({
      next: data => {
        this.equipmentForm.patchValue({
          id: data.id,
          name: data.name,
          equipmentNo: data.equipmentNo,
          departmentID: data.departmentID,
          equipmentTypeID: data.equipmentTypeID,
          oemID: data.oemid,
          modelNo: data.modelNo,
          purchaseDate: data.purchaseDate ? data.purchaseDate.split('T')[0] : '',
          calibrationRequired: data.calibrationRequired,
          nextCalibrationDueDate: data.nextCalibrationDueDate ? data.nextCalibrationDueDate.split('T')[0] : '',
          maintenanceRequired: data.maintenanceRequired,
          maintenanceInterval: data.maintenanceInterval,
          nextMaintenanceDueDate: data.nextMaintenanceDueDate ? data.nextMaintenanceDueDate.split('T')[0] : '',
          internalExternal: data.internalExternal,
          intermediateCheckRequired: data.intermediateCheckRequired,
          intermediateCheckInterval: data.intermediateCheckInterval,
          lastCalibrationDate: data.lastCalibrationDate ? data.lastCalibrationDate.split('T')[0] : '',
          calibrationFrequencyDays: data.calibrationFrequencyDays,
          maintenanceSchedule: data.maintenanceSchedule || '',
        });
        if (data.calibrations && data.calibrations.length > 0) {
          data.calibrations.forEach((calibration: any) => {
            this.calibrationRecords.push(
              this.fb.group({
                id: [calibration.id],
                equipmentID: [calibration.equipmentID],
                calibrationDate: [calibration.calibrationDate ? calibration.calibrationDate.split('T')[0] : ''],
                calibrationDueDate: [calibration.calibrationDueDate ? calibration.calibrationDueDate.split('T')[0] : ''],
                certificate: [calibration.certificate],
                certificatePath: [calibration.certificatePath],
                agency: [calibration.agency],
                calibrationAgencyID: [calibration.calibrationAgencyID],
                file: [null],
                isReviewed: [calibration.isReviewed],
              })
            );
          });
        }

        if (data.maintenances && data.maintenances.length > 0) {

          data.maintenances.forEach((record: any) => {
            this.maintenanceRecords.push(
              this.fb.group({
                id: [record.id],
                equipmentID: [record.equipmentID],
                maintenanceDate: [record.maintenanceDate ? record.maintenanceDate.split('T')[0] : ''],
                certificate: [record.certificate],
                certificatePath: [record.certificatePath],
                file: [null],
              })
            );
          });
        }
        if (data.soPs && data.soPs.length > 0) {
          this.sopAttachments = [];
          this.sopVideos = [];
          data.soPs.forEach((sop: any) => {
            this.sopAttachmentsArray.push(
              this.fb.group({
                id: [sop.id],
                equipmentId: [sop.equipmentID],
                title: [sop.title],
                fileName: [sop.fileName],
                filePath: [sop.filePath],
                file: [null],
                type: [sop.type],
                uploadReferenceID: [sop.uploadReferenceID],
              })
            );

            if (sop.type === 'video') {
              this.sopVideos.push({ id: sop.id, title: sop.title || '', name: sop.fileName, type: sop.type, url: sop.filePath });
            }
            if (sop.type === 'attachment') {
              this.sopAttachments.push({ id: sop.id, title: sop.title || '', name: sop.fileName, type: sop.type, url: sop.filePath });
            }
          });
          this.optimizeVideoPlayback();
        }
        // Rebind analysis techniques (A4) — junction → multiselect + FormArray
        const techItems = data.analysisTechniques ?? [];
        this.equipmentForm.patchValue({
          techniqueIds: techItems.map((x: any) => x.analysisTechniqueID),
        });
        const techArray = this.equipmentForm.get('analysisTechniques') as FormArray;
        techArray.clear();
        techItems.forEach((x: any) => {
          techArray.push(this.fb.group({ analysisTechniqueID: [x.analysisTechniqueID] }));
        });
        if (this.isViewMode) {
          this.equipmentForm.disable();
        }
      },
      error: err => {
        console.error('Error loading equipment:', err);
      },
    });
  }

  setupAutoDueDateCalculation(): void {
    this.equipmentForm.get('calibrationRequired')?.valueChanges.subscribe(required => {
      if (required && !this.equipmentForm.get('nextCalibrationDueDate')?.value) {
        const calDue = this.calculateDueDate(new Date().toDateString(), 'EveryDay');
        this.equipmentForm.get('nextCalibrationDueDate')?.setValue(calDue);
      } else if (!required) {
        this.equipmentForm.get('nextCalibrationDueDate')?.setValue(null);
      }
    });

    this.calibrationForm.get('calibrationDueDate')?.valueChanges.subscribe(date => {
      if (date && this.calibrationForm.get('calibrationDate')?.value >= this.calibrationForm.get('calibrationDueDate')?.value) {
        this.toastService.show('Calibration Due Date should be greater than Calibration Date', 'warning');
        this.calibrationForm.get('calibrationDueDate')?.setValue('');
      }
      this.equipmentForm.get('nextCalibrationDueDate')?.setValue(date);
    });

    this.equipmentForm.get('maintenanceInterval')?.valueChanges.subscribe(interval => {
      if (interval) {
        const due = this.calculateDueDate(new Date().toDateString(), interval);
        this.equipmentForm.get('nextMaintenanceDueDate')?.setValue(due);
      }
    });
  }

  checkDueDates(): void {
    const today = this.getToday();
    const calDue = this.equipmentForm.get('nextCalibrationDueDate')?.value;
    const maintDue = this.equipmentForm.get('nextMaintenanceDueDate')?.value;

    this.calibrationDue = calDue ? calDue <= today : false;
    this.maintenanceDue = maintDue ? maintDue <= today : false;
  }

  listenToDueDateChanges(): void {
    this.equipmentForm.get('nextCalibrationDueDate')?.valueChanges.subscribe(() => this.checkDueDates());
    this.equipmentForm.get('nextMaintenanceDueDate')?.valueChanges.subscribe(() => this.checkDueDates());
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  calculateDueDate(startDate: string, interval: string): string {
    if (!startDate || !interval) return '';

    const match = interval.match(/(\d+)?\s*(EveryDay|Weekly|Month|Months|Year|Years)/i);
    if (!match) return '';

    const value = match[1] ? parseInt(match[1], 10) : 1;
    const unitRaw = match[2].toLowerCase();

    const date = new Date(startDate);
    if (isNaN(date.getTime())) return '';

    if (unitRaw === 'everyday') {
      // Add 1 day
      date.setDate(date.getDate() + 1);
    } else if (unitRaw === 'weekly') {
      // Add 7 days
      date.setDate(date.getDate() + 7);
    } else if (unitRaw.startsWith('month')) {
      let newMonth = date.getMonth() + value;
      let newYear = date.getFullYear() + Math.floor(newMonth / 12);
      newMonth = newMonth % 12;
      date.setMonth(newMonth);
      date.setFullYear(newYear);
    } else if (unitRaw.startsWith('year')) {
      date.setFullYear(date.getFullYear() + value);
    } else {
      // Default fallback: no change
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getDepartment = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.departmentService.getDepartmentDropdown(term, page, pageSize);
  };
  onDepartmentSelected(item: any) {
    if (!item) {
      this.equipmentForm.patchValue({ departmentID: null });
      return;
    }
    this.equipmentForm.patchValue({ departmentID: item.id });
  }
  getOEM = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.oemService.getOEMDropdown(term, page, pageSize);
  };
  onOEMSelected(item: any) {
    if (!item) {
      this.equipmentForm.patchValue({ oemID: null });
      return;
    }
    this.equipmentForm.patchValue({ oemID: item.id });
  }
  getCalibrationAgency = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.agencyService.getCalibrationAgencyDropdown(term, page, pageSize);
  };
  onCalibrationAgencySelected(item: any) {
    if (!item) {
      this.equipmentForm.patchValue({ 'calibration.calibrationAgencyID': null });
      return;
    }
    this.equipmentForm.patchValue({ 'calibration.calibrationAgencyID': item.id });
  }
  getEquipmentType = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.equipmentTypeService.getEquipmentTypeDropdown(term, page, pageSize);
  };
  onEquipmentTypeSelected(item: any) {
    if (!item) {
      this.equipmentForm.patchValue({ equipmentTypeID: null });
      return;
    }
    this.equipmentForm.patchValue({ equipmentTypeID: item.id });
  }
  getAnalysisTechnique = (term: string, page: number, pageSize: number): Observable<any[]> => {
    return this.analysisTechniqueService.getAnalysisTechniqueDropdown(term, page, pageSize);
  };
  onTechniqueSelected(items: any[]) {
    const ids = items.map(x => x.id ?? x);
    this.equipmentForm.patchValue({ techniqueIds: ids });
    const techArray = this.equipmentForm.get('analysisTechniques') as FormArray;
    techArray.clear();
    ids.forEach((id: number) => {
      techArray.push(this.fb.group({ analysisTechniqueID: [id] }));
    });
  }
  isFieldInvalid(path: string): boolean {
    return FormValidationHelper.isFieldInvalid(this.equipmentForm, path, this.submitted);
  }

  submit(): void {
    this.submitted = true;
    FormValidationHelper.markAllTouched(this.equipmentForm);
    if (!this.equipmentForm.valid) {
      this.toastService.show('Please fix the validation errors before submitting.', 'warning');
      return;
    }
    // Strip nested arrays — calibrations/maintenances/sops are managed via separate endpoints
    // Keep analysisTechniques — synced inline in the same save
    const { calibrations, maintenances, sops, techniqueIds, ...payload } = this.equipmentForm.value;
    payload.analysisTechniques = (this.equipmentForm.get('analysisTechniques') as FormArray).value;
    // Convert empty strings to proper types for backend
    if (!payload.nextCalibrationDueDate) payload.nextCalibrationDueDate = null;
    if (!payload.nextMaintenanceDueDate) payload.nextMaintenanceDueDate = null;
    if (!payload.lastCalibrationDate) payload.lastCalibrationDate = null;
    if (!payload.calibrationFrequencyDays && payload.calibrationFrequencyDays !== 0) payload.calibrationFrequencyDays = null;
    // Ensure numeric IDs are sent as numbers, not empty strings
    if (!payload.oemID) payload.oemID = 0;
    if (!payload.departmentID) payload.departmentID = 0;
    if (!payload.equipmentTypeID) payload.equipmentTypeID = 0;

    if (this.equipmentId > 0) {
      this.equipmentService.updateEquipment(payload).subscribe({
        next: response => {
          this.saved = true;
          this.toastService.show(response.message, 'success');
          this.router.navigate(['/equipment']);
        },
        error: () => {
        },
      });
    } else {
      this.equipmentService.createEquipment(payload).subscribe({
        next: response => {
          this.saved = true;
          this.toastService.show(response.message, 'success');
          this.router.navigate(['/equipment']);
        },
        error: () => {
        },
      });
    }
  }

  onFileChange(event: any, certificateType: 'calibration' | 'maintenance' | 'sop'): void {
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
      let previewUrl = '';
      const reader = new FileReader();
      reader.onload = () => {
        previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);

      if (certificateType === 'calibration') {
        this.calibrationForm.patchValue({
          certificate: file.name,
          file: file,
          certificatePath: previewUrl,
        });
      }
      if (certificateType === 'maintenance') {
        this.maintenanceForm.patchValue({
          certificate: file.name,
          file: file,
          certificatePath: previewUrl,
        });
      }
      if (certificateType === 'sop') {
        this.sopAttachmentForm.patchValue({
          fileName: file.name,
          filePath: previewUrl,
          file: file,
        });
        this.sopAttachmentForm.get('file')?.markAsTouched();
      }
    }
  }

  onSOPVideoChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { // 50 MB limit for videos
      this.toastService.show('File size should be less than 50 MB.', 'warning');
      event.target.value = '';
      return;
      }
    if(file.type !== 'video/mp4') {
      this.toastService.show('Invalid file type. Only MP4 videos are allowed.', 'warning');
      event.target.value = '';
      return;
    }

    this.sopVideoForm.patchValue({
      fileName: file.name,
      file: file,
    });
    this.sopVideoForm.get('file')?.markAsTouched();
  }

  openFileInNewTab(filePath: string): void {
    if (filePath) {
       const baseUrl = environment.baseUrl;
      const fullUrl = baseUrl + filePath;
      window.open(fullUrl, '_blank');
    } else {
    }
  }
  removeFile(): void {
    this.equipmentForm.get('agreementFilePath')?.reset();
    this.equipmentForm.get('fileName')?.reset();
  }

  closeModal(): void {
    if (this.bsModal) {
      this.bsModal.hide();
    }
    this.equipmentForm.reset();
    this.equipmentForm.enable();
    if (this.calibrationForm) {
      this.calibrationForm.reset();
    }
    if (this.maintenanceForm) {
      this.maintenanceForm.reset();
    }
    if (this.sopAttachmentForm) {
      this.sopAttachmentForm.reset();
    }
    if (this.sopVideoForm) {
      this.sopVideoForm.reset();
    }
    this.isEditMode = false;
    this.isViewMode = false;
  }

  openCalibrationModal(): void {
    this.calibrationForm.reset({ id: 0, equipmentID: this.equipmentId, calibrationDate: '', calibrationDueDate: '', certificate: '', certificatePath: '', agency: '', calibrationAgencyID: null });
    const modalElement = document.getElementById('calibrationModal');
    if (modalElement) {
      const modal = new Modal(modalElement);
      modal.show();
    }
  }

  openMaintenanceModal(): void {
    this.maintenanceForm.reset({ id: 0, equipmentID: this.equipmentId, maintenanceDate: '', certificate: '', certificatePath: '', file: null });
    const modalElement = document.getElementById('maintenanceModal');
    if (modalElement) {
      const modal = new Modal(modalElement);
      modal.show();
    }
  }
  submitCalibrationForm(): void {
    if (this.calibrationForm.valid) {
      const formData = new FormData();
      formData.append('id', this.calibrationForm.get('id')?.value);
      formData.append('equipmentID', String(this.equipmentId));
      formData.append('calibrationDate', this.calibrationForm.get('calibrationDate')?.value);
      formData.append('calibrationDueDate', this.calibrationForm.get('calibrationDueDate')?.value);
      formData.append('certificate', this.calibrationForm.get('certificate')?.value);
      formData.append('certificatePath', this.calibrationForm.get('certificatePath')?.value);
      formData.append('agency', this.calibrationForm.get('agency')?.value);
      this.calibrationForm.get('calibrationAgencyID')?.value ? formData.append('calibrationAgencyID', this.calibrationForm.get('calibrationAgencyID')?.value) : null;
      formData.append('file', this.calibrationForm.get('file')?.value);
      formData.append('isReviewed', this.calibrationForm.get('isReviewed')?.value);

      this.equipmentService.addEquipmentCalibration(formData).subscribe({
        next: response => {
          this.toastService.show(response.message, 'success');
          this.closeModalById('calibrationModal');
          this.loadEquipment(this.equipmentId);
        },
        error: () => {
        },
      });
    } else {
      this.calibrationForm.markAllAsTouched();
    }
  }
  submitMaintenanceForm(): void {
    if (this.maintenanceForm.valid) {
      const formData = new FormData();
      formData.append('id', this.maintenanceForm.get('id')?.value);
      formData.append('equipmentID', String(this.equipmentId));
      formData.append('maintenanceDate', this.maintenanceForm.get('maintenanceDate')?.value);
      formData.append('certificate', this.maintenanceForm.get('certificate')?.value);
      formData.append('certificatePath', this.maintenanceForm.get('certificatePath')?.value);
      formData.append('file', this.maintenanceForm.get('file')?.value);

      this.equipmentService.addEquipmentMaintenance(formData).subscribe({
        next: response => {
          this.toastService.show(response.message, 'success');
          this.closeModalById('maintenanceModal');
          this.loadEquipment(this.equipmentId);
        },
        error: () => {
        },
      });
    } else {
      this.maintenanceForm.markAllAsTouched();
    }
  }

  submitSOPAttachmentForm(): void {
    if (this.sopAttachmentForm.valid) {
      const formData = new FormData();
      formData.append('id', this.sopAttachmentForm.get('id')?.value);
      formData.append('equipmentID', String(this.equipmentId));
      formData.append('title', this.sopAttachmentForm.get('title')?.value);
      formData.append('fileName', this.sopAttachmentForm.get('fileName')?.value);
      formData.append('filePath', this.sopAttachmentForm.get('filePath')?.value);
      formData.append('file', this.sopAttachmentForm.get('file')?.value);
      formData.append('type', this.sopAttachmentForm.get('type')?.value);
      this.equipmentService.addEquipmentSOP(formData).subscribe({
        next: response => {
          this.toastService.show(response.message, 'success');
          this.closeModalById('attachmentModal');
          this.loadEquipment(this.equipmentId);
        },
        error: () => {
        }
      });
    } else {
      this.sopAttachmentForm.markAllAsTouched();
    }
  }

  submitSOPVideoForm(): void {
    if (this.sopVideoForm.valid) {
      const formData = new FormData();
      formData.append('id', this.sopVideoForm.get('id')?.value);
      formData.append('equipmentID', String(this.equipmentId));
      formData.append('title', this.sopVideoForm.get('title')?.value);
      formData.append('fileName', this.sopVideoForm.get('fileName')?.value);
      formData.append('filePath', this.sopVideoForm.get('filePath')?.value);
      formData.append('file', this.sopVideoForm.get('file')?.value);
      formData.append('type', this.sopVideoForm.get('type')?.value);
      this.equipmentService.addEquipmentSOP(formData).subscribe({
        next: response => {
          this.toastService.show(response.message, 'success');
          this.closeModalById('videoModal');
          this.loadEquipment(this.equipmentId);
        },
        error: () => {
        }
      });
    } else {
      this.sopVideoForm.markAllAsTouched();
    }
  }

  review(index: number): void {
    if (!confirm('Are you sure you want to mark this calibration as reviewed?')) return;
    const calibrationId = this.calibrationRecords.at(index).get('id')?.value;
    if (!calibrationId) return;
    this.equipmentService.reviewCalibration(calibrationId).subscribe({
      next: response => {
        this.toastService.show(response.message, 'success');
        this.calibrationRecords.at(index).patchValue({ isReviewed: true });
      },
      error: () => {},
    });
  }

  openAttachmentModal(): void {
    this.sopAttachmentForm.reset({ id: 0, equipmentID: this.equipmentId, title: '', fileName: '', filePath: '', file: null, type: 'attachment' });
    const fileInputs = document.querySelectorAll<HTMLInputElement>('#attachmentModal input[type="file"]');
    fileInputs.forEach(input => input.value = '');
    const modalElement = document.getElementById('attachmentModal');
    if (modalElement) {
      const modal = new Modal(modalElement);
      modal.show();
    }
  }

  openVideoModal(): void {
    this.sopVideoForm.reset({ id: 0, equipmentID: this.equipmentId, title: '', fileName: '', filePath: '', file: null, type: 'video' });
    const fileInputs = document.querySelectorAll<HTMLInputElement>('#videoModal input[type="file"]');
    fileInputs.forEach(input => input.value = '');
    const modalElement = document.getElementById('videoModal');
    if (modalElement) {
      const modal = new Modal(modalElement);
      modal.show();
    }
  }

  deleteAttachment(attachment: { id: number; title: string; name: string; type: string; url: string }): void {
    const confirmed = confirm('Are you sure you want to delete this attachment?');
    if (!confirmed) return;
    const index = this.sopAttachmentsArray.controls.findIndex(
      item => item.get('id')?.value === attachment.id
    );
    if (index > -1) {
      const payload = this.sopAttachmentsArray.at(index).value;
      const formData = new FormData();
      formData.append('id', payload.id);
      formData.append('equipmentID', payload.equipmentId);
      formData.append('title', payload.title);
      formData.append('fileName', payload.fileName);
      formData.append('filePath', payload.filePath);
      formData.append('file', payload.file);
      formData.append('type', payload.type);
      formData.append('uploadReferenceID', payload.uploadReferenceID);
      this.equipmentService.deleteEquipmentSOP(formData).subscribe({
        next: response => {
          this.toastService.show(response.message, 'success');
          this.sopAttachments = this.sopAttachments.filter(item => item.id !== attachment.id);
          this.sopAttachmentsArray.removeAt(index);
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Failed to delete attachment', 'error');
        }
      });
    }
  }

  deleteVideo(video: { id: number, name: string; type: string; url: string }): void {
    const confirmed = confirm('Are you sure you want to delete this video?');
    if (!confirmed) return;
    const index = this.sopAttachmentsArray.controls.findIndex(
      item => item.get('id')?.value === video.id
    );

    if (index > -1) {
      const payload = this.sopAttachmentsArray.at(index).value;
      const formData = new FormData();
      formData.append('id', payload.id);
      formData.append('equipmentID', payload.equipmentId);
      formData.append('title', payload.title);
      formData.append('fileName', payload.fileName);
      formData.append('filePath', payload.filePath);
      formData.append('file', payload.file);
      formData.append('type', payload.type);
      formData.append('uploadReferenceID', payload.uploadReferenceID);
      this.equipmentService.deleteEquipmentSOP(formData).subscribe({
        next: response => {
          this.toastService.show(response.message, 'success');
          this.sopVideos = this.sopVideos.filter(item => item.id !== video.id);
          this.sopAttachmentsArray.removeAt(index);
        },
        error: (err) => {
          this.toastService.show(err?.error?.message || 'Failed to delete video', 'error');
        }
      });
    }
  }
  optimizeVideoPlayback(): void {
    const baseUrl = environment.baseUrl;
    this.sopVideos.forEach(video => {
      if (!video.url.startsWith('http')) {
        video.url = `${baseUrl}/${video.url}`;
      }
    });
  }

  initRefMaterialForm(): void {
    this.refMaterialForm = this.fb.group({
      id: [0],
      equipmentMasterID: [this.equipmentId],
      materialName: ['', Validators.required],
      type: ['CRM', Validators.required],
      lotNumber: [''],
      certificateNumber: [''],
      manufactureDate: [null],
      expiryDate: [null],
      supplier: [''],
      status: ['Active'],
    });
  }

  loadReferenceMaterials(): void {
    this.refMaterialService.getByEquipment(this.equipmentId).subscribe({
      next: (data) => {
        this.referenceMaterials = data || [];
      },
      error: () => {
        this.referenceMaterials = [];
      },
    });
  }

  openRefMaterialModal(): void {
    this.initRefMaterialForm();
    this.refMaterialForm.patchValue({ equipmentMasterID: this.equipmentId });
    const modalElement = document.getElementById('refMaterialModal');
    if (modalElement) {
      const modal = new Modal(modalElement);
      modal.show();
    }
  }

  submitRefMaterialForm(): void {
    if (this.refMaterialForm.valid) {
      const payload = this.refMaterialForm.value;
      payload.equipmentMasterID = this.equipmentId;
      this.refMaterialService.create(payload).subscribe({
        next: (response) => {
          this.toastService.show(response.message, 'success');
          this.closeModalById('refMaterialModal');
          this.loadReferenceMaterials();
        },
        error: (error) => {
          this.toastService.show(error.error?.message || 'Error saving reference material', 'error');
        },
      });
    } else {
      this.refMaterialForm.markAllAsTouched();
    }
  }

  closeModalById(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modal = Modal.getInstance(modalElement);
      modal?.hide();
    }
  }

  deleteRefMaterial(id: number): void {
    const confirmed = confirm('Are you sure you want to delete this reference material?');
    if (!confirmed) return;
    this.refMaterialService.delete(id).subscribe({
      next: (response) => {
        this.toastService.show(response.message, 'success');
        this.loadReferenceMaterials();
      },
      error: (error) => {
        this.toastService.show(error.error?.message || 'Error deleting reference material', 'error');
      },
    });
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.equipmentForm.dirty || this.saved) return true;
    return this.unsavedChangesService.confirm();
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.equipmentForm?.dirty && !this.saved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
