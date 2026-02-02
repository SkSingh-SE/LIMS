import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-sample-cutting-raw-format',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sample-cutting-raw-format.component.html',
    styleUrls: ['./sample-cutting-raw-format.component.css']
})
export class SampleCuttingRawFormatComponent implements AfterViewInit {

    // NABL-compliant Mock Data
    mockSampleCuttingData = {
        labName: "ABC Metallurgical Testing Laboratory",
        documentCode: "RAW-CUT-01",
        revision: "Rev 00",
        printedBy: "R. Patel",
        printedOn: new Date(),

        sampleInfo: {
            jobNo: "JOB-2025-0142",
            sampleNo: "SMP-2025-0142",
            customerName: "M/s XYZ Engineering Pvt. Ltd.",
            material: "Carbon Steel Plate",
            specification: "IS 2062 E250",
            quantity: "3 Nos",
            testReference: "Sample Preparation – Cutting"
        },

        cuttingDetails: {
            method: "Band Saw Cutting",
            machineId: "SM-02",
            operator: "R. Patel",
            cuttingDate: "05-02-2025"
        },

        observations: [
            { sr: 1, length: "", width: "", thickness: "", remark: "" },
            { sr: 2, length: "", width: "", thickness: "", remark: "" },
            { sr: 3, length: "", width: "", thickness: "", remark: "" },
            { sr: 4, length: "", width: "", thickness: "", remark: "" },
            { sr: 5, length: "", width: "", thickness: "", remark: "" }
        ]
    };

    constructor() { }

    ngAfterViewInit(): void {
        // Auto-trigger print when the view is initialized
        setTimeout(() => {
            window.print();
        }, 500);
    }
}
