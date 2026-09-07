import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { getAllMenuItems, MenuItem } from '../models/MenuItem';
import { PermissionService } from '../utility/permission/permission.service';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  isClickable: boolean;
  isCurrentPage?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private router = inject(Router);
  private permissionService = inject(PermissionService);

  /** Authoritative reactive breadcrumb list */
  readonly breadcrumbs = signal<BreadcrumbItem[]>([]);

  /** Optional dynamic override (resets automatically on navigation) */
  private dynamicOverride = signal<BreadcrumbItem[] | null>(null);

  constructor() {
    // Initial resolution for initial page load
    this.resolveBreadcrumbs(this.router.url);

    // Listen to navigation events
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((event) => {
        this.dynamicOverride.set(null);
        this.resolveBreadcrumbs(event.urlAfterRedirects || event.url);
      });
  }

  /**
   * Set controlled dynamic suffix for detail screens.
   * e.g. Home > Test > Method & Scientific Configuration > Test Method Master > ASTM_A370 > Edit
   */
  setDynamicTrail(suffixes: (string | { label: string; url?: string })[]): void {
    const base = this.buildBaseBreadcrumbs(this.router.url);
    if (base.length === 0) return;

    // Convert the last item of base to clickable if it had a URL
    const lastBase = base[base.length - 1];
    if (lastBase.url) {
      lastBase.isClickable = true;
      lastBase.isCurrentPage = false;
    }

    const additional: BreadcrumbItem[] = suffixes.map((s, idx) => {
      const isLast = idx === suffixes.length - 1;
      if (typeof s === 'string') {
        return {
          label: s,
          isClickable: false,
          isCurrentPage: isLast
        };
      }
      return {
        label: s.label,
        url: s.url,
        isClickable: !isLast && !!s.url,
        isCurrentPage: isLast
      };
    });

    const full = [...base, ...additional];
    this.dynamicOverride.set(full);
    this.breadcrumbs.set(full);
  }

  /**
   * Complete override if needed by a specialized screen
   */
  setBreadcrumbs(customItems: BreadcrumbItem[]): void {
    this.dynamicOverride.set(customItems);
    this.breadcrumbs.set(customItems);
  }

  /**
   * Reset any manual override back to automatic resolution
   */
  reset(): void {
    this.dynamicOverride.set(null);
    this.resolveBreadcrumbs(this.router.url);
  }

  /**
   * Core route resolution against authoritative MenuItem hierarchy
   */
  private resolveBreadcrumbs(rawUrl: string): void {
    if (this.dynamicOverride()) {
      this.breadcrumbs.set(this.dynamicOverride()!);
      return;
    }

    const items = this.buildBaseBreadcrumbs(rawUrl);
    this.breadcrumbs.set(items);
  }

  private buildBaseBreadcrumbs(rawUrl: string): BreadcrumbItem[] {
    const cleanUrl = (rawUrl || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

    // 1. Root / Home route
    if (cleanUrl === '/' || cleanUrl === '') {
      return [{ label: 'Home', isClickable: false, isCurrentPage: true }];
    }

    const menuItems = getAllMenuItems();

    // Prioritize search in Test branch first to guarantee Universal hierarchy precedence
    const testBranch = menuItems.filter(m => (m.title || '').trim().toLowerCase() === 'test');
    const otherBranches = menuItems.filter(m => (m.title || '').trim().toLowerCase() !== 'test');
    const prioritizedMenus = [...testBranch, ...otherBranches];

    // Find the matching path in the menu tree
    const match = this.findMatchingPath(prioritizedMenus, cleanUrl);

    const result: BreadcrumbItem[] = [
      { label: 'Home', url: '/', isClickable: true }
    ];

    if (!match || match.path.length === 0) {
      // Fallback: derive breadcrumb from URL segments if not found in menu
      const segments = cleanUrl.split('/').filter(Boolean);
      segments.forEach((seg, idx) => {
        const isLast = idx === segments.length - 1;
        result.push({
          label: this.formatSegmentLabel(seg),
          isClickable: false,
          isCurrentPage: isLast
        });
      });
      return result;
    }

    const { path, remaining } = match;

    // Check if remaining has a named action like 'create' or 'edit'
    const actionSegment = this.extractActionSegment(remaining);

    path.forEach((node, idx) => {
      const isPathLeaf = idx === path.length - 1;
      const isOverallLeaf = isPathLeaf && !actionSegment;

      const hasRoute = !!node.route && node.route.trim().length > 0;
      const hasPerm = !node.permissions?.length || this.permissionService.hasAny(node.permissions);
      const isClickable = hasRoute && hasPerm && !isOverallLeaf;

      result.push({
        label: node.title,
        url: hasRoute ? node.route : undefined,
        isClickable,
        isCurrentPage: isOverallLeaf
      });
    });

    if (actionSegment) {
      result.push({
        label: actionSegment,
        isClickable: false,
        isCurrentPage: true
      });
    }

    return result;
  }

  /**
   * Recursively traverses menu tree to find exact match or longest matching route prefix
   */
  private findMatchingPath(
    items: MenuItem[],
    url: string
  ): { path: MenuItem[]; remaining: string } | null {
    let bestMatch: { path: MenuItem[]; remaining: string } | null = null;
    let longestRouteLength = -1;

    const traverse = (node: MenuItem, currentPath: MenuItem[]) => {
      const nextPath = [...currentPath, node];

      if (node.route && node.route.trim().length > 0) {
        const nodeRoute = node.route.trim().toLowerCase();
        const lowerUrl = url.toLowerCase();

        // Exact match
        if (lowerUrl === nodeRoute) {
          bestMatch = { path: nextPath, remaining: '' };
          longestRouteLength = Number.MAX_SAFE_INTEGER;
          return;
        }

        // Prefix match with path boundary
        if (lowerUrl.startsWith(nodeRoute + '/')) {
          const remaining = url.substring(node.route.length);
          if (nodeRoute.length > longestRouteLength) {
            longestRouteLength = nodeRoute.length;
            bestMatch = { path: nextPath, remaining };
          }
        }
      }

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          traverse(child, nextPath);
          if (longestRouteLength === Number.MAX_SAFE_INTEGER) return;
        }
      }
    };

    for (const item of items) {
      traverse(item, []);
      if (longestRouteLength === Number.MAX_SAFE_INTEGER) break;
    }

    return bestMatch;
  }

  /**
   * Filter out raw IDs and extract clean action labels like 'Create' or 'Edit'
   */
  private extractActionSegment(remaining: string): string | null {
    if (!remaining) return null;
    const parts = remaining.split('/').filter(Boolean);
    if (parts.length === 0) return null;

    // Check if the remaining part is 'create'
    if (parts[0].toLowerCase() === 'create') {
      return 'Create';
    }

    // Check if parts has 'edit'
    if (parts[0].toLowerCase() === 'edit') {
      return 'Edit';
    }

    // Check if parts has 'details'
    if (parts[0].toLowerCase() === 'details') {
      return 'Details';
    }

    // Check if parts has 'preview'
    if (parts[0].toLowerCase() === 'preview') {
      return 'Preview';
    }

    // If it's a numeric ID or UUID/hash, do not add raw IDs to the breadcrumb per rule 8
    return null;
  }

  private formatSegmentLabel(segment: string): string {
    return segment
      .split(/[-_]/)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }
}
