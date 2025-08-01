import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl + "/Auth";// Replace with actual API URL

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl + '/login', credentials, { observe: 'response' }).pipe(
      map((response: HttpResponse<any>) => {
        if (response.status === 200 && response.body) {
          this.saveUserData(response.body); // Save user data
          return response.body;
        }
        throw new Error('Invalid response from server');
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  refreshToken(accessToken: string): Observable<any> {
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };
  
    return this.http.get<any>(this.apiUrl + '/refresh-token', { headers });
  }
  

  saveUserData(userData: any): void {
    localStorage.setItem('userData', JSON.stringify(userData));
    const expirationTime = Date.now() + userData.expiresInSecond * 1000; // Convert seconds to milliseconds
    localStorage.setItem('tokenExpiration', expirationTime.toString());
  }

  getUserData(): any {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  isLoggedIn(): boolean {
    const expiration = localStorage.getItem('tokenExpiration');
    const userData = this.getUserData();
  alert('isLoggedIn called');
    if (!userData || !expiration) {
      return false;
    }
  
    return Date.now() < Number(expiration);
  }

  logout() {
    localStorage.removeItem('userData');
    localStorage.removeItem('tokenExpiration');
    this.router.navigate(['/login']);
  }

  isTokenExpiringSoon(): boolean {
    const thresholdInSeconds = 60;
    const expiration = localStorage.getItem('tokenExpiration');

    if (!expiration) {
      return false;
    }
    const expirationTime = Number(expiration); // in ms
    const currentTime = Date.now();
    return expirationTime - currentTime < thresholdInSeconds * 1000;
  }
}
