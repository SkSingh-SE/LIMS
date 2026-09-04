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
    const isObj = typeof this.selectedItemId === 'object' && this.selectedItemId !== null;
    const targetEqId = isObj ? this.selectedItemId.equivalentId : null;
    const targetId = isObj ? this.selectedItemId.id : this.selectedItemId;

    const index = this.items.findIndex(i => {
      if (i.isHeader || i.selectable === false) return false;
      if (targetEqId) return i.equivalentId === targetEqId;
      return i.id === targetId && !i.equivalentId;
    });
    this.highlightedIndex = index >= 0 ? index : 0;
  }

  onSelect(item: any, index: number): void {
    if (item?.isHeader || item?.selectable === false) return;
    this.highlightedIndex = index;
    this.selectItem.emit(item);
  }

  onHover(item: any, index: number): void {
    if (item?.isHeader || item?.selectable === false) return;
    this.highlightedIndex = index;
  }

  onScrollEvent(event: any): void {
    this.onScroll.emit(event);
  }

  trackById(_index: number, item: any): any {
    if (item.isHeader) return 'header-' + item.name;
    if (item.equivalentId) return 'eq-' + item.equivalentId;
    return 'base-' + item.id;
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
