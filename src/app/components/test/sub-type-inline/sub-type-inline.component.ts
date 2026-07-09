import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LaboratoryTestService } from '../../../services/laboratory-test.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { AnalysisTechniqueService } from '../../../services/analysis-technique.service';

@Component({
  selector: 'app-sub-type-inline',
  templateUrl: './sub-type-inline.component.html',
  styleUrl: './sub-type-inline.component.css',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent]
})
export class SubTypeInlineComponent implements OnInit {
  @Input() subGroupId: number = 0;
  @Input() isViewMode: boolean = false;
  @Output() changed = new EventEmitter<void>();

  subTypes: any[] = [];
  editRowId: number | null = null;
  editForm!: FormGroup;

  constructor(
    private labService: LaboratoryTestService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private techniqueService: AnalysisTechniqueService
  ) {}

  ngOnInit(): void {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      metalClassificationID: [null],
      analysisTechniqueID: [null],
      pricingRuleType: [''],
      invoiceCaption: ['']
    });
    if (this.subGroupId > 0) {
      this.loadSubTypes();
    }
  }

  getTechniques = (term: string, page: number, pageSize: number) =>
    this.techniqueService.getAnalysisTechniqueDropdown(term, page, pageSize);

  loadSubTypes(): void {
    this.labService.getSubTypesBySubGroup(this.subGroupId).subscribe({
      next: (list) => { this.subTypes = list || []; },
      error: () => this.toastService.show('Failed to load sub-types.', 'error')
    });
  }

  startAdd(): void {
    this.editRowId = -1;
    this.editForm.reset();
  }

  startEdit(st: any): void {
    this.editRowId = st.id;
    this.editForm.patchValue({
      name: st.name,
      metalClassificationID: st.metalClassificationID,
      analysisTechniqueID: st.analysisTechniqueID,
      pricingRuleType: st.pricingRuleType,
      invoiceCaption: st.invoiceCaption
    });
  }

  cancelEdit(): void {
    this.editRowId = null;
    this.editForm.reset();
  }

  saveNew(): void {
    if (this.editForm.invalid) {
      this.toastService.show('Name is required.', 'warning');
      return;
    }
    const payload = { ...this.editForm.value, laboratoryTestSubGroupID: this.subGroupId };
    this.labService.createSubType(payload).subscribe({
      next: () => {
        this.toastService.show('Sub-Type added.', 'success');
        this.cancelEdit();
        this.loadSubTypes();
        this.changed.emit();
      },
      error: (err) => this.toastService.show(err.error?.message || 'Add failed.', 'error')
    });
  }

  saveEdit(st: any): void {
    if (this.editForm.invalid) {
      this.toastService.show('Name is required.', 'warning');
      return;
    }
    const payload = { ...this.editForm.value, id: st.id, laboratoryTestSubGroupID: this.subGroupId };
    this.labService.updateSubType(payload).subscribe({
      next: () => {
        this.toastService.show('Sub-Type updated.', 'success');
        this.cancelEdit();
        this.loadSubTypes();
        this.changed.emit();
      },
      error: (err) => this.toastService.show(err.error?.message || 'Update failed.', 'error')
    });
  }

  deleteSubType(st: any): void {
    if (!confirm(`Delete sub-type "${st.name}"?`)) return;
    this.labService.deleteSubType(st.id).subscribe({
      next: () => {
        this.toastService.show('Sub-Type deleted.', 'success');
        this.loadSubTypes();
        this.changed.emit();
      },
      error: (err) => this.toastService.show(err.error?.message || 'Delete failed.', 'error')
    });
  }
}
