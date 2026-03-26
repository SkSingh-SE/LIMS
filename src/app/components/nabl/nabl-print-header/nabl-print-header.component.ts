import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NablHeaderService } from '../../../services/nabl-header.service';

@Component({
  selector: 'app-nabl-print-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nabl-print-header.component.html',
  styleUrl: './nabl-print-header.component.css'
})
export class NablPrintHeaderComponent implements OnInit {
  @Input() formatNo: string = '';
  @Input() mainTitle: string = '';
  @Input() docNo: string = '';
  @Input() issueNo: string | number = '01';
  @Input() issueDate: string | Date = new Date();
  @Input() revNo: string | number = '00';
  @Input() revDate: string | Date = '--';

  companyName = '';
  companyAddress = '';
  logoPath: string = 'assets/images/logo.png';

  constructor(private nablHeaderService: NablHeaderService) {}

  ngOnInit(): void {
    this.nablHeaderService.getCompanyInfo().subscribe({
      next: (info) => {
        this.companyName = info.companyName || 'DIVINE METALLURGICAL SERVICES PVT. LTD.';
        this.companyAddress = info.companyAddress || '';
        if (info.organizationLogo) {
          this.logoPath = info.organizationLogo;
        }
      },
      error: () => {
        this.companyName = 'DIVINE METALLURGICAL SERVICES PVT. LTD.';
      }
    });
  }
}
