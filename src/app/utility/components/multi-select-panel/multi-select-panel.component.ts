import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-multi-select-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select-panel.component.html',
  styleUrl: './multi-select-panel.component.css',
})
export class MultiSelectPanelComponent {
  @Input() items: any[] = [];
  @Input() selectedIds: any[] = [];
  @Input() loading = false;

  @Output() itemToggled = new EventEmitter<any>();
  @Output() scrolledToEnd = new EventEmitter<void>();
  @Output() searchChanged = new EventEmitter<string>();

  @ViewChild('panelSearchRef') panelSearchRef!: ElementRef;

  searchInput = '';
  private scrollEndPending = false;

  /** Called by parent after overlay attaches */
  focusSearch(): void {
    setTimeout(() => this.panelSearchRef?.nativeElement?.focus());
  }

  /** Called by parent before closing to reset search state */
  resetSearch(): void {
    this.searchInput = '';
  }

  isSelected(id: any): boolean {
    return (this.selectedIds || []).some(sid => +sid === +id);
  }

  toggleItem(item: any): void {
    this.itemToggled.emit(item);
  }

  onSearchChange(): void {
    this.searchChanged.emit(this.searchInput);
  }

  clearSearch(): void {
    this.searchInput = '';
    this.searchChanged.emit('');
  }

  onScrollEvent(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      if (!this.scrollEndPending && !this.loading) {
        this.scrollEndPending = true;
        this.scrolledToEnd.emit();
        setTimeout(() => (this.scrollEndPending = false), 300);
      }
    }
  }

  trackById(_: number, item: any): any {
    return item.id;
  }
}
