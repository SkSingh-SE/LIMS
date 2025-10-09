import { CommonModule } from '@angular/common';
import { AfterViewInit, AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, QueryList, Renderer2, ViewChild, ViewChildren, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationBellComponent } from './notification-bell/notification-bell.component';
import { UserService } from '../../services/user.service';

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
interface MenuItem {
  id: number;
  title: string;
  route: string;
  parentMenuID: number | null;
  children: MenuItem[];
  permissions: string[];
  icon?: string; // optional for UI
  color?: string; // optional helper for display
}

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
  private resizeObserver!: ResizeObserver;
  private distributeScheduled = false;

  constructor(private renderer: Renderer2, private cdr: ChangeDetectorRef, private authService: AuthService, private userService: UserService) {}

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    if (userData && userData.employeeId) {
      this.getUserMenu(userData.employeeId);
    }
  }

  ngAfterViewInit() {
    this.updateNavbarHeight();
    // schedule an initial distribution after view is ready
    setTimeout(() => this.distributeMenuItems(), 50);

    // when menu item elements change, recompute
    this.menuItemEls.changes.subscribe(() => {
      // slight delay to ensure layout stabilized
      setTimeout(() => this.distributeMenuItems(), 25);
    });
  }

  ngAfterViewChecked() {
    // ensure navbar height kept updated after changes
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

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  // Helper to generate colors
  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Hardcoded menu structure adapted to API-like MenuItem shape.
  // Titles should match incoming API payload so filtering can work by title.
  menuItems: MenuItem[] = [
    {
      id: 1,
      title: 'Administration',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-people',
      color: '',
      children: [
        { id: 11, title: 'Department Master', route: '/department', parentMenuID: 1, permissions: ['CanReadDepartment'], children: [], color: this.getRandomColor() },
        { id: 12, title: 'Employee Master', route: '/employee', parentMenuID: 1, permissions: ['CanReadEmployee'], children: [], color: this.getRandomColor() },
        { id: 13, title: 'Designation Master', route: '/designation', parentMenuID: 1, permissions: ['CanReadDesignation'], children: [], color: this.getRandomColor() },
        { id: 14, title: 'Tax Master', route: '/tax', parentMenuID: 1, permissions: ['CanReadTax'], children: [], color: this.getRandomColor() },
        { id: 15, title: 'Bank Master', route: '/bank', parentMenuID: 1, permissions: ['CanReadBank'], children: [], color: this.getRandomColor() },
        { id: 16, title: 'Courier Master', route: '/courier', parentMenuID: 1, permissions: ['CanReadCourier'], children: [], color: this.getRandomColor() },
        { id: 17, title: 'TPI Master', route: '/tpi', parentMenuID: 1, permissions: ['CanReadTPI'], children: [], color: this.getRandomColor() },
        { id: 18, title: 'Supplier Master', route: '/supplier', parentMenuID: 1, permissions: ['CanReadSupplier'], children: [], color: this.getRandomColor() },
        { id: 19, title: 'Equipment', route: '/equipment', parentMenuID: 1, permissions: ['CanReadEquipment'], children: [], color: this.getRandomColor() },
        { id: 20, title: 'OEM Master', route: '/oem', parentMenuID: 1, permissions: ['CanReadOEM'], children: [], color: this.getRandomColor() },
        { id: 21, title: 'Calibration Agency', route: '/calibration-agency', parentMenuID: 1, permissions: ['CanReadCalibrationAgency'], children: [], color: this.getRandomColor() }
      ]
    },
    {
      id: 2,
      title: 'Specification',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-box',
      color: '',
      children: [
        { id: 22, title: 'Dimensional Factors Master', route: '/dimesional-factor', parentMenuID: 2, permissions: ['CanReadDimensionalFactors'], children: [], color: this.getRandomColor() },
        { id: 23, title: 'Heat Treatment Master', route: '/heat-treatment', parentMenuID: 2, permissions: ['CanReadHeatTreatment'], children: [], color: this.getRandomColor() },
        { id: 24, title: 'Chemical Parameter Master', route: '/chemical-parameter', parentMenuID: 2, permissions: ['CanReadChemicalParameter'], children: [], color: this.getRandomColor() },
        { id: 25, title: 'Mechanical Parameter Master', route: '/mechanical-parameter', parentMenuID: 2, permissions: ['CanReadMechanicalParameter'], children: [], color: this.getRandomColor() },
        { id: 26, title: 'Product Condition Master', route: '/product-condition', parentMenuID: 2, permissions: ['CanReadProductCondition'], children: [], color: this.getRandomColor() },
        { id: 27, title: 'Specimen Orientation Master', route: '/specimen-orientation', parentMenuID: 2, permissions: ['CanReadSpecimenOrientation'], children: [], color: this.getRandomColor() },
        { id: 28, title: 'Standard Organization Master', route: '/standard-organization', parentMenuID: 2, permissions: ['CanReadStandardOrganization'], children: [], color: this.getRandomColor() },
        { id: 29, title: 'Universal Code Type Master', route: '/universal-code-type', parentMenuID: 2, permissions: ['CanReadUniversalCode'], children: [], color: this.getRandomColor() },
        { id: 30, title: 'Metal Classification', route: '/metal-classification', parentMenuID: 2, permissions: ['CanReadMetalClassification'], children: [], color: this.getRandomColor() },
        { id: 31, title: 'Material Specification', route: '/material-specification', parentMenuID: 2, permissions: ['CanReadMaterialSpecification'], children: [], color: this.getRandomColor() },
        { id: 32, title: 'Custom Material Specification', route: '/custom-material-specification', parentMenuID: 2, permissions: ['CanReadCustomMaterialSpecification'], children: [], color: this.getRandomColor() },
        { id: 33, title: 'Product Specification', route: '/product-specification', parentMenuID: 2, permissions: ['CanReadProductSpecification'], children: [], color: this.getRandomColor() },
        { id: 34, title: 'Custom Product Specification', route: '/custom-product-specification', parentMenuID: 2, permissions: ['CanReadCustomProductSpecification'], children: [], color: this.getRandomColor() }
      ]
    },
    {
      id: 3,
      title: 'Test',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-file-earmark',
      color: '',
      children: [
        { id: 35, title: 'Laboratory Test', route: '/test', parentMenuID: 3, permissions: ['CanReadLaboratoryTest'], children: [], color: this.getRandomColor() },
        { id: 36, title: 'Test Method Specification', route: '/test-specification', parentMenuID: 3, permissions: ['CanReadTestMethodSpecification'], children: [], color: this.getRandomColor() },
        { id: 37, title: 'Invoice Case', route: '/invoice-case', parentMenuID: 3, permissions: ['CanReadInvoiceCase'], children: [], color: this.getRandomColor() }
      ]
    },
    {
      id: 4,
      title: 'Customer',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-people',
      color: '',
      children: [
        { id: 38, title: 'Company Category', route: '/company-category', parentMenuID: 4, permissions: ['CanReadCompanyCategory'], children: [], color: this.getRandomColor() },
        { id: 39, title: 'Customer Master', route: '/customer', parentMenuID: 4, permissions: ['CanReadCustomerMaster'], children: [], color: this.getRandomColor() }
      ]
    },
    {
      id: 5,
      title: 'Sample',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-layout-text-sidebar',
      color: '',
      children: [
        { id: 40, title: 'Inward', route: '/sample/inward', parentMenuID: 5, permissions: ['CanReadInward'], children: [], color: this.getRandomColor() },
        { id: 41, title: 'Plan', route: '/sample/plan', parentMenuID: 5, permissions: ['CanReadPlan'], children: [], color: this.getRandomColor() },
        { id: 42, title: 'Review', route: '/sample/review', parentMenuID: 5, permissions: ['CanReadReview'], children: [], color: this.getRandomColor() },
        { id: 43, title: 'Preparation', route: '/sample/preparation', parentMenuID: 5, permissions: ['CanReadPreparation'], children: [], color: this.getRandomColor() },
        { id: 44, title: 'Cutting Price Master', route: '/cutting-price-master', parentMenuID: 5, permissions: ['CanReadCuttingPrice'], children: [], color: this.getRandomColor() },
        { id: 45, title: 'Sample Cutting', route: '/sample/cutting', parentMenuID: 5, permissions: ['CanReadSampleCutting'], children: [], color: this.getRandomColor() },
        { id: 46, title: 'Machining Challan', route: '/sample/machining', parentMenuID: 5, permissions: ['CanReadMachiningChallan'], children: [], color: this.getRandomColor() }
      ]
    },
    {
      id: 6,
      title: 'Invoice',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-receipt-cutoff',
      color: '',
      children: [
        { id: 47, title: 'Invoice Case Config', route: '/invoice-case-config', parentMenuID: 6, permissions: ['CanReadInvoiceCaseConfig'], children: [], color: this.getRandomColor() },
        { id: 48, title: 'Invoice Case', route: '/invoice-case', parentMenuID: 6, permissions: ['CanReadInvoiceCase'], children: [], color: this.getRandomColor() }
      ]
    },
    {
      id: 7,
      title: 'NABL ISO 17025',
      route: '/iso-17025',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-shield-check',
      color: '',
      children: [
        { id: 49, title: 'Lab Scope Master', route: '/scope', parentMenuID: 7, permissions: ['CanReadLabScopeMaster'], children: [], color: this.getRandomColor() }
      ]
    },
    {
      id: 8,
      title: 'User Management',
      route: '',
      parentMenuID: null,
      permissions: [],
      icon: 'bi-person-fill-gear',
      color: '',
      children: [
        { id: 50, title: 'Lab Employee Master', route: '/nabl/lab-employee', parentMenuID: 8, permissions: ['CanReadLabEmployeeMaster'], children: [], color: this.getRandomColor() },
        { id: 51, title: 'Lab Score Master', route: '/nabl/lab-score', parentMenuID: 8, permissions: ['CanReadLabScore'], children: [], color: this.getRandomColor() },
        { id: 52, title: 'Quality Control Plan', route: '/nabl/quality-control', parentMenuID: 8, permissions: ['CanReadQualityControlPlan'], children: [], color: this.getRandomColor() },
        {
          id: 53,
          title: 'Customer Feedback',
          route: '/nabl/customer-feedback',
          parentMenuID: 8,
          permissions: ['CanReadCustomerFeedback'],
          color: this.getRandomColor(),
          children: [
            { id: 54, title: 'CF - Lab Employee', route: '/nabl/lab-employee', parentMenuID: 53, permissions: ['CanReadLabEmployeeMaster'], children: [], color: this.getRandomColor() }
          ]
        }
      ]
    }
  ];

  // Primary row visible items (updated by distribution)
  visibleMenuItems: MenuItem[] = [...this.menuItems];

  // overflow (menu2) items
  menu2Items: MenuItem[] = [];

  // Use unified MenuItem for submenu signal
  subMenus = signal<MenuItem[]>([]);
  isSubMenuOpen = signal(false);
  activeMenu = signal<string | null>(null);
  activeSubmenu = signal<string | null>(null);
  isMenu2Open = signal(false);

  notifications = [
    { userImg: 'user-avatar.png', userName: 'John Doe', message: 'Sent you a message', time: '5 mins ago' },
    { userImg: 'user-avatar.png', userName: 'Alice Smith', message: 'Commented on your post', time: '10 mins ago' }
  ];

  // Utility: case-insensitive match by title
  private findApiItemByTitle(apiList: MenuItem[], title: string): MenuItem | undefined {
    const t = title.trim().toLowerCase();
    return apiList.find(a => (a.title || '').trim().toLowerCase() === t);
  }

  // Filter hardcoded menus by API response
  private filterMenusByApi(apiMenus: MenuItem[]): MenuItem[] {
    if (!apiMenus || apiMenus.length === 0) return [];

    const apiTopList = apiMenus;
    const filtered: MenuItem[] = [];

    for (const hard of this.menuItems) {
      const matchTop = this.findApiItemByTitle(apiTopList, hard.title);
      if (!matchTop) continue; // top-level not permitted by API

      // Build filtered children
      const filteredChildren: MenuItem[] = [];
      for (const child of hard.children || []) {
        const apiChild = matchTop.children?.find(c => (c.title||'').trim().toLowerCase() === child.title.trim().toLowerCase());
        // Keep child only if apiChild exists AND has permissions or further children
        if (apiChild && ((apiChild.permissions && apiChild.permissions.length > 0) || (apiChild.children && apiChild.children.length > 0))) {
          // Optionally merge permissions/color from apiChild
          const merged: MenuItem = { ...child, permissions: apiChild.permissions || [], children: apiChild.children || [] };
          filteredChildren.push(merged);
        }
      }

      // If route exists or filtered children exist -> include
      if ((hard.route && hard.route.length > 0) || filteredChildren.length > 0) {
        const included: MenuItem = { ...hard, children: filteredChildren };
        filtered.push(included);
      }
    }
    return filtered;
  }

  // Distribute items between primary row (visibleMenuItems) and overflow (menu2Items)
  private distributeMenuItems() {
    if (this.distributeScheduled) return;
    this.distributeScheduled = true;
    setTimeout(() => {
      this.distributeScheduled = false;
      try {
        // Ensure we have DOM refs
        if (!this.menuContainer || !this.menuItemEls) {
          return;
        }
        const containerEl = this.menuContainer.nativeElement as HTMLElement;
        const containerWidth = containerEl.clientWidth || containerEl.getBoundingClientRect().width || 0;

        // subtract right-side width (avatar + arrow) to get available width for menu items
        const rightWidth = this.navRight?.nativeElement ? (this.navRight.nativeElement as HTMLElement).getBoundingClientRect().width : 0;
        // some buffer for gaps/margins
        const buffer = 24;
        const available = Math.max(80, containerWidth - rightWidth - buffer);

        const menuEls = this.menuItemEls.toArray();
        const visible: MenuItem[] = [];
        const overflow: MenuItem[] = [];

        let used = 0;
        // Use this.menuItems ordering (full list) to map with elements; menuEls correspond to currently rendered visibleMenuItems,
        // but initial rendering shows all items; we guard by mapping index positions.
        for (let i = 0; i < this.menuItems.length; i++) {
          const item = this.menuItems[i];
          // try to get element width from rendered list, fallback to estimate
          const elRef = menuEls[i];
          let w = 0;
          if (elRef && elRef.nativeElement) {
            w = (elRef.nativeElement as HTMLElement).getBoundingClientRect().width;
          } else {
            // estimate width by measuring text length
            w = Math.min(220, Math.max(80, item.title.length * 10 + 40));
          }

          // if adding this item overshoots available, push to overflow
          if (used + w <= available || visible.length === 0) {
            visible.push(item);
            used += w;
          } else {
            overflow.push(item);
          }
        }

        // If overflow empty, ensure menu2 closed
        this.visibleMenuItems = visible;
        this.menu2Items = overflow;
        // If there is overflow, keep isMenu2Open false by default (user toggles)
        if (!this.isMenu2Open() && this.menu2Items.length === 0) {
          this.isMenu2Open.set(false);
        }

        this.cdr.detectChanges();
        // after DOM update, schedule a height update
        setTimeout(() => this.updateNavbarHeight(), 20);
      } catch (e) {
        console.error('distributeMenuItems error', e);
      }
    }, 25);
  }

  openSubMenu(menu: MenuItem) {
    if (menu && menu.children && menu.children.length > 0) {
      this.subMenus.set(menu.children);
      this.isSubMenuOpen.set(true);
    } else {
      this.subMenus.set([]);
      this.isSubMenuOpen.set(false);
    }
    this.activeMenu.set(menu.title);
    setTimeout(() => {
      this.updateNavbarHeight();
      this.cdr.detectChanges();
    }, 300);
  }

  closeSubMenu() {
    this.isSubMenuOpen.set(false);
    setTimeout(() => {
      this.updateNavbarHeight();
      this.cdr.detectChanges();
    }, 300);
  }

  setActiveSubMenu(submenu: MenuItem) {
    this.activeSubmenu.set(submenu.title);
    this.isMenu2Open.set(false);
  }

  menuOpenClose() {
    this.isMenu2Open.set(!this.isMenu2Open());
    setTimeout(() => {
      this.updateNavbarHeight();
      this.cdr.detectChanges();
    }, 300);
  }

  getUserMenu(id:number) {
    this.userService.getUserMenuWithPermissions(id).subscribe({
      next: (res: MenuItem[]) => {
        // res expected to match API MenuItem shape
        try {
          const filtered = this.filterMenusByApi(res || []);
          // update full list then re-distribute
          this.menuItems = filtered;
          // default visible = full list, distribution will move overflow into menu2Items
          this.visibleMenuItems = [...this.menuItems];
          this.menu2Items = [];
          // schedule distribution after render
          setTimeout(() => this.distributeMenuItems(), 50);
          if (!this.activeMenu() && this.menuItems.length > 0) {
            this.activeMenu.set(this.menuItems[0].title);
          }
          this.updateNavbarHeight();
          this.cdr.detectChanges();
        } catch (e) {
          console.error('Error filtering menus with API response', e);
        }
      },
      error: (err) => {
        console.error('Error fetching user menu with permissions:', err);
      }
    });
  }

  @HostListener('window:resize')
  onResize() {
    // recalculate distribution on resize
    this.distributeMenuItems();
    this.updateNavbarHeight();
  }

  logout() {
    this.authService.logout();
  }
}
