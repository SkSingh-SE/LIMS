import { Component, ElementRef, Input, OnInit, HostListener, ViewChild } from '@angular/core';
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
    @ViewChild('reviewerBox') reviewerBox!: ElementRef;
    @ViewChild('approverBox') approverBox!: ElementRef;

    isReviewerOpen = false;
    isApproverOpen = false;
    reviewers: SuggestedPerson[] = [];
    approvers: SuggestedPerson[] = [];
    currentUserName = '';
    isOpen = true;
    today = new Date().toISOString().split('T')[0];
    constructor(
        private nablHeaderService: NablHeaderService,
        private authService: AuthService,
        private eref: ElementRef
    ) { }


    @HostListener('document:click', ['$event'])
    handleClick(event: MouseEvent) {
        const target = event.target as HTMLElement;

        const clickedInsideReviewer = this.reviewerBox?.nativeElement.contains(target);
        const clickedInsideApprover = this.approverBox?.nativeElement.contains(target);

        if (clickedInsideReviewer || clickedInsideApprover) {
            return;
        }

        this.isReviewerOpen = false;
        this.isApproverOpen = false;
    }

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
            error: () => { }
        });

        // Load suggested reviewers/approvers
        this.nablHeaderService.getSuggestedReviewers().subscribe({
            next: (data) => {
                this.reviewers = data.reviewers || [];
                this.approvers = data.approvers || [];
            },
            error: () => { }
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



    openApprover() {
        this.isApproverOpen = true;
        this.isReviewerOpen = false;
    }
    openReviewer() {
        this.isReviewerOpen = true;
        this.isApproverOpen = false;
    }

    onReviewerClick(person: SuggestedPerson): void {

        this.parentForm.get('reviewedBy')?.setValue(person.name);
        this.parentForm.get('reviewedDate')?.setValue(this.today);
        this.isReviewerOpen = false;
    }

    onApproverClick(person: SuggestedPerson): void {
        this.parentForm.get('approvedBy')?.setValue(person.name);
        this.parentForm.get('approvedDate')?.setValue(this.today);
        this.isApproverOpen = false;
    }

}
