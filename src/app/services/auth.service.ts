import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl +"/Auth";// Replace with actual API URL

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl+'/login', credentials, { observe: 'response' }).pipe(
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
    const userData = localStorage.getItem('userData');
    const expiration = localStorage.getItem('tokenExpiration');
  
    if (!userData || !expiration || Date.now() > Number(expiration)) {
      localStorage.clear();
      return false;
    }
    return true;
  }

  logout() {
    localStorage.removeItem('userData');
    localStorage.removeItem('tokenExpiration');
    this.router.navigate(['/login']);
  }
}
