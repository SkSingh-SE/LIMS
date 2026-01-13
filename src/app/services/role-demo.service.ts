import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { RoleFilterService } from './role-filter.service';
import { DashboardCardDto, DashboardChartDto } from '../models/dashboardModels';

/**
 * Demonstration service showing role-based filtering functionality
 * This service provides examples of how the role-based filtering works
 */
@Injectable({
  providedIn: 'root'
})
export class RoleDemoService {

  constructor(
    private authService: AuthService,
    private roleFilterService: RoleFilterService
  ) {}

  /**
   * Demonstrate role-based filtering with sample data
   */
  demonstrateRoleFiltering(): void {
    console.log('=== Role-Based Filtering Demonstration ===');
    
    // Sample dashboard cards with different role requirements
    const sampleCards: DashboardCardDto[] = [
      {
        key: 'admin-only-card',
        title: 'Admin Dashboard',
        count: 5,
        status: 'Normal',
        allowedRoles: ['Admin'],
        description: 'Only admins can see this'
      },
      {
        key: 'accounts-card',
        title: 'Financial Reports',
        count: 12,
        status: 'Warning',
        allowedRoles: ['Admin', 'Accounts'],
        description: 'Admin and Accounts users can see this'
      },
      {
        key: 'normal-user-card',
        title: 'My Tasks',
        count: 8,
        status: 'Normal',
        allowedRoles: ['Admin', 'Accounts', 'Normal'],
        description: 'All users can see this'
      },
      {
        key: 'public-card',
        title: 'System Status',
        count: 1,
        status: 'Critical',
        allowedRoles: [],
        description: 'No role restrictions - everyone can see this'
      }
    ];

    // Get current user roles
    const userRoles = this.authService.getUserRoles();
    console.log('Current user roles:', userRoles);

    // Filter cards based on user roles
    const filteredCards = this.roleFilterService.filterByUserRoles(sampleCards);
    console.log('Filtered cards:', filteredCards.map(card => ({
      title: card.title,
      allowedRoles: card.allowedRoles
    })));

    // Get access summary
    const accessSummary = this.roleFilterService.getRoleAccessSummary(sampleCards);
    console.log('Access summary:', accessSummary);

    // Demonstrate role checking
    console.log('Role checks:');
    console.log('- Is Admin:', this.authService.hasRole('Admin'));
    console.log('- Is Accounts:', this.authService.hasRole('Accounts'));
    console.log('- Is Normal:', this.authService.hasRole('Normal'));
    console.log('- Has any admin/accounts role:', this.authService.hasAnyRole(['Admin', 'Accounts']));
    console.log('- Primary role:', this.authService.getPrimaryRole());

    // Demonstrate content access checking
    console.log('Content access checks:');
    sampleCards.forEach(card => {
      const canAccess = this.roleFilterService.canAccessContent(card.allowedRoles);
      console.log(`- Can access "${card.title}":`, canAccess);
    });

    console.log('=== End Demonstration ===');
  }

  /**
   * Simulate different user roles and show filtering results
   */
  simulateRoleScenarios(): void {
    console.log('=== Role Scenario Simulation ===');

    const sampleCards: DashboardCardDto[] = [
      { key: 'admin', title: 'Admin Panel', count: 1, status: 'Normal', allowedRoles: ['Admin'] },
      { key: 'accounts', title: 'Billing', count: 5, status: 'Warning', allowedRoles: ['Accounts'] },
      { key: 'mixed', title: 'Reports', count: 10, status: 'Normal', allowedRoles: ['Admin', 'Accounts'] },
      { key: 'all', title: 'Dashboard', count: 15, status: 'Normal', allowedRoles: ['Admin', 'Accounts', 'Normal'] },
      { key: 'public', title: 'Status', count: 1, status: 'Critical', allowedRoles: [] }
    ];

    // Simulate different role scenarios
    const scenarios = [
      { roles: ['Admin'], description: 'Admin user' },
      { roles: ['Accounts'], description: 'Accounts user' },
      { roles: ['Normal'], description: 'Normal user' },
      { roles: ['Admin', 'Accounts'], description: 'Multi-role user (Admin + Accounts)' },
      { roles: [], description: 'User with no roles' }
    ];

    scenarios.forEach(scenario => {
      console.log(`\n--- Scenario: ${scenario.description} ---`);
      console.log('User roles:', scenario.roles);
      
      // Mock the auth service for this scenario
      spyOn(this.authService, 'getUserRoles').and.returnValue(scenario.roles);
      spyOn(this.authService, 'hasAnyRole').and.callFake((roles: string[]) => {
        return roles.some(role => scenario.roles.includes(role));
      });

      const filteredCards = this.roleFilterService.filterByUserRoles(sampleCards);
      console.log('Accessible cards:', filteredCards.map(card => card.title));
      console.log('Access count:', `${filteredCards.length}/${sampleCards.length}`);
    });

    console.log('=== End Simulation ===');
  }

  /**
   * Test multi-role content aggregation
   */
  demonstrateMultiRoleAggregation(): void {
    console.log('=== Multi-Role Aggregation Demonstration ===');

    // Sample cards that might appear multiple times for multi-role users
    const duplicateCards: DashboardCardDto[] = [
      {
        key: 'shared-reports',
        title: 'Shared Reports',
        count: 5,
        status: 'Normal',
        allowedRoles: ['Admin'],
        description: 'Admin view'
      },
      {
        key: 'shared-reports',
        title: 'Shared Reports',
        count: 3,
        status: 'Warning',
        allowedRoles: ['Accounts'],
        description: 'Accounts view'
      },
      {
        key: 'unique-admin',
        title: 'Admin Only',
        count: 2,
        status: 'Critical',
        allowedRoles: ['Admin'],
        description: 'Admin exclusive'
      }
    ];

    console.log('Original cards:', duplicateCards.map(card => ({
      key: card.key,
      title: card.title,
      count: card.count,
      status: card.status,
      allowedRoles: card.allowedRoles
    })));

    // Demonstrate aggregation
    const aggregatedCards = this.roleFilterService.filterAndAggregateByRoles(
      duplicateCards,
      (card) => card.key,
      (existing, duplicate) => ({
        ...existing,
        count: existing.count + duplicate.count,
        status: this.getMostCriticalStatus(existing.status, duplicate.status),
        description: `${existing.description} + ${duplicate.description}`
      })
    );

    console.log('Aggregated cards:', aggregatedCards.map(card => ({
      key: card.key,
      title: card.title,
      count: card.count,
      status: card.status,
      description: card.description
    })));

    console.log('=== End Aggregation Demonstration ===');
  }

  /**
   * Helper method to determine most critical status
   */
  private getMostCriticalStatus(status1: string, status2: string): 'Normal' | 'Warning' | 'Critical' {
    const statusPriority = { 'Normal': 1, 'Warning': 2, 'Critical': 3 };
    const priority1 = statusPriority[status1 as keyof typeof statusPriority] || 1;
    const priority2 = statusPriority[status2 as keyof typeof statusPriority] || 1;
    
    return priority1 >= priority2 
      ? status1 as 'Normal' | 'Warning' | 'Critical'
      : status2 as 'Normal' | 'Warning' | 'Critical';
  }
}