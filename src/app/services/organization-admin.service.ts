import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrganizationAdminListRequest {
  pageNo: number;
  pageSize: number;
  searchTerm?: string;
  isActive?: boolean;
}

export interface OrganizationAdminItem {
  id: number;
  labName: string;
  labCode: string;
  labAddress: string;
  contactEmail: string;
  contactPhone: string;
  organizationLogo?: string;
  cin?: string;
  website?: string;
  mobileNo?: string;
  ulrPrefix?: string;
  labLocationCode?: string;
  isMultiBranch: boolean;
  isActive: boolean;
  branchCount: number;
  activeUserCount: number;
  createdOn?: string;
  modifiedOn?: string;
}

export interface OrganizationAdminListResponse {
  totalCount: number;
  items: OrganizationAdminItem[];
}

export interface OrganizationCreateDto {
  labName: string;
  labCode: string;
  labAddress: string;
  contactEmail: string;
  contactPhone: string;
  organizationLogo?: string;
  cin?: string;
  website?: string;
  mobileNo?: string;
  ulrPrefix?: string;
  labLocationCode?: string;
  isMultiBranch: boolean;
}

export interface OrganizationUpdateDto {
  id: number;
  labName: string;
  labCode: string;
  labAddress: string;
  contactEmail: string;
  contactPhone: string;
  organizationLogo?: string;
  cin?: string;
  website?: string;
  mobileNo?: string;
  ulrPrefix?: string;
  labLocationCode?: string;
  isMultiBranch: boolean;
}

export interface OrganizationDependency {
  organizationId: number;
  labName: string;
  activeBranchesCount: number;
  activeUsersCount: number;
  openSamplesCount: number;
  canDeactivate: boolean;
  blockReason?: string;
}

export interface BranchAdminListRequest {
  organizationId: number;
  pageNo: number;
  pageSize: number;
  searchTerm?: string;
  isActive?: boolean;
}

export interface BranchAdminItem {
  id: number;
  organizationID: number;
  organizationName: string;
  name: string;
  code: string;
  isHeadOffice: boolean;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  disciplineCount: number;
  assignedUserCount: number;
  createdOn?: string;
  modifiedOn?: string;
}

export interface BranchAdminListResponse {
  totalCount: number;
  items: BranchAdminItem[];
}

export interface BranchCreateDto {
  organizationID: number;
  name: string;
  code: string;
  isHeadOffice: boolean;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface BranchUpdateDto {
  id: number;
  organizationID: number;
  name: string;
  code: string;
  isHeadOffice: boolean;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
}

export interface BranchDependency {
  branchId: number;
  branchName: string;
  activeUsersCount: number;
  defaultUsersCount: number;
  equipmentCount: number;
  departmentsCount: number;
  openSamplesCount: number;
  canDeactivate: boolean;
  blockReason?: string;
}

export interface BranchDisciplineItem {
  id: number;
  branchID: number;
  disciplineID: number;
  disciplineName: string;
  disciplineCode: string;
  disciplineDescription?: string;
  isAccredited: boolean;
  isActive: boolean;
}

export interface AvailableDisciplineItem {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface BranchDisciplinesResponse {
  branchId: number;
  branchName: string;
  assignedDisciplines: BranchDisciplineItem[];
  availableDisciplines: AvailableDisciplineItem[];
}

export interface BranchDisciplineAssignDto {
  disciplineID: number;
  isAccredited: boolean;
}

export interface BranchDisciplineAccreditationDto {
  isAccredited: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationAdminService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // ---------------- Organization APIs ----------------
  getOrganizations(params: OrganizationAdminListRequest): Observable<OrganizationAdminListResponse> {
    return this.http.post<OrganizationAdminListResponse>(`${this.baseUrl}/Organization/list`, params);
  }

  getOrganizationDetails(id: number): Observable<OrganizationAdminItem> {
    return this.http.get<OrganizationAdminItem>(`${this.baseUrl}/Organization/details/${id}`);
  }

  createOrganization(dto: OrganizationCreateDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/Organization/create`, dto);
  }

  updateOrganization(dto: OrganizationUpdateDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/Organization/update`, dto);
  }

  toggleOrganizationStatus(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/Organization/${id}/toggle-status`, {});
  }

  getOrganizationDependencies(id: number): Observable<OrganizationDependency> {
    return this.http.get<OrganizationDependency>(`${this.baseUrl}/Organization/${id}/dependencies`);
  }

  // ---------------- Branch APIs ----------------
  getAdminBranches(params: BranchAdminListRequest): Observable<BranchAdminListResponse> {
    return this.http.post<BranchAdminListResponse>(`${this.baseUrl}/Branch/admin-list`, params);
  }

  getBranchDetails(id: number): Observable<BranchAdminItem> {
    return this.http.get<BranchAdminItem>(`${this.baseUrl}/Branch/details/${id}`);
  }

  createBranch(dto: BranchCreateDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/Branch/create`, dto);
  }

  updateBranch(dto: BranchUpdateDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/Branch/update`, dto);
  }

  toggleBranchStatus(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/Branch/${id}/toggle-status`, {});
  }

  getBranchDependencies(id: number): Observable<BranchDependency> {
    return this.http.get<BranchDependency>(`${this.baseUrl}/Branch/${id}/dependencies`);
  }

  // ---------------- Branch Discipline APIs ----------------
  getBranchDisciplines(branchId: number): Observable<BranchDisciplinesResponse> {
    return this.http.get<BranchDisciplinesResponse>(`${this.baseUrl}/Branch/${branchId}/disciplines`);
  }

  assignDiscipline(branchId: number, dto: BranchDisciplineAssignDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/Branch/${branchId}/disciplines/assign`, dto);
  }

  removeDiscipline(branchId: number, disciplineId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Branch/${branchId}/disciplines/${disciplineId}`);
  }

  toggleDisciplineAccreditation(branchId: number, disciplineId: number, dto: BranchDisciplineAccreditationDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/Branch/${branchId}/disciplines/${disciplineId}/accreditation`, dto);
  }
}
