import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DesignationService } from '../../../services/designation.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../services/loader.service';
import { GlobalLoaderComponent } from '../../global-loader/global-loader.component';

@Component({
  selector: 'app-details-designation',
  imports: [FormsModule,CommonModule,RouterLink],
  templateUrl: './details-designation.component.html',
  styleUrl: './details-designation.component.css'
})
export class DetailsDesignationComponent implements OnInit {
  designationId: string | null = null;
  designationDetails: any = null;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(private route: ActivatedRoute, private designationService: DesignationService, private loaderService: LoaderService) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.designationId = params.get('id');

      if (this.designationId) {
        this.loadDesignationDetails(this.designationId);
      }
    });
  }

  loadDesignationDetails(id: string) {
    this.loaderService.show();
    this.designationService.getDesignationById(parseInt(id)).subscribe({
      next: (data) => {
        this.designationDetails = data;
        this.isLoading = false;
        this.loaderService.hide();
      },
      error: (error) => {
        console.error('Error fetching designation details:', error);
        this.errorMessage = 'Failed to load designation details.';
        this.isLoading = false;
        this.loaderService.hide();
      }
    });
  }
}
