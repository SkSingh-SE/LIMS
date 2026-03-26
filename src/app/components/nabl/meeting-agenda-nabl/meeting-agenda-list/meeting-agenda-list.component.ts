import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingAgendaService } from '../../../../services/meeting-agenda.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';

@Component({
    selector: 'app-meeting-agenda-list',
    standalone: true,
    imports: [CommonModule, NablRegisterTableComponent],
    templateUrl: './meeting-agenda-list.component.html',
    styleUrl: './meeting-agenda-list.component.css'
})
export class MeetingAgendaListComponent implements OnInit {
    title = 'F-53: Meeting Notice / Agenda for MRM';
    addButtonLabel = 'New Meeting Notice';
    addRoute = '/meeting-agenda/create';
    baseRoute = '/meeting-agenda';

    columns: RegisterColumn[] = [
        { key: 'documentNo', type: 'string', label: 'Doc No', filter: true },
        { key: 'meetingDate', label: 'Meeting Date', type: 'date', width: '150px', filter: true },
        { key: 'meetingTime', label: 'Time', type: 'string', width: '120px' },
        { key: 'chairperson', label: 'Chairperson', type: 'string', filter: true },
        { key: 'venue', label: 'Venue', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: MeetingAgendaService) { }

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
                console.error('Error fetching meeting agendas:', err);
            }
        });
    }

    onPageChange(params: any) {
        this.fetchData(params);
    }
}
