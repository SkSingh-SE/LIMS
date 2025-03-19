import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

export enum FileType {
  Customer = 0,
  Employee = 1,
  Sample = 2,
  Test = 3,
  Material = 4,
  Product = 5,
  Other = 6
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
private apiUrl = environment.apiUrl +"/FileUpload"; // Replace with actual API

  constructor(private http: HttpClient) {}

  uploadFile(file: File, fileType: FileType, year?: number): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);

    let url = `${this.apiUrl}/uploadFile?fileType=${fileType}`;
    if (year) {
      url += `&year=${year}`;
    }

    const req = new HttpRequest('POST', url, formData, { reportProgress: true });

    return this.http.request(req).pipe(
      catchError((error) => {
        console.error("Upload error:", error);
        return throwError(() => new Error("File upload failed. Please try again."));
      })
    );
  }

  getFileById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/files/${id}`);
  }
}
