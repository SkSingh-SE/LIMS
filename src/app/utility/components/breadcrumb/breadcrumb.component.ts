import { Component, inject, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbService, BreadcrumbItem } from '../../../services/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.css']
})
export class BreadcrumbComponent {
  private breadcrumbService = inject(BreadcrumbService);

  /** Optional local override for screens with ad-hoc breadcrumb variations */
  @Input() customTrail?: BreadcrumbItem[];

  /** Active breadcrumb list (uses service signal unless local customTrail is supplied) */
  readonly items = computed(() => {
    if (this.customTrail && this.customTrail.length > 0) {
      return this.customTrail;
    }
    return this.breadcrumbService.breadcrumbs();
  });
}
