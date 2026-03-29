import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-dropdown-panel',
  imports: [CommonModule],
  templateUrl: './dropdown-panel.component.html',
  styleUrl: './dropdown-panel.component.css',
})
export class DropdownPanelComponent {
  @Input() items: any[] = [];
  @Input() selectedItemId: any;
  @Input() loading = false;

  @Output() selectItem = new EventEmitter<any>();
  @Output() onScroll = new EventEmitter<any>();

  @ViewChild('listRef', { static: true }) listRef!: ElementRef<HTMLUListElement>;

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

  onSelect(item: any, index: number): void {
    this.highlightedIndex = index;
    this.selectItem.emit(item);
  }

  onScrollEvent(event: any): void {
    this.onScroll.emit(event);
  }

  trackById(_index: number, item: any): any {
    return item.id;
  }

  /** Public method — called by parent to scroll highlighted item into view */
  scrollToHighlightedItem(): void {
    setTimeout(() => {
      const listEl = this.listRef?.nativeElement;
      if (!listEl) return;
      const itemEl = listEl.children[this.highlightedIndex] as HTMLElement;
      itemEl?.scrollIntoView({ block: 'nearest' });
    });
  }
}
