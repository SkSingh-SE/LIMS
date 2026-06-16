import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { SupplierEvaluationRecordService } from '../../../../services/supplier-evaluation-record.service';
import { ToastService } from '../../../../services/toast.service';
import { NablFormsHelper } from '../../../../utility/nabl-helpers/nabl-forms.helper';
import { QuillModule } from 'ngx-quill';
import { Observable } from 'rxjs';
import { CanComponentDeactivate } from '../../../../guards/unsaved-changes.guard';
import { UnsavedChangesService } from '../../../../services/unsaved-changes.service';
import { NablSignatureSectionComponent } from '../../nabl-signature-section/nabl-signature-section.component';
import { NablHeaderService } from '../../../../services/nabl-header.service';

@Component({
    selector: 'app-supplier-evaluation-record-form',

    imports: [CommonModule, ReactiveFormsModule, QuillModule, NablSignatureSectionComponent],
    templateUrl: './supplier-evaluation-record-form.component.html',
    styleUrls: ['./supplier-evaluation-record-form.component.css']
})
export class SupplierEvaluationRecordFormComponent implements CanComponentDeactivate, OnInit {
    saved = false;
    evaluationForm!: FormGroup;
    isEditMode = false;
    isViewMode = false;
    recordId: number | null = null;
    formNumbers: string[] = [];
    supplierList: any[] = [];
    poSummaryList: any[] = [];
    incomingInspectionList: any[] = [];
    poItemsList: any[] = [];
    receivedItemsList: any[] = [];
    selectedList: any[] = [];
    selectedIndent: any = null
    openSections: { [key: string]: boolean } = {
        header: true,
        supplier: true,
        evaluation: true,
        poSummary: true,
        inspectionSummary: true,
        approval: true
    };

    quillModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['clean']
        ]
    };

    recommendationOptions = [
        { value: 'Approved', label: 'Approved' },
        { value: 'Conditionally Approved', label: 'Conditionally Approved' },
        { value: 'Rejected', label: 'Rejected' }
    ];

    defaultCriteria = [
        { parameter: 'Quality of Materials Supplied', maxScore: 40 },
        { parameter: 'Delivery Compliance', maxScore: 30 },
        { parameter: 'Pricing & Commercial Terms', maxScore: 15 },
        { parameter: 'After Sales Support / Response', maxScore: 15 }
    ];
    today = new Date().toISOString().split('T')[0];
    constructor(
        private fb: FormBuilder,
        private service: SupplierEvaluationRecordService,
        private router: Router,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private unsavedChangesService: UnsavedChangesService,
        private nablHeaderService: NablHeaderService) { }

    initForm(): void {
        this.evaluationForm = this.fb.group({
            formatNo: ['F-26'],
            documentNo: ['F-26'],
            issueNo: [{ value: '01', disabled: true }],
            revNo: [{ value: '00', disabled: true }],
            date: [this.today, Validators.required],
            purchaseOrders: [[]],
            incomingPlan: [[]],
            supplierName: ['', Validators.required],
            supplierRegisterId: [null],
            contactPerson: ['', Validators.required],
            mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10,12}$')]],
            email: ['', [Validators.required, Validators.email]],
            registerNo: ['', Validators.required],
            gstNo: ['', [Validators.required, Validators.pattern('^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')]],
            address: ['', Validators.required],
            natureOfBusiness: ['Manufacturer'],
            productsServicesOffered: ['', Validators.required],
            evaluatingPeriodFrom: [""],
            evaluationDate: [this.today, Validators.required],
            evaluatingPeriodTo: [""],
            presentStatus: ['', Validators.required],
            serviceProvider: ['', Validators.required],

            criteria: this.fb.array([]),

            totalScore: [{ value: 0, disabled: true }],
            maxPossibleScore: [{ value: 0, disabled: true }],
            percentageScore: [{ value: 0, disabled: true }],

            recommendation: ['Approved', Validators.required],
            generalRemarks: [''],
            acceptableLimitMin: [null, [Validators.required, Validators.min(30), Validators.max(90)]],
            approvedBy: [null],
            toContinued: [false],
            toRemoved: [false],
            preparedBy: [null],
            reviewedBy: [null],
            approvedDate: [''],
            preparedDate: [this.today],
            reviewedDate: [''],
        });

        // System-managed fields — always readonly
        this.evaluationForm.get('documentNo')?.disable();
        this.evaluationForm.get('formatNo')?.disable();
        this.evaluationForm.get('date')?.disable();
        this.evaluationForm.get('toContinued')?.disable();
        this.evaluationForm.get('toRemoved')?.disable();
        this.evaluationForm.get('acceptableLimitMin')?.valueChanges.subscribe(value => {

            const limit = Number(value);

            if (limit > 90) {
                this.evaluationForm.get('acceptableLimitMin')?.setValue('', {
                    emitEvent: false
                });

                this.toastService.show(
                    'Acceptable limit cannot exceed 90%',
                    'warning'
                );
            }
        });
        this.evaluationForm.get('acceptableLimitMin')?.valueChanges.subscribe(value => {

            const limit = Number(value);

            if (limit > 90) {
                this.evaluationForm.get('acceptableLimitMin')?.setValue('', {
                    emitEvent: false
                });

                this.toastService.show(
                    'Acceptable limit cannot exceed 90%',
                    'warning'
                );

                return;
            }

            this.updateConclusion();
        });
    }
    ngOnInit(): void {
        this.formNumbers = NablFormsHelper.getFormNumbers();
        this.initForm();
        this.nablHeaderService.getFormDefaults('SupplierEvaluation').subscribe({
            next: (defaults) => {
                this.evaluationForm.patchValue({ formatNo: defaults.formCode });
            },
            error: () => { }
        });
        this.loadSupplierList();
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.recordId = +params['id'];
                this.isEditMode = this.router.url.includes('/edit');
                this.isViewMode = this.router.url.includes('/details');
                this.loadRecordData();
            } else {
                // Init with default criteria if new
                this.defaultCriteria.forEach(c => this.addCriteria(c.parameter, c.maxScore));
                this.calculateTotals();
            }
        });

        // Subscribe to form value changes to calculate totals dynamically
        this.evaluationForm.get('criteria')?.valueChanges.subscribe(() => {
            this.calculateTotals();
        });
    }

    get formTitle(): string {
        if (this.isViewMode) return 'View Supplier Evaluation Record';
        return this.isEditMode ? 'Edit Supplier Evaluation Record' : 'New Supplier Evaluation Record';
    }
    openModal(id: string): void {
        const modal = new (window as any).bootstrap.Modal(document.getElementById(id));
        modal.show();
    }

    openPoItems(po: any): void {
        // const add = this.getAdd(po);
        const poNo = po.poNo;
        const supplierName = po.supplierName;
        this.service.getPoItemsDetailsByPoNo(poNo, supplierName).subscribe({
            next: (res) => {
                this.poItemsList = res;

                if (!this.poItemsList.length) {
                    this.toastService.show('No records found for selected Purchase Order', 'warning');
                }
            },
            error: () => {
                this.toastService.show('Failed to fetch supplier evaluation details', 'error');
            }
        });

        this.openModal('poItemsModal');
    }

    openIndent(po: any): void {
        const indentNo = po.referenceIndentNo;
        this.service.getIndentByPo(indentNo).subscribe({
            next: (res) => {
                this.selectedIndent = res;
            },
            error: () => {
                this.toastService.show('Failed to fetch supplier evaluation details', 'error');
            }
        });

        this.openModal('indentModal');
    }

    openParameters(row: any): void {
        const inspectionPlanNo = row.inspectionPlanNoName;
        this.service.getInspectionPlanDetailByinspectionPlanNo(inspectionPlanNo).subscribe({

            next: (res) => {
                this.selectedList = res;

                if (!this.selectedList.length) {
                    this.toastService.show('No records found for selected Inspection Plan No', 'warning');
                }
            },
            error: () => {
                this.toastService.show('Failed to fetch supplier evaluation details', 'error');
            }
        });
        this.openModal('parameterModal');
    }
    openReceivedItems(row: any): void {
        const poNo = row.purchaseOrderNo;
        const supplierName = row.supplierName;
        this.service.getReceivedItems(poNo, supplierName).subscribe({
            next: (res) => {
                this.receivedItemsList = res;

                if (!this.receivedItemsList.length) {
                    this.toastService.show('No records found for selected Purchase Order', 'warning');
                }
            },
            error: () => {
                this.toastService.show('Failed to fetch supplier evaluation details', 'error');
            }
        });

        this.openModal('receivedItemsModal');
    }


    loadSupplierList(): void {
        this.service.getAllSuppliers().subscribe({
            next: (res) => {
                this.supplierList = res;
            },
            error: () => {
                this.supplierList = [];
            }
        })
    }


    onSupplierChange(event: any): void {
        const supplierId = Number(event.target.value);
        const selectSupplier = this.supplierList.find(c => c.id === supplierId || c.Id === supplierId);
        if (!selectSupplier) {
            this.evaluationForm.patchValue({
                supplierRegisterId: null,
                supplierName: '',
                contactPerson: '',
                mobileNo: '',
                email: '',
                registerNo: '',
                gstNo: '',
                address: '',
                natureOfBusiness: '',
                productsServicesOffered: '',
                presentStatus: '',
                serviceProvider: ''
            });
            return;
        }
        const additional = selectSupplier.additionalValues || selectSupplier.AdditionalValues || {};
        this.evaluationForm.patchValue({
            supplierRegisterId: selectSupplier.id || selectSupplier.Id,
            supplierName: selectSupplier.name || selectSupplier.Name,
            contactPerson: additional.ContactPerson || '',
            mobileNo: additional.MobileNo || '',
            email: additional.Email || '',
            registerNo: additional.RegisterNo || '',
            gstNo: additional.GSTNo || '',
            address: additional.Address || '',
            natureOfBusiness: additional.NatureOfBusiness || '',
            productsServicesOffered: additional.ProductsServicesOffered || '',
            presentStatus: additional.PresentStatus || '',
            serviceProvider: additional.ServiceProvider || ''
        });


    }
    fetchSupplierEvaluationDetails(): void {
        const supplierName = this.evaluationForm.get('supplierName')?.value;
        var fromDate = this.evaluationForm.get('evaluatingPeriodFrom')?.value;
        var toDate = this.evaluationForm.get('evaluatingPeriodTo')?.value;

        // Condition 1: Supplier Name check (Ye hamesha mandatory hai)
        if (!supplierName) {
            this.toastService.show('Please select Supplier Name', 'warning');
            return;
        }

        // Condition 2: Agar dono me se koi EK date select ki hai, to dusri mandatory ho jayegi
        if (fromDate || toDate) {
            if (!fromDate) {
                this.evaluationForm.get('evaluatingPeriodFrom')?.markAsTouched();
                this.toastService.show('Please select From Date', 'warning');
                return;
            }
            if (!toDate) {
                this.evaluationForm.get('evaluatingPeriodTo')?.markAsTouched();
                this.toastService.show('Please select To Date', 'warning');
                return;
            }
        }


        this.service.getSupplierEvaluationDetails(supplierName, fromDate, toDate).subscribe({
            next: (res: any) => {
                this.poSummaryList = res.purchaseOrders || [];
                this.incomingInspectionList = res.incomingMaterials || [];
                this.evaluationForm.patchValue({
                    purchaseOrders: this.poSummaryList,
                    incomingPlan: this.incomingInspectionList
                });

                if (!this.poSummaryList.length) {
                    this.toastService.show('No records found for selected supplier and date range', 'warning');
                }
            },
            error: () => {
                this.toastService.show('Failed to fetch supplier evaluation details', 'error');
            }
        });

    }

    get criteria(): FormArray {
        return this.evaluationForm.get('criteria') as FormArray;
    }
    addCriteria(parameter: string = '', maxScore: number = 10, scoreObtained: number = 0, remarks: string = ''): void {
        const itemGroup = this.fb.group({
            parameter: [parameter, Validators.required],
            maxScore: [maxScore, [Validators.required, Validators.min(1)]],
            scoreObtained: [scoreObtained, [Validators.required, Validators.min(0)]],
            remarks: [remarks]
        });
        this.criteria.push(itemGroup);
    }

    removeCriteria(index: number): void {
        this.criteria.removeAt(index);
        this.calculateTotals();
    }

    calculateTotals(): void {
        let totalObtained = 0;
        let maxTotal = 0;

        this.criteria.controls.forEach(ctrl => {
            const max = Number(ctrl.get('maxScore')?.value) || 0;
            const obtained = Number(ctrl.get('scoreObtained')?.value) || 0;

            // Prevent obtained from exceeding max in individual rows
            if (obtained > max && max > 0 && !this.isViewMode) {
                ctrl.get('scoreObtained')?.setValue(max, { emitEvent: false });
                totalObtained += max;
            } else {
                totalObtained += obtained;
            }

            maxTotal += max;
        });

        const percentage = maxTotal > 0 ? ((totalObtained / maxTotal) * 100).toFixed(2) : 0;

        this.evaluationForm.patchValue({
            totalScore: totalObtained,
            maxPossibleScore: maxTotal,
            percentageScore: Number(percentage)
        }, { emitEvent: false });
        this.updateConclusion();
    }

    toggleSection(section: string): void {
        this.openSections[section] = !this.openSections[section];
    }

    updateConclusion(): void {
        const minLimit = Number(this.evaluationForm.get('acceptableLimitMin')?.value || 0);
        const percentageScore = Number(this.evaluationForm.get('percentageScore')?.value || 0);

        if (minLimit <= 0 || percentageScore <= 0) {
            this.evaluationForm.patchValue({
                toContinued: false,
                toRemoved: false
            });
            return;
        }

        if (percentageScore > minLimit) {
            this.evaluationForm.patchValue({
                toContinued: true,
                toRemoved: false
            });
        } else {
            this.evaluationForm.patchValue({
                toContinued: false,
                toRemoved: true
            });
        }
    }
    loadRecordData(): void {
        if (!this.recordId) return;

        this.service.getById(this.recordId).subscribe(record => {
            if (record) {
                // Clear empty array default
                while (this.criteria.length !== 0) {
                    this.criteria.removeAt(0);
                }
                record.evaluationDate = NablFormsHelper.formatDateForInput(record.evaluationDate);
                record.evaluatingPeriodFrom = NablFormsHelper.formatDateForInput(record.evaluatingPeriodFrom);
                record.evaluatingPeriodTo = NablFormsHelper.formatDateForInput(record.evaluatingPeriodTo);
                record.date = NablFormsHelper.formatDateForInput(record.date);
                record.criteria.forEach((c) => {
                    this.addCriteria(c.parameter, c.maxScore, c.scoreObtained, c.remarks);
                });
                this.poSummaryList = record.purchaseOrders || [];
                this.incomingInspectionList = record.incomingPlan || [];

                this.evaluationForm.patchValue(record);
                // Lock form if not in editable status
                const status = (record as any).status;
                if (status && status !== 'Draft' && status !== 'Rejected') {
                    this.evaluationForm.disable();
                    this.isViewMode = true;
                } else if (this.isViewMode) {
                    this.evaluationForm.disable();
                }
                // Re-disable system fields
                this.evaluationForm.get('documentNo')?.disable();
                this.evaluationForm.get('formatNo')?.disable();
            } else {
                this.toastService.show('Record not found', 'error');
                this.router.navigate(['/supplier-evaluation']);
            }
        });
    }

    onSubmit(): void {
        if (this.evaluationForm.invalid) {
            this.evaluationForm.markAllAsTouched();
            this.toastService.show('Please fill all required fields', 'warning');
            return;
        }

        const poList = this.evaluationForm.get('purchaseOrders')?.value || [];

        if (poList.length > 0 && poList) {

            const fromDate = poList[0].poDate;
            const toDate = poList[poList.length - 1].poDate;
            this.evaluationForm.patchValue({
                evaluatingPeriodFrom: fromDate,
                evaluatingPeriodTo: toDate
            });
        }
        else {
            this.evaluationForm.patchValue({
                evaluatingPeriodFrom: "",
                evaluatingPeriodTo: ""
            });

        }

        const formData = this.evaluationForm.getRawValue();
        formData.preparedDate = this.today;
        formData.approvedDate = formData.approvedBy ? this.today : null;
        formData.reviewedDate = formData.reviewedBy ? this.today : null;


        if (this.isEditMode) {
            this.service.update(this.recordId!, formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Supplier evaluation record updated successfully', 'success');
                    this.router.navigate(['/supplier-evaluation']);
                },
                error: () => {
                    this.toastService.show('Failed to update record', 'error');
                }
            });
        }
        else {
            this.service.create(formData).subscribe({
                next: () => {
                    this.saved = true;
                    this.toastService.show('Supplier evaluation record created successfully', 'success');
                    this.router.navigate(['/supplier-evaluation']);
                },
                error: () => {
                    this.toastService.show('Failed to create record', 'error');
                }
            });
        }
    }

    onCancel(): void {
        this.router.navigate(['/supplier-evaluation']);
    }

    canDeactivate(): Observable<boolean> | boolean {
        if (!this.evaluationForm.dirty || this.saved) return true;
        return this.unsavedChangesService.confirm();
    }

    @HostListener('window:beforeunload', ['$event'])
    onBeforeUnload(event: BeforeUnloadEvent) {
        if (this.evaluationForm?.dirty && !this.saved) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
