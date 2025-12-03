import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  debounceTime,
  distinctUntilChanged,
  Observable,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';

@Component({
  selector: 'app-multi-select-dropdown',
  imports: [CommonModule, FormsModule, NgSelectModule, ReactiveFormsModule],
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

  selectedItems: any[] = [];
  multiForm: FormGroup;
  items: any[] = [];
  page = 0;
  pageSize = 20;
  hasMore = true;
  loading = false;
  searchTerm = '';

  typeahead = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(private fb: FormBuilder) {
    this.multiForm = this.fb.group({
      search: [[]],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle required validator dynamically
    if (changes['required']) {
      if (this.required) {
        this.multiForm.get('search')?.setValidators(Validators.required);
      } else {
        this.multiForm.get('search')?.clearValidators();
      }
      this.multiForm.get('search')?.updateValueAndValidity();
    }

    if (changes['selectedValues']) {
      const newValues = changes['selectedValues'].currentValue || [];
      const oldValues = changes['selectedValues'].previousValue || [];

      // only act if actual change
      if (JSON.stringify(newValues) !== JSON.stringify(oldValues)) {
        this.multiForm.get('search')?.setValue(newValues, { emitEvent: false });

        const missingIds = newValues.filter(
          (id: any) => !this.items.some(item => item.id === id)
        );

        if (missingIds.length > 0) {
          this.fetchMissingItems(missingIds, true); // pass emit=true
        } else {
          this.syncSelectedItems(true); // emit on init/change
        }
      }
    }
  }

  ngOnInit(): void {
    // Set required validator on init
    if (this.required) {
      this.multiForm.get('search')?.setValidators(Validators.required);
      this.multiForm.get('search')?.updateValueAndValidity();
    }
    this.setupTypeahead();
    this.loadItems();
  }

  private setupTypeahead(): void {
    const typeaheadSub = this.typeahead.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        this.loading = true;
        this.page = 0;
        this.items = [];
      }),
      switchMap(term => this.fetchDataFn(term || '', this.page, this.pageSize))
    ).subscribe(data => {
      this.items = data;
      this.loading = false;
      this.hasMore = data.length === this.pageSize;
    });

    this.subscriptions.push(typeaheadSub);
  }

  onScrollToEnd(): void {
    if (this.hasMore && !this.loading) {
      this.page++;
      this.loadItems();
    }
  }

  customSearchFn(term: string): void {
    this.searchTerm = term;
    this.page = 0;
    this.items = [];
    this.hasMore = true;
    this.loadItems();
  }

  private loadItems(): void {
    if (this.loading) return;

    this.loading = true;
    this.fetchDataFn(this.searchTerm, this.page, this.pageSize).subscribe({
      next: (data) => {
        this.items = [
          ...this.items,
          ...data.filter(d => !this.items.some(i => i.id === d.id)) // de-dup
        ];
        this.hasMore = data.length === this.pageSize;
        this.loading = false;

        // After loading, sync selected items silently
        this.syncSelectedItems();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  //  Fetch missing items (initial selection not in first page)
  private fetchMissingItems(ids: any[], emit: boolean = false): void {
    const requests = ids.map(id => this.fetchDataFn(id.toString(), 0, 1));

    const sub = new Observable<any[]>(subscriber => {
      let collected: any[] = [];
      let completed = 0;

      requests.forEach(req => {
        req.subscribe({
          next: (data) => {
            if (data && data.length > 0) {
              collected.push(data[0]);
            }
          },
          complete: () => {
            completed++;
            if (completed === requests.length) {
              subscriber.next(collected);
              subscriber.complete();
            }
          }
        });
      });
    }).subscribe(fetchedItems => {
      this.items = [
        ...this.items,
        ...fetchedItems.filter(f => !this.items.some(i => i.id === f.id))
      ];
      this.syncSelectedItems(emit); // only sync, no emit
    });

    this.subscriptions.push(sub);
  }

  //  Sync selected values with available items
  private syncSelectedItems(emit: boolean = false): void {
    this.selectedItems = this.selectedValues
      ?.map(id => this.items.find(item => item.id === id))
      .filter(Boolean);

    if (emit) {
      this.itemsSelected.emit(this.selectedItems);
    }
  }


  //  Only user actions should emit
  onChange(selected: any[]): void {
    this.selectedItems = selected;
    this.itemsSelected.emit(this.selectedItems);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
