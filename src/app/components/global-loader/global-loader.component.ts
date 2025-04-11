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

  isLoading = false;
  constructor(public loaderService: LoaderService) {
    this.loaderService.loading$.subscribe(status => {
      this.isLoading = status;
    });

   }
}
