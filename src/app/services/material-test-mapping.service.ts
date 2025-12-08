import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaterialTestMappingService {

  private apiUrl = environment.apiUrl +"/MaterialTestMapping";

    constructor(private http: HttpClient) {}

    getAllMaterialTestMappings(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }

    getMaterialTestMappingById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }

    createMaterialTestMapping(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }

    updateMaterialTestMapping( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
    getAutoSuggestedTests(metalId:number|null,productConditionId:number|null, gradeId:string): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/AutoSuggest?metalClassificationID=${metalId}&productConditionID=${productConditionId}&gradeIDs=${gradeId}`);
    }
    getAutoSuggestedGrads(metalId:number|null,productConditionId:number|null): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/AutoSuggestedGrade?metalClassificationID=${metalId}&productConditionID=${productConditionId}`);
    }

}
