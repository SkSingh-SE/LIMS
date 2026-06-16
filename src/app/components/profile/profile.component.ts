import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  userName = '';
  email = '';
  role = '';
  isAdmin = false;
  lastLoginDate: string | null = null;
  initials = '';
  accountStatus = '';

  ngOnInit(): void {
    const userData = this.authService.getUserData();
    if (userData) {
      this.userName = userData.userName || '';
      this.email = userData.email || '';
      this.role = userData.role || '';
      this.isAdmin = userData.isAdmin || false;
      this.accountStatus = userData.accountStatus || '';
      this.lastLoginDate = userData.lastLoginDate ? new Date(userData.lastLoginDate).toLocaleString() : null;

      const parts = this.userName.trim().split(' ');
      this.initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : this.userName.substring(0, 2).toUpperCase();
    }
  }

  constructor(private authService: AuthService) {}
}
