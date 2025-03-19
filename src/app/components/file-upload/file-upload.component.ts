import { Component } from '@angular/core';
import { FileType, FileUploadService } from '../../services/file-upload.service';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule,FormsModule,MatProgressBarModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css'
})
export class FileUploadComponent {
  selectedFile: File | null = null;
  selectedFileType: FileType = FileType.Employee;
  year: number | undefined = undefined;
  uploadProgress: number = -1;
  uploadComplete: boolean = false;
  uploadError: string | null = null;
  allowedFormats: string[] = ['pdf', 'png', 'jpg', 'jpeg', 'docx']; // Allowed file formats
  maxSizeInMB: number = 5; // Max file size in MB

  fileTypes = Object.keys(FileType)
  .filter(key => isNaN(Number(key))) 
  .map(key => ({
    value: FileType[key as keyof typeof FileType], 
    label: key 
  }));

  constructor(private fileUploadService: FileUploadService) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    // File Validation
    if (!fileExtension || !this.allowedFormats.includes(fileExtension)) {
      this.uploadError = `Invalid file format. Allowed formats: ${this.allowedFormats.join(', ')}`;
      return;
    }

    if (fileSizeMB > this.maxSizeInMB) {
      this.uploadError = `File size exceeds ${this.maxSizeInMB}MB limit.`;
      return;
    }

    this.selectedFile = file;
    this.uploadError = null; // Reset error if the file is valid
  }

  onUpload() {
    if (!this.selectedFile || this.selectedFileType === null) {
      this.uploadError = "Please select a valid file and file type.";
      return;
    }

    this.uploadProgress = 0;
    this.fileUploadService.uploadFile(this.selectedFile, this.selectedFileType, this.year)
      .subscribe({
        next: (event) => {
          debugger
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress = Math.round((event.total / event.loaded) * 90);
          } else if (event.type === HttpEventType.Response) {
            this.uploadComplete = true;
            this.uploadProgress = 100;
            setTimeout(() => (this.uploadProgress = -1), 2000); // Hide after 2 sec
          }
        },
        error: (err) => {
          this.uploadError = err.message;
          this.uploadProgress = -1;
        }
      });
  }
}
