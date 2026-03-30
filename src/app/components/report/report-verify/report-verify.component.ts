import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-report-verify',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report-verify.component.html',
  styleUrls: ['./report-verify.component.css']
})
export class ReportVerifyComponent implements OnInit {
  reportNo = '';
  reportData: any = null;
  loading = true;
  error = '';
  baseUrl = environment.apiUrl.replace('/api', '');

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit(): void {
    this.reportNo = this.route.snapshot.paramMap.get('reportNo') || '';
    if (this.reportNo) {
      this.loadReport();
    } else {
      this.error = 'No report number provided.';
      this.loading = false;
    }
  }

  loadReport(): void {
    this.http.get<any>(`${environment.apiUrl}/Reporting/verify/${this.reportNo}`).subscribe({
      next: (data) => {
        this.reportData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Report not found or access denied.';
        this.loading = false;
      }
    });
  }
}
