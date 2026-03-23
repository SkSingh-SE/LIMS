import { CommonModule } from '@angular/common';
import { Component, ComponentRef, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, Subject, Subscription, switchMap } from 'rxjs';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DropdownPanelComponent } from '../dropdown-panel/dropdown-panel.component';

@Component({
  selector: 'app-searchable-dropdown',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './searchable-dropdown.component.html',
  styleUrl: './searchable-dropdown.component.css'
})
export class SearchableDropdownComponent {
  @Input() placeholder = 'Type to search...';
  @Input() labelName = 'Select Item';
  @Input() required = false;
  @Input() isDisabled = false;
  @Input() fetchDataFn!: (searchTerm: string, page: number, pageSize: number) => any;
  @Input() selectedItem: any;
  @Input() hideLabel = false;
  @Input() smallInput = false;

  @Output() itemSelected = new EventEmitter<any>();

  @ViewChild('inputRef') inputRef!: ElementRef;

  searchTerm = '';
  dropdownData: any[] = [];
  selectedLabel = '';
  showDropdown = false;
  pageNo = 0;
  pageSize = 20;
  loading = false;
  hasMore = true;
  highlightedIndex = -1;

  private searchSubject = new Subject<string>();
  private sub = new Subscription();
  private overlayRef!: OverlayRef;
  private dropdownComponentRef!: ComponentRef<DropdownPanelComponent>;
  private initialLoaded = false;

  constructor(private overlay: Overlay, private vcr: ViewContainerRef) {}

  ngOnInit(): void {
    const searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(term => {
          this.pageNo = 0;
          this.dropdownData = [];
          this.loading = true;
          return this.fetchDataFn(term, this.pageNo, this.pageSize);
        })
      )
      .subscribe(data => {
        this.dropdownData = data as any[];
        this.hasMore = (data as any[]).length === this.pageSize;
        this.pageNo++;
        this.loading = false;
        this.highlightedIndex = this.dropdownData.length > 0 ? 0 : -1;
        this.openDropdownPanel();
      });

    this.sub.add(searchSub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItem']) {
      const val = changes['selectedItem'].currentValue;
      if (!val && val !== 0) {
        this.selectedLabel = '';
        this.searchTerm = '';
        return;
      }
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
          }
        });
      }
    }
  }

  handleInput(event: any): void {
    this.searchTerm = event.target.value;
    this.selectedLabel = this.searchTerm;
    this.searchSubject.next(this.searchTerm);
  }

  onFocus(): void {
    // Always load and open dropdown on focus
    if (this.dropdownData.length > 0) {
      this.openDropdownPanel();
    } else {
      this.loadInitialData();
    }
  }

  /** Load data for first open / chevron click */
  private loadInitialData(): void {
    if (this.loading) return;
    this.loading = true;
    this.pageNo = 0;
    this.dropdownData = [];
    this.fetchDataFn(this.searchTerm, this.pageNo, this.pageSize).subscribe((data: any[]) => {
      this.dropdownData = data;
      this.hasMore = data.length === this.pageSize;
      this.pageNo++;
      this.loading = false;
      this.initialLoaded = true;
      this.highlightedIndex = data.length > 0 ? 0 : -1;
      this.openDropdownPanel();
    });
  }

  onChevronClick(): void {
    if (this.isDisabled) return;
    if (this.overlayRef?.hasAttached()) {
      this.closeDropdown();
      return;
    }
    // Focus the input so keyboard works
    this.inputRef?.nativeElement?.focus();
    if (this.dropdownData.length > 0) {
      this.openDropdownPanel();
    } else {
      this.loadInitialData();
    }
  }

  openDropdownPanel(): void {
    if (!this.inputRef) return;
    const inputRect = this.inputRef.nativeElement.getBoundingClientRect();
    const inputWidth = Math.round(inputRect.width);

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.inputRef.nativeElement)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      ])
      .withFlexibleDimensions(false)
      .withPush(false);

    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        positionStrategy,
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        hasBackdrop: false,
        width: inputWidth + 40,
        panelClass: 'dropdown-panel',
      });
    }

    if (!this.overlayRef.hasAttached()) {
      const dropdownPortal = new ComponentPortal(DropdownPanelComponent, this.vcr);
      this.dropdownComponentRef = this.overlayRef.attach(dropdownPortal);
      this.dropdownComponentRef.instance.items = this.dropdownData;
      this.dropdownComponentRef.instance.selectedItemId = this.selectedItem;
      this.dropdownComponentRef.instance.highlightedIndex = this.highlightedIndex;
      this.dropdownComponentRef.instance.loading = this.loading;

      this.dropdownComponentRef.instance.selectItem.subscribe((item: any) => {
        this.selectItem(item);
      });

      this.dropdownComponentRef.instance.onScroll.subscribe((event: any) => {
        this.onScroll(event);
      });

      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick, true);
        // Scroll to highlighted item on first open
        if (this.highlightedIndex >= 0) {
          this.dropdownComponentRef.instance.scrollToHighlightedItem();
        }
      });
    } else {
      this.dropdownComponentRef.instance.items = this.dropdownData;
      this.dropdownComponentRef.instance.highlightedIndex = this.highlightedIndex;
      this.dropdownComponentRef.instance.loading = this.loading;
      this.dropdownComponentRef.changeDetectorRef.detectChanges();
      // Scroll first item into view after search results load
      if (this.highlightedIndex >= 0) {
        this.dropdownComponentRef.instance.scrollToHighlightedItem();
      }
    }
  }

  handleOutsideClick = (event: MouseEvent) => {
    const inputEl = this.inputRef?.nativeElement;
    const dropdownEl = this.overlayRef?.overlayElement;
    const clickedInsideInput = inputEl?.contains(event.target as Node);
    const clickedInsideDropdown = dropdownEl?.contains(event.target as Node);

    if (!clickedInsideInput && !clickedInsideDropdown) {
      this.closeDropdown();
    }
  };

  selectItem(item: any): void {
    this.selectedLabel = item.name;
    this.searchTerm = '';
    this.itemSelected.emit(item);
    this.closeDropdown();
  }

  onScroll(event: any) {
    const div = event.target;
    if (div.scrollTop + div.clientHeight >= div.scrollHeight - 5) {
      this.loadMore();
    }
  }

  loadMore() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.syncLoadingToPanel();

    this.fetchDataFn(this.searchTerm, this.pageNo, this.pageSize).subscribe((data: any[]) => {
      this.dropdownData = [...this.dropdownData, ...data];
      this.hasMore = data.length === this.pageSize;
      this.pageNo++;
      this.loading = false;
      this.openDropdownPanel();
    });
  }

  closeDropdown(): void {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    document.removeEventListener('click', this.handleOutsideClick, true);
    this.highlightedIndex = -1;
  }

  handleKeydown(event: KeyboardEvent): void {
    const isOpen = this.overlayRef?.hasAttached();
    const itemsLength = this.dropdownData.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          // Open dropdown on arrow down when closed
          this.onFocus();
          return;
        }
        if (!itemsLength) return;
        this.highlightedIndex = (this.highlightedIndex + 1) % itemsLength;
        this.syncHighlightToPanel();
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen || !itemsLength) return;
        this.highlightedIndex = (this.highlightedIndex - 1 + itemsLength) % itemsLength;
        this.syncHighlightToPanel();
        break;

      case 'Enter':
        event.preventDefault();
        if (isOpen && this.highlightedIndex >= 0 && this.highlightedIndex < itemsLength) {
          this.selectItem(this.dropdownData[this.highlightedIndex]);
        }
        break;

      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          this.closeDropdown();
        }
        break;

      case 'Tab':
        if (isOpen) {
          this.closeDropdown();
        }
        break;
    }
  }

  /** Push highlight index to panel and trigger scroll + change detection */
  private syncHighlightToPanel(): void {
    if (!this.dropdownComponentRef) return;
    this.dropdownComponentRef.instance.highlightedIndex = this.highlightedIndex;
    this.dropdownComponentRef.instance.scrollToHighlightedItem();
    this.dropdownComponentRef.changeDetectorRef.detectChanges();
  }

  /** Push loading state to panel */
  private syncLoadingToPanel(): void {
    if (!this.dropdownComponentRef) return;
    this.dropdownComponentRef.instance.loading = this.loading;
    this.dropdownComponentRef.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.overlayRef?.dispose();
    document.removeEventListener('click', this.handleOutsideClick, true);
  }
}
