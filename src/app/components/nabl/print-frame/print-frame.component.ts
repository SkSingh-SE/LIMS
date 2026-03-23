import { Component, Input, AfterViewInit, ElementRef, ViewChild, OnDestroy, HostBinding, NgZone } from '@angular/core';
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
  private rafId: number | null = null;

  constructor(private ngZone: NgZone) { }

  ngAfterViewInit() {
    // Defer initial measurement to next macrotask to avoid
    // ExpressionChangedAfterItHasBeenCheckedError on the HostBinding
    setTimeout(() => this.calculateHeights());

    if (typeof ResizeObserver !== 'undefined') {
      // Run outside Angular zone: ResizeObserver fires very frequently
      // and we manually call ngZone.run() only when a value actually changes
      this.ngZone.runOutsideAngular(() => {
        this.resizeObserver = new ResizeObserver(() => {
          // Debounce: cancel any pending frame before scheduling a new one
          if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
          }
          this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.measureAndUpdate();
          });
        });

        if (this.headerContainer) {
          this.resizeObserver.observe(this.headerContainer.nativeElement);
        }
        if (this.footerContainer) {
          this.resizeObserver.observe(this.footerContainer.nativeElement);
        }
      });
    }
  }

  /** Called from inside Angular zone (initial). */
  private calculateHeights() {
    let changed = false;

    if (this.headerContainer) {
      const h = this.headerContainer.nativeElement.offsetHeight;
      // Only update when value genuinely changes — prevents the HostBinding
      // feedback loop: assign → CSS var changes → element resizes → observer fires → repeat
      if (h > 0 && h !== this.headerHeight) {
        this.headerHeight = h;
        changed = true;
      }
    }

    if (this.footerContainer) {
      const f = this.footerContainer.nativeElement.offsetHeight;
      if (f > 0 && f !== this.footerHeight) {
        this.footerHeight = f;
        changed = true;
      }
    }
  }

  /** Called from outside Angular zone (ResizeObserver). Enter zone only on actual change. */
  private measureAndUpdate() {
    const newH = this.headerContainer?.nativeElement.offsetHeight ?? 0;
    const newF = this.footerContainer?.nativeElement.offsetHeight ?? 0;

    const hChanged = newH > 0 && newH !== this.headerHeight;
    const fChanged = newF > 0 && newF !== this.footerHeight;

    if (hChanged || fChanged) {
      // Enter Angular zone only when a real change occurred
      this.ngZone.run(() => {
        if (hChanged) this.headerHeight = newH;
        if (fChanged) this.footerHeight = newF;
      });
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
