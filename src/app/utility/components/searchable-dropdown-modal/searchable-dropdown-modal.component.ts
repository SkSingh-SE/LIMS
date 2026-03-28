import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, Output, SimpleChanges } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, Observable, Subject, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-searchable-dropdown-modal',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './searchable-dropdown-modal.component.html',
  styleUrl: './searchable-dropdown-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchableDropdownModalComponent {
  @Input() placeholder: string = 'Type to search...';
  @Input() labelName: string = 'Select Item';
  @Input() required: boolean = false;
  @Input() isDisabled: boolean = false;
  @Input() fetchDataFn!: (searchTerm: string, page: number, pageSize: number) => Observable<any[]>;
  @Output() itemSelected = new EventEmitter<any>();
  @Input() selectedItem: any;
  @Input() hideLabel: boolean = false;
  @Input() isMultiSelect: boolean = false;
  @Input() reloadKey: any;
  @Output() itemsSelected = new EventEmitter<any[]>();
  selectedItems: any[] = [];
  dropdownStyle: { [key: string]: string } = {};
  tooltipStyle: { [key: string]: string } = {};

  searchTerm: string = '';
  dropdownData: any[] = [];
  pageNo = 0;
  pageSize = 20;
  loading = false;
  hasMore = true;
  showDropdown = false;
  selectedLabel: string = '';
  private hasValidSelection = false;
  randomId = 'input-' + Math.random().toString(36).substring(2, 10);
  highlightedIndex: number = -1;

  private searchSubject = new Subject<string>();
  private subscription = new Subscription();
  private closingFromBlur = false;

  constructor(private elRef: ElementRef, private cdr: ChangeDetectorRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showDropdown) return;
    const target = event.target as HTMLElement;
    if (!this.elRef.nativeElement.contains(target) && !target.closest('.dropdown-panel')) {
      this.showDropdown = false;
      this.revertIfInvalid();
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    const sub = this.searchSubject.pipe(
      debounceTime(300),
      switchMap((term: string) => {
        this.pageNo = 0;
        this.dropdownData = [];
        this.loading = true;
        this.cdr.markForCheck();
        return this.fetchDataFn(term, this.pageNo, this.pageSize);
      })
    ).subscribe({
      next: (data: any[]) => {
        this.dropdownData = data;
        this.hasMore = data.length === this.pageSize;
        this.pageNo++;
        this.loading = false;
        const idx = this.dropdownData.findIndex(d => d.id === this.selectedItem);
        this.highlightedIndex = idx >= 0 ? idx : (this.dropdownData.length ? 0 : -1);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });

    this.subscription.add(sub);
    this.loadMore();
  }

  updateDropdownPosition(): void {
    const inputGroup = this.elRef.nativeElement.querySelector('.input-group');
    if (inputGroup) {
      const rect = inputGroup.getBoundingClientRect();
      const dropdownWidth = Math.max(rect.width, 280);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 220;

      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        this.dropdownStyle = {
          position: 'fixed',
          top: rect.bottom + 2 + 'px',
          left: rect.left + 'px',
          width: dropdownWidth + 'px',
        };
      } else {
        this.dropdownStyle = {
          position: 'fixed',
          bottom: (window.innerHeight - rect.top + 2) + 'px',
          left: rect.left + 'px',
          width: dropdownWidth + 'px',
        };
      }
    }
  }

  openDropdown(): void {
    this.showDropdown = true;
    this.updateDropdownPosition();
  }

  handleInput(event: any): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    if (this.hasValidSelection) {
      this.hasValidSelection = false;
      this.selectedItem = null;
      this.itemSelected.emit(null);
    }
    this.searchSubject.next(this.searchTerm);
    this.openDropdown();
  }

  handleKeydown(event: KeyboardEvent): void {
    const itemsLength = this.dropdownData.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.showDropdown) {
          this.openDropdown();
          return;
        }
        if (!itemsLength) return;
        this.highlightedIndex = (this.highlightedIndex + 1 + itemsLength) % itemsLength;
        this.scrollToHighlighted();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.showDropdown || !itemsLength) return;
        this.highlightedIndex = (this.highlightedIndex - 1 + itemsLength) % itemsLength;
        this.scrollToHighlighted();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.showDropdown && this.highlightedIndex >= 0 && this.highlightedIndex < this.dropdownData.length) {
          const item = this.dropdownData[this.highlightedIndex];
          if (this.isMultiSelect) {
            this.toggleItem(item);
          } else {
            this.selectItem(item);
          }
        }
        break;
      case 'Escape':
        if (this.showDropdown) {
          this.showDropdown = false;
          this.revertIfInvalid();
        }
        break;
      case 'Tab':
        if (this.showDropdown) {
          this.showDropdown = false;
          this.revertIfInvalid();
        }
        break;
    }
  }

  loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;

    this.fetchDataFn(this.searchTerm, this.pageNo, this.pageSize).subscribe({
      next: (data: any[]) => {
        this.dropdownData = [...this.dropdownData, ...data];
        this.hasMore = data.length === this.pageSize;
        this.pageNo++;
        this.loading = false;
        if (this.highlightedIndex === -1 && this.dropdownData.length) {
          const idx = this.dropdownData.findIndex(d => d.id === this.selectedItem);
          this.highlightedIndex = idx >= 0 ? idx : 0;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectItem(item: any) {
    this.selectedLabel = item.name;
    this.searchTerm = '';
    this.hasValidSelection = true;
    this.itemSelected.emit(item);
    this.showDropdown = false;
    const idx = this.dropdownData.findIndex(d => d.id === item.id);
    this.highlightedIndex = idx >= 0 ? idx : -1;
    this.cdr.markForCheck();
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selectedLabel = '';
    this.searchTerm = '';
    this.selectedItem = null;
    this.hasValidSelection = false;
    this.selectedItems = [];
    this.itemSelected.emit(null);
    if (this.isMultiSelect) {
      this.itemsSelected.emit([]);
    }
    this.showDropdown = false;
  }

  onScroll(event: any) {
    const div = event.target;
    if (div.scrollTop + div.clientHeight >= div.scrollHeight - 5) {
      this.loadMore();
    }
  }

  onFocus(): void {
    if (this.closingFromBlur) {
      this.closingFromBlur = false;
      return;
    }
    this.openDropdown();
  }

  onBlur(): void {
    // Delay to allow mousedown on dropdown items to register first
    this.closingFromBlur = true;
    setTimeout(() => {
      if (this.closingFromBlur) {
        this.showDropdown = false;
        this.revertIfInvalid();
        this.closingFromBlur = false;
        this.cdr.markForCheck();
      }
    }, 150);
  }

  /** If user typed garbage without selecting, revert to empty */
  private revertIfInvalid(): void {
    if (this.isMultiSelect) return;
    if (!this.hasValidSelection && this.selectedLabel) {
      this.selectedLabel = '';
      this.searchTerm = '';
      this.selectedItem = null;
      this.itemSelected.emit(null);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItem']) {
      const val = changes['selectedItem'].currentValue;
      if (!val || (Array.isArray(val) && val.length === 0)) {
        this.selectedLabel = '';
        this.searchTerm = '';
        this.selectedItems = [];
        this.hasValidSelection = false;
        return;
      }
      if (this.isMultiSelect && Array.isArray(this.selectedItem)) {
        this.selectedItems = [];
        const idsToResolve: any[] = [];
        this.selectedItem.forEach((id: any) => {
          const matchedItem = this.dropdownData.find(item => item.id == id);
          if (matchedItem) {
            this.selectedItems.push(matchedItem);
          } else {
            idsToResolve.push(id);
          }
        });
        if (idsToResolve.length > 0) {
          this.fetchDataFn('', 0, 100).subscribe({
            next: (data) => {
              idsToResolve.forEach((id: any) => {
                const found = data.find(item => item.id == id);
                if (found && !this.selectedItems.some(si => si.id == found.id)) {
                  this.selectedItems.push(found);
                }
              });
              data.forEach((item: any) => {
                if (!this.dropdownData.some(d => d.id === item.id)) {
                  this.dropdownData.push(item);
                }
              });
              this.cdr.markForCheck();
            },
            error: () => {
              this.cdr.markForCheck();
            },
          });
        }
      } else if (!this.isMultiSelect) {
        const matched = this.dropdownData.find(x => x.id === this.selectedItem);
        if (matched) {
          if (this.selectedLabel.length === 0) {
            this.selectedLabel = matched.name;
            this.hasValidSelection = true;
            this.selectItem(matched);
          }
        } else {
          this.fetchDataFn(this.selectedItem, 0, 1).subscribe({
            next: (data: any[]) => {
              const found = data.find(x => x.id === this.selectedItem);
              if (found) {
                this.dropdownData = [found, ...this.dropdownData];
                this.selectedLabel = found.name;
                this.hasValidSelection = true;
                this.selectItem(found);
                const idx = this.dropdownData.findIndex(d => d.id === found.id);
                this.highlightedIndex = idx >= 0 ? idx : -1;
              }
              this.cdr.markForCheck();
            },
            error: () => {
              this.cdr.markForCheck();
            },
          });
        }
      }
    }

    if (changes['reloadKey'] && !changes['reloadKey'].firstChange) {
      this.dropdownData = [];
      this.pageNo = 0;
      this.hasMore = true;
      this.loadMore();
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
      this.selectedItems = [...this.selectedItems.slice(0, index), ...this.selectedItems.slice(index + 1)];
    } else {
      this.selectedItems = [...this.selectedItems, item];
    }
    this.searchTerm = '';
    this.itemsSelected.emit(this.selectedItems);
    this.cdr.markForCheck();
  }

  isSelected(item: any): boolean {
    return this.selectedItems.some(i => i.id === item.id);
  }

  getSelectedLabels(): string {
    return this.selectedItems.map(i => i.name).join(', ');
  }

  trackById(_index: number, item: any): any {
    return item.id;
  }

  updateTooltipPosition(): void {
    const inputGroup = this.elRef.nativeElement.querySelector('.input-group');
    if (inputGroup) {
      const rect = inputGroup.getBoundingClientRect();
      this.tooltipStyle = {
        position: 'fixed',
        top: rect.bottom + 4 + 'px',
        left: rect.left + 'px',
        'z-index': '99999'
      };
    }
  }

  getCompactLabel(): string {
    if (this.selectedItems.length === 0) return '';
    if (this.selectedItems.length === 1) return this.selectedItems[0].name;
    return `${this.selectedItems[0].name} +${this.selectedItems.length - 1}`;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
