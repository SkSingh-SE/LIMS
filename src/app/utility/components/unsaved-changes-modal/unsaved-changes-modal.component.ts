import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UnsavedChangesService } from '../../../services/unsaved-changes.service';

@Component({
  selector: 'app-unsaved-changes-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop fade" [class.show]="visible" *ngIf="visible" (click)="stay()"></div>
    <div class="modal fade" [class.show]="visible" [style.display]="visible ? 'block' : 'none'" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered unsaved-dialog">
        <div class="modal-content unsaved-content">
          <div class="unsaved-icon-area">
            <div class="unsaved-icon-circle">
              <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
          </div>
          <div class="unsaved-body">
            <h5 class="unsaved-title">Unsaved Changes</h5>
            <p class="unsaved-text">You have unsaved changes that will be lost.<br/>Are you sure you want to leave this page?</p>
          </div>
          <div class="unsaved-actions">
            <button type="button" class="btn btn-stay" (click)="stay()">
              <i class="bi bi-arrow-left-circle"></i> Stay on Page
            </button>
            <button type="button" class="btn btn-leave" (click)="leave()">
              <i class="bi bi-box-arrow-right"></i> Leave Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop { z-index: 1050; }
    .modal { z-index: 1055; }

    .unsaved-dialog {
      max-width: 420px;
    }

    .unsaved-content {
      border: none;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
      text-align: center;
    }

    .unsaved-icon-area {
      background: linear-gradient(135deg, var(--primary-gradient-start, #ff4b3a) 0%, var(--primary-color, #da261c) 100%);
      padding: 28px 0 20px;
    }

    .unsaved-icon-circle {
      width: 64px;
      height: 64px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }

    .unsaved-icon-circle i {
      font-size: 1.75rem;
      color: #fff;
    }

    .unsaved-body {
      padding: 24px 28px 12px;
    }

    .unsaved-title {
      font-weight: 700;
      font-size: 1.15rem;
      color: #1a1a2e;
      margin-bottom: 8px;
    }

    .unsaved-text {
      color: #6c757d;
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 0;
    }

    .unsaved-actions {
      display: flex;
      gap: 12px;
      padding: 16px 28px 24px;
      justify-content: center;
    }

    .btn-stay,
    .btn-leave {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      font-size: 0.82rem !important;
      font-weight: 500 !important;
      padding: 6px 18px !important;
      border-radius: 6px !important;
      min-height: 32px !important;
      transition: all 0.2s ease-in-out !important;
    }

    .btn-stay i,
    .btn-leave i {
      font-size: 0.9rem !important;
      display: inline-block !important;
    }

    .btn-stay {
      background-color: #f1f3f5;
      color: #495057;
      border: 1px solid #dee2e6;
    }

    .btn-stay:hover {
      background-color: #e9ecef;
      border-color: #ced4da;
      color: #212529;
    }

    .btn-leave {
      background: linear-gradient(135deg, var(--primary-gradient-start, #ff4b3a) 0%, var(--primary-color, #da261c) 100%);
      color: #fff;
      border: none;
      box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb, 218, 38, 28), 0.3);
    }

    .btn-leave:hover {
      background: linear-gradient(135deg, var(--primary-color, #da261c) 0%, var(--primary-hover, #b71c1c) 100%);
      color: #fff;
      box-shadow: 0 4px 12px rgba(var(--bs-primary-rgb, 218, 38, 28), 0.4);
      transform: translateY(-1px);
    }
  `]
})
export class UnsavedChangesModalComponent implements OnInit, OnDestroy {
  visible = false;
  private sub!: Subscription;

  constructor(private unsavedChangesService: UnsavedChangesService) {}

  ngOnInit(): void {
    this.sub = this.unsavedChangesService.show$.subscribe(() => {
      this.visible = true;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  stay(): void {
    this.visible = false;
    this.unsavedChangesService.resolve(false);
  }

  leave(): void {
    this.visible = false;
    this.unsavedChangesService.resolve(true);
  }
}
