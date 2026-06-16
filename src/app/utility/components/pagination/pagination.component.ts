import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Reusable pagination control used by every list screen.
 * Renders a windowed page list (max ~7 buttons with ellipsis) so 100+ page
 * lists don't explode the DOM.
 *
 * Layout:
 *   [Page size selector] ------- [Showing X-Y of Z] ------- [« Prev 1 ... 5 6 7 ... 166 Next »]
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  @Input() pageSizes: number[] = [10, 25, 50, 100, 200, 500];
  /** Maximum numeric page buttons (excluding first/last/ellipsis). Default window keeps total ≤ 5. */
  @Input() maxVisible = 3;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  /** True page count, independent of windowing. */
  get totalPagesCount(): number {
    if (!this.totalItems || this.pageSize <= 0) return 0;
    return Math.ceil(this.totalItems / this.pageSize);
  }

  /** True when we're on the last page (or no pages at all). */
  get isLastPage(): boolean {
    return this.currentPage >= this.totalPagesCount;
  }

  /** 1-based index of the first record on the current page. */
  get startRecord(): number {
    if (!this.totalItems) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  /** 1-based index of the last record on the current page. */
  get endRecord(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalItems ? this.totalItems : end;
  }

  /**
   * Windowed page list. Returns entries of type `number` for clickable pages
   * and the string `'...'` for ellipsis placeholders.
   *
   * Rules:
   *  - Always show page 1 and the last page.
   *  - Show up to `maxVisible` pages around the current page.
   *  - Insert `'...'` wherever a gap exists.
   *  - If total pages ≤ maxVisible+2, just return all pages (no ellipsis).
   */
  get visiblePages(): (number | string)[] {
    const total = this.totalPagesCount;
    if (total <= 0) return [];
    if (total <= this.maxVisible + 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const half = Math.floor(this.maxVisible / 2);
    let start = this.currentPage - half;
    let end = this.currentPage + half;

    if (start < 2) {
      start = 2;
      end = start + this.maxVisible - 1;
    }
    if (end > total - 1) {
      end = total - 1;
      start = end - this.maxVisible + 1;
      if (start < 2) start = 2;
    }

    const pages: (number | string)[] = [1];
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  }

  onPageClick(page: number | string): void {
    if (typeof page !== 'number') return;
    if (page < 1 || page > this.totalPagesCount) return;
    if (page === this.currentPage) return;
    this.pageChange.emit(page);
  }

  onPrev(): void {
    if (this.currentPage > 1) this.pageChange.emit(this.currentPage - 1);
  }

  onNext(): void {
    if (!this.isLastPage) this.pageChange.emit(this.currentPage + 1);
  }

  onSizeChange(event: Event): void {
    const newSize = Number((event.target as HTMLSelectElement).value);
    if (!isNaN(newSize) && newSize > 0) {
      this.pageSizeChange.emit(newSize);
    }
  }

  /** Angular trackBy — avoid re-rendering ellipsis items. */
  trackByPage = (index: number, page: number | string) =>
    typeof page === 'number' ? page : `ellipsis-${index}`;
}
