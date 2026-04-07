import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TestResultService } from '../../../services/test-result.service';
import { ParameterService } from '../../../services/parameter.service';
import { LongTermTestDto, LongTermReadingDto } from '../../../models/testResultModels';
import { ToastService } from '../../../services/toast.service';
import { TestStatusBadgeComponent } from '../test-status-badge/test-status-badge.component';

@Component({
  selector: 'app-long-term-tracking',

  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, TestStatusBadgeComponent],
  templateUrl: './long-term-tracking.component.html',
  styleUrls: ['./long-term-tracking.component.css']
})
export class LongTermTrackingComponent implements OnInit, OnDestroy {
  // Data
  longTermTests: LongTermTestDto[] = [];
  isSaving = signal(false);

  // Search & Filter
  searchTerm: string = '';
  sortByColumn: string = 'startedAt';
  sortOrder: string = 'desc';

  // Pagination
  pageNumber: number = 1;
  pageSize: number = 10;
  totalRecords: number = 0;
  pageSizes: number[] = [10, 20, 50];

  // Details Modal
  showDetails = false;
  selectedTest: LongTermTestDto | null = null;

  // Record Reading Modal
  showRecordModal = false;
  selectedTestId: number = 0;
  selectedTestForRecord: LongTermTestDto | null = null;
  recordForm!: FormGroup;
  availableParameters: any[] = [];

  // Auto-refresh
  private refreshInterval: any;

  constructor(
    private testResultService: TestResultService,
    private parameterService: ParameterService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.recordForm = this.fb.group({
      parameterId: ['', Validators.required],
      value: ['', [Validators.required, Validators.pattern(/^\d+(\.\d{1,4})?$/)]],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    this.loadLongTermTests();
    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      if (!this.showDetails && !this.showRecordModal) {
        this.loadLongTermTests();
      }
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // ================================================================
  // UI HELPERS - Search, Sort, Filter, Pagination
  // ================================================================
  onSearch(): void {
    this.pageNumber = 1;
    this.loadLongTermTests();
  }

  applySorting(column: string): void {
    if (this.sortByColumn === column) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortByColumn = column;
      this.sortOrder = 'asc';
    }
    this.pageNumber = 1;
    this.loadLongTermTests();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageNumber = page;
      this.loadLongTermTests();
    }
  }

  changePageSize(): void {
    this.pageNumber = 1;
    this.loadLongTermTests();
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize) || 1;
  }

  // ================================================================
  // LOAD & FETCH
  // ================================================================
  // LOAD & FETCH
  // ================================================================
  loadLongTermTests(): void {
    const filter = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm,
      sortByColumn: this.sortByColumn,
      sortOrder: this.sortOrder
    };
    this.testResultService.getLongTermTests(filter).subscribe({
      next: (data) => {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          console.info('[LongTermTracking] No long-term tests found');
        }

        // Handle both direct array and paginated response
        if (Array.isArray(data)) {
          this.longTermTests = data;
          this.totalRecords = data.length;
        } else if (data?.items) {
          this.longTermTests = data.items || [];
          this.totalRecords = data.totalRecords || 0;
        } else {
          this.longTermTests = [];
          this.totalRecords = 0;
        }

        // Validate each test item
        this.longTermTests?.forEach((test: LongTermTestDto) => {
          if (!test.id) {
            console.warn('[LongTermTracking] Test missing ID:', test);
          }
          if (!test.sampleNo) {
            console.warn('[LongTermTracking] Test missing sample number:', test);
          }
          if (!test.readings) {
            test.readings = [];
          }
        });

        console.log('Loaded long-term tests:', this.longTermTests.length);
      },
      error: (error) => {
        console.error('Error loading long-term tests:', error);
        this.toastService.show('Failed to load long-term tests', 'error');
      }
    });
  }
  viewDetails(testId: number): void {
    if (!testId) {
      console.warn('[LongTermTracking] No test ID provided for details view');
      return;
    }

    console.log('Viewing details for test:', testId);
    this.testResultService.getLongTermTestDetail(testId).subscribe({
      next: (data) => {
        if (!data) {
          console.warn('[LongTermTracking] Empty test details received');
          this.toastService.show('Failed to load test details', 'warning');
          return;
        }

        // Ensure readings array exists
        if (!data.readings) {
          console.warn('[LongTermTracking] Test missing readings array:', testId);
          data.readings = [];
        }

        // if(data.readings.length > 0 && data.parameters && data.parameters.length > 0) {
        //   console.info('[LongTermTracking] No readings recorded yet for test:', testId);
        // }
        this.selectedTest = data;
        this.showDetails = true;
        console.log('Loaded test details with', data.readings?.length || 0, 'readings');
      },
      error: (error) => {
        console.error('Error loading test details:', error);
        this.toastService.show('Failed to load test details', 'error');
      }
    });
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedTest = null;
  }

  refreshDetails(testId: number): void {
    this.viewDetails(testId);
  }

  // ================================================================
  // RECORD READING MODAL
  // ================================================================
  recordReading(test: LongTermTestDto): void {
    this.selectedTestId = test.id;
    this.selectedTestForRecord = test;
    this.recordForm.reset();
    this.availableParameters = [];
    this.showRecordModal = true;

    // Load available parameters for this test
    if (test?.headerId)
      this.loadAvailableParameters(test);
    else
      this.toastService.show('Header ID is missing for this test', 'error');
  }

  loadAvailableParameters(test: LongTermTestDto): void {
    // Get parameters from the test's existing readings or from a parameter service
    // For now, use a generic parameter dropdown
    this.testResultService.getParametersForHeader(test.headerId).subscribe({
      next: (data) => {
        this.availableParameters = data || [];
        console.log('Loaded', this.availableParameters.length, 'available parameters');
        const control = this.recordForm.get('parameterId');

        // Auto-select if empty
        if (!control?.value || control.value === '') {
          if (this.availableParameters.length > 0) {
            control?.setValue(this.availableParameters[0].id);
          }
        }
      },
      error: (error) => {
        console.error('Error loading parameters:', error);
        this.toastService.show('Failed to load parameters', 'error');
      }
    });
  }

  closeRecordModal(): void {
    this.showRecordModal = false;
    this.selectedTestId = 0;
    this.selectedTestForRecord = null;
    this.recordForm.reset();
    this.availableParameters = [];
  }

  saveReading(): void {
    if (!this.recordForm.valid) {
      this.recordForm.markAllAsTouched();
      this.toastService.show('Please fill in all required fields', 'warning');
      return;
    }

    if (!this.selectedTestId) {
      console.warn('[LongTermTracking] No test ID selected for recording reading');
      this.toastService.show('Test ID is missing', 'error');
      return;
    }

    const formValue = this.recordForm.value;
    const parameterId = parseInt(formValue.parameterId, 10);
    const value = parseFloat(formValue.value);

    if (isNaN(parameterId) || isNaN(value)) {
      console.warn('[LongTermTracking] Invalid parameter or value format', { parameterId, value });
      this.toastService.show('Invalid parameter or value', 'error');
      return;
    }

    const payload = {
      longTermTestId: this.selectedTestId,
      parameterId: parameterId,
      value: value,
      remarks: formValue.remarks || undefined
    };

    console.log('Saving reading:', payload);
    this.isSaving.set(true);

    this.testResultService.longTermRecord(payload).subscribe({
      next: (response) => {
        if (!response) {
          console.warn('[LongTermTracking] Empty response from recording API');
        }
        this.toastService.show('Reading recorded successfully', 'success');
        this.isSaving.set(false);
        this.closeRecordModal();
        // Refresh the details view if open
        if (this.showDetails && this.selectedTest) {
          this.refreshDetails(this.selectedTest.id);
        }
        // Reload list
        this.loadLongTermTests();
      },
      error: (error) => {
        console.error('Error recording reading:', error);
        this.toastService.show('Failed to record reading', 'error');
        this.isSaving.set(false);
      }
    });
  }

  // ================================================================
  // COMPLETE TEST
  // ================================================================
  completeTest(test: LongTermTestDto): void {
    const confirmed = confirm(`Are you sure you want to complete the long-term test "${test.testName}"?`);
    if (!confirmed) return;

    console.log('Completing long-term test:', test.id);
    this.isSaving.set(true);

    this.testResultService.completeLongTerm(test.id).subscribe({
      next: (response) => {
        this.toastService.show('Test completed successfully', 'success');
        this.isSaving.set(false);
        this.closeDetails();
        this.loadLongTermTests();
      },
      error: (error) => {
        console.error('Error completing test:', error);
        this.toastService.show('Failed to complete test', 'error');
        this.isSaving.set(false);
      }
    });
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================
  getParameterName(parameterId: number): string {
    const param = this.availableParameters.find(p => p.id === parameterId);
    return param ? param.name : 'Unknown';
  }

  canRecordReading(test: LongTermTestDto): boolean {
    return test.status !== 'Completed' && test.status !== 'Paused';
  }

  canCompleteTest(test: LongTermTestDto): boolean {

    const allowedStatus =
      test.status === 'Active' ||
      test.status === 'In Progress' ||
      test.status === 'Started';

    // 72 hours = 259200000 ms
    const hrs = test.durationHours || 1;
    const expiryMs = hrs * 60 * 60 * 1000;

    const startTime = new Date(test.startedAt).getTime();
    const now = Date.now();

    const isExpired = (now - startTime) >= expiryMs;

    return allowedStatus || isExpired;
  }
}
