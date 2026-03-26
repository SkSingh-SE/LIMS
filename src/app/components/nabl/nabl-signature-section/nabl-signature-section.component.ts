import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { NablHeaderService, SuggestedPerson } from '../../../services/nabl-header.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-nabl-signature-section',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './nabl-signature-section.component.html',
    styleUrl: './nabl-signature-section.component.scss',
})
export class NablSignatureSectionComponent implements OnInit {
    @Input() parentForm!: FormGroup;
    @Input() sectionTitle = 'Responsibility & Signatures';
    @Input() showSection = true;

    reviewers: SuggestedPerson[] = [];
    approvers: SuggestedPerson[] = [];
    currentUserName = '';
    isOpen = true;

    constructor(
        private nablHeaderService: NablHeaderService,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        // Auto-fill preparedBy from logged-in user — try localStorage first, then API
        const userData = this.authService.getUserData();
        const localName = userData?.userName || userData?.name || '';
        if (localName) {
            this.fillPreparedBy(localName);
        }

        // Also fetch from API (most reliable — uses JWT claims on server)
        this.nablHeaderService.getCompanyInfo().subscribe({
            next: (info) => {
                if (info.preparedBy) {
                    this.fillPreparedBy(info.preparedBy);
                }
            },
            error: () => {}
        });

        // Load suggested reviewers/approvers
        this.nablHeaderService.getSuggestedReviewers().subscribe({
            next: (data) => {
                this.reviewers = data.reviewers || [];
                this.approvers = data.approvers || [];
            },
            error: () => {}
        });
    }

    private fillPreparedBy(name: string): void {
        this.currentUserName = name;
        const ctrl = this.parentForm.get('preparedBy');
        if (ctrl && !ctrl.value) {
            ctrl.setValue(name);
        }
    }

    toggleSection(): void {
        this.isOpen = !this.isOpen;
    }

    onReviewerClick(person: SuggestedPerson): void {
        this.parentForm.get('reviewedBy')?.setValue(person.name);
    }

    onApproverClick(person: SuggestedPerson): void {
        this.parentForm.get('approvedBy')?.setValue(person.name);
    }
}
