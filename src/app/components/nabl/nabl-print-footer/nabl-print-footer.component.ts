import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nabl-print-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nabl-print-footer.component.html',
  styleUrl: './nabl-print-footer.component.css'
})
export class NablPrintFooterComponent {
  @Input() preparedByName: string = '';
  @Input() issuedByName: string = '';
  @Input() reviewedApprovedByName: string = '';

  @Input() preparedByRole: string = 'Prepared By';
  @Input() issuedByRole: string = 'Issued By';
  @Input() reviewedApprovedByRole: string = 'Reviewed & Approved By';

  @Input() showSignatures: boolean = true;
}
