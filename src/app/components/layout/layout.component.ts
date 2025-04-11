import { Component, HostListener, ViewChild } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GlobalLoaderComponent } from '../global-loader/global-loader.component';
import { ToastComponent } from '../toast/toast.component';

@Component({
  selector: 'app-layout',
  imports: [CommonModule,NavbarComponent,GlobalLoaderComponent,ToastComponent,RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  @ViewChild(NavbarComponent) navbarComponent!: NavbarComponent;
  isVisible: boolean = false;

  @HostListener('window:scroll', [])
  onScroll(): void {
    this.isVisible = window.scrollY > 20;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
