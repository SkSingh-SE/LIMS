import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, Observable, Subject, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-searchable-dropdown-modal',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './searchable-dropdown-modal.component.html',
  styleUrl: './searchable-dropdown-modal.component.css'
})
export class SearchableDropdownModalComponent {
  @Input() placeholder: string = 'Type to search...';
  @Input() labelName: string = 'Select Item';
  @Input() required: boolean = false;
  @Input() isDisabled: boolean = false;
  @Input() fetchDataFn!: (searchTerm: string, page: number, pageSize: number) => Observable<any[]>; // Pass API call from parent
  @Output() itemSelected = new EventEmitter<any>();
  @Input() selectedItem: any;
  @Input() hideLabel: boolean = false;
  @Input() isMultiSelect: boolean = false;
  @Output() itemsSelected = new EventEmitter<any[]>();
  selectedItems: any[] = [];



  searchTerm: string = '';
  dropdownData: any[] = [];
  pageNo = 0;
  pageSize = 20;
  loading = false;
  hasMore = true;
  showDropdown = false;
  selectedLabel: string = '';
  randomId = 'input-' + Math.random().toString(36).substring(2, 10);
  highlightedIndex: number = -1;


  private searchSubject = new Subject<string>();
  private subscription = new Subscription();

  ngOnInit(): void {
    const sub = this.searchSubject.pipe(
      debounceTime(300),
      switchMap((term: string) => {
        this.pageNo = 0;
        this.dropdownData = [];
        return this.fetchDataFn(term, this.pageNo, this.pageSize);
      })
    ).subscribe((data: any[]) => {
      this.dropdownData = data;
      this.hasMore = data.length === this.pageSize;
      this.pageNo++;
      // set initial highlighted index (prefer selectedItem if present)
      const idx = this.dropdownData.findIndex(d => d.id === this.selectedItem);
      this.highlightedIndex = idx >= 0 ? idx : (this.dropdownData.length ? 0 : -1);
    });

    this.subscription.add(sub);
    this.loadMore();
  }

  handleInput(event: any): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.searchSubject.next(this.searchTerm);
    if (this.searchTerm.length > 0) {
      this.showDropdown = true;
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (!this.showDropdown) return;

    const itemsLength = this.dropdownData.length;
    if (!itemsLength) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex = (this.highlightedIndex + 1 + itemsLength) % itemsLength;
        this.scrollToHighlighted();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex = (this.highlightedIndex - 1 + itemsLength) % itemsLength;
        this.scrollToHighlighted();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.dropdownData.length) {
          const item = this.dropdownData[this.highlightedIndex];
          if (this.isMultiSelect) {
            this.toggleItem(item);
          } else {
            this.selectItem(item);
          }
        }
        break;
      case 'Escape':
        this.showDropdown = false;
        break;
    }
  }

  loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;

    this.fetchDataFn(this.searchTerm, this.pageNo, this.pageSize).subscribe((data: any[]) => {
      this.dropdownData = [...this.dropdownData, ...data];
      this.hasMore = data.length === this.pageSize;
      this.pageNo++;
      this.loading = false;
      // ensure highlightedIndex is valid after loading more
      if (this.highlightedIndex === -1 && this.dropdownData.length) {
        const idx = this.dropdownData.findIndex(d => d.id === this.selectedItem);
        this.highlightedIndex = idx >= 0 ? idx : 0;
      }
    });
  }

  selectItem(item: any) {
    this.selectedLabel = item.name;
    this.itemSelected.emit(item);
    // reflect selection visually
    const idx = this.dropdownData.findIndex(d => d.id === item.id);
    this.highlightedIndex = idx >= 0 ? idx : -1;
  }
  onScroll(event: any) {
    const div = event.target;
    if (div.scrollTop + div.clientHeight >= div.scrollHeight - 5) {
      this.loadMore();
    }
  }
  onFocus(): void {
    if (this.searchTerm.length > 0) {
      this.showDropdown = true;
    }
  }

  onBlur(): void {
    // Optionally delay hiding to allow click to register
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItem'] && changes['selectedItem'].currentValue) {
      if (this.isMultiSelect && Array.isArray(this.selectedItem)) {
        // Handle multiple IDs
        this.selectedItems = [];
        this.selectedItem.forEach((id: any) => {
          const matchedItem = this.dropdownData.find(item => item.id == id);
          if (matchedItem) {
            this.selectedItems.push(matchedItem);
          } else {
            this.fetchDataFn(id, 0, 1).subscribe((data) => {
              const found = data.find(item => item.id == id);
              if (found) {
                this.selectedItems.push(found);
              }
            });
          }
        });
      } else if (!this.isMultiSelect) {
        // single select logic
        const matched = this.dropdownData.find(x => x.id === this.selectedItem);
        if (matched) {
          if (this.selectedLabel.length === 0) {
            this.selectedLabel = matched.name;
            this.selectItem(matched);
          }

        } else {
          this.fetchDataFn(this.selectedItem, 0, 1).subscribe((data: any[]) => {
            const found = data.find(x => x.id === this.selectedItem);
            if (found) {
              this.dropdownData = [found, ...this.dropdownData];
              this.selectedLabel = found.name;
                this.selectItem(found);
                const idx = this.dropdownData.findIndex(d => d.id === found.id);
                this.highlightedIndex = idx >= 0 ? idx : -1;
            }
          });
        }
      }
    }


  }

    private scrollToHighlighted(): void {
      if (this.highlightedIndex < 0) return;
      const id = this.randomId + '-item-' + this.highlightedIndex;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }

  toggleItem(item: any): void {
    const index = this.selectedItems.findIndex(i => i.id === item.id);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
    } else {
      this.selectedItems.push(item);
    }
    this.itemsSelected.emit(this.selectedItems);
  }

  isSelected(item: any): boolean {
    return this.selectedItems.some(i => i.id === item.id);
  }

  getSelectedLabels(): string {
    return this.selectedItems.map(i => i.name).join(', ');
  }

}
