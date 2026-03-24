import { Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { NavigationStart, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GlobalLoaderComponent } from '../global-loader/global-loader.component';
import { ToastComponent } from '../toast/toast.component';
import { UnsavedChangesModalComponent } from '../../utility/components/unsaved-changes-modal/unsaved-changes-modal.component';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, NavbarComponent, GlobalLoaderComponent, ToastComponent, RouterOutlet, UnsavedChangesModalComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit, OnDestroy {
  @ViewChild(NavbarComponent) navbarComponent!: NavbarComponent;
  isVisible: boolean = false;
  private routerSub!: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Global cleanup: remove stuck modal backdrops on every route change
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => {
        this.cleanupModals();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  /**
   * Removes stuck Bootstrap modal backdrops and body classes.
   * Fixes: modal open → browser back → page stays blurred/frozen.
   */
  private cleanupModals(): void {
    // Remove all modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    // Remove modal-open class from body (restores scroll)
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isVisible = window.scrollY > 20;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
