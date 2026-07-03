import { Injectable, signal } from '@angular/core';

export interface BranchInfo {
  code: string;
  name: string;
  location: string;
}

@Injectable({
  providedIn: 'root'
})
export class BranchService {
  private readonly storageKey = 'selectedBranchCode';
  
  // Available branches
  readonly branches: BranchInfo[] = [
    { code: 'ALL', name: 'All Branches', location: 'Global' },
    { code: 'BLR', name: 'Bengaluru Lab', location: 'Karnataka' },
    { code: 'PUN', name: 'Pune Lab', location: 'Maharashtra' },
    { code: 'CHN', name: 'Chennai Lab', location: 'Tamil Nadu' },
    { code: 'DEL', name: 'Delhi NCR Lab', location: 'New Delhi' },
    { code: 'AMD', name: 'Ahmedabad Lab', location: 'Gujarat' },
  ];

  // Signal for currently selected branch
  readonly selectedBranch = signal<BranchInfo>(this.getInitialBranch());

  constructor() { }

  private getInitialBranch(): BranchInfo {
    const code = localStorage.getItem(this.storageKey);
    const match = this.branches.find(b => b.code === code);
    return match || this.branches[0];
  }

  setBranch(branchCode: string): void {
    const match = this.branches.find(b => b.code === branchCode);
    if (match) {
      this.selectedBranch.set(match);
      localStorage.setItem(this.storageKey, match.code);
    }
  }

  getBranch(): BranchInfo {
    return this.selectedBranch();
  }
}
