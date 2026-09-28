import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Modal } from 'bootstrap';
import { ExecutionLayoutService } from '../../services/execution-layout.service';
import { ToastService } from '../../services/toast.service';
import { ParameterService } from '../../services/parameter.service';
import { ConditionMasterService } from '../../services/condition-master.service';
import { EquipmentRequirementService } from '../../services/equipment-requirement.service';
import { FactorConversionService } from '../../services/factor-conversion.service';
import { MeasurementUncertaintyMasterService } from '../../services/measurement-uncertainty-master.service';
import { AcceptanceCriteriaService } from '../../services/acceptance-criteria.service';
import { HasPermissionDirective } from '../../utility/directives/has-permission.directive';
import { FormFieldErrorComponent } from '../../utility/components/form-field-error/form-field-error.component';
import { PaginationComponent } from '../../utility/components/pagination/pagination.component';
import { BreadcrumbComponent } from '../../utility/components/breadcrumb/breadcrumb.component';
import { SearchableDropdownComponent } from '../../utility/components/searchable-dropdown/searchable-dropdown.component';
import {
  ExecutionLayoutListItemDto,
  ExecutionLayoutDto,
  ExecutionLayoutSectionDto,
  ExecutionLayoutItemDto,
  ExecutionLayoutMetadataDto,
  SectionTypeMetaDto
} from '../../models/execution-layout.model';

@Component({
  selector: 'app-execution-layout-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    FormFieldErrorComponent,
    PaginationComponent,
    BreadcrumbComponent,
    HasPermissionDirective,
    SearchableDropdownComponent
  ],
  templateUrl: './execution-layout-list.component.html',
  styleUrl: './execution-layout-list.component.css'
})
export class ExecutionLayoutListComponent implements OnInit {
  @ViewChild('modalRef') modalElement!: ElementRef;
  private bsModal!: Modal;
  filterSearch = '';
  filterStatus = 'active';
  layoutList: ExecutionLayoutListItemDto[] = [];
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  pageSizes = [10, 25, 50, 100];
  sortByColumn = '';
  sortOrder = 'asc';
  layoutForm!: FormGroup;
  submitted = false;
  isEditMode = false;
  isViewMode = false;
  selectedId = 0;

  metadata: ExecutionLayoutMetadataDto | null = null;
  sectionTypes: string[] = [
    'Preparation', 'Conditions', 'Equipment', 'Parameters', 'Observations',
    'Calculations', 'Graph', 'Factors', 'MeasurementUncertainty', 'AcceptanceCriteria',
    'Attachments', 'Remarks'
  ];
  rendererTypes: string[] = [
    'ObservationMatrix', 'MultiSpecimen', 'MultiReading', 'ParameterTable',
    'Qualitative', 'Calculation', 'Graph'
  ];

  private fetchFns: { [key: string]: (term: string, page: number, size: number) => Observable<any> } = {};

  constructor(
    private fb: FormBuilder,
    private layoutService: ExecutionLayoutService,
    private paramService: ParameterService,
    private conditionService: ConditionMasterService,
    private equipReqService: EquipmentRequirementService,
    private factorService: FactorConversionService,
    private muService: MeasurementUncertaintyMasterService,
    private acService: AcceptanceCriteriaService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initFetchFunctions();
    this.loadMetadata();
    this.loadList();
  }

  private initFetchFunctions(): void {
    const paramFn = (term: string, page: number, size: number) => this.paramService.getParameterDropdown(term, page, size);
    this.fetchFns['ParameterMaster'] = paramFn;
    this.fetchFns['GraphXAxis'] = paramFn;
    this.fetchFns['GraphYAxis'] = paramFn;
    this.fetchFns['GraphSeries'] = paramFn;
    this.fetchFns['ConditionMaster'] = (term: string, page: number, size: number) => this.conditionService.getConditionMasterDropdown(term, page, size);
    this.fetchFns['EquipmentRequirementMaster'] = (term: string, page: number, size: number) => this.equipReqService.getRequirementDropdown(term, page, size);
    this.fetchFns['FactorConversionMaster'] = (term: string, page: number, size: number) => this.factorService.getFactorDropdown(term, page, size);
    this.fetchFns['MeasurementUncertaintyMaster'] = (term: string, page: number, size: number) => this.muService.getUncertaintyDropdown(term, page, size);
    this.fetchFns['AcceptanceCriteriaMaster'] = (term: string, page: number, size: number) => this.acService.getAcceptanceCriteriaDropdown(term, page, size);
    this.fetchFns['None'] = () => of([]);
  }

  getFetchFn(refType: string): (term: string, page: number, size: number) => Observable<any> {
    return this.fetchFns[refType] || this.fetchFns['None'];
  }

  loadMetadata(): void {
    this.layoutService.getMetadata().subscribe({
      next: (meta: ExecutionLayoutMetadataDto) => {
        if (meta) {
          this.metadata = meta;
          if (meta.sectionTypes?.length) {
            this.sectionTypes = meta.sectionTypes.map(x => x.sectionType);
          }
          if (meta.allowedRendererTypes?.length) {
            this.rendererTypes = meta.allowedRendererTypes;
          }
        }
      },
      error: () => {
        // Fallbacks already configured in class fields
      }
    });
  }

  getAllowedReferenceTypes(sectionType: string): string[] {
    const metaSec = this.metadata?.sectionTypes?.find(
      s => s.sectionType.toLowerCase() === (sectionType || '').toLowerCase()
    );
    if (metaSec && metaSec.allowedReferenceTypes?.length) {
      return metaSec.allowedReferenceTypes;
    }
    // Safe fallbacks
    switch ((sectionType || '').toLowerCase()) {
      case 'preparation':
      case 'conditions':
        return ['None', 'ConditionMaster'];
      case 'equipment':
        return ['None', 'EquipmentRequirementMaster'];
      case 'parameters':
      case 'observations':
      case 'calculations':
        return ['None', 'ParameterMaster'];
      case 'graph':
        return ['None', 'ParameterMaster', 'GraphXAxis', 'GraphYAxis', 'GraphSeries'];
      case 'factors':
        return ['None', 'FactorConversionMaster'];
      case 'measurementuncertainty':
        return ['None', 'MeasurementUncertaintyMaster'];
      case 'acceptancecriteria':
        return ['None', 'AcceptanceCriteriaMaster'];
      default:
        return ['None'];
    }
  }

  initForm(): void {
    this.layoutForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: [null, Validators.maxLength(500)],
      rendererType: [null, Validators.maxLength(30)],
      displayOrder: [0],
      sections: this.fb.array([])
    });
  }

  get sectionsArray(): FormArray {
    return this.layoutForm.get('sections') as FormArray;
  }

  createSectionGroup(sec?: ExecutionLayoutSectionDto): FormGroup {
    const defaultType = sec?.sectionType || 'Parameters';
    return this.fb.group({
      id: [sec?.id || 0],
      sectionCode: [sec?.sectionCode || '', Validators.required],
      sectionName: [sec?.sectionName || '', Validators.required],
      sectionType: [defaultType, Validators.required],
      displayOrder: [sec?.displayOrder || 0],
      isVisible: [sec?.isVisible ?? true],
      isCollapsible: [sec?.isCollapsible ?? false],
      isRequired: [sec?.isRequired ?? false],
      items: this.fb.array(sec?.items?.map(it => this.createItemGroup(it, defaultType)) || [])
    });
  }

  getItemsArray(sectionIdx: number): FormArray {
    return this.sectionsArray.at(sectionIdx).get('items') as FormArray;
  }

  createItemGroup(item?: ExecutionLayoutItemDto, sectionType?: string): FormGroup {
    const allowed = this.getAllowedReferenceTypes(sectionType || 'Parameters');
    let refType = item?.referenceType || allowed[0] || 'None';
    if (!allowed.includes(refType)) {
      refType = allowed[0] || 'None';
    }
    return this.fb.group({
      id: [item?.id || 0],
      referenceType: [refType, Validators.required],
      referenceID: [item?.referenceID || null],
      referenceName: [item?.referenceName || null],
      referenceCode: [item?.referenceCode || null],
      displayLabel: [item?.displayLabel || null],
      displayOrder: [item?.displayOrder || 0],
      isVisible: [item?.isVisible ?? true],
      isEditable: [item?.isEditable ?? true],
      isRequired: [item?.isRequired ?? false]
    });
  }

  addSection(): void {
    this.sectionsArray.push(this.createSectionGroup());
  }

  removeSection(idx: number): void {
    this.sectionsArray.removeAt(idx);
  }

  addItem(sectionIdx: number): void {
    const sec = this.sectionsArray.at(sectionIdx) as FormGroup;
    const secType = sec.get('sectionType')?.value;
    this.getItemsArray(sectionIdx).push(this.createItemGroup(undefined, secType));
  }

  removeItem(sectionIdx: number, itemIdx: number): void {
    this.getItemsArray(sectionIdx).removeAt(itemIdx);
  }

  onSectionTypeChanged(secIdx: number): void {
    const secGroup = this.sectionsArray.at(secIdx) as FormGroup;
    const secType = secGroup.get('sectionType')?.value;
    const allowed = this.getAllowedReferenceTypes(secType);
    const items = this.getItemsArray(secIdx);
    items.controls.forEach(ctrl => {
      const itGroup = ctrl as FormGroup;
      const currentRef = itGroup.get('referenceType')?.value;
      if (!allowed.includes(currentRef)) {
        itGroup.patchValue({
          referenceType: allowed[0] || 'None',
          referenceID: null,
          referenceName: null,
          referenceCode: null
        });
      }
    });
  }

  onRefTypeChanged(itemGroup: any): void {
    const fg = itemGroup as FormGroup;
    fg.patchValue({
      referenceID: null,
      referenceName: null,
      referenceCode: null
    });
  }

  getSelectedItem(itemGroup: any): any {
    const fg = itemGroup as FormGroup;
    const id = fg.get('referenceID')?.value;
    if (!id) return null;
    return {
      id: id,
      name: fg.get('referenceName')?.value || fg.get('displayLabel')?.value || `ID ${id}`,
      code: fg.get('referenceCode')?.value
    };
  }

  onRefSelected(itemGroup: any, event: any): void {
    const fg = itemGroup as FormGroup;
    if (event && event.id) {
      fg.patchValue({
        referenceID: event.id,
        referenceName: event.name || event.title || null,
        referenceCode: event.code || null
      });
      if (!fg.get('displayLabel')?.value) {
        fg.patchValue({ displayLabel: event.name || event.title || '' });
      }
    } else {
      fg.patchValue({
        referenceID: null,
        referenceName: null,
        referenceCode: null
      });
    }
  }

  loadList(): void {
    this.layoutService.list({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.filterSearch || null,
      status: this.filterStatus
    }).subscribe({
      next: (res: any) => {
        this.layoutList = res.items || [];
        this.totalItems = res.totalRecords || 0;
      },
      error: () => this.toast.show('Failed to load execution layouts', 'error')
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.loadList();
  }

  onReset(): void {
    this.filterSearch = '';
    this.filterStatus = 'active';
    this.pageNumber = 1;
    this.loadList();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.loadList();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageNumber = 1;
    this.loadList();
  }

  openModal(mode: string, id = 0): void {
    this.submitted = false;
    this.isEditMode = mode === 'edit';
    this.isViewMode = mode === 'view';
    this.selectedId = id;
    this.sectionsArray.clear();
    this.layoutForm.enable();

    if (mode === 'create') {
      this.layoutForm.reset({ displayOrder: 0 });
      this.addSection();
    } else {
      this.layoutService.getDetails(id).subscribe({
        next: (data: ExecutionLayoutDto) => {
          this.layoutForm.patchValue({
            code: data.code,
            name: data.name,
            description: data.description,
            rendererType: data.rendererType,
            displayOrder: data.displayOrder
          });
          data.sections?.forEach(s => this.sectionsArray.push(this.createSectionGroup(s)));
          if (this.isViewMode) {
            this.layoutForm.disable();
          }
        },
        error: () => this.toast.show('Failed to load layout details', 'error')
      });
    }

    if (!this.bsModal) {
      this.bsModal = new Modal(this.modalElement.nativeElement);
    }
    this.bsModal.show();
  }

  closeModal(): void {
    this.bsModal?.hide();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.layoutForm.invalid) {
      this.layoutForm.markAllAsTouched();
      this.toast.show('Please fill in all required fields correctly', 'warning');
      return;
    }

    const payload = this.layoutForm.getRawValue();
    if (payload.sections) {
      payload.sections.forEach((sec: any) => {
        if (sec.items) {
          sec.items.forEach((it: any) => {
            if (it.referenceType === 'None') {
              it.referenceID = null;
              it.referenceName = null;
              it.referenceCode = null;
            }
          });
        }
      });
    }

    const operation = this.isEditMode
      ? this.layoutService.update({ ...payload, id: this.selectedId })
      : this.layoutService.create(payload);

    operation.subscribe({
      next: () => {
        this.toast.show(`Layout ${this.isEditMode ? 'updated' : 'created'} successfully`, 'success');
        this.closeModal();
        this.loadList();
      },
      error: (err: any) => this.toast.show(err.error?.message || 'Operation failed', 'error')
    });
  }

  toggleStatus(item: ExecutionLayoutListItemDto): void {
    this.layoutService.toggleStatus(item.id).subscribe({
      next: () => {
        this.toast.show(`Layout ${item.isActive ? 'deactivated' : 'activated'}`, 'success');
        this.loadList();
      },
      error: () => this.toast.show('Status change failed', 'error')
    });
  }
}
