import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TestResultService } from '../../../services/test-result.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-machining-challan',
  imports: [CommonModule, FormsModule],
  templateUrl: './machining-challan.component.html',
  styleUrl: './machining-challan.component.css',
})
export class MachiningChallanComponent implements OnInit {
  sampleId: number | null = null;
  loading = false;
  machiningItems: any[] = [];

  newDesc = '';
  newAmount: number | null = null;
  newRemark = '';

  constructor(
    private testResultService: TestResultService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {}

  loadItems(): void {
    if (!this.sampleId) return;
    this.loading = true;
    this.testResultService.getMachiningItems(this.sampleId).subscribe({
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

  addItem(): void {
    if (!this.sampleId || !this.newDesc?.trim() || !this.newAmount) return;
    this.testResultService
      .addMachiningItem(this.sampleId, {
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

  get totalAmount(): number {
    return this.machiningItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  }
}
