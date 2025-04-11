import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Event } from '@angular/router';
import { debounceTime, Observable, Subject, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-searchable-dropdown',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './searchable-dropdown.component.html',
  styleUrl: './searchable-dropdown.component.css'
})
export class SearchableDropdownComponent {
  @Input() placeholder: string = 'Type to search...';
  @Input() labelName: string = 'Select Item';
  @Input() required: boolean = false;
  @Input() isDisabled: boolean = false;
  @Input() fetchDataFn!: (searchTerm: string, page: number, pageSize: number) => Observable<any[]>; // Pass API call from parent
  @Output() itemSelected = new EventEmitter<any>();
  @Input() selectedItem: any;

  searchTerm: string = '';
  dropdownData: any[] = [];
  pageNo = 0;
  pageSize = 20;
  loading = false;
  hasMore = true;
  showDropdown = false;
  selectedLabel: string = '';

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
    debugger;
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
      const matchedItem = this.dropdownData.find(item => item.id == this.selectedItem);
      if (matchedItem) {
        this.selectedLabel = matchedItem.name;
      } else if(this.dropdownData.length == 0) {
        // Fetch the item if not in dropdownData
        this.fetchDataFn(this.selectedItem, 0, 1).subscribe((data) => {
          const found = data.find(item => item.id == this.selectedItem);
          if (found) {
            this.dropdownData = [found, ...this.dropdownData];
            this.selectedLabel = found.name;
          }
        });
      }
    }
  }


}
