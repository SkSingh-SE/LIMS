import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, Renderer2, signal, ViewChild } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { ListDesignationComponent } from '../designation/list-designation/list-designation.component';
import { AuthService } from '../../services/auth.service';

interface SubMenuItem {
  title: string,
  route: string,
  color: string,
  submenu?: SubMenuItem[]
}
interface MenuItem {
  id: number
  title: string,
  icon: string,
  isExpanded: boolean,
  submenu: SubMenuItem[]
}

@Component({
  selector: 'app-navbar',
  imports: [CommonModule,RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('navbar', { static: false }) navbar!: ElementRef;
  navbarHeight: number = 64;
  private resizeObserver!: ResizeObserver;

  constructor(private renderer: Renderer2, private cdr: ChangeDetectorRef, private authService: AuthService) { }
  ngAfterViewInit() {
    this.updateNavbarHeight();
  }

  updateNavbarHeight() {
    requestAnimationFrame(() => {
      if (this.navbar?.nativeElement) {
        this.navbarHeight = this.navbar.nativeElement.offsetHeight;
        document.documentElement.style.setProperty('--nav-height', `${this.navbarHeight +5}px`);
        this.cdr.detectChanges(); // Ensure change detection applies updates
      }
    });
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  menuItems: MenuItem[] = [
    {
      id: 1,
      title: 'Administration',
      icon: 'bi-people',
      isExpanded: false,
      submenu: [
        { title: 'Department Master', route: '/department', color: this.getRandomColor() },
        { title: 'Employee Master', route: '/employee', color: this.getRandomColor() },
        { title: 'Designation Master', route: '/designation', color: this.getRandomColor() },
        { title: 'Tax Master', route: '/tax', color: this.getRandomColor() },
        { title: 'Bank Master', route: '/bank', color: this.getRandomColor() },
        { title: 'Courier Master', route: '/courier', color: this.getRandomColor() },
        { title: 'TPI Master', route: '/tpi', color: this.getRandomColor() },
        { title: 'Supplier Master', route: '/supplier', color: this.getRandomColor() },
        { title: 'Equipment', route: '/equipment', color: this.getRandomColor() },
        { title: 'OEM Master', route: '/oem', color: this.getRandomColor() },
        { title: 'Calibration Agency', route: '/calibration-agency', color: this.getRandomColor() },
      ]
    },
    {
      id: 2,
      title: 'Specification',
      icon: 'bi-box',
      isExpanded: false,
      submenu: [
        { title: 'Dimensional Factors Master', route: '/dimesional-factor', color: this.getRandomColor() },
        { title: 'Heat Treatment Master', route: '/heat-treatment', color: this.getRandomColor() },
        { title: 'Chemical Parameter Master', route: '/chemical-parameter', color: this.getRandomColor() },
        { title: 'Mechanical Parameter Master', route: '/mechanical-parameter', color: this.getRandomColor() },
        { title: 'Product Condition Master', route: '/product-condition', color: this.getRandomColor() },
        { title: 'Specimen Orientation Master', route: '/specimen-orientation', color: this.getRandomColor() },
        { title: 'Standard Organization Master', route: '/standard-organization', color: this.getRandomColor() },
        { title: 'Universal Code Type Master', route: '/universal-code-type', color: this.getRandomColor() },
        { title: 'Metal Classification', route: '/metal-classification', color: this.getRandomColor() },
        { title: 'Material Specification', route: '/material-specification', color: this.getRandomColor() },
        { title: 'Custom Material Specification', route: '/custom-material-specification', color: this.getRandomColor() },
        { title: 'Product Specification', route: '/product-specification', color: this.getRandomColor() },
        { title: 'Custom Product Specification', route: '/custom-product-specification', color: this.getRandomColor() },
      ]
    },
    {
      id: 3,
      title: 'Test',
      icon: 'bi-file-earmark',
      isExpanded: false,
      submenu: [
        { title: 'Laboratory Test', route: '/test', color: this.getRandomColor() },
        { title: 'Test Method Specification', route: '/test-specification', color: this.getRandomColor() },
        { title: 'Invoice Case', route: '/invoice-case', color: this.getRandomColor() },
      ]
    },
    {
      id: 4,
      title: 'Customer',
      icon: 'bi-people',
      isExpanded: false,
      submenu: [
        { title: 'Company Category', route: '/company-category', color: this.getRandomColor() },
        { title: 'Customer Master', route: '/customer', color: this.getRandomColor() }
      ]
    },
    {
      id: 5,
      title: 'Sample',
      icon: 'bi-layout-text-sidebar',
      isExpanded: false,
      submenu: [
        { title: 'Inward', route: '/sample/inward', color: this.getRandomColor() },
        { title: 'Plan', route: '/sample/plan', color: this.getRandomColor() },
        { title: 'Review', route: '/sample/review', color: this.getRandomColor() },
        { title: 'Preparation', route: '/sample/preparation', color: this.getRandomColor() },
        { title: 'Cutting Price Master', route: '/cutting-price-master', color: this.getRandomColor() },
        { title: 'Sample Cutting', route: '/sample/cutting', color: this.getRandomColor() },
        { title: 'Machining Challan', route: '/sample/machining', color: this.getRandomColor() },
      ]
    },
    {
      id: 6,
      title: 'Invoice',
      icon: 'bi-receipt-cutoff',
      isExpanded: false,
      submenu: [
        { title: 'Invoice Case Config', route: '/invoice-case-config', color: this.getRandomColor() },
        { title: 'Invoice Case', route: '/invoice-case', color: this.getRandomColor() },
      ]
    },
    {
      id: 7,
      title: 'NABL ISO 17025',
      icon: 'bi-shield-check',
      isExpanded: false,
      submenu: [
        { title: 'Lab Scope Master', route: '/scope', color: this.getRandomColor() },
      ]
    },
    {
      id: 8,
      title: 'User Management',
      icon: 'bi-person-fill-gear',
      isExpanded: false,
      submenu: [
        { title: 'Lab Employee Master', route: '/nabl/lab-employee', color: this.getRandomColor() },
        { title: 'Lab Score Master', route: '/nabl/lab-score', color: this.getRandomColor() },
        { title: 'Quality Control Plan', route: '/nabl/quality-control', color: this.getRandomColor() },
        {
          title: 'Customer Feedback', route: '/nabl/customer-feedback', color: this.getRandomColor(),
          submenu: [
            { title: 'Lab Employee Master', route: '/nabl/lab-employee', color: this.getRandomColor() },
            { title: 'Lab Score Master', route: '/nabl/lab-score', color: this.getRandomColor() },
            { title: 'Quality Control Plan', route: '/nabl/quality-control', color: this.getRandomColor() },
            { title: 'Customer Feedback', route: '/nabl/customer-feedback', color: this.getRandomColor() },
          ]
        },
      ]
    }
  ];
  menu2Items = this.menuItems;
  subMenus = signal<SubMenuItem[]>([]);
  isSubMenuOpen = signal(false);
  activeMenu = signal<string | null>(null);
  activeSubmenu = signal<string | null>(null);
  isMenu2Open = signal(false);
  notifications = [
    {
      userImg: 'user-avatar.png', // Replace with actual user image URL
      userName: 'John Doe',
      message: 'Sent you a message',
      time: '5 mins ago'
    },
    {
      userImg: 'user-avatar.png',
      userName: 'Alice Smith',
      message: 'Commented on your post',
      time: '10 mins ago'
    }
  ];


  getRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  openSubMenu(menu: MenuItem) {
    if (menu.submenu) {
      this.subMenus.set(menu.submenu);
      this.isSubMenuOpen.set(true);
    } else {
      this.isSubMenuOpen.set(false);
    }
    this.activeMenu.set(menu.title);
    console.log("active menu ", this.activeMenu());
    setTimeout(() => {
      this.updateNavbarHeight();
      this.cdr.detectChanges(); // Ensure Angular detects this change
    }, 300);
  }
  closeSubMenu(){
    this.isSubMenuOpen.set(false);
    setTimeout(() => {
      this.updateNavbarHeight();
      this.cdr.detectChanges(); // Ensure Angular detects this change
    }, 300);
  }

  setActiveSubMenu(submenu: SubMenuItem) {
    this.activeSubmenu.set(submenu.title);
    this.isMenu2Open.set(false);
  }
  menuOpenClose() {
    this.isMenu2Open.set(!this.isMenu2Open());
    console.log("menu2 open close ", this.isMenu2Open());
    setTimeout(() => {
      this.updateNavbarHeight();
      this.cdr.detectChanges(); // Ensure Angular detects this change
    }, 300);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateNavbarHeight();
  }
  logout(){
    this.authService.logout();
  }
}
