import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
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
    if (changes['selectedValues'] && this.selectedValues) {
      console.log("set values", this.selectedValues);
      this.multiForm.get('search')?.setValue(this.selectedValues, { emitEvent: false });
    }
  }
  ngOnInit(): void {
    this.setupTypeahead();
    // this.setupSelectionWatcher();
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

  private setupSelectionWatcher(): void {
    const selectionSub = this.multiForm.get('search')?.valueChanges.subscribe(value => {
      this.selectedItems = value;
      this.itemsSelected.emit(this.selectedItems);
    });

    if (selectionSub) {
      this.subscriptions.push(selectionSub);
    }
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
        this.items = [...this.items, ...data];
        this.hasMore = data.length === this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onChange(selected: any[]): void {
    this.selectedItems = selected;
    this.itemsSelected.emit(this.selectedItems);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
