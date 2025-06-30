import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-cutting-price-master-form',
  imports: [CommonModule, FormsModule,ReactiveFormsModule],
  templateUrl: './cutting-price-master-form.component.html',
  styleUrl: './cutting-price-master-form.component.css'
})
export class CuttingPriceMasterFormComponent implements OnInit {
  cuttingPriceForm!: FormGroup;
  priceList: any[] = [];
  editingId: string | null = null;

  unitTypes = ['Per Cut', 'Per Minute', 'Per Sample'];

  ngOnInit(): void {
    this.cuttingPriceForm = this.fb.group({
      cuttingType: ['', Validators.required],
      unitType: ['', Validators.required],
      ratePerUnit: [0, [Validators.required, Validators.min(0)]],
      remarks: [''],
      isActive: [true]
    });

    // Dummy data to simulate backend
    this.priceList = [
      {
        id: '1',
        cuttingType: 'Hacksaw',
        unitType: 'Per Cut',
        ratePerUnit: 20,
        remarks: 'Manual cut',
        isActive: true
      },
      {
        id: '2',
        cuttingType: 'EDM Wire',
        unitType: 'Per Minute',
        ratePerUnit: 50,
        remarks: 'High precision',
        isActive: true
      }
    ];
  }

  constructor(private fb: FormBuilder) {}

  onSubmit() {
    if (this.cuttingPriceForm.invalid) return;

    const formValue = this.cuttingPriceForm.value;
    if (this.editingId) {
      // Update existing entry
      const index = this.priceList.findIndex(x => x.id === this.editingId);
      if (index > -1) {
        this.priceList[index] = { id: this.editingId, ...formValue };
      }
    } else {
      // Add new entry
      const newEntry: any = {
        id: Math.random().toString(36).substring(2, 9),
        ...formValue
      };
      this.priceList.push(newEntry);
    }

    this.resetForm();
  }

  edit(entry: any) {
    this.cuttingPriceForm.patchValue(entry);
    this.editingId = entry.id;
  }

  resetForm() {
    this.editingId = null;
    this.cuttingPriceForm.reset({
      cuttingType: '',
      unitType: '',
      ratePerUnit: 0,
      remarks: '',
      isActive: true
    });
  }
}