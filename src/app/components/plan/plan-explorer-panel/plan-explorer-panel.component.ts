import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PlanExplorerService,
  ProductMasterExplorerData,
  MetalExplorerData,
  LabTestExplorerData,
  ConfiguredGrade,
  ConfiguredTest
} from '../../../services/plan-explorer.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-plan-explorer-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-explorer-panel.component.html',
  styleUrls: ['./plan-explorer-panel.component.css']
})
export class PlanExplorerPanelComponent implements OnChanges {
  @Input() productMasterId: number | null = null;
  @Input() metalClassificationId: number | null = null;
  @Input() activeSampleNo: string = '';
  @Input() activeTabType: 'general' | 'chemical' = 'general';
  @Input() isViewMode: boolean = false;

  @Output() applyGradeConfig = new EventEmitter<ConfiguredGrade>();
  @Output() applyTestConfig = new EventEmitter<ConfiguredTest>();
  @Output() applyBatchTests = new EventEmitter<ConfiguredTest[]>();

  isExpanded: boolean = true;
  activeExplorerTab: 'product' | 'metal' | 'labtest' = 'product';
  searchTerm: string = '';

  productData: ProductMasterExplorerData | null = null;
  metalData: MetalExplorerData | null = null;

  loadingProduct: boolean = false;
  loadingMetal: boolean = false;

  expandedGradeId: number | null = null;

  // Client-side cache to prevent re-fetching
  private productCache = new Map<number, ProductMasterExplorerData>();
  private metalCache = new Map<number, MetalExplorerData>();

  // Batch Multi-Test Selection
  selectedTestsToApply = new Map<number, ConfiguredTest>();

  // Tab 3: Universal Lab Test Search State
  labTestSearchTerm: string = '';
  labTestSearchResults: ConfiguredTest[] = [];
  labTestSearchLoading: boolean = false;

  constructor(
    private explorerService: PlanExplorerService,
    private toastService: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productMasterId'] && this.productMasterId) {
      this.loadProductExplorer(this.productMasterId);
    }
    if (changes['metalClassificationId'] && this.metalClassificationId) {
      this.loadMetalExplorer(this.metalClassificationId);
    }
  }

  togglePanel(): void {
    this.isExpanded = !this.isExpanded;
  }

  loadProductExplorer(id: number): void {
    if (this.productCache.has(id)) {
      this.productData = this.productCache.get(id)!;
      if (this.productData.grades.length > 0 && !this.expandedGradeId) {
        this.expandedGradeId = this.productData.grades[0].specificationGradeID;
      }
      return;
    }

    this.loadingProduct = true;
    this.explorerService.getProductMasterExplorer(id).subscribe({
      next: data => {
        this.productCache.set(id, data);
        this.productData = data;
        this.loadingProduct = false;
        if (data.grades.length > 0) {
          this.expandedGradeId = data.grades[0].specificationGradeID;
        }
      },
      error: () => {
        this.loadingProduct = false;
      }
    });
  }

  loadMetalExplorer(id: number): void {
    if (this.metalCache.has(id)) {
      this.metalData = this.metalCache.get(id)!;
      return;
    }

    this.loadingMetal = true;
    this.explorerService.getMetalExplorer(id).subscribe({
      next: data => {
        this.metalCache.set(id, data);
        this.metalData = data;
        this.loadingMetal = false;
      },
      error: () => {
        this.loadingMetal = false;
      }
    });
  }

  toggleGradeAccordion(gradeId: number): void {
    this.expandedGradeId = this.expandedGradeId === gradeId ? null : gradeId;
  }

  getFilteredGrades(grades: ConfiguredGrade[] | undefined): ConfiguredGrade[] {
    if (!grades) return [];
    if (!this.searchTerm.trim()) return grades;
    const term = this.searchTerm.toLowerCase();
    return grades.filter(
      g =>
        g.gradeName.toLowerCase().includes(term) ||
        g.specificationName.toLowerCase().includes(term) ||
        g.configuredTests.some(t => t.laboratoryTestName.toLowerCase().includes(term))
    );
  }

  onQuickApplyGrade(grade: ConfiguredGrade, event: Event): void {
    event.stopPropagation();
    if (this.isViewMode) return;
    this.applyGradeConfig.emit(grade);
    this.toastService.show(`Applied ${grade.gradeName} configuration to active plan tab.`, 'success');
  }

  onQuickApplyTest(test: ConfiguredTest, event: Event): void {
    event.stopPropagation();
    if (this.isViewMode) return;
    this.applyTestConfig.emit(test);
    this.toastService.show(`Applied ${test.laboratoryTestName} to active plan tab.`, 'success');
  }

  toggleSelectTest(test: ConfiguredTest, event: Event): void {
    event.stopPropagation();
    if (this.selectedTestsToApply.has(test.laboratoryTestID)) {
      this.selectedTestsToApply.delete(test.laboratoryTestID);
    } else {
      this.selectedTestsToApply.set(test.laboratoryTestID, test);
    }
  }

  isTestSelected(testId: number): boolean {
    return this.selectedTestsToApply.has(testId);
  }

  onApplySelectedTests(): void {
    if (this.isViewMode || this.selectedTestsToApply.size === 0) return;
    const selectedList = Array.from(this.selectedTestsToApply.values());
    this.applyBatchTests.emit(selectedList);
    this.toastService.show(`Applied ${selectedList.length} selected tests to plan.`, 'success');
    this.selectedTestsToApply.clear();
  }

  clearSelectedBatch(): void {
    this.selectedTestsToApply.clear();
  }

  searchLabTests(): void {
    if (!this.labTestSearchTerm || this.labTestSearchTerm.trim().length < 2) {
      this.labTestSearchResults = [];
      return;
    }
    this.labTestSearchLoading = true;
    this.explorerService.searchUniversalLabTests(this.labTestSearchTerm.trim()).subscribe({
      next: results => {
        this.labTestSearchResults = results || [];
        this.labTestSearchLoading = false;
      },
      error: () => {
        this.labTestSearchLoading = false;
      }
    });
  }

  getGeneralTests(tests: ConfiguredTest[] | undefined): ConfiguredTest[] {
    if (!tests) return [];
    return tests.filter(t => t.testType !== 'Chemical');
  }

  getChemicalTests(tests: ConfiguredTest[] | undefined): ConfiguredTest[] {
    if (!tests) return [];
    return tests.filter(t => t.testType === 'Chemical');
  }
}
