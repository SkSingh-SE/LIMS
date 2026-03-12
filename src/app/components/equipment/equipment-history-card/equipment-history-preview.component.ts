import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EquipmentHistoryService } from '../../../services/equipment-history.service';
import { NablPrintHeaderComponent } from '../../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../../nabl/nabl-print-footer/nabl-print-footer.component';
import { PrintFrameComponent } from '../../nabl/print-frame/print-frame.component';

@Component({
  selector: 'app-equipment-history-preview',

  imports: [CommonModule, RouterModule, FormsModule, NablPrintHeaderComponent, NablPrintFooterComponent, PrintFrameComponent],
  templateUrl: './equipment-history-preview.component.html',
  styleUrl: './equipment-history-preview.component.css'
})
export class EquipmentHistoryPreviewComponent implements OnInit {
  record: any = null;
  isLoading = false;
  recordId: number | null = null;

  constructor(
    private equipmentHistoryService: EquipmentHistoryService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.recordId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.recordId) {
      this.loadRecord();
    }
  }

  private loadRecord(): void {
    this.isLoading = true;
    this.equipmentHistoryService.getById(this.recordId!).subscribe({
      next: (record) => {
        this.record = record;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading record:', error);
        this.isLoading = false;
      }
    });
  }

  printRecord(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/equipment-history-card']);
  }

  getRecordTypeClass(recordType: string): string {
    switch (recordType) {
      case 'calibration': return 'badge-primary';
      case 'maintenance': return 'badge-success';
      case 'repair': return 'badge-warning';
      case 'modification': return 'badge-info';
      case 'verification': return 'badge-secondary';
      default: return 'badge-light';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'in-progress': return 'badge-info';
      default: return 'badge-secondary';
    }
  }
}
