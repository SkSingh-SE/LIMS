import { CommonModule } from '@angular/common';
import { AfterViewInit, AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, Renderer2, ViewChild, ViewChildren, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { UserService } from '../../services/user.service';
import { getAllMenuItems, MenuItem } from '../../models/MenuItem';
import { PermissionService } from '../../utility/permission/permission.service';

export interface FlatMenuItem {
  title: string;
  route: string;
  breadcrumb: string;
}

/*
  Unified MenuItem structure to match API payload:
  {
    id: number,
    title: string,
    route: string,
    parentMenuID: number | null,
    children: MenuItem[],
    permissions: string[]
  }
*/
// interface MenuItem {
//   id: number;
//   title: string;
//   route: string;
//   parentMenuID: number | null;
//   children: MenuItem[];
//   permissions: string[];
//   icon?: string; // optional for UI
//   color?: string; // optional helper for display
// }

@Component({
  selector: 'app-navbar',

  imports: [CommonModule, RouterModule, NotificationBellComponent, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {

  @ViewChild('navbar', { static: false }) navbar!: ElementRef;
  @ViewChild('menuContainer', { static: false }) menuContainer!: ElementRef;
  @ViewChild('navRight', { static: false }) navRight!: ElementRef;
  @ViewChildren('menuItem', { read: ElementRef }) menuItemEls!: QueryList<ElementRef>;
  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('menu2Scroll') menu2Scroll!: ElementRef;

  navbarHeight: number = 64;
  private distributeScheduled = false;
  private resizeObserver: ResizeObserver | null = null;

  // Search properties
  searchQuery = '';
  searchResults: FlatMenuItem[] = [];
  isSearchOpen = signal(false);
  isSearchExpanded = signal(false);
  allFlatMenuItems: FlatMenuItem[] = [];

  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private userService: UserService,
    private permissionService: PermissionService,
    private router: Router
  ) {
    this.allFlatMenuItems = this.flattenMenuItems(this.menuItems);
  }

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    if (userData && userData.employeeId) {
      this.getUserMenu(userData.employeeId);
    }
  }

  ngAfterViewInit() {
    this.updateNavbarHeight();

    this.menuItemEls.changes.subscribe(() => {
      this.distributeMenuItems();
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.distributeMenuItems();
    });

    this.resizeObserver.observe(this.menuContainer.nativeElement);
  }


  ngAfterViewChecked() {
    this.updateNavbarHeight();
  }

  updateNavbarHeight() {
    requestAnimationFrame(() => {
      if (this.navbar?.nativeElement) {
        this.navbarHeight = this.navbar.nativeElement.offsetHeight;
        document.documentElement.style.setProperty('--nav-height', `${this.navbarHeight + 5}px`);
        this.cdr.detectChanges();
      }
    });
  }


  // Menu handling signals
  menuItems: MenuItem[] = getAllMenuItems();
  visibleMenuItems: MenuItem[] = [...this.menuItems];
  menu2Items: MenuItem[] = [];
  subMenus = signal<MenuItem[]>([]);
  isSubMenuOpen = signal(false);
  activeMenu = signal<string | null>(null);
  activeSubmenu = signal<string | null>(null);
  isMenu2Open = signal(false);

  // Hover-driven dropdown state
  hoveredSubmenuId = signal<number | null>(null);
  hoveredGroupId   = signal<number | null>(null);
  private submenuTimer: ReturnType<typeof setTimeout> | null = null;
  private groupTimer:   ReturnType<typeof setTimeout> | null = null;

  // Click-driven active state for L3 / L4 items
  activeNestedItemId = signal<number | null>(null);
  activeDeepItemId   = signal<number | null>(null);

  notifications = [
    { userImg: 'user-avatar.png', userName: 'John Doe', message: 'Sent you a message', time: '5 mins ago' },
    { userImg: 'user-avatar.png', userName: 'Alice Smith', message: 'Commented on your post', time: '10 mins ago' }
  ];

  // -----------------------------
  // Permissions Integration
  // -----------------------------
  private collectPermissionsFromApi(apiMenus: MenuItem[]): string[] {
    const perms: string[] = [];
    const walk = (items: MenuItem[]) => {
      items.forEach(i => {
        if (i.permissions && i.permissions.length) perms.push(...i.permissions);
        if (i.children && i.children.length) walk(i.children);
      });
    };
    walk(apiMenus);
    return Array.from(new Set(perms));
  }

  private applyPermissionFilter(localMenus: MenuItem[]): MenuItem[] {
    const filterRecursively = (items: MenuItem[]): MenuItem[] => {
      return items.reduce<MenuItem[]>((acc, item) => {
        const copy: MenuItem = { ...item, children: [] };
        if (item.children?.length) copy.children = filterRecursively(item.children);

        const show = (item.permissions?.length ? this.permissionService.hasAny(item.permissions) : true)
          || (copy.children && copy.children.length > 0);

        if (show) {
          acc.push(copy);
        } else {

        }
        return acc;
      }, []);
    };
    const result = filterRecursively(localMenus);

    return result;
  }

  // -----------------------------
  // Menu fetch and filtering
  // -----------------------------
  getUserMenu(id: number) {
    this.userService.getUserMenuWithPermissions(id).subscribe({
      next: (res: MenuItem[]) => {
        try {

          // 1. Set global permissions
          const perms = this.collectPermissionsFromApi(res || []);
          this.permissionService.setPermissions(perms);

          // 2. Filter hardcoded menu by API response

          const filtered = this.filterMenusByApi(res || []);

          // commented for development
          // const afterPermFilter = this.applyPermissionFilter(filtered);
          // this.menuItems = afterPermFilter;

          // 3. Update visible/overflow
          this.visibleMenuItems = [...this.menuItems];
          this.menu2Items = [];
          this.allFlatMenuItems = this.flattenMenuItems(this.menuItems);
          setTimeout(() => this.distributeMenuItems(), 50);

          // 4. Set active menu
          if (!this.activeMenu() && this.menuItems.length > 0) this.activeMenu.set(this.menuItems[0].title);

          this.updateNavbarHeight();
          this.cdr.detectChanges();
        } catch (e) {
          console.error('Error processing user menu', e);
        }
      },
      error: (err) => console.error('Error fetching user menu:', err)
    });
  }

  private findApiItemByTitle(apiList: MenuItem[], title: string): MenuItem | undefined {
    const t = title.trim().toLowerCase();
    return apiList.find(a => (a.title || '').trim().toLowerCase() === t);
  }

  private filterMenusByApi(apiMenus: MenuItem[]): MenuItem[] {
    if (!apiMenus || apiMenus.length === 0) {
      return [];
    }

    const filtered: MenuItem[] = [];
    for (const hard of this.menuItems) {
      const matchTop = this.findApiItemByTitle(apiMenus, hard.title);
      if (!matchTop) {
        continue;
      }

      const filteredChildren: MenuItem[] = [];
      for (const child of hard.children || []) {
        const apiChild = matchTop.children?.find(c => (c.title || '').trim().toLowerCase() === child.title.trim().toLowerCase());
        if (apiChild && ((apiChild.permissions && apiChild.permissions.length > 0) || (apiChild.children && apiChild.children.length > 0))) {
          filteredChildren.push({ ...child, permissions: apiChild.permissions || [], children: apiChild.children || [] });
        }
      }
      if ((hard.route && hard.route.length) || filteredChildren.length > 0) {
        filtered.push({ ...hard, children: filteredChildren });
      } else {

      }
    }

    return filtered;
  }

  // -----------------------------
  // Menu distribution & resize
  // -----------------------------
  private distributeMenuItems() {
    if (!this.menuContainer || !this.menuItemEls) return;

    requestAnimationFrame(() => {
      const parentWidth = this.menuContainer.nativeElement.parentElement?.getBoundingClientRect().width || 0;
      const rightWidth = this.navRight?.nativeElement?.getBoundingClientRect().width || 0;
      const availableWidth = parentWidth - rightWidth - 24;

      const menuEls = this.menuItemEls.toArray();

      let usedWidth = 0;
      const visible: MenuItem[] = [];
      const overflow: MenuItem[] = [];

      this.menuItems.forEach((item, index) => {
        const el = menuEls[index]?.nativeElement;
        const width = el
          ? el.getBoundingClientRect().width
          : Math.max(100, item.title.length * 10 + 40);

        if (usedWidth + width <= availableWidth || visible.length === 0) {
          visible.push(item);
          usedWidth += width;
        } else {
          overflow.push(item);
        }
      });

      // CRITICAL: Ensure no items are dropped
      const totalAssigned = visible.length + overflow.length;
      if (totalAssigned < this.menuItems.length) {
        // Force all remaining items to overflow
        const missingItems = this.menuItems.slice(totalAssigned);
        overflow.push(...missingItems);
      }

      this.visibleMenuItems = visible;
      this.menu2Items = overflow;

      if (this.menu2Items.length === 0) {
        this.isMenu2Open.set(false);
      }

      this.cdr.markForCheck();
    });
  }


  @HostListener('window:resize')
  onResize() {
    this.distributeMenuItems();
  }

  // -----------------------------
  // Submenu and menu actions
  // -----------------------------
  openSubMenu(menu: MenuItem) {
    if (menu?.children?.length) {
      this.subMenus.set(menu.children);
      this.isSubMenuOpen.set(true);
    } else {
      this.subMenus.set([]);
      this.isSubMenuOpen.set(false);
    }
    this.activeMenu.set(menu.title);
    setTimeout(() => this.updateNavbarHeight(), 300);
  }

  closeSubMenu() {
    this.isSubMenuOpen.set(false);
    setTimeout(() => this.updateNavbarHeight(), 300);
  }

  setActiveSubMenu(submenu: MenuItem) {
    this.activeSubmenu.set(submenu.title);
    this.isMenu2Open.set(false);
  }

  setActiveNestedItem(item: MenuItem) {
    this.activeNestedItemId.set(item.id);
    this.activeDeepItemId.set(null);
  }

  setActiveDeepItem(item: MenuItem, groupId: number) {
    this.activeDeepItemId.set(item.id);
    this.activeNestedItemId.set(groupId); // highlight the parent group too
  }

  // ── Hover dropdown handlers ──────────────────────────────
  onSubmenuEnter(id: number) {
    if (this.submenuTimer) { clearTimeout(this.submenuTimer); this.submenuTimer = null; }
    this.hoveredSubmenuId.set(id);
  }

  onSubmenuLeave() {
    this.submenuTimer = setTimeout(() => { this.hoveredSubmenuId.set(null); this.hoveredGroupId.set(null); }, 150);
  }

  onDropdownEnter(id: number) {
    if (this.submenuTimer) { clearTimeout(this.submenuTimer); this.submenuTimer = null; }
    this.hoveredSubmenuId.set(id);
  }

  onDropdownLeave() {
    this.submenuTimer = setTimeout(() => { this.hoveredSubmenuId.set(null); this.hoveredGroupId.set(null); }, 150);
  }

  onGroupEnter(id: number) {
    if (this.groupTimer)   { clearTimeout(this.groupTimer);   this.groupTimer   = null; }
    if (this.submenuTimer) { clearTimeout(this.submenuTimer); this.submenuTimer = null; }
    this.hoveredGroupId.set(id);
  }

  onGroupLeave() {
    this.groupTimer = setTimeout(() => { this.hoveredGroupId.set(null); }, 150);
  }

  menuOpenClose() {
    this.isMenu2Open.set(!this.isMenu2Open());
    setTimeout(() => this.updateNavbarHeight(), 300);
  }

  logout() {
    this.authService.logout();
  }

  // ── Search methods ──────────────────────────────────────
  flattenMenuItems(items: MenuItem[], breadcrumb: string = ''): FlatMenuItem[] {
    const result: FlatMenuItem[] = [];
    for (const item of items) {
      const crumb = breadcrumb ? `${breadcrumb} > ${item.title}` : item.title;
      if (item.route) {
        result.push({ title: item.title, route: item.route, breadcrumb: crumb });
      }
      if (item.children?.length) {
        result.push(...this.flattenMenuItems(item.children, crumb));
      }
    }
    return result;
  }

  toggleSearch() {
    if (this.isSearchExpanded()) {
      this.collapseSearch();
    } else {
      this.isSearchExpanded.set(true);
      this.isSearchOpen.set(true);
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 150);
    }
  }

  collapseSearch() {
    this.isSearchExpanded.set(false);
    this.isSearchOpen.set(false);
    this.searchQuery = '';
    this.searchResults = [];
  }

  onSearchInput() {
    const q = this.searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      this.searchResults = [];
      this.isSearchOpen.set(false);
      return;
    }
    this.searchResults = this.allFlatMenuItems.filter(
      (m) => m.title.toLowerCase().includes(q) || m.breadcrumb.toLowerCase().includes(q)
    );
    this.isSearchOpen.set(this.searchResults.length > 0);
  }

  navigateToSearch(item: FlatMenuItem) {
    this.router.navigate([item.route]);
    this.collapseSearch();
  }

  closeSearch() {
    setTimeout(() => this.collapseSearch(), 200);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      this.toggleSearch();
    }
    if (event.key === 'Escape') {
      this.collapseSearch();
    }
  }

  scrollMenu2(direction: 'left' | 'right') {
    const el = this.menu2Scroll?.nativeElement;
    if (el) {
      const scrollAmount = 200;
      el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) { this.resizeObserver.disconnect(); }
    if (this.submenuTimer)   { clearTimeout(this.submenuTimer); }
    if (this.groupTimer)     { clearTimeout(this.groupTimer); }
  }
}
