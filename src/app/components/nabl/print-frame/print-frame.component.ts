import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnDestroy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-print-frame',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './print-frame.component.html',
  styleUrl: './print-frame.component.css'
})
export class PrintFrameComponent implements AfterViewInit, OnDestroy {
  @Input() orientation: 'portrait' | 'landscape' = 'portrait';

  @ViewChild('headerContainer') headerContainer!: ElementRef;
  @ViewChild('footerContainer') footerContainer!: ElementRef;

  @HostBinding('style.--print-header-height.px') headerHeight: number = 170;
  @HostBinding('style.--print-footer-height.px') footerHeight: number = 130;

  private resizeObserver: ResizeObserver | null = null;

  constructor() { }

  ngAfterViewInit() {
    this.calculateHeights();

    // Listen for changes (e.g. dynamic content loading)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.calculateHeights();
      });

      if (this.headerContainer) this.resizeObserver.observe(this.headerContainer.nativeElement);
      if (this.footerContainer) this.resizeObserver.observe(this.footerContainer.nativeElement);
    }
  }

  private calculateHeights() {
    if (this.headerContainer) {
      const hHeight = this.headerContainer.nativeElement.offsetHeight;
      if (hHeight > 0) this.headerHeight = hHeight;
    }

    if (this.footerContainer) {
      const fHeight = this.footerContainer.nativeElement.offsetHeight;
      if (fHeight > 0) this.footerHeight = fHeight;
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
