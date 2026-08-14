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

  isExpanded: boolean = true;
  activeExplorerTab: 'product' | 'metal' | 'catalog' = 'product';
  searchTerm: string = '';

  productData: ProductMasterExplorerData | null = null;
  metalData: MetalExplorerData | null = null;

  loadingProduct: boolean = false;
  loadingMetal: boolean = false;

  expandedGradeId: number | null = null;

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
    this.loadingProduct = true;
    this.explorerService.getProductMasterExplorer(id).subscribe({
      next: data => {
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
    this.loadingMetal = true;
    this.explorerService.getMetalExplorer(id).subscribe({
      next: data => {
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

  getGeneralTests(tests: ConfiguredTest[] | undefined): ConfiguredTest[] {
    if (!tests) return [];
    return tests.filter(t => t.testType !== 'Chemical');
  }

  getChemicalTests(tests: ConfiguredTest[] | undefined): ConfiguredTest[] {
    if (!tests) return [];
    return tests.filter(t => t.testType === 'Chemical');
  }
}
