import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nabl-print-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nabl-print-header.component.html',
  styleUrl: './nabl-print-header.component.css'
})
export class NablPrintHeaderComponent {
  @Input() formatNo: string = '';
  @Input() mainTitle: string = '';
  @Input() docNo: string = '';
  @Input() issueNo: string | number = '01';
  @Input() issueDate: string | Date = new Date();
  @Input() revNo: string | number = '00';
  @Input() revDate: string | Date = '--';

  // Fixed company details (can be moved to a configuration service later)
  companyName: string = 'DIVINE METALLURGICAL SERVICES PVT. LTD.';
  companyAddress: string = 'Plot No. 14, Gopal Industrial Estate, Opp. Vallabhnagar, Odhav, AHMEDABAD – 382415, GUJRAT';
  logoPath: string = 'assets/images/logo.png';
}
