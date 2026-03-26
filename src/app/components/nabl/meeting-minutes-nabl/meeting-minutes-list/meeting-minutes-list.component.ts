import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingMinutesService } from '../../../../services/meeting-minutes.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-meeting-minutes-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './meeting-minutes-list.component.html',
    styleUrl: './meeting-minutes-list.component.css'
})
export class MeetingMinutesListComponent implements OnInit {
    title = 'F-54: Minutes of MRM';
    addButtonLabel = 'New Meeting Minutes';
    addRoute = '/meeting-minutes/create';
    baseRoute = '/meeting-minutes';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'meetingDate', label: 'Meeting Date', type: 'date', width: '150px', filter: true },
        { key: 'chairperson', label: 'Chairperson', type: 'string', filter: true },
        { key: 'reviewPeriod', label: 'Review Period', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: MeetingMinutesService) { }

    ngOnInit() {
        this.fetchData();
    }

    fetchData(params: any = {}) {
        this.service.getAll().subscribe({
            next: (resp) => {
                this.data.set(resp);
                this.totalItems.set(resp.length);
            },
            error: (err) => {
                console.error('Error fetching meeting minutes:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
