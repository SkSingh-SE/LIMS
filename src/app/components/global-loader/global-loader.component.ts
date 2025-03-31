import { Component, Input } from '@angular/core';
import { LoaderService } from '../../services/loader.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-global-loader',
  imports: [CommonModule],
  templateUrl: './global-loader.component.html',
  styleUrl: './global-loader.component.css'
})
export class GlobalLoaderComponent {
  @Input() type: 'table' | 'card' | 'list' | 'form' | 'loader' = 'card'; // Default type
  @Input() rows: number = 5; // Default row count for table
  @Input() fields: number = 3; // Default field count for forms
  constructor(public loaderService: LoaderService) { }
}
