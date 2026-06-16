import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ScoringColumn {
    key: string;
    label: string;
    width?: string;
}

export interface ScoringRow {
    id: number;
    activity: string;
    risk: string;
    opportunity: string;
    severity: number;
    probability: number;
    riskRating: number;
    mitigate: string;
    actionPlan: string;
    effectiveness: string;
    revisedSeverity?: number;
    revisedProbability?: number;
    revisedRiskRating?: number;
    [key: string]: any;
}

@Component({
    selector: 'app-nabl-scoring-matrix',

    imports: [CommonModule, FormsModule],
    templateUrl: './nabl-scoring-matrix.component.html',
    styleUrl: './nabl-scoring-matrix.component.css'
})
export class NablScoringMatrixComponent {
    @Input() rows: ScoringRow[] = [];
    @Input() extraColumns: ScoringColumn[] = [];
    @Input() editable: boolean = false;
    @Input() showRevisedRisk: boolean = true;

    @Output() rowChanged = new EventEmitter<ScoringRow>();

    onValueChange(row: ScoringRow, key: string, value: any) {
        (row as any)[key] = value;
        if (key === 'severity' || key === 'probability') {
            row.riskRating = row.severity * row.probability;
        }
        if (key === 'revisedSeverity' || key === 'revisedProbability') {
            row.revisedRiskRating = (row.revisedSeverity || 0) * (row.revisedProbability || 0);
        }
        this.rowChanged.emit(row);
    }

    getRiskClass(rating: number): string {
        if (rating >= 10) return 'risk-high';
        if (rating >= 6) return 'risk-medium';
        return 'risk-low';
    }
}
