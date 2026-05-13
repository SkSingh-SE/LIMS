import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MenuService } from '../../../services/menu.service';
import { ToastService } from '../../../services/toast.service';

interface FlatNode {
  id: number;
  title: string;
  icon: string | null;
  route: string | null;
  depth: number;
  hasChildren: boolean;
  parentId: number | null;
  expanded: boolean;
  visible: boolean;
}

@Component({
  selector: 'app-menu-management-list',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './menu-management-list.component.html',
  styleUrl: './menu-management-list.component.css',
})
export class MenuManagementListComponent implements OnInit {
  flatNodes: FlatNode[] = [];
  searchTerm = '';
  private allNodes: FlatNode[] = [];

  constructor(private menuService: MenuService, private toastService: ToastService) {}

  ngOnInit(): void {
    this.loadTree();
  }

  loadTree(): void {
    this.menuService.getMenuTree().subscribe({
      next: (tree) => {
        this.allNodes = this.flattenTree(tree, 0);
        this.applySearch();
      },
      error: () => this.toastService.show('Failed to load menus.', 'error'),
    });
  }

  private flattenTree(nodes: any[], depth: number): FlatNode[] {
    const result: FlatNode[] = [];
    for (const node of nodes) {
      const hasChildren = node.subMenu?.length > 0;
      const flat: FlatNode = {
        id: node.id,
        title: node.title,
        icon: node.icon ?? null,
        route: node.route ?? null,
        depth,
        hasChildren,
        parentId: node.parentID ?? null,
        expanded: depth === 0,
        visible: depth === 0,
      };
      result.push(flat);
      if (hasChildren) {
        result.push(...this.flattenTree(node.subMenu, depth + 1));
      }
    }
    return result;
  }

  private updateVisibility(): void {
    const expandedIds = new Set<number>();
    for (const node of this.flatNodes) {
      if (node.depth === 0) {
        node.visible = true;
        if (node.expanded) expandedIds.add(node.id);
      } else {
        node.visible = node.parentId !== null && expandedIds.has(node.parentId);
        if (node.visible && node.expanded) expandedIds.add(node.id);
      }
    }
  }

  toggle(node: FlatNode): void {
    node.expanded = !node.expanded;
    this.updateVisibility();
  }

  expandAll(): void {
    this.flatNodes.forEach((n) => (n.expanded = true));
    this.updateVisibility();
  }

  collapseAll(): void {
    this.flatNodes.forEach((n) => (n.expanded = false));
    this.updateVisibility();
  }

  onSearch(): void {
    this.applySearch();
  }

  private applySearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.flatNodes = this.allNodes.map((n) => ({ ...n }));
      // restore default visibility (only roots expanded)
      this.flatNodes.forEach((n) => {
        n.expanded = n.depth === 0;
        n.visible = n.depth === 0;
      });
      this.updateVisibility();
      return;
    }

    // Mark matched nodes and their ancestors as visible
    const matchedIds = new Set<number>();
    const ancestorIds = new Set<number>();

    // first pass: find all matches
    for (const node of this.allNodes) {
      if (node.title.toLowerCase().includes(term) || (node.route ?? '').toLowerCase().includes(term)) {
        matchedIds.add(node.id);
      }
    }

    // second pass: find all ancestors of matches
    const buildAncestors = (parentId: number | null) => {
      if (parentId === null) return;
      const parent = this.allNodes.find((n) => n.id === parentId);
      if (parent && !ancestorIds.has(parent.id)) {
        ancestorIds.add(parent.id);
        buildAncestors(parent.parentId);
      }
    };

    for (const node of this.allNodes) {
      if (matchedIds.has(node.id)) buildAncestors(node.parentId);
    }

    this.flatNodes = this.allNodes
      .filter((n) => matchedIds.has(n.id) || ancestorIds.has(n.id))
      .map((n) => ({ ...n, expanded: true, visible: true }));
  }

  depthPadding(depth: number): string {
    return `${depth * 1.4 + 0.5}rem`;
  }

  depthBadgeClass(depth: number): string {
    const classes = ['bg-primary', 'bg-success', 'bg-warning text-dark', 'bg-secondary'];
    return classes[depth] ?? 'bg-secondary';
  }

  depthLabel(depth: number): string {
    return `L${depth}`;
  }
}
