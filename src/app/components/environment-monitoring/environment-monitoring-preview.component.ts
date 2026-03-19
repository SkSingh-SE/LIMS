import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EnvironmentMonitoring } from '../../models/environmentMonitoringModel';
import { EnvironmentMonitoringService } from '../../services/environment-monitoring.service';
import { PrintFrameComponent } from '../nabl/print-frame/print-frame.component';
import { NablPrintHeaderComponent } from '../nabl/nabl-print-header/nabl-print-header.component';
import { NablPrintFooterComponent } from '../nabl/nabl-print-footer/nabl-print-footer.component';

@Component({
  selector: 'app-environment-monitoring-preview',

  imports: [CommonModule, RouterModule, PrintFrameComponent, NablPrintHeaderComponent, NablPrintFooterComponent],
  templateUrl: './environment-monitoring-preview.component.html',
  styleUrl: './environment-monitoring-preview.component.css'
})
export class EnvironmentMonitoringPreviewComponent implements OnInit {
  recordId: number = 0;
  record: EnvironmentMonitoring | null = null;
  months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private environmentService: EnvironmentMonitoringService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.recordId = Number(params.get('id'));
      if (this.recordId > 0) {
        this.loadRecord();
      } else {
      }
    });
  }

  loadRecord(): void {
    this.environmentService.getById(this.recordId).subscribe({
      next: (data: any) => {
        this.record = data;
      },
      error: (err: any) => {
        console.error('Error loading environment monitoring record:', err);
      }
    });
  }

  getMonthName(month: number): string {
    return this.months[month - 1] || '';
  }

  checkDeviation(temperature: number, humidity: number): boolean {
    if (!this.record) return false;
    const tempOK = temperature >= (this.record.minTempLimit || 0) && temperature <= (this.record.maxTempLimit || 100);
    const humidityOK = humidity >= (this.record.minHumidityLimit || 0) && humidity <= (this.record.maxHumidityLimit || 100);
    return !(tempOK && humidityOK);
  }

  printPage(): void {
    window.print();
  }

  goBack(): void {
    this.router.navigate(['/environment-monitoring']);
  }
}
