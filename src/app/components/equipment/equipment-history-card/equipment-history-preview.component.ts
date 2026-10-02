import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  data: any = null;
  recordId: number | null = null;
  orientation: 'portrait' | 'landscape' = 'portrait';
  orientationManual = false;
  private orientationDetected = false;
  constructor(
    private equipmentHistoryService: EquipmentHistoryService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.recordId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.recordId) {
      this.loadRecord(this.recordId);
    }
  }

  private loadRecord(equipmentId: number): void {
    this.equipmentHistoryService.getequipmentById(equipmentId).subscribe({
      next: (record) => {
        this.data = record;
      },
      error: (error) => {
        console.error('Error loading record:', error);
      }
    });
  }

  printRecord(): void {
    window.print();
  }
  private autoDetectOrientation(): void {
    if (this.orientationManual || this.orientationDetected) return;
    this.orientationDetected = true;
    const bodyBlock = document.querySelector('.body-block') as HTMLElement | null;
    if (!bodyBlock) return;
    let needsLandscape = false;
    bodyBlock.querySelectorAll<HTMLElement>('table').forEach(table => {
      if (table.scrollWidth > table.clientWidth + 8) needsLandscape = true;
    });
    bodyBlock.querySelectorAll<HTMLElement>('tr').forEach(row => {
      if (row.children.length > 5) needsLandscape = true;
    });
    const detected: 'portrait' | 'landscape' = needsLandscape ? 'landscape' : 'portrait';
    if (detected !== this.orientation) {
      this.orientation = detected;
      this.cdr.detectChanges();
    }
  }

  setOrientation(o: 'portrait' | 'landscape'): void {
    this.orientation = o;
    this.orientationManual = true;
  }

  resetToAuto(): void {
    this.orientationManual = false;
    this.orientationDetected = false;
    this.orientation = 'portrait';
    setTimeout(() => this.autoDetectOrientation(), 100);
  }

  printPage(): void {
    document.getElementById('comp-print-size')?.remove();
    const styleEl = document.createElement('style');
    styleEl.id = 'comp-print-size';
    styleEl.textContent = `@page { size: A4 ${this.orientation}; }`;
    document.head.appendChild(styleEl);
    const originalTitle = document.title;
    document.title = '';
    window.print();
    document.title = originalTitle;
    document.head.removeChild(styleEl);
  }
  goBack(): void {
    this.router.navigate(['/equipment']);
  }


}
