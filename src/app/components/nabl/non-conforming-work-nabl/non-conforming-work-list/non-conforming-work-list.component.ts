import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NonConformingWorkService } from '../../../../services/non-conforming-work.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-non-conforming-work-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './non-conforming-work-list.component.html',
    styleUrl: './non-conforming-work-list.component.css'
})
export class NonConformingWorkListComponent implements OnInit {
    title = 'F-41: Non-Conforming Work Records';
    addRoute = '/non-conforming-work/create';
    baseRoute = '/non-conforming-work';

    columns: RegisterColumn[] = [
        { key: 'dateMonthYear', label: 'Date / Month & Year', type: 'string', width: '150px', filter: true },
        { key: 'ncDetail', label: 'NC Detail', type: 'string', filter: true },
        { key: 'closerDate', label: 'Closer Date', type: 'date', width: '130px', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);
    isLoading = signal(false);

    constructor(private service: NonConformingWorkService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.isLoading.set(true);
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp);
                this.totalItems.set(resp.length);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error fetching NC records:', err);
                this.isLoading.set(false);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
