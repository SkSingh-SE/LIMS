import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule, FormatWidth } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReferenceMaterialService } from '../../../services/reference-material.service';
import { ToastService } from '../../../services/toast.service';
import { NablFormsHelper } from '../../../utility/nabl-helpers/nabl-forms.helper';

import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../services/nabl-header.service';
import { InventorymanagementService } from '../../../services/inventory-management.service';
import { DepartmentService } from '../../../services/department.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';
import { Inventorymanagement, InventorymanagementResponse } from '../../../models/inventory-managementModel';
@Component({
    selector: 'app-reference-material-form',

    imports: [CommonModule, ReactiveFormsModule, RouterModule, QuillModule, NablSignatureSectionComponent, SearchableDropdownComponent],
    templateUrl: './reference-material-form.component.html',
    styleUrl: './reference-material-form.component.css'
})
export class ReferenceMaterialFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    materialForm!: FormGroup;
    qtyForm!: FormGroup;
    inventoryForm!: FormGroup;
    recordId: number = 0;
    isEditMode = false;
    isViewMode = false;
    formTitle = 'Add Reference Material (CRM)';
    formNumbers: string[] = NablFormsHelper.getFormNumbers();
    supplierList: any[] = [];
    inventoryList: any[] = [];
    quantityLogs: any[] = [];
    showQtyPopup = false;
    showInvntPopup = false;
    selectedInventory: any = null;
    isInventoryFound = true;
    showManualInventoryFields = false;
    isInventoryLinked = false;
    openSections: { [key: string]: boolean } = {
        header: true,
        material: true,
        technical: true,
        parameters: true,
        inventory: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: ReferenceMaterialService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService,
        private inventorymanagementService: InventorymanagementService,
        private departmentService: DepartmentService
    ) { }

    ngOnInit(): void {
        this.initForm();
        this.nablHeaderService.getFormDefaults('ReferenceMaterial').subscribe({
            next: (defaults) => {
                this.materialForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });

        this.recordId = Number(this.route.snapshot.params['id']);
        const path = this.route.snapshot.url[this.route.snapshot.url.length - 2]?.path;
        this.loadSupplierList();
        if (path === 'details') {
            this.isViewMode = true;
            this.formTitle = 'View Reference Material';
            this.materialForm.disable();
        } else if (path === 'edit') {
            this.isEditMode = true;
            this.formTitle = 'Edit Reference Material';
        }
        if (path != "details" && path != "edit") {
            this.service.getNextMaterilNo().subscribe({
                next: (res) => {
                    this.materialForm.patchValue({
                        rmCode: res.rmCode
                    })
                },
                error: () => { }
            });
        }
        if (this.recordId) {
            this.loadData();
        }
        else {
            this.addParameter();
        }
    }

    initForm(): void {
        this.materialForm = this.fb.group({
            id: [0],
            formatNo: ['F-17'],
            issueNo: ['01'],
            revNo: ['00'],
            date: [this.today, Validators.required],
            documentNo: ['F-17'],
            issueDate: [this.today, Validators.required],
            parameters: this.fb.array([]),
            rmName: ['', Validators.required],
            rmCode: ['', Validators.required],
            materialDescription: ['', Validators.required],
            type: ['', Validators.required],
            manufacturer: ['', Validators.required],
            supplier: [null],
            supplierId: [''],
            itemId: ['', Validators.required],
            batchNo: ['', Validators.required],
            matrixType: ['', Validators.required],
            storageCondition: [''],
            specifications: ['', Validators.required],
            storageLocation: [''],
            certificateNo: ['', Validators.required],
            certificationDate: [null],
            validityDate: ['', Validators.required],
            traceability: ['', Validators.required],
            inventoryId: [null],
            initialQuantity: [, [Validators.required, Validators.min(0)]],
            minimumQuantity: [0],
            unitOfMeasure: ['', Validators.required],
            preparedBy: [''],
            departmentID: [''],
            itemCode: [''],
            itemName: [''],
            reviewedBy: [null],
            approvedBy: [null],
            reviewedDate: [''],
            approvedDate: [''],
            preparedDate: [this.today],
        });
        this.qtyForm = this.fb.group({
            addedQuantity: [null, [Validators.required, Validators.min(1)]]
        });
        this.inventoryForm = this.fb.group({
            id: [0],
            itemCode: ['', Validators.required],
            itemCategory: ['', Validators.required],
            itemName: ['', Validators.required],
            itemDescription: [''],
            departmentID: [0],
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
        // System-managed fields — always readonly
        this.materialForm.get('documentNo')?.disable();
        this.materialForm.get('issueDate')?.disable();
        this.materialForm.get('issueNo')?.disable();
        this.materialForm.get('revNo')?.disable();
        this.materialForm.get('formatNo')?.disable();
        this.materialForm.get('rmCode')?.disable();
        this.inventoryForm.get('itemCategory')?.disable();
        // Disable all specified fields from your form
        this.materialForm.get('manufacturer')?.disable();
        this.materialForm.get('supplierId')?.disable();
        this.materialForm.get('batchNo')?.disable();
        this.materialForm.get('departmentID')?.disable();
        this.materialForm.get('storageLocation')?.disable();
        this.materialForm.get('initialQuantity')?.disable();
        this.materialForm.get('minimumQuantity')?.disable();
        this.materialForm.get('unitOfMeasure')?.disable();

    }
    setInventoryValidators(): void {

        const itemIdControl = this.materialForm.get('itemId');
        const itemCodeControl = this.materialForm.get('itemCode');
        const itemNameControl = this.materialForm.get('itemName');

        if (this.showManualInventoryFields) {
            // Manual mode

            itemIdControl?.clearValidators();

            itemCodeControl?.setValidators([Validators.required]);
            itemNameControl?.setValidators([Validators.required]);
        }
        else if (this.isInventoryLinked) {
            // Inventory linked mode

            itemIdControl?.setValidators([Validators.required]);

            itemCodeControl?.clearValidators();
            itemNameControl?.clearValidators();
        }

        itemIdControl?.updateValueAndValidity();
        itemCodeControl?.updateValueAndValidity();
        itemNameControl?.updateValueAndValidity();
    }

    get parameters(): FormArray {
        return this.materialForm.get('parameters') as FormArray;
    }
    addParameter(): void {
        const paramForm = this.fb.group({
            parameterName: ['', Validators.required],
            certifiedValue: [, Validators.required],
            lowerLimit: [, Validators.required],
            upperLimit: [, Validators.required],
            unit: ['', Validators.required],
            measurementUncertainty: [, Validators.required],
            remarks: ['']
        });
        this.parameters.push(paramForm);
    }
    removeParameter(index: number): void {
        if (this.parameters.length > 1) {
            this.parameters.removeAt(index);
        }
    }

    loadData(): void {
        this.service.getById(this.recordId).subscribe({
            next: (data: any) => {
                if (data) {
                    const formValues = { ...data };
                    if (data.parameters) {
                        this.parameters.clear();
                        data.parameters.forEach(() => this.addParameter());
                    }

                    formValues.date = NablFormsHelper.formatDateForInput(data.date);
                    formValues.certificationDate = NablFormsHelper.formatDateForInput(data.certificationDate);
                    formValues.validityDate = NablFormsHelper.formatDateForInput(data.validityDate);
                    const selectedId = formValues.itemId;
                    const inventoryId = formValues.inventoryId;
                    formValues.itemId = null;

                    this.materialForm.patchValue(formValues);

                    if (data.type) {
                        this.service.getMaterialData(data.type).subscribe({
                            next: (res) => {
                                this.inventoryList = res || [];
                                if (this.inventoryList.length > 0) {
                                    this.isInventoryFound = true;
                                    this.showManualInventoryFields = false;
                                    this.isInventoryLinked = true;

                                    // After dropdown options loaded, patch selected item
                                    this.materialForm.patchValue({
                                        itemId: selectedId,
                                        inventoryId: inventoryId
                                    });
                                } else {
                                    this.isInventoryFound = false;
                                    this.showManualInventoryFields = true;
                                    this.isInventoryLinked = false;
                                }

                                this.setInventoryValidators();
                            },
                            error: () => {
                                this.inventoryList = [];
                                this.isInventoryFound = false;
                                this.showManualInventoryFields = true;
                                this.isInventoryLinked = false;

                                this.setInventoryValidators();
                            }
                        });
                    }


                    // Lock form if not in editable status
                    const status = (data as any).status;
                    if (status && status !== 'Draft' && status !== 'Rejected') {
                        this.materialForm.disable();
                        this.isViewMode = true;
                    }
                    // Re-disable system fields (in case form was enabled for Draft/Rejected)
                    this.materialForm.get('documentNo')?.disable();
                    this.materialForm.get('issueNo')?.disable();
                    this.materialForm.get('revNo')?.disable();
                    this.materialForm.get('formatNo')?.disable();
                }
            },
            error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to load record', 'error'); }
        });
    }

    loadSupplierList(): void {
        this.inventorymanagementService.getSuppliersDropdown().subscribe({
            next: (res) => {
                this.supplierList = res;
            },
            error: () => {
                this.supplierList = [];
            }
        });
    }
    getDepartments = (term: string, page: number, pageSize: number): Observable<any[]> => {
        return this.departmentService.getDepartmentDropdown(term, page, pageSize);
    };

    onDepartmentSelected(item: any) {
        if (!item) { this.materialForm.patchValue({ departmentID: null }); return; }
        this.materialForm.patchValue({ departmentID: item.id });
    }
    onDepartmentSelect(item: any) {
        if (!item) { this.inventoryForm.patchValue({ departmentID: null }); return; }
        this.inventoryForm.patchValue({ departmentID: item.id });
    }
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
    // onItemChange(event: Event): void {
    //     const selectEl = event.target as HTMLSelectElement;
    //     let item = selectEl.value;

    //     if (!item) {
    //         this.isInventoryLinked = false;
    //         this.clearInventoryFields();
    //         this.enableInventoryFields();
    //         return;
    //     }

    //     if (item.includes(':')) {
    //         item = item.split(':')[1].trim();
    //     }

    //     if (!item.includes('/')) {
    //         this.isInventoryLinked = false;
    //         this.clearInventoryFields();
    //         this.enableInventoryFields();
    //         return;
    //     }

    //     const slashIndex = item.indexOf('/');
    //     const itemCode = item.substring(0, slashIndex).trim();
    //     const itemName = item.substring(slashIndex + 1).trim();

    //     this.service.getItemData(itemCode, itemName).subscribe({
    //         next: (res) => {
    //             this.isInventoryLinked = true;

    //             this.materialForm.patchValue({
    //                 manufacturer: res.manufacturer || '',
    //                 supplierId: res.supplierId || null,
    //                 supplier: res.supplierName || null,
    //                 batchNo: res.batchNo || '',
    //                 initialQuantity: res.quantity || 0,
    //                 minimumQuantity: res.minimumQuantity || 0,
    //                 storageLocation: res.storageLocation || '',
    //                 inventoryId: res.inventoryId || null,
    //                 itemName: res.itemName || '',
    //                 itemCode: res.itemCode || '',
    //                 departmentID: res.departmentID || null,
    //                 unitOfMeasure: res.unit || ''
    //             });

    //             this.disableInventoryFields();
    //             this.setInventoryValidators();
    //         },
    //         error: () => {
    //             this.isInventoryLinked = false;
    //             this.clearInventoryFields();
    //             this.enableInventoryFields();
    //             this.setInventoryValidators();
    //         }
    //     });
    // }

    onItemChange(event: Event): void {

        const selectEl = event.target as HTMLSelectElement;
        let item = selectEl.value;

        if (!item) {
            this.isInventoryLinked = false;
            this.clearInventoryFields();
            this.enableInventoryFields();
            return;
        }

        // If value contains ":" then remove only the prefix
        const colonIndex = item.indexOf(':');

        if (colonIndex !== -1) {
            item = item.substring(colonIndex + 1).trim();
        }

        // Find FIRST "/" only
        const slashIndex = item.indexOf('/');

        if (slashIndex === -1) {
            this.isInventoryLinked = false;
            this.disableInventoryFields();
            // this.setInventoryValidators();

            return;
        }

        const itemCode = item.substring(0, slashIndex).trim();
        const itemName = item.substring(slashIndex + 1).trim();

        console.log('Full Item:', item);
        console.log('Item Code:', itemCode);
        console.log('Item Name:', itemName);

        this.service.getItemData(itemCode, itemName).subscribe({
            next: (res) => {

                this.isInventoryLinked = true;

                this.materialForm.patchValue({
                    manufacturer: res.manufacturer || '',
                    supplierId: res.supplierId || 0,
                    supplier: res.supplierName || null,
                    batchNo: res.batchNo || '',
                    initialQuantity: res.quantity || 0,
                    minimumQuantity: res.minimumQuantity || 0,
                    storageLocation: res.storageLocation || '',
                    inventoryId: res.inventoryId || null,
                    itemName: res.itemName || itemName,
                    itemCode: res.itemCode || itemCode,
                    departmentID: res.departmentID || 0,
                    unitOfMeasure: res.unit || ''
                });

                this.disableInventoryFields();
                this.setInventoryValidators();
            },

            error: () => {
                this.isInventoryLinked = false;
                this.clearInventoryFields();
                this.enableInventoryFields();
                this.setInventoryValidators();
            }
        });
    }
    clearInventoryFields(): void {
        this.materialForm.patchValue({
            inventoryId: null,
            itemCode: '',
            itemName: '',
            manufacturer: '',
            supplierId: 0,
            supplier: null,
            batchNo: '',
            initialQuantity: 0,
            minimumQuantity: 0,
            unitOfMeasure: '',
            storageLocation: '',
            departmentID: 0
        });
    }

    disableInventoryFields(): void {
        this.materialForm.get('departmentID')?.disable();
        this.materialForm.get('supplierId')?.disable();
    }

    enableInventoryFields(): void {
        this.materialForm.get('departmentID')?.enable();
        this.materialForm.get('supplierId')?.enable();
    }
    openQtyPopup(): void {
        const inventoryId = this.materialForm.get('inventoryId')?.value;

        if (!inventoryId) {
            this.toastService.show(
                'Please select Inventory Item before adding quantity.', 'warning');
            return;
        }

        this.selectedInventory = {
            id: inventoryId,
            itemCode: this.materialForm.get('itemCode')?.value,
            itemName: this.materialForm.get('itemName')?.value,
            quantity: this.materialForm.get('initialQuantity')?.value
        };

        this.qtyForm.reset();
        this.quantityLogs = [];
        this.showQtyPopup = true;

        this.loadQuantityLogs(inventoryId);
    }
    openInvtPopup(): void {

        const materialtype = this.materialForm.get('type')?.value;
        if (!materialtype) {
            this.toastService.show(
                'Please select Material Type before adding inventory.', 'warning');
            return;
        }
        this.inventoryForm.reset();
        this.inventoryForm.patchValue({
            itemCategory: materialtype,
            quantity: 0,
            minimumQuantity: 0,
        });
        this.showInvntPopup = true;

    }
    closeInvtPopup(): void {
        this.showInvntPopup = false;
        this.inventoryForm.reset();
    }

    loadQuantityLogs(inventoryId: number): void {
        this.inventorymanagementService.getQuantityLogs(inventoryId).subscribe({
            next: (res: any) => {
                this.quantityLogs = res || [];
            },
            error: () => {
                this.quantityLogs = [];
            }
        });
    }
    onMaterialTypeChange(event: Event): void {
        const selectEl = event.target as HTMLSelectElement;
        const type = selectEl.value;
        this.inventoryList = [];
        this.isInventoryFound = false;
        this.showManualInventoryFields = false;
        this.isInventoryLinked = false;
        this.materialForm.patchValue({
            itemId: null,
            itemCode: '',
            itemName: '',
            manufacturer: '',
            supplierId: 0,
            batchNo: '',
            initialQuantity: 0,
            minimumQuantity: 0,
            unitOfMeasure: null,
            storageLocation: '',
            departmentID: 0
        });
        if (!type) return;

        this.service.getMaterialData(type).subscribe({
            next: (res) => {
                this.inventoryList = [];
                this.inventoryList = [...(res || [])];
                this.inventoryList = res;
                // if (this.inventoryList.length > 0) {
                this.isInventoryFound = true;
                this.showManualInventoryFields = false;
                this.isInventoryLinked = true;
                this.setInventoryValidators();
                // }
                // else {
                //     this.isInventoryFound = false;
                //     this.showManualInventoryFields = true;
                //     this.isInventoryLinked = false;
                //     this.setInventoryValidators();
                // }
            },
            error: () => {
                this.inventoryList = [];
                this.isInventoryFound = false;
                this.showManualInventoryFields = true;
                this.isInventoryLinked = false;
                this.setInventoryValidators();
            }

        })
    }
    saveInventory(): void {

        const requiredFields = [
            'itemCode',
            'itemCategory',
            'itemName',
            'unit'
        ];

        let isValid = true;

        requiredFields.forEach(field => {
            const control = this.inventoryForm.get(field);

            if (control?.invalid) {
                control.markAsTouched();
                isValid = false;
            }
        });

        if (!isValid) {
            return;
        }

        const formValue = this.inventoryForm.getRawValue();

        const payload: Inventorymanagement = {
            id: 0,
            itemCode: formValue.itemCode,
            itemCategory: formValue.itemCategory,
            itemName: formValue.itemName,
            itemDescription: formValue.itemDescription || null,

            departmentID: formValue.departmentID || 0,

            supplierId: formValue.supplierId || 0,


            manufacturer: formValue.manufacturer || null,
            batchNo: formValue.batchNo || null,

            unit: formValue.unit,

            quantity: Number(formValue.quantity || 0),
            minimumQuantity: Number(formValue.minimumQuantity || 0),

            storageLocation: formValue.storageLocation || null,
            date: formValue.date || new Date(),

            remarks: formValue.remarks || null
        };

        this.inventorymanagementService.create(payload).subscribe({
            next: (res: any) => {

                const inventoryId =
                    res?.id ||
                    res?.Id ||
                    res?.data?.id ||
                    res?.data?.Id;

                const itemCode = formValue.itemCode;
                const itemName = formValue.itemName;
                const newInventoryItem = {
                    id: inventoryId,
                    name: `${formValue.itemCode}/${formValue.itemName}`
                };

                // Inventory dropdown/list update
                this.inventoryList = [newInventoryItem];
                // Set inventory reference in material form
                this.materialForm.patchValue({
                    inventoryId: inventoryId,
                    itemId: `${itemCode}/${itemName}`
                });

                // Fetch created inventory details
                this.service.getItemData(itemCode, itemName).subscribe({
                    next: (res) => {

                        this.isInventoryLinked = true;

                        this.materialForm.patchValue({
                            manufacturer: res.manufacturer || '',
                            supplierId: res.supplierId || 0,
                            supplier: res.supplierName || null,
                            batchNo: res.batchNo || '',
                            initialQuantity: res.quantity || 0,
                            minimumQuantity: res.minimumQuantity || 0,
                            storageLocation: res.storageLocation || '',
                            inventoryId: res.inventoryId || inventoryId,
                            itemName: res.itemName || itemName,
                            itemCode: res.itemCode || itemCode,
                            departmentID: res.departmentID || 0,
                            unitOfMeasure: res.unit || ''
                        });

                        this.disableInventoryFields();
                        this.setInventoryValidators();

                        // Close popup
                        this.showInvntPopup = false;

                        this.toastService.show(
                            'Inventory saved successfully',
                            'success'
                        );
                    },

                    error: () => {
                        this.toastService.show(
                            'Inventory saved, but details could not be loaded.',
                            'warning'
                        );
                    }
                });
            },

            error: () => {
                this.toastService.show(
                    'Error while saving inventory',
                    'error'
                );
            }
        });
    }

    addQuantity(): void {
        if (this.qtyForm.invalid) {
            this.qtyForm.markAllAsTouched();
            return;
        }

        const inventoryId = this.materialForm.get('inventoryId')?.value;
        const addedQty = Number(this.qtyForm.get('addedQuantity')?.value);

        const payload = {
            inventoryId: inventoryId,
            addedQuantity: addedQty
        };

        this.inventorymanagementService.addQuantity(payload).subscribe({
            next: (res: any) => {

                const newQty = res.id.newQuantity || res.id.NewQuantity;

                this.selectedInventory.quantity = newQty;

                this.materialForm.patchValue({
                    initialQuantity: newQty
                });

                this.qtyForm.reset();

                this.loadQuantityLogs(inventoryId);
            }
        });
    }
    closeQtyPopup() {
        this.showQtyPopup = false;
        this.selectedInventory = null;
        this.qtyForm.reset();
        this.quantityLogs = [];
    }

    onSubmit(): void {
        if (this.materialForm.invalid) {
            this.materialForm.markAllAsTouched();
            return;
        }

        const formData = this.materialForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;
        if (this.isEditMode) {
            this.service.update(this.recordId, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/reference-material']);
                    this.toastService.show('reference material updated successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to update record', 'error'); }
            });
        } else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.router.navigate(['/reference-material']);
                    this.toastService.show('reference material created successfully', 'success')
                },
                error: (error: any) => { this.toastService.show(error?.error?.message || 'Failed to create record', 'error'); }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/reference-material']);
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.materialForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.materialForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
