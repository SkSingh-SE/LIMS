import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DailyLogColumn {
    key: string;
    label: string;
    subLabel?: string;
    width?: string;
}

export interface DailyLogEntry {
    day: number;
    [key: string]: any;
}

@Component({
    selector: 'app-nabl-daily-log-grid',

    imports: [CommonModule, FormsModule],
    templateUrl: './nabl-daily-log-grid.component.html',
    styleUrl: './nabl-daily-log-grid.component.css'
})
export class NablDailyLogGridComponent {
    @Input() columns: DailyLogColumn[] = [];
    @Input() entries: DailyLogEntry[] = [];
    @Input() month: string = '';
    @Input() year: string = '';
    @Input() roomName: string = '';
    @Input() totalDays: number = 31;
    @Input() editable: boolean = false;

    @Output() entryChanged = new EventEmitter<DailyLogEntry>();

    get dayRows(): number[] {
        return Array.from({ length: this.totalDays }, (_, i) => i + 1);
    }

    getEntry(day: number): DailyLogEntry {
        return this.entries.find(e => e.day === day) || { day } as DailyLogEntry;
    }

    onValueChange(day: number, key: string, value: any) {
        const entry = this.getEntry(day);
        entry[key] = value;
        this.entryChanged.emit(entry);
    }
}
