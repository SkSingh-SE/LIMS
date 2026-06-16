import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SignatureEntry {
    name: string;
    designation: string;
    signature?: string;
    date?: string;
}

@Component({
    selector: 'app-nabl-signature-block',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './nabl-signature-block.component.html',
    styleUrl: './nabl-signature-block.component.css'
})
export class NablSignatureBlockComponent {
    Math = Math;
    @Input() signatories: SignatureEntry[] = [];
    @Input() showDateColumn: boolean = true;
    @Input() title: string = '';
}
