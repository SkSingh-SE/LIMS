import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HasPermissionDirective } from './has-permission.directive';
import { PermissionService } from '../permission/permission.service';

@Component({
  template: `
    <div *hasPermission="requiredPermission; mode: permissionMode">
      <span class="protected-content">Protected Content</span>
    </div>
  `,
  imports: [HasPermissionDirective],
  standalone: true,
})
class TestHostComponent {
  requiredPermission: string | string[] | null = 'CanRead';
  permissionMode: 'any' | 'all' = 'any';
}

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let permissionService: PermissionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });
    permissionService = TestBed.inject(PermissionService);
    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
  });

  it('should show content when user has the required permission', () => {
    permissionService.setPermissions(['CanRead', 'CanWrite']);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.protected-content');
    expect(el).toBeTruthy();
  });

  it('should hide content when user lacks the required permission', () => {
    permissionService.setPermissions(['CanWrite']);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.protected-content');
    expect(el).toBeNull();
  });

  it('should show content when permission is null (no restriction)', () => {
    component.requiredPermission = null;
    permissionService.setPermissions([]);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.protected-content');
    expect(el).toBeTruthy();
  });

  it('should show content when checking any and user has at least one', () => {
    component.requiredPermission = ['CanRead', 'CanAdmin'];
    component.permissionMode = 'any';
    permissionService.setPermissions(['CanRead']);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.protected-content');
    expect(el).toBeTruthy();
  });

  it('should hide content when checking all and user is missing one', () => {
    component.requiredPermission = ['CanRead', 'CanAdmin'];
    component.permissionMode = 'all';
    permissionService.setPermissions(['CanRead']);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.protected-content');
    expect(el).toBeNull();
  });

  it('should show content when checking all and user has all', () => {
    component.requiredPermission = ['CanRead', 'CanWrite'];
    component.permissionMode = 'all';
    permissionService.setPermissions(['CanRead', 'CanWrite', 'CanDelete']);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('.protected-content');
    expect(el).toBeTruthy();
  });

  it('should reactively update when permissions change', () => {
    permissionService.setPermissions([]);
    fixture.detectChanges();

    // Initially hidden
    expect(fixture.nativeElement.querySelector('.protected-content')).toBeNull();

    // Grant permission
    permissionService.setPermissions(['CanRead']);
    fixture.detectChanges();

    // Now visible
    expect(fixture.nativeElement.querySelector('.protected-content')).toBeTruthy();
  });

  it('should reactively hide when permissions are revoked', () => {
    permissionService.setPermissions(['CanRead']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected-content')).toBeTruthy();

    // Revoke permission
    permissionService.setPermissions([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.protected-content')).toBeNull();
  });
});
