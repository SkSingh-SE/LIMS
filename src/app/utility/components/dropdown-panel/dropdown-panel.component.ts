import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dropdown-panel',
  imports: [CommonModule],
  templateUrl: './dropdown-panel.component.html',
  styleUrl: './dropdown-panel.component.css'
})
export class DropdownPanelComponent {
  @Input() items: any[] = [];
  @Input() selectedItemId: any;
  @Input() loading = false;

  @Output() selectItem = new EventEmitter<any>();
  @Output() onScroll = new EventEmitter<any>();

  highlightedIndex = 0;

  ngOnInit(): void {
    this.setInitialHighlight();
  }

  ngOnChanges(): void {
    this.setInitialHighlight();
  }

  private setInitialHighlight(): void {
    if (!this.items?.length || !this.selectedItemId) return;
    const index = this.items.findIndex(i => i.id === this.selectedItemId);
    this.highlightedIndex = index >= 0 ? index : 0;
  }

  onKeyDown(event: KeyboardEvent): void {
    const count = this.items.length;
    if (!count) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = (this.highlightedIndex + 1) % count;
        this.scrollToHighlightedItem();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = (this.highlightedIndex - 1 + count) % count;
        this.scrollToHighlightedItem();
        break;

      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0) {
          this.selectItem.emit(this.items[this.highlightedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        break;
    }
  }

  onSelect(item: any, index: number): void {
    this.highlightedIndex = index;
    this.selectItem.emit(item);
  }

  onScrollEvent(event: any): void {
    this.onScroll.emit(event);
  }

  /** Public method — called by parent to scroll highlighted item into view */
  scrollToHighlightedItem(): void {
    setTimeout(() => {
      const el = document.getElementById(`dropdown-item-${this.highlightedIndex}`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }
}
