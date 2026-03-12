import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SampleLabelNablService } from '../../../../services/sample-label-nabl.service';

@Component({
    selector: 'app-sample-label-nabl-preview',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sample-label-preview.component.html',
    styleUrl: './sample-label-preview.component.css'
})
export class SampleLabelNablPreviewComponent implements OnInit {
    recordId: number = 0;
    data: any = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private service: SampleLabelNablService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.recordId = Number(params.get('id'));
            if (this.recordId > 0) {
                this.fetchData();
            }
        });
    }

    fetchData() {
        this.service.getById(this.recordId).subscribe({
            next: (resp) => {
                this.data = resp;
            },
            error: (err) => console.error('Error fetching preview data:', err)
        });
    }

    printPage(): void {
        window.print();
    }

    goBack(): void {
        this.router.navigate(['/nabl/sample-label']);
    }
}
