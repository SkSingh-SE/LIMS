import { Directive, Input, SimpleChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { PermissionService } from '../permission/permission.service';
import { Subscription } from 'rxjs';

type Mode = 'any' | 'all';

@Directive({
  selector: '[hasPermission]'
})
export class HasPermissionDirective {
 @Input('hasPermission') permission: string | string[] | undefined | null;
  @Input('hasPermissionMode') hasPermissionMode: Mode = 'any';

  private hasView = false;
  private sub?: Subscription;

  constructor(
    private tpl: TemplateRef<any>,
    private vcr: ViewContainerRef,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {
    // subscribe to permission changes
    this.sub = this.permissionService.permissionsChanged.subscribe(() => {
      this.updateView();
    });

    this.updateView(); // initial check
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updateView();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private normalize(perms: string | string[] | undefined | null): string[] {
    if (!perms) return [];
    return Array.isArray(perms) ? perms.map(p => (p || '').toString()) : [(perms || '').toString()];
  }

  private updateView() {
    const perms = this.normalize(this.permission);

    let allowed = true;
    if (perms.length > 0) {
      allowed =
        this.hasPermissionMode === 'all'
          ? this.permissionService.hasAll(perms)
          : this.permissionService.hasAny(perms);
    }

    if (allowed && !this.hasView) {
      this.vcr.createEmbeddedView(this.tpl);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.vcr.clear();
      this.hasView = false;
    }
  }
}
