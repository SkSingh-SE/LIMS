import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  Observable,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';
import { MultiSelectPanelComponent } from '../multi-select-panel/multi-select-panel.component';

@Component({
  selector: 'app-multi-select-dropdown',
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrl: './multi-select-dropdown.component.css',
})
export class MultiSelectDropdownComponent implements OnInit, OnChanges, OnDestroy {
  @Input() placeholder: string = 'Select items...';
  @Input() required: boolean = false;
  @Input() isDisabled: boolean = false;
  @Input() fetchDataFn!: (searchTerm: string, page: number, pageSize: number) => Observable<any[]>;
  @Output() itemsSelected = new EventEmitter<any[]>();
  @Input() selectedValues: any[] = [];
  @Input() labelName: string = 'Select Item';
  @Input() hideLabel: boolean = false;
  @Input() reloadKey: any;
  @Input() smallInput: boolean = false;

  @ViewChild('triggerRef') triggerRef!: ElementRef;

  selectedItems: any[] = [];
  items: any[] = [];
  searchTerm = '';
  page = 0;
  pageSize = 20;
  hasMore = true;
  loading = false;
  touched = false;
  isOpen = false;

  // switchMap subject — cancels in-flight search requests when term changes
  private typeaheadSubject = new Subject<string>();
  private overlayRef!: OverlayRef;
  private panelRef!: ComponentRef<MultiSelectPanelComponent>;
  private subs = new Subscription();

  constructor(private overlay: Overlay, private vcr: ViewContainerRef, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Typeahead pipe: debounce + distinct + switchMap (cancels previous in-flight request)
    const searchSub = this.typeaheadSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(term => {
          this.searchTerm = term;
          this.page = 0;
          this.items = [];
          this.hasMore = true;
          this.loading = true;
          this.syncPanelState();
          this.cdr.markForCheck();
        }),
        switchMap(term => this.fetchDataFn(term, 0, this.pageSize))
      )
      .subscribe({
        next: data => {
          this.items = data;
          this.hasMore = data.length === this.pageSize;
          this.loading = false;
          this.syncPanelState();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.syncPanelState();
          this.cdr.markForCheck();
        },
      });

    this.subs.add(searchSub);
    this.fetchPage(0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedValues']) {
      const newValues = changes['selectedValues'].currentValue || [];
      const oldValues = changes['selectedValues'].previousValue || [];
      if (JSON.stringify(newValues) !== JSON.stringify(oldValues)) {
        const missingIds = newValues.filter((id: any) => !this.items.some(item => +item.id === +id));
        if (missingIds.length > 0) {
          this.fetchMissingItems(missingIds);
        } else {
          this.syncSelectedItems();
        }
      }
    }
    if (changes['reloadKey'] && !changes['reloadKey'].firstChange) {
      this.reloadDropdown();
    }
  }

  // ─── Data loading ───────────────────────────────────────────────────────────

  // Single entry-point for both initial load and scroll-to-end pagination.
  // Page is incremented ONLY inside the success callback to prevent drift when
  // the guard (loading flag) or errors block the request.
  private fetchPage(page: number): void {
    if (this.loading) return;
    this.loading = true;
    this.syncPanelState();

    const sub = this.fetchDataFn(this.searchTerm, page, this.pageSize).subscribe({
      next: data => {
        this.page = page;
        this.items =
          page === 0
            ? data
            : [...this.items, ...data.filter(d => !this.items.some(i => +i.id === +d.id))];
        this.hasMore = data.length === this.pageSize;
        this.loading = false;
        this.syncPanelState();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.syncPanelState();
        this.cdr.markForCheck();
      },
    });
    this.subs.add(sub);
  }

  // Fetch individual items by ID for initial selectedValues rebind
  private fetchMissingItems(ids: any[]): void {
    const requests = ids.map(id => this.fetchDataFn(id.toString(), 0, 1));
    const sub = forkJoin(requests).subscribe({
      next: (results: any[][]) => {
        const collected = results.filter(d => d?.length > 0).map(d => d[0]);
        this.items = [...this.items, ...collected.filter(f => !this.items.some(i => +i.id === +f.id))];
        this.syncSelectedItems();
        this.cdr.markForCheck();
      },
      error: () => this.syncSelectedItems(),
    });
    this.subs.add(sub);
  }

  // Used only for external selectedValues rebind (not during user interaction)
  private syncSelectedItems(): void {
    this.selectedItems = (this.selectedValues || [])
      .map(id => this.items.find(item => +item.id === +id))
      .filter(Boolean);
  }

  // ─── Overlay ─────────────────────────────────────────────────────────────────

  private openDropdown(): void {
    if (!this.triggerRef) return;
    const triggerWidth = this.triggerRef.nativeElement.getBoundingClientRect().width;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.triggerRef.nativeElement)
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
        width: triggerWidth,
        panelClass: 'ms-overlay-panel',
      });
    } else {
      this.overlayRef.updatePositionStrategy(positionStrategy);
      this.overlayRef.updateSize({ width: triggerWidth });
    }

    if (!this.overlayRef.hasAttached()) {
      const portal = new ComponentPortal(MultiSelectPanelComponent, this.vcr);
      this.panelRef = this.overlayRef.attach(portal);
      this.panelRef.instance.items = this.items;
      this.panelRef.instance.selectedIds = [...(this.selectedValues || [])];
      this.panelRef.instance.loading = this.loading;

      this.panelRef.instance.itemToggled.subscribe((item: any) => this.toggleItem(item));
      this.panelRef.instance.scrolledToEnd.subscribe(() => this.onScrollToEnd());
      this.panelRef.instance.searchChanged.subscribe((term: string) => this.typeaheadSubject.next(term));

      this.isOpen = true;
      this.cdr.markForCheck();

      // mousedown capture fires before Angular handlers — immune to stopPropagation.
      // setTimeout defers registration so the opening mousedown itself doesn't close immediately.
      setTimeout(() => {
        document.addEventListener('mousedown', this.handleOutsideClick, true);
        this.panelRef?.instance?.focusSearch();
      });
    } else {
      this.syncPanelState();
    }
  }

  private syncPanelState(): void {
    if (!this.panelRef || !this.overlayRef?.hasAttached()) return;
    this.panelRef.instance.items = this.items;
    this.panelRef.instance.selectedIds = [...(this.selectedValues || [])];
    this.panelRef.instance.loading = this.loading;
    this.panelRef.changeDetectorRef.detectChanges();
  }

  closeDropdown(): void {
    if (this.overlayRef?.hasAttached()) {
      this.overlayRef.detach();
    }
    document.removeEventListener('mousedown', this.handleOutsideClick, true);
    this.isOpen = false;
    this.cdr.markForCheck();

    // Reset search state and reload base list when user closed with a search term active
    if (this.searchTerm) {
      this.searchTerm = '';
      this.page = 0;
      this.items = [];
      this.hasMore = true;
      this.loading = false;
      this.fetchPage(0);
    }
  }

  // ─── Event handlers ──────────────────────────────────────────────────────────

  onTriggerClick(): void {
    if (this.isDisabled) return;
    this.touched = true;
    if (!this.overlayRef?.hasAttached()) {
      this.openDropdown();
    }
  }

  onChevronClick(event: Event): void {
    event.stopPropagation();
    if (this.isDisabled) return;
    this.touched = true;
    if (this.overlayRef?.hasAttached()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  handleOutsideClick = (event: MouseEvent) => {
    // Auto-remove listener if overlay was already detached externally
    if (!this.overlayRef?.hasAttached()) {
      document.removeEventListener('mousedown', this.handleOutsideClick, true);
      return;
    }
    const triggerEl = this.triggerRef?.nativeElement;
    const overlayEl = this.overlayRef?.overlayElement;
    if (!triggerEl?.contains(event.target as Node) && !overlayEl?.contains(event.target as Node)) {
      this.closeDropdown();
      this.cdr.markForCheck();
    }
  };

  // Append next page — page is incremented ONLY after a successful fetch (inside fetchPage)
  onScrollToEnd(): void {
    if (!this.hasMore || this.loading) return;
    this.fetchPage(this.page + 1);
  }

  // Toggle selection — mutates selectedItems directly, never re-derives from items list
  // (items may be filtered by search and not contain previously selected entries)
  toggleItem(item: any): void {
    const currentIds: any[] = [...(this.selectedValues || [])];
    const idx = currentIds.findIndex(id => +id === +item.id);
    if (idx >= 0) {
      currentIds.splice(idx, 1);
      this.selectedItems = this.selectedItems.filter(i => +i.id !== +item.id);
    } else {
      currentIds.push(item.id);
      this.selectedItems = [...this.selectedItems, item];
    }
    this.selectedValues = currentIds;
    this.itemsSelected.emit(this.selectedItems);
    this.syncPanelState();
    this.cdr.markForCheck();
  }

  removeItem(event: Event, item: any): void {
    event.stopPropagation();
    this.toggleItem(item);
  }

  clearAll(event: Event): void {
    event.stopPropagation();
    this.selectedValues = [];
    this.selectedItems = [];
    this.itemsSelected.emit([]);
    this.syncPanelState();
    this.cdr.markForCheck();
  }

  private reloadDropdown(): void {
    this.page = 0;
    this.items = [];
    this.hasMore = true;
    this.loading = false;
    this.fetchPage(0);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.overlayRef?.dispose();
    document.removeEventListener('mousedown', this.handleOutsideClick, true);
  }
}
