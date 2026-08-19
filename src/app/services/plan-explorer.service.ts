import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConfiguredParameter {
  parameterID: number;
  parameterName: string;
  minValue?: number;
  maxValue?: number;
  parameterUnitID: number;
  parameterUnit: string;
  selected: boolean;
}

export interface ConfiguredTest {
  laboratoryTestID: number;
  laboratoryTestName: string;
  testType: 'General' | 'Chemical';
  subGroup: string;
  sourceTag?: string;
  sourceTags?: string[];
  testMethodSpecificationID?: number;
  testMethodSpecificationName?: string;
  testMethodStandardID?: number;
  testMethodStandardName?: string;
  quantity: number;
}

export interface ConfiguredGrade {
  specificationGradeID: number;
  gradeName: string;
  specificationID?: number;
  specificationName: string;
  metalClassificationName?: string;
  isScopeConfigured?: boolean;
  configuredTests: ConfiguredTest[];
  chemicalElements: ConfiguredParameter[];
}

export interface ProductMasterExplorerData {
  productMasterID: number;
  productName: string;
  displayTitle: string;
  metalClassificationID?: number;
  metalClassificationName: string;
  productSizeMasterID?: number;
  productSizeDisplayName: string;
  grades: ConfiguredGrade[];
}

export interface MetalExplorerData {
  metalClassificationID: number;
  metalClassificationName: string;
  grades: ConfiguredGrade[];
}

export interface LabTestExplorerData {
  laboratoryTestID: number;
  laboratoryTestName: string;
  category: string;
  testMethodSpecifications?: ConfiguredTest[];
  standards?: ConfiguredTest[];
}

@Injectable({
  providedIn: 'root'
})
export class PlanExplorerService {
  private apiUrl = `${environment.apiUrl}/plan-explorer`;

  constructor(private http: HttpClient) {}

  getProductMasterExplorer(productMasterId: number): Observable<ProductMasterExplorerData> {
    return this.http.get<ProductMasterExplorerData>(`${this.apiUrl}/product-master/${productMasterId}`);
  }

  getMetalExplorer(metalId: number): Observable<MetalExplorerData> {
    return this.http.get<MetalExplorerData>(`${this.apiUrl}/metal-classification/${metalId}`);
  }

  getMetalClassificationExplorer(metalId: number): Observable<MetalExplorerData> {
    return this.getMetalExplorer(metalId);
  }

  getLabTestExplorer(labTestId: number): Observable<LabTestExplorerData> {
    return this.http.get<LabTestExplorerData>(`${this.apiUrl}/lab-test/${labTestId}`);
  }

  searchUniversalLabTests(query: string): Observable<ConfiguredTest[]> {
    return this.http.get<ConfiguredTest[]>(`${this.apiUrl}/universal-search?query=${encodeURIComponent(query)}`);
  }
}
