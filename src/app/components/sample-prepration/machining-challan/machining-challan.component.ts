import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { TestResultService } from '../../../services/test-result.service';
import { SampleInwardService } from '../../../services/sample-inward.service';
import { ToastService } from '../../../services/toast.service';
import { SearchableDropdownComponent } from '../../../utility/components/searchable-dropdown/searchable-dropdown.component';

@Component({
  selector: 'app-machining-challan',
  imports: [CommonModule, FormsModule, SearchableDropdownComponent],
  templateUrl: './machining-challan.component.html',
  styleUrl: './machining-challan.component.css',
})
export class MachiningChallanComponent implements OnInit {
  // ── Case / Inward selection ──
  selectedInwardId: number | null = null;
  availableSamples: any[] = [];

  // ── Sample selection ──
  selectedSampleId: number | null = null;

  // ── Machining data ──
  loading = false;
  machiningItems: any[] = [];

  // ── Add new item ──
  newDesc = '';
  newAmount: number | null = null;
  newRemark = '';

  constructor(
    private testResultService: TestResultService,
    private inwardService: SampleInwardService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {}

  // ── Case (Inward) Dropdown ──

  fetchSampleInwardDropdown = (searchTerm: string, pageNumber: number, pageSize: number): Observable<any> => {
    return this.inwardService.getPreparationInwardDropdown(searchTerm, pageNumber, pageSize);
  };

  onInwardSelected(item: any): void {
    if (!item) {
      this.resetSelection();
      return;
    }

    this.selectedInwardId = item.id;
    this.availableSamples = [];
    this.selectedSampleId = null;
    this.machiningItems = [];

    // Load samples for this inward
    this.inwardService.getSampleInwardById(item.id).subscribe({
      next: (data: any) => {
        this.availableSamples = (data?.sampleDetails || []).map((s: any) => ({
          id: s.id,
          name: s.sampleNo + (s.details ? ' - ' + s.details : ''),
          sampleNo: s.sampleNo,
        }));
      },
      error: (err: any) => {
        this.toastService.show(err?.error?.message || 'Failed to load samples', 'error');
      },
    });
  }

  // ── Sample Dropdown (local filter over loaded samples) ──

  fetchSampleDropdown = (searchTerm: string, _pageNumber: number, _pageSize: number): Observable<any[]> => {
    if (!this.availableSamples.length) return of([]);
    if (!searchTerm) return of(this.availableSamples);
    const term = searchTerm.toLowerCase();
    return of(this.availableSamples.filter(s => s.name.toLowerCase().includes(term)));
  };

  onSampleSelected(item: any): void {
    if (!item) {
      this.selectedSampleId = null;
      this.machiningItems = [];
      return;
    }
    this.selectedSampleId = item.id;
    this.loadItems();
  }

  // ── Reset ──

  resetSelection(): void {
    this.selectedInwardId = null;
    this.availableSamples = [];
    this.selectedSampleId = null;
    this.machiningItems = [];
  }

  // ── Load Machining Items ──

  loadItems(): void {
    if (!this.selectedSampleId) return;
    this.loading = true;
    this.testResultService.getMachiningItems(this.selectedSampleId).subscribe({
      next: (data) => {
        this.machiningItems = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastService.show(err?.error?.message || 'Failed to load machining items', 'error');
      },
    });
  }

  // ── Add Item ──

  addItem(): void {
    if (!this.selectedSampleId || !this.newDesc?.trim() || !this.newAmount) return;
    this.testResultService
      .addMachiningItem(this.selectedSampleId, {
        description: this.newDesc.trim(),
        amount: this.newAmount,
        remark: this.newRemark?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.newDesc = '';
          this.newAmount = null;
          this.newRemark = '';
          this.loadItems();
          this.toastService.show('Machining item added', 'success');
        },
        error: (err) => this.toastService.show(err?.error?.message || 'Failed to add item', 'error'),
      });
  }

  // ── Delete Item ──

  deleteItem(itemId: number): void {
    if (!confirm('Delete this machining charge?')) return;
    this.testResultService.deleteMachiningItem(itemId).subscribe({
      next: () => {
        this.loadItems();
        this.toastService.show('Machining item deleted', 'success');
      },
      error: (err) => this.toastService.show(err?.error?.message || 'Failed to delete item', 'error'),
    });
  }

  // ── Total ──

  get totalAmount(): number {
    return this.machiningItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }
}
