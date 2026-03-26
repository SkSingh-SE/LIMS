import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NablFormDefaults {
    formCode: string;
    companyName: string;
    companyAddress: string;
    contactEmail: string;
    contactPhone: string;
    organizationLogo: string;
    nablTcNumber: string;
    nablLogo: string;
    preparedBy: string;
    preparedById: number;
}

export interface SuggestedPerson {
    id: number;
    name: string;
    designation: string;
    department: string;
}

export interface SuggestedReviewers {
    reviewers: SuggestedPerson[];
    approvers: SuggestedPerson[];
}

@Injectable({
    providedIn: 'root',
})
export class NablHeaderService {
    private apiUrl = environment.apiUrl + '/Nabl';
    private companyInfoCache$: Observable<NablFormDefaults> | null = null;
    private reviewersCache$: Observable<SuggestedReviewers> | null = null;

    constructor(private http: HttpClient) {}

    getFormDefaults(formType: string): Observable<NablFormDefaults> {
        return this.http.get<NablFormDefaults>(`${this.apiUrl}/form-defaults/${formType}`);
    }

    getCompanyInfo(): Observable<NablFormDefaults> {
        if (!this.companyInfoCache$) {
            this.companyInfoCache$ = this.http
                .get<NablFormDefaults>(`${this.apiUrl}/form-defaults/JobDescription`)
                .pipe(shareReplay(1));
        }
        return this.companyInfoCache$;
    }

    getSuggestedReviewers(): Observable<SuggestedReviewers> {
        if (!this.reviewersCache$) {
            this.reviewersCache$ = this.http
                .get<SuggestedReviewers>(`${this.apiUrl}/suggested-reviewers`)
                .pipe(shareReplay(1));
        }
        return this.reviewersCache$;
    }

    clearCache(): void {
        this.companyInfoCache$ = null;
        this.reviewersCache$ = null;
    }
}
