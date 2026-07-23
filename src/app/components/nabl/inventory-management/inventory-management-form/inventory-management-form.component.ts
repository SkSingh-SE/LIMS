import { ActivatedRoute, Router } from "@angular/router";
import { ToastService } from "../../../../services/toast.service";
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SearchableDropdownComponent } from "../../../../utility/components/searchable-dropdown/searchable-dropdown.component";
import { CanComponentDeactivate } from "../../../../guards/unsaved-changes.guard";
import { FormFieldErrorComponent } from "../../../../utility/components/form-field-error/form-field-error.component";
import { Modal } from "bootstrap";
import { InventorymanagementService } from "../../../../services/inventory-management.service";
import { UnsavedChangesService } from "../../../../services/unsaved-changes.service";
import { noWhitespaceValidator } from "../../../../utility/validators/custom-validators";
import { Observable } from "rxjs";
import { FormValidationHelper } from "../../../../utility/helper/form-validation.helper";
import { DepartmentService } from "../../../../services/department.service";
import { SupplierRegistrationService } from "../../../../services/supplier-registration.service";


@Component({
    selector: 'app-inventory-management-form',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, SearchableDropdownComponent, FormFieldErrorComponent],
    templateUrl: './inventory-management-form.component.html',
    styleUrl: './inventory-management-form.component.css'
})

export class InventoryManagementFormComponent implements CanComponentDeactivate, OnInit, AfterViewInit {
    saved = false;
    @ViewChild('modalRef') modalElement!: ElementRef;
    private bsModal!: Modal;
    inventoryForm!: FormGroup;
    submitted = false;
    isEditMode: boolean = false;
    isViewMode: boolean = false;
    inventoryObjet: any = null;
    inventoryId: number = 0;
    supplierList: any[] = [];
    formTitle = 'Inventory Management Form';
    constructor(private fb: FormBuilder, private router: Router, private route: ActivatedRoute,
        private inventorymanagementService: InventorymanagementService, private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService, private departmentService: DepartmentService
    ) { }
    today = new Date().toISOString().split('T')[0];
    ngOnInit(): void {
        this.inventoryForm = this.fb.group({
            id: [0],
            itemCode: ['', Validators.required],
            itemCategory: ['', Validators.required],
            itemName: ['', Validators.required],
            itemDescription: [''],
            departmentID: [null],
            supplierId: [''],
            supplierName: [''],
            manufacturer: [''],
            batchNo: [''],
            unit: ['', Validators.required],
            quantity: [0, Validators.required],
            minimumQuantity: [0],
            storageLocation: [''],
            date: [this.today],
            remarks: ['']
        });
        this.route.paramMap.subscribe(params => {
            this.inventoryId = Number(params.get('id'));
            if (this.inventoryId > 0) {
                this.loadInventoryManagementData();
            }
        });
        const currentUrl = this.route.snapshot.url.map(seg => seg.path).join('/');
        this.loadSupplierList();
        const state = history.state as { mode?: string };
        if (currentUrl.includes('details') || (state && state.mode === 'view')) {
            this.formTitle = 'Inventory Management Details';
            this.isViewMode = true;
            this.inventoryForm.disable();
        } else if (currentUrl.includes('edit') || (state && state.mode === 'edit')) {
            this.isEditMode = true;
            this.isViewMode = false;
        } else {
            this.isEditMode = false;
            this.isViewMode = false;
        }
    }
    ngAfterViewInit(): void {
        this.openModal();
    }
    loadInventoryManagementData(): void {
        this.inventorymanagementService.getDataById(this.inventoryId).subscribe({
            next: (data: any) => {
                if (data) {
                    const formValue = { ...data };
                    this.inventoryForm.patchValue(formValue);
                }
            },
            error: (error: any) => {
                console.error('Error fetching department data:', error);
            }
        });
    }
    openModal(): void {
        this.bsModal = new Modal(this.modalElement.nativeElement);
        this.bsModal.show();
    }
    // Maan lete hain aapka formGroup ka naam 'myForm' hai
    onSupplierChange(event: any) {
        // 1. Select ki gayi ID get karein
        const selectedId = this.inventoryForm.get('supplierId')?.value;

        // 2. supplierList me se us ID ka object dhoondein
        const selectedSupplier = this.supplierList.find(
            supplier => (supplier.id || supplier.Id) === selectedId
        );

        // 3. Agar supplier mil jata hai, to uska naam form me store karein
        if (selectedSupplier) {
            const name = selectedSupplier.name || selectedSupplier.Name;
            this.inventoryForm.patchValue({
                supplierName: name
            });
        } else {
            // Agar 'Select Supplier' choose kiya hai to naam khali kar dein
            this.inventoryForm.patchValue({
                supplierName: ''
            });
        }
    }

    onSubmit(): void {
        this.submitted = true;
        FormValidationHelper.markAllTouched(this.inventoryForm);
        if (!this.inventoryForm.valid) {
            this.toastService.show('Please fix the validation errors before submitting.', 'warning');
            return;
        }
        const formData = this.inventoryForm.value;
        formData.date = this.today;
        if (this.isEditMode) {
            this.inventorymanagementService.update(this.inventoryId, formData).subscribe({
                next: (response) => {
                    this.saved = true;
                    this.toastService.show('Inventory Management updated successfully', 'success');
                    this.closeModal();
                },
                error: (error) => {
                    console.error('Error updating designation:', error);
                }
            });
        } else {
            this.inventorymanagementService.create(formData).subscribe({
                next: (response) => {
                    this.toastService.show('Inventory Management created successfully', 'success');
                    this.closeModal();
                },
                error: (error) => {
                    console.error('Error creating designation:', error);
                }
            });
        }
    }
    isFieldInvalid(path: string): boolean {
        return FormValidationHelper.isFieldInvalid(this.inventoryForm, path, this.submitted);
    }

    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };
    loadSupplierList(): void {
        this.inventorymanagementService.getSuppliersDropdown().subscribe({
            next: (res) => {
                this.supplierList = res;
            },
            error: () => {
                this.supplierList = [];
            }
        })
    }

    onDepartmentSelected(item: any) {
        if (!item) { this.inventoryForm.patchValue({ departmentID: null }); return; }
        this.inventoryForm.patchValue({ departmentID: item.id });
    }
    closeModal(): void {
        this.submitted = false;
        if (this.bsModal) {
            this.bsModal.hide();
            this.router.navigate(['/inventory-management']);
        }
        this.inventoryForm.reset();
        this.inventoryForm.enable();
        this.inventoryId = 0;
        this.isEditMode = false;
        this.isViewMode = false;
    }
    canDeactivate(): Observable<boolean> | boolean {
        if (!this.inventoryForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }
    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.inventoryForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}