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

  loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;

    this.fetchDataFn(this.searchTerm, this.pageNo, this.pageSize).subscribe((data: any[]) => {
      this.dropdownData = [...this.dropdownData, ...data];
      this.hasMore = data.length === this.pageSize;
      this.pageNo++;
      this.loading = false;
    });
  }

  selectItem(item: any) {
    this.selectedLabel = item.name;
    this.itemSelected.emit(item);
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
      debugger;
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
        const matchedItem = this.dropdownData.find(item => item.id == this.selectedItem);
        if (matchedItem) {
          this.selectedLabel = matchedItem.name;
          this.selectItem(matchedItem);
        } else if (this.dropdownData.length == 0) {
          this.fetchDataFn(this.selectedItem, 0, 1).subscribe((data) => {
            const found = data.find(item => item.id == this.selectedItem);
            if (found) {
              this.dropdownData = [found, ...this.dropdownData];
              this.selectedLabel = found.name;
              this.selectItem(found);
            }
          });
        }
      }
    }


  }

  toggleItem(item: any): void {
    debugger;
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
