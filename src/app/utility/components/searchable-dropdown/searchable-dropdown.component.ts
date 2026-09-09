import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ComponentRef, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, Subject, Subscription, switchMap } from 'rxjs';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DropdownPanelComponent } from '../dropdown-panel/dropdown-panel.component';
import { rankAndFilterDropdownItems } from '../../helper/dropdown-search.helper';

@Component({
  selector: 'app-searchable-dropdown',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './searchable-dropdown.component.html',
  styleUrl: './searchable-dropdown.component.css',
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
  @Input() isInvalid = false;
  @Input() reloadKey: any;

  @Output() itemSelected = new EventEmitter<any>();

  @ViewChild('inputRef') inputRef!: ElementRef;

  searchTerm = '';
  dropdownData: any[] = [];
  selectedLabel = '';
  private hasValidSelection = false;
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
  constructor(private overlay: Overlay, private vcr: ViewContainerRef, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(term => {
          this.pageNo = 0;
          this.loading = true;
          this.syncLoadingToPanel();
          return this.fetchDataFn(term, this.pageNo, this.pageSize);
        })
      )
      .subscribe({
        next: data => {
          const rawItems = (data as any[]) || [];
          this.dropdownData = rankAndFilterDropdownItems(rawItems, this.searchTerm);
          this.hasMore = rawItems.length === this.pageSize;
          this.pageNo++;
          this.loading = false;
          const firstSelectable = this.dropdownData.findIndex(x => x && !x.isHeader && x.selectable !== false);
          this.highlightedIndex = firstSelectable >= 0 ? firstSelectable : (this.dropdownData.length > 0 ? 0 : -1);
          this.cdr.markForCheck();
          this.openDropdownPanel();
        },
        error: () => {
          this.loading = false;
          this.syncLoadingToPanel();
          this.cdr.markForCheck();
        },
      });

    this.sub.add(searchSub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const isFocused = typeof document !== 'undefined' && document.activeElement === this.inputRef?.nativeElement;

    if (changes['selectedItem']) {
      const val = changes['selectedItem'].currentValue;
      if (!val && val !== 0) {
        if (!isFocused) {
          this.selectedLabel = '';
          this.searchTerm = '';
          this.hasValidSelection = false;
          this.dropdownData = [];
          this.pageNo = 0;
          this.hasMore = true;
          this.closeDropdown();
        }
        this.cdr.markForCheck();
        return;
      }

      const rawId = typeof val === 'object' && val !== null ? val.id : val;

      if (typeof val === 'object' && val !== null && val.id !== undefined) {
        // Full object passed — resolve human-readable label
        // Grade/leaf items carry spec displayTitle in additionalValues — never let it shadow the child name.
        const candidateLabel =
          val.name ||
          val.label ||
          val.additionalValues?.['fullDisplayName'] ||
          val.displayTitle ||
          val.DisplayTitle ||
          val.title ||
          (val.additionalValues?.['displayTitle'] && String(val.additionalValues['displayTitle']) !== String(val.name) ? val.additionalValues['displayTitle'] : undefined) ||
          (val.code && String(val.code) !== String(val.id) ? val.code : undefined);

        if (candidateLabel) {
          this.selectedLabel = candidateLabel;
          this.hasValidSelection = true;
          this.dropdownData = [val, ...this.dropdownData.filter(x => x && x.id !== val.id)];
          this.cdr.markForCheck();
          return;
        }
        // If candidateLabel is missing, do not display naked ID — fall through to query fetchDataFn
      }

      // Check if item is already in dropdownData (match by ID or by additionalValues master/subgroup ID)
      const matched = this.dropdownData.find(x => x && !x.isHeader && x.selectable !== false && 
        (+x.id === +rawId || (x.additionalValues && (+x.additionalValues['masterTestId'] === +rawId || +x.additionalValues['subGroupId'] === +rawId || +x.additionalValues['testMethodSpecificationId'] === +rawId || +x.additionalValues['versionId'] === +rawId))));
      if (matched) {
        this.selectedLabel = matched.additionalValues?.['fullDisplayName'] || matched.name;
        this.hasValidSelection = true;
        this.cdr.markForCheck();
      } else if (rawId && this.fetchDataFn) {
        // Only ID passed — search by ID string (backend supports numeric ID lookup)
        this.fetchDataFn(String(rawId), 0, 20).subscribe({
          next: (data: any[]) => {
            const found = (data || []).find(x => x && !x.isHeader && x.selectable !== false && 
              (+x.id === +rawId || (x.additionalValues && (+x.additionalValues['masterTestId'] === +rawId || +x.additionalValues['subGroupId'] === +rawId || +x.additionalValues['testMethodSpecificationId'] === +rawId || +x.additionalValues['versionId'] === +rawId))));
            if (found) {
              this.dropdownData = [found, ...this.dropdownData.filter(x => x && x.id !== found.id)];
              this.selectedLabel = found.additionalValues?.['fullDisplayName'] || found.name;
              this.hasValidSelection = true;
              this.cdr.markForCheck();
            }
          },
          error: () => {
            this.cdr.markForCheck();
          },
        });
      }
    }

    // When reloadKey changes (e.g. switching between different samples or table rows)
    if (changes['reloadKey'] && !changes['reloadKey'].firstChange) {
      if (!isFocused) {
        this.dropdownData = [];
        this.pageNo = 0;
        this.hasMore = true;
        this.closeDropdown();
        if (!this.selectedItem && this.selectedItem !== 0) {
          this.selectedLabel = '';
          this.searchTerm = '';
          this.hasValidSelection = false;
        }
      }
      this.cdr.markForCheck();
    }
  }

  handleInput(event: any): void {
    this.searchTerm = event.target.value;
    this.selectedLabel = this.searchTerm;
    if (this.hasValidSelection) {
      this.hasValidSelection = false;
      this.selectedItem = null;
      this.pageNo = 0;
      this.hasMore = true;
      this.itemSelected.emit(null);
    }
    // Instantly rank existing loaded items while the debounced backend request is pending
    if (this.dropdownData.length > 0) {
      this.dropdownData = rankAndFilterDropdownItems(this.dropdownData, this.searchTerm);
      const firstSelectable = this.dropdownData.findIndex(x => x && !x.isHeader && x.selectable !== false);
      this.highlightedIndex = firstSelectable >= 0 ? firstSelectable : 0;
      if (this.dropdownComponentRef) {
        this.dropdownComponentRef.instance.items = this.dropdownData;
        this.dropdownComponentRef.instance.highlightedIndex = this.highlightedIndex;
        this.dropdownComponentRef.changeDetectorRef.detectChanges();
      }
    }
    this.openDropdownPanel();
    this.searchSubject.next(this.searchTerm);
    this.cdr.markForCheck();
  }

  onFocus(): void {
    if (this.isDisabled) return;
    if (!this.dropdownData.length || !this.hasValidSelection) {
      this.loadInitialData();
    } else {
      this.openDropdownPanel();
    }
  }

  loadInitialData(): void {
    if (!this.fetchDataFn) return;
    this.loading = true;
    this.pageNo = 0;
    this.searchTerm = '';
    this.syncLoadingToPanel();

    this.fetchDataFn('', this.pageNo, this.pageSize).subscribe({
      next: (data: any[]) => {
        this.dropdownData = data || [];
        this.hasMore = (data || []).length === this.pageSize;
        this.pageNo++;
        this.loading = false;
        const firstSelectable = this.dropdownData.findIndex(x => x && !x.isHeader && x.selectable !== false);
        this.highlightedIndex = firstSelectable >= 0 ? firstSelectable : (this.dropdownData.length > 0 ? 0 : -1);
        this.cdr.markForCheck();
        this.openDropdownPanel();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onChevronClick(): void {
    if (this.isDisabled) return;
    if (this.overlayRef?.hasAttached()) {
      this.closeDropdown();
      return;
    }
    this.inputRef?.nativeElement?.focus();
    this.onFocus();
  }

  openDropdownPanel(): void {
    if (!this.overlayRef) {
      const positionStrategy = this.overlay
        .position()
        .flexibleConnectedTo(this.inputRef)
        .withPositions([
          {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
            offsetY: 4,
          },
          {
            originX: 'start',
            originY: 'top',
            overlayX: 'start',
            overlayY: 'bottom',
            offsetY: -4,
          },
        ])
        .withFlexibleDimensions(false)
        .withPush(false);

      const inputWidth = this.inputRef.nativeElement.getBoundingClientRect().width;

      this.overlayRef = this.overlay.create({
        positionStrategy,
        hasBackdrop: false,
        width: Math.max(inputWidth, 240),
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
      });
    }

    if (!this.overlayRef.hasAttached()) {
      const portal = new ComponentPortal(DropdownPanelComponent, this.vcr);
      this.dropdownComponentRef = this.overlayRef.attach(portal);
      this.dropdownComponentRef.instance.items = this.dropdownData;
      this.dropdownComponentRef.instance.selectedItemId = this.selectedItem?.id ?? this.selectedItem;
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
      });
    } else {
      this.dropdownComponentRef.instance.items = this.dropdownData;
      this.dropdownComponentRef.instance.highlightedIndex = this.highlightedIndex;
      this.dropdownComponentRef.instance.loading = this.loading;
      this.dropdownComponentRef.changeDetectorRef.detectChanges();
    }
  }

  handleOutsideClick = (event: MouseEvent) => {
    const inputEl = this.inputRef?.nativeElement;
    const dropdownEl = this.overlayRef?.overlayElement;
    const target = event.target as Node;
    const clickedInsideInput = inputEl?.contains(target);
    const clickedInsideDropdown = dropdownEl?.contains(target);

    if (!clickedInsideInput && !clickedInsideDropdown) {
      if (!this.hasValidSelection && this.selectedLabel) {
        this.selectedLabel = '';
        this.searchTerm = '';
        this.selectedItem = null;
        this.itemSelected.emit(null);
      }
      this.closeDropdown();
      this.cdr.markForCheck();
    }
  };

  selectItem(item: any): void {
    if (!item || item.isHeader || item.selectable === false) return;
    this.selectedLabel = item.additionalValues?.['fullDisplayName'] || item.name;
    this.searchTerm = '';
    this.hasValidSelection = true;
    this.selectedItem = item;
    this.dropdownData = [];
    this.pageNo = 0;
    this.hasMore = true;
    this.itemSelected.emit(item);
    this.closeDropdown();
    this.cdr.markForCheck();
  }

  clearSelection(event: Event): void {
    event.stopPropagation();
    this.selectedLabel = '';
    this.searchTerm = '';
    this.selectedItem = null;
    this.hasValidSelection = false;
    this.dropdownData = [];
    this.pageNo = 0;
    this.hasMore = true;
    this.itemSelected.emit(null);
    this.closeDropdown();
    this.loadInitialData();
  }

  onBlur(): void {
    // Delay clearing slightly so that any click/mousedown inside dropdown or overlay finishes first
    setTimeout(() => {
      if (this.hasValidSelection) return;
      if (this.overlayRef?.hasAttached()) {
        // Dropdown overlay is still attached (user is interacting with panel)
        return;
      }
      if (this.selectedLabel) {
        this.selectedLabel = '';
        this.searchTerm = '';
        this.selectedItem = null;
        this.itemSelected.emit(null);
        this.cdr.markForCheck();
      }
    }, 200);
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

    this.fetchDataFn(this.searchTerm, this.pageNo, this.pageSize).subscribe({
      next: (data: any[]) => {
        const rawNew = (data as any[]) || [];
        const combined = [...this.dropdownData, ...rawNew];
        this.dropdownData = rankAndFilterDropdownItems(combined, this.searchTerm);
        this.hasMore = rawNew.length === this.pageSize;
        this.pageNo++;
        this.loading = false;
        this.cdr.markForCheck();
        this.openDropdownPanel();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeDropdown(): void {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    document.removeEventListener('click', this.handleOutsideClick, true);
    this.highlightedIndex = -1;
  }

  private getNextSelectableIndex(currentIndex: number, direction: 1 | -1): number {
    const len = this.dropdownData.length;
    if (!len) return -1;
    let nextIndex = currentIndex;
    for (let i = 0; i < len; i++) {
      nextIndex = (nextIndex + direction + len) % len;
      const item = this.dropdownData[nextIndex];
      if (item && !item.isHeader && item.selectable !== false) {
        return nextIndex;
      }
    }
    return currentIndex;
  }

  handleKeydown(event: KeyboardEvent): void {
    const isOpen = this.overlayRef?.hasAttached();
    const itemsLength = this.dropdownData.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          this.onFocus();
          return;
        }
        if (!itemsLength) return;
        this.highlightedIndex = this.getNextSelectableIndex(this.highlightedIndex, 1);
        this.syncHighlightToPanel();
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen || !itemsLength) return;
        this.highlightedIndex = this.getNextSelectableIndex(this.highlightedIndex, -1);
        this.syncHighlightToPanel();
        break;

      case 'Enter':
        event.preventDefault();
        if (isOpen && this.highlightedIndex >= 0 && this.highlightedIndex < itemsLength) {
          const item = this.dropdownData[this.highlightedIndex];
          if (item && !item.isHeader && item.selectable !== false) {
            this.selectItem(item);
          }
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
