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
  @Output() selectItem = new EventEmitter<any>();
  @Output() onScroll = new EventEmitter<any>();

  selectedIndex = 0;

  onKeyDown(event: KeyboardEvent): void {
    debugger;
    const itemCount = this.items.length;

    if (itemCount === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        this.selectedIndex = (this.selectedIndex + 1) % itemCount;
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.selectedIndex = (this.selectedIndex - 1 + itemCount) % itemCount;
        event.preventDefault();
        break;
      case 'Enter':
        this.onSelect(this.items[this.selectedIndex]);
        event.preventDefault();
        break;
    }
  }

  onSelect(item: any) {
    this.selectItem.emit(item);
  }
  onScrollEvent(event: any) {
    this.onScroll.emit(event);
  }
}
