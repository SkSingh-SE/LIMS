import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ParameterUnitService {

  private apiUrl = environment.apiUrl +"/ParameterUnitMaster"; 
  private equivalentUnitsCache = new Map<number, Observable<any[]>>();
  
    constructor(private http: HttpClient) {}
  
    getAllParameterUnits(filter:any): Observable<any> {
      return this.http.post<any>(this.apiUrl+"/list", filter);
    }
  
    getParameterUnitById(id: number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/details/${id}`);
    }
  
    createParameterUnit(payload: any): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/create`, payload);
    }
  
    updateParameterUnit( payload: any): Observable<any> {
      return this.http.put<any>(`${this.apiUrl}/update`, payload);
    }
  
    deleteParameterUnit(id: number): Observable<any> {
      return this.http.delete<any>(`${this.apiUrl}/delete/${id}`);
    }

    getParameterUnitDropdown(searchTerm:string,pageNumber:number, pageSize:number): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/dropdown?searchTerm=${searchTerm}&pageNo=${pageNumber}&pageSize=${pageSize}`);
    }

    /**
     * Fetch equivalent units for a parameter's default unit (base + SimilarUnit1-7 matches).
     * Results are cached per unitId — repeated calls for the same unitId reuse the same
     * in-flight or completed observable, avoiding duplicate network requests.
     */
    getEquivalentUnits(unitId: number): Observable<any[]> {
      if (!this.equivalentUnitsCache.has(unitId)) {
        const obs$ = this.http.get<any[]>(`${this.apiUrl}/equivalents/${unitId}`).pipe(
          shareReplay(1)
        );
        this.equivalentUnitsCache.set(unitId, obs$);
      }
      return this.equivalentUnitsCache.get(unitId)!;
    }

}
