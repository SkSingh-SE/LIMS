# Design Document: Dashboard Integration

## Overview

The Dashboard Integration feature creates a new unified main dashboard for the Angular LIMS frontend by integrating with the dashboard backend API. The solution provides a common dashboard accessible at the root route (`/`) that displays all available cards, charts, and notifications for users without role restrictions. The existing account dashboard remains separate and specific to account-related functionality. The new main dashboard provides a seamless user experience with auto-refresh capabilities, customizable layouts, and a compact, enhanced design that maximizes information density while maintaining visual appeal.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (Angular)     │◄──►│   Dashboard      │◄──►│   LIMS Data     │
│                 │    │   Endpoints      │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Architecture

```
LayoutComponent
├── NavbarComponent (existing)
├── MainDashboardComponent (new - at root route)
│   ├── DashboardCardComponent (new)
│   ├── DashboardChartComponent (new)
│   └── DashboardNotificationPanelComponent (new)
├── AccountDashboardComponent (existing - enhanced for accounts)
│   └── Account-specific cards and functionality
├── ToastComponent (existing)
└── GlobalLoaderComponent (existing)
```

### Service Layer

```
DashboardService (new)
├── API Integration
├── Caching Layer
├── Error Handling
└── Auto-refresh Logic

AuthService (existing)
├── Role Detection
└── Permission Validation

NotificationService (existing)
├── SignalR Integration
└── Real-time Updates
```

## Components and Interfaces

### DashboardService Interface

```typescript
interface DashboardService {
  getDashboard(): Observable<DashboardResponseDto>;
  getDashboardCards(): Observable<DashboardCardDto[]>;
  getDashboardCharts(): Observable<DashboardChartDto[]>;
  getDashboardNotifications(): Observable<DashboardNotificationDto[]>;
  refreshDashboard(): void;
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
}
```

### DashboardCardComponent Interface

```typescript
interface DashboardCardProps {
  title: string;
  count: number;
  status: 'Normal' | 'Warning' | 'Critical';
  description?: string;
  metadata?: any;
  route?: string;
}
```

### DashboardChartComponent Interface

```typescript
interface DashboardChartProps {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: ChartData;
  options?: ChartOptions;
}
```

### DashboardNotificationComponent Interface

```typescript
interface DashboardNotificationProps {
  id: string;
  title: string;
  message: string;
  priority: 'Info' | 'Warning' | 'Critical';
  timestamp: Date;
  route?: string;
  metadata?: any;
}
```

## Data Models

### Compact Design Principles

The dashboard implements a compact, enhanced design that maximizes information density while maintaining usability:

1. **Grid Optimization**: Uses a responsive grid system with smaller card sizes and tighter spacing
2. **Visual Hierarchy**: Enhanced typography, improved contrast, and consistent color schemes
3. **Information Density**: Optimized layouts that show more data in less space
4. **Modern Styling**: Clean, contemporary design with smooth animations and transitions
5. **Accessibility**: Maintains readability and usability across all screen sizes

### Backend Response Models

```typescript
interface DashboardResponseDto {
  cards: DashboardCardDto[];
  charts: DashboardChartDto[];
  notifications: DashboardNotificationDto[];
  generatedAt: Date;
}

interface DashboardCardDto {
  key: string;
  title: string;
  count: number;
  status: 'Normal' | 'Warning' | 'Critical';
  description?: string;
  metadata?: any;
}

interface DashboardChartDto {
  key: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: any;
  metadata?: any;
}

interface DashboardNotificationDto {
  id: string;
  title: string;
  message: string;
  priority: 'Info' | 'Warning' | 'Critical';
  timestamp: Date;
  route?: string;
  metadata?: any;
}
```

### Frontend State Models

```typescript
interface DashboardState {
  cards: DashboardCardDto[];
  charts: DashboardChartDto[];
  notifications: DashboardNotificationDto[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date;
  customLayout?: CardLayout[];
}

interface CardLayout {
  cardKey: string;
  position: number;
  visible: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all testable acceptance criteria, I identified several areas where properties can be consolidated:
- Status styling properties (3.2, 3.3, 3.4) can be combined into a single comprehensive property
- Layout persistence properties (7.2, 7.4) test the same underlying functionality
- Navigation properties (3.5, 5.2) follow similar patterns
- Role-based filtering properties have been removed as role validation is no longer required

### Core Properties

**Property 1: Route Structure Preservation**
*For any* existing route in the system, after dashboard integration, that route should continue to function correctly and return the expected component
**Validates: Requirements 1.2, 9.4, 9.5**

**Property 2: Universal Content Display**
*For any* dashboard data (cards, charts, notifications), all content should be displayed without filtering or restrictions
**Validates: Requirements 2.1, 2.2, 2.3**

**Property 3: Card Display Completeness**
*For any* dashboard card, the rendered component should display all required fields (title, count, description, status indicator) when they are provided in the data
**Validates: Requirements 3.1**

**Property 4: Status-Based Card Styling**
*For any* dashboard card, the visual styling should correspond to its status (Normal: blue, Warning: yellow, Critical: red)
**Validates: Requirements 3.2, 3.3, 3.4**

**Property 5: Card Navigation Functionality**
*For any* clickable dashboard card, clicking it should navigate to the correct route based on the card's metadata or key mapping
**Validates: Requirements 3.5**

**Property 6: Chart Type Rendering**
*For any* supported chart type (bar, line, pie, doughnut), the chart component should render the chart correctly with the provided data
**Validates: Requirements 4.1**

**Property 7: Responsive Chart Behavior**
*For any* chart at different screen sizes, the chart should maintain readability and proper proportions within the Bootstrap grid system
**Validates: Requirements 4.2, 10.2**

**Property 8: Compact Design Implementation**
*For any* dashboard layout, the compact design should maximize information density while maintaining readability and usability
**Validates: Requirements 11.1, 11.2, 11.3, 11.6**

**Property 9: Notification Priority Styling**
*For any* notification, the visual styling should correspond to its priority level (Info: blue, Warning: yellow, Critical: red)
**Validates: Requirements 5.1**

**Property 10: Notification Click Navigation**
*For any* clickable notification, clicking it should navigate to the related page specified in the notification's route property
**Validates: Requirements 5.2**

**Property 11: Notification Chronological Ordering**
*For any* set of notifications, they should be displayed in chronological order with the most recent notification first
**Validates: Requirements 5.4**

**Property 12: Auto-Refresh State Preservation**
*For any* user interaction state (scroll position, expanded sections, form inputs), auto-refresh should preserve these states
**Validates: Requirements 6.3**

**Property 13: Card Layout Drag-and-Drop**
*For any* card in the dashboard, dragging it to a new position should update the layout and persist the change
**Validates: Requirements 7.1**

**Property 14: Layout Persistence Across Sessions**
*For any* customized card layout, the layout should be restored when the user returns in a new browser session
**Validates: Requirements 7.2, 7.4**

**Property 15: Responsive Layout Customization**
*For any* customized card layout, the layout should adapt gracefully to different screen sizes while maintaining the user's preferred arrangement
**Validates: Requirements 7.5**

**Property 16: Loading State Display**
*For any* data fetching operation, appropriate loading indicators should be displayed until the operation completes
**Validates: Requirements 8.3**

**Property 17: Account Dashboard Enhancement Preservation**
*For any* existing account dashboard functionality, it should continue to work correctly and be enhanced with better UX while remaining account-focused
**Validates: Requirements 9.2, 9.4**

**Property 18: Cross-Device Responsive Rendering**
*For any* dashboard component, it should render properly and maintain functionality across desktop, tablet, and mobile devices
**Validates: Requirements 10.1**

## Error Handling

### API Error Handling Strategy

1. **Network Errors**: Display toast notification with retry option
2. **Authentication Errors**: Redirect to login page
3. **Authorization Errors**: Hide unauthorized content gracefully
4. **Data Parsing Errors**: Show fallback content with error indicator
5. **Chart Rendering Errors**: Display empty state with error message

### Error Recovery Mechanisms

1. **Automatic Retry**: Failed API calls retry up to 3 times with exponential backoff
2. **Graceful Degradation**: Show cached data when fresh data unavailable
3. **Partial Loading**: Display available data even if some components fail
4. **User Feedback**: Clear error messages with actionable next steps

### Error Logging

1. **Client-Side Logging**: Log errors to browser console with context
2. **Error Reporting**: Send critical errors to backend for monitoring
3. **User Action Tracking**: Log user interactions for debugging

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs
- Both approaches are complementary and necessary for comprehensive coverage

### Unit Testing Focus Areas

1. **Component Rendering**: Test specific card, chart, and notification rendering
2. **User Interactions**: Test click handlers, drag-and-drop, and form interactions
3. **Error Conditions**: Test API failures, network issues, and invalid data
4. **Edge Cases**: Test zero counts, empty states, and boundary conditions
5. **Integration Points**: Test service interactions and data flow

### Property-Based Testing Configuration

- **Testing Library**: Use fast-check for TypeScript property-based testing
- **Test Iterations**: Minimum 100 iterations per property test
- **Test Tagging**: Each property test references its design document property
- **Tag Format**: **Feature: dashboard-integration, Property {number}: {property_text}**

### Property Test Examples

```typescript
// Example property test for role-based filtering
it('should filter content based on user roles', () => {
  fc.assert(fc.property(
    fc.array(dashboardCardGenerator),
    fc.array(userRoleGenerator),
    (cards, userRoles) => {
      const filteredCards = filterCardsByRoles(cards, userRoles);
      return filteredCards.every(card => 
        card.allowedRoles.some(role => userRoles.includes(role))
      );
    }
  ), { numRuns: 100 });
});
```

### Test Data Generators

1. **Dashboard Card Generator**: Creates random card data with various statuses and roles
2. **Chart Data Generator**: Creates random chart data for different chart types
3. **Notification Generator**: Creates random notifications with different priorities
4. **User Role Generator**: Creates random user role combinations
5. **Layout Configuration Generator**: Creates random card layout configurations

### Integration Testing

1. **API Integration**: Test actual API calls with mock backend
2. **Route Integration**: Test navigation and route handling
3. **Authentication Integration**: Test role-based access control
4. **Real-time Integration**: Test SignalR notification updates
5. **Performance Integration**: Test auto-refresh and caching behavior

### End-to-End Testing Scenarios

1. **Complete Dashboard Flow**: Login → Dashboard Load → Card Click → Navigation
2. **Role-Based Access**: Test different user roles see appropriate content
3. **Customization Flow**: Drag cards → Save layout → Refresh → Verify persistence
4. **Error Recovery**: Simulate network issues → Verify graceful handling
5. **Mobile Experience**: Test complete flow on mobile devices