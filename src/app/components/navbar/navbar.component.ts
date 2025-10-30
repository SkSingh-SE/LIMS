import { CommonModule } from '@angular/common';
import { AfterViewInit, AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, Renderer2, ViewChild, ViewChildren, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { UserService } from '../../services/user.service';
import { getAllMenuItems, MenuItem } from '../../models/MenuItem';
import { PermissionService } from '../../utility/permission/permission.service';

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
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {

  @ViewChild('navbar', { static: false }) navbar!: ElementRef;
  @ViewChild('menuContainer', { static: false }) menuContainer!: ElementRef;
  @ViewChild('navRight', { static: false }) navRight!: ElementRef;
  @ViewChildren('menuItem', { read: ElementRef }) menuItemEls!: QueryList<ElementRef>;

  navbarHeight: number = 64;
  private distributeScheduled = false;
  private resizeObserver: ResizeObserver | null = null;
  
  constructor(
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private userService: UserService,
    private permissionService: PermissionService
  ) { }

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    if (userData && userData.employeeId) {
      this.getUserMenu(userData.employeeId);
    }
  }

  ngAfterViewInit() {
    this.updateNavbarHeight();
    setTimeout(() => this.distributeMenuItems(), 50);
    this.menuItemEls.changes.subscribe(() => setTimeout(() => this.distributeMenuItems(), 25));

    // Add ResizeObserver back
    if (this.menuContainer?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => this.distributeMenuItems());
      this.resizeObserver.observe(this.menuContainer.nativeElement);
    }
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

        if (show) acc.push(copy);
        return acc;
      }, []);
    };
    return filterRecursively(localMenus);
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
          this.menuItems = this.applyPermissionFilter(filtered);

          // 3. Update visible/overflow
          this.visibleMenuItems = [...this.menuItems];
          this.menu2Items = [];
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
    if (!apiMenus || apiMenus.length === 0) return [];

    const filtered: MenuItem[] = [];
    for (const hard of this.menuItems) {
      const matchTop = this.findApiItemByTitle(apiMenus, hard.title);
      if (!matchTop) continue;

      const filteredChildren: MenuItem[] = [];
      for (const child of hard.children || []) {
        const apiChild = matchTop.children?.find(c => (c.title || '').trim().toLowerCase() === child.title.trim().toLowerCase());
        if (apiChild && ((apiChild.permissions && apiChild.permissions.length > 0) || (apiChild.children && apiChild.children.length > 0))) {
          filteredChildren.push({ ...child, permissions: apiChild.permissions || [], children: apiChild.children || [] });
        }
      }
      if ((hard.route && hard.route.length) || filteredChildren.length > 0) filtered.push({ ...hard, children: filteredChildren });
    }
    return filtered;
  }

  // -----------------------------
  // Menu distribution & resize
  // -----------------------------
  private distributeMenuItems() {
    if (this.distributeScheduled) return;
    this.distributeScheduled = true;
    setTimeout(() => {
      this.distributeScheduled = false;
      try {
        if (!this.menuContainer || !this.menuItemEls) return;

        const containerWidth = (this.menuContainer.nativeElement as HTMLElement).clientWidth;
        const rightWidth = this.navRight?.nativeElement?.offsetWidth || 0;
        const buffer = 24;
        const available = Math.max(80, containerWidth - rightWidth - buffer);

        const menuEls = this.menuItemEls.toArray();
        const visible: MenuItem[] = [];
        const overflow: MenuItem[] = [];
        let used = 0;

        for (let i = 0; i < this.menuItems.length; i++) {
          const item = this.menuItems[i];
          const elRef = menuEls[i];
          const w = elRef?.nativeElement?.getBoundingClientRect().width || Math.min(220, Math.max(80, item.title.length * 10 + 40));

          if (used + w <= available || visible.length === 0) {
            visible.push(item);
            used += w;
          } else {
            overflow.push(item);
          }
        }

        this.visibleMenuItems = visible;
        this.menu2Items = overflow;
        if (!this.isMenu2Open() && this.menu2Items.length === 0) this.isMenu2Open.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.updateNavbarHeight(), 20);
      } catch (e) {
        console.error('distributeMenuItems error', e);
      }
    }, 25);
  }

  @HostListener('window:resize')
  onResize() {
    this.distributeMenuItems();
    this.updateNavbarHeight();
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

  menuOpenClose() {
    this.isMenu2Open.set(!this.isMenu2Open());
    setTimeout(() => this.updateNavbarHeight(), 300);
  }

  logout() {
    this.authService.logout();
  }
  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
