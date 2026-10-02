import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BranchInfo {
  id: number;
  code: string;
  name: string;
  address?: string;
  isHeadOffice?: boolean;
  isDefault?: boolean;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canExecute?: boolean;
  canApprove?: boolean;
  canDelete?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private readonly storageKey = 'selectedBranchId';
  private readonly http = inject(HttpClient);

  // Dynamic user-authorized branches
  readonly branches = signal<BranchInfo[]>([]);

  // Signal for currently active operating branch
  readonly selectedBranch = signal<BranchInfo | null>(null);

  constructor() {
    this.restoreFromStorage();
  }

  loadUserBranches(): Observable<BranchInfo[]> {
    return this.http.get<BranchInfo[]>(`${environment.apiUrl}/Branch/user-branches`).pipe(
      tap(branchList => {
        this.branches.set(branchList);
        const storedId = localStorage.getItem(this.storageKey);
        let activeBranch: BranchInfo | undefined;
        if (storedId) {
          activeBranch = branchList.find(b => b.id.toString() === storedId);
        }
        if (!activeBranch) {
          activeBranch = branchList.find(b => b.isDefault) || branchList[0];
        }
        if (activeBranch) {
          this.setBranch(activeBranch);
        }
      })
    );
  }

  setBranch(branch: BranchInfo): void {
    this.selectedBranch.set(branch);
    if (branch && branch.id) {
      localStorage.setItem(this.storageKey, branch.id.toString());
    }
  }

  setBranchById(branchId: number): void {
    const match = this.branches().find(b => b.id === branchId);
    if (match) {
      this.setBranch(match);
    }
  }

  getBranch(): BranchInfo | null {
    return this.selectedBranch();
  }

  private restoreFromStorage(): void {
    const storedId = localStorage.getItem(this.storageKey);
    if (storedId) {
      const match = this.branches().find(b => b.id.toString() === storedId);
      if (match) {
        this.selectedBranch.set(match);
      }
    }
  }
}
