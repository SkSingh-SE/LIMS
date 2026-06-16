import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class NablAuditService {
    private apiUrl = environment.apiUrl + '/Nabl';

    constructor(private http: HttpClient) {}

    getDashboard(): Observable<NablDashboardDto> {
        return this.http.get<NablDashboardDto>(`${this.apiUrl}/dashboard`);
    }

    getAuditSummary(): Observable<AuditSummaryItem[]> {
        return this.http.get<AuditSummaryItem[]>(`${this.apiUrl}/audit-summary`);
    }

    generateAuditPackage(request: AuditPackageRequest): Observable<Blob> {
        return this.http.post(`${this.apiUrl}/audit-package`, request, {
            responseType: 'blob',
        });
    }
}

export interface NablDashboardDto {
    totalForms: number;
    draftCount: number;
    submittedCount: number;
    reviewedCount: number;
    approvedCount: number;
    rejectedCount: number;
    overdueCount: number;
    pendingReviews: NablPendingReviewItem[];
    upcomingReviews: NablUpcomingReviewItem[];
    expiringDocuments: NablExpiringDocItem[];
    formSummary: AuditSummaryItem[];
}

export interface NablPendingReviewItem {
    id: number;
    formType: string;
    formCode: string;
    documentNo: string;
    status: string;
    date: string;
    preparedBy: string;
}

export interface NablUpcomingReviewItem {
    id: number;
    formType: string;
    formCode: string;
    documentNo: string;
    nextReviewDate: string;
    daysUntilReview: number;
}

export interface NablExpiringDocItem {
    id: number;
    formType: string;
    formCode: string;
    documentNo: string;
    effectiveDate: string;
    nextReviewDate: string;
    isOverdue: boolean;
}

export interface AuditSummaryItem {
    formType: string;
    formCode: string;
    total: number;
    draft: number;
    submitted: number;
    reviewed: number;
    approved: number;
    rejected: number;
}

export interface AuditPackageRequest {
    formTypes: string[];
    from?: string;
    to?: string;
}
