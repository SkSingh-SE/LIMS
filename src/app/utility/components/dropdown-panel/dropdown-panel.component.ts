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

  onSelect(item: any) {
    this.selectItem.emit(item);
  }
}
