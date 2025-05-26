import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ComponentRef, ElementRef, EventEmitter, Input, Output, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Event } from '@angular/router';
import { debounceTime, Observable, Subject, Subscription, switchMap } from 'rxjs';
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

  private searchSubject = new Subject<string>();
  private sub = new Subscription();

  private overlayRef!: OverlayRef;
  private dropdownComponentRef!: ComponentRef<DropdownPanelComponent>;


  constructor(private overlay: Overlay, private vcr: ViewContainerRef) { }

  ngOnInit(): void {
    const searchSub = this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap(term => {
          this.pageNo = 0;
          this.dropdownData = [];
          return this.fetchDataFn(term, this.pageNo, this.pageSize);
        })
      )
      .subscribe(data => {
        this.dropdownData = data as any[];
        this.hasMore = (data as any[]).length === this.pageSize;
        this.pageNo++;
        this.openDropdownPanel();
      });

    this.sub.add(searchSub);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItem'] && changes['selectedItem'].currentValue) {
      const matched = this.dropdownData.find(x => x.id === this.selectedItem);
      if (matched) {
        this.selectedLabel = matched.name;
        this.selectItem(matched);
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
    this.searchSubject.next(this.searchTerm);
  }
  onFocus(): void {
    if (this.selectedLabel.length > 0) {
      this.openDropdownPanel();
    }
  }
  openDropdownPanel(): void {
    const inputRect = this.inputRef.nativeElement.getBoundingClientRect();
    const inputWidth = inputRect.width;

    const positionStrategy = this.overlay.position()
      .flexibleConnectedTo(this.inputRef.nativeElement)
      .withPositions([
        {
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
        },
        {
          originX: 'start',
          originY: 'top',
          overlayX: 'start',
          overlayY: 'bottom',
        },
      ])
      .withFlexibleDimensions(false)
      .withPush(false);

    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        positionStrategy,
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        hasBackdrop: false, // No backdrop for dropdown
        minWidth: inputWidth,
        maxWidth: inputWidth,
      });
    }

    if (!this.overlayRef.hasAttached()) {
      const dropdownPortal = new ComponentPortal(DropdownPanelComponent, this.vcr);
      this.dropdownComponentRef = this.overlayRef.attach(dropdownPortal);
      this.dropdownComponentRef.instance.items = this.dropdownData;

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
      this.dropdownComponentRef.changeDetectorRef.detectChanges();
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
  }



  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.overlayRef?.dispose();
  }

}
