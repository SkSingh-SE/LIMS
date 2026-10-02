import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingAgendaService } from '../../../../services/meeting-agenda.service';
import { NablRegisterTableComponent, RegisterColumn } from '../../nabl-register-table/nabl-register-table.component';
import { ToastService } from '../../../../services/toast.service';
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
        { key: 'meetingNo', type: 'string', label: 'Meeting No', filter: true },
        { key: 'meetingDate', label: 'Meeting Date', type: 'date', filter: true },
        { key: 'meetingType', label: 'Meeting Type', type: 'string', filter: true },
        { key: 'meetingTime', label: 'Meeting Time', type: 'string' },
        { key: 'meetingVenue', label: 'Meeting Venue', type: 'string', filter: true }
    ];

    data = signal<any[]>([]);
    totalItems = signal(0);

    constructor(private service: MeetingAgendaService, private toastService: ToastService) { }

    ngOnInit() {
        this.fetchData({
            PageNumber: 1,
            PageSize: 10,
            searchTerm: '',
            sortByColumn: 'id',
            sortOrder: 'desc',
            filter: []
        });
    }

    fetchData(params: any) {
        this.service.getAll(params).subscribe({
            next: (resp) => {
                this.data.set(resp.items || []);
                this.totalItems.set(resp.totalRecords || 0);
            },
            error: (err) => {
                console.error('Error fetching meeting agendas:', err);
            }
        });
    }
    deleteRecord(id: number) {
        if (confirm('Are you sure you want to delete this record?')) {
            this.service.delete(id).subscribe({
                next: (res) => {
                    this.toastService.show('Record deleted successfully', 'success');
                    this.fetchData({
                        PageNumber: 1,
                        PageSize: 10,
                        searchTerm: '',
                        sortByColumn: 'id',
                        sortOrder: 'desc',
                        filter: []
                    });
                },
                error: (err) => {
                    this.toastService.show(err.message || 'Error deleting record', 'error');
                }
            });
        }
    }
    onPageChange(params: any) {
        this.fetchData(params);
    }
}
