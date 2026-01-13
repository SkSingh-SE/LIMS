import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  location: string;
  department: string;
  initial: string;
  imageUrl?: string;
  type: 'management' | 'tech' | 'product' | 'hr';
  children?: OrgNode[];
  isExpanded?: boolean;
  color?: string; // For the circle avatar background
}

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './org-chart.component.html',
  styleUrls: ['./org-chart.component.css']
})
export class OrgChartComponent implements OnInit {

  /**
   *
   */
  constructor(private employeeService: EmployeeService) {
  }

  ngOnInit(): void {
    this.getEmployeeOrgChart();
  }

  getEmployeeOrgChart(): void {
    this.employeeService.getEmployeeOrgChart().subscribe({
      next: (data) => {
        this.rootNode = data;
      },
      error: (error) => {
        console.error('Error fetching employee org chart:', error);
      }
    });
  }
  rootNode: OrgNode = {
    id: '1',
    name: 'Bhagirathsinh Gohil',
    role: 'Managing Director',
    location: 'Ahmedabad',
    department: 'MANAGEMENT',
    initial: 'BG',
    type: 'management',
    isExpanded: true,
    color: '#2e3a59', // Dark blue-ish
    children: [
      {
        id: '2',
        name: 'Kunal Rajan',
        role: 'Operation Director',
        location: 'Ahmedabad',
        department: 'MANAGEMENT',
        initial: 'KR',
        type: 'management',
        isExpanded: true,
        color: '#0ea5e9', // Light blue
        children: [
          {
            id: '5',
            name: 'Sachin Singh',
            role: 'Vice President (Operation)',
            location: 'Ahmedabad',
            department: 'MANAGEMENT',
            initial: 'SS',
            type: 'management',
            color: '#10b981', // Green
            isExpanded: true,
            children: [
              {
                id: '6',
                name: 'Umang Khadsar',
                role: 'Tech Lead',
                location: 'Ahmedabad',
                department: 'LIMS TECHNICAL',
                initial: 'UK',
                type: 'tech',
                color: '#f59e0b', // Amber
              },
              {
                id: '7',
                name: 'Gagan Shah',
                role: 'Tech Lead',
                location: 'Ahmedabad',
                department: 'LIMS TECHNICAL',
                initial: 'GS',
                type: 'tech',
                color: '#f59e0b',
              },
              {
                id: '8',
                name: 'Hitesh Panchal',
                role: 'Sr. Tech Lead',
                location: 'Ahmedabad',
                department: 'LIMS FUNCTIONAL',
                initial: 'HP',
                type: 'tech',
                color: '#84cc16', // Lime
                children: [
                  {
                    id: '13',
                    name: 'Palak Patel',
                    role: 'Software Engineer',
                    location: 'Ahmedabad',
                    department: 'CRM & POWER PLATFORM',
                    initial: 'PP',
                    type: 'tech',
                    color: '#6366f1'
                  }
                ],
                isExpanded: true
              },
              {
                id: '9',
                name: 'Amit Sevak',
                role: 'Tech Lead',
                location: 'Ahmedabad',
                department: 'LIMS FUNCTIONAL',
                initial: 'AS',
                type: 'tech',
                color: '#84cc16',
                children: [
                  {
                    id: '14',
                    name: 'Sakshi Sengar',
                    role: 'Associate Software Engineer',
                    location: 'Ahmedabad',
                    department: 'CRM & POWER PLATFORM',
                    initial: 'SS',
                    type: 'tech',
                    color: '#6366f1'
                  }
                ],
                isExpanded: true
              },
              {
                id: '10',
                name: 'Krunal Acharya',
                role: 'Sr. Cloud Consultant',
                location: 'Ahmedabad',
                department: 'LIMS',
                initial: 'KA',
                type: 'tech',
                color: '#3b82f6',
                children: [
                  {
                    id: '15',
                    name: 'Sudhanshu Singh',
                    role: 'Software Engineer',
                    location: 'Ahmedabad',
                    department: 'CRM & POWER PLATFORM',
                    initial: 'SS',
                    type: 'tech',
                    color: '#6366f1'
                  }
                ],
                isExpanded: true
              },
              {
                id: '11',
                name: 'Mihir Shah',
                role: 'Sr. Project Manager',
                location: 'Ahmedabad',
                department: 'CRM & POWER PLATFORM',
                initial: 'MS',
                type: 'management',
                color: '#ec4899',
                children: [
                  {
                    id: '16',
                    name: 'Aarti Ingele',
                    role: 'Software Engineer',
                    location: 'Ahmedabad',
                    department: 'CRM & POWER PLATFORM',
                    initial: 'AI',
                    type: 'tech',
                    color: '#6366f1'
                  }
                ],
                isExpanded: true
              },
              {
                id: '12',
                name: 'Amit Sharma',
                role: 'Sr. Project Manager',
                location: 'Ahmedabad',
                department: 'CRM & POWER PLATFORM',
                initial: 'AS',
                type: 'management',
                color: '#ec4899',
                children: [
                  {
                    id: '17',
                    name: 'Dolly Kansara',
                    role: 'Software Engineer',
                    location: 'Ahmedabad',
                    department: 'CRM & POWER PLATFORM',
                    initial: 'DK',
                    type: 'tech',
                    color: '#6366f1'
                  },
                  {
                    id: '18',
                    name: 'Praduman Prajapati',
                    role: 'Software Engineer',
                    location: 'Ahmedabad',
                    department: 'CRM & POWER PLATFORM',
                    initial: 'PP',
                    type: 'tech',
                    color: '#6366f1'
                  },
                  {
                    id: '19',
                    name: 'Mehul Dabhi',
                    role: 'Associate Software Engineer',
                    location: 'Ahmedabad',
                    department: 'CRM & POWER PLATFORM',
                    initial: 'MD',
                    type: 'tech',
                    color: '#6366f1'
                  }

                ],
                isExpanded: true
              },
              {
                id: '20',
                name: 'Amit Pandey',
                role: 'Tech Lead',
                location: 'Ahmedabad',
                department: 'LIMS FUNCTIONAL',
                initial: 'AP',
                type: 'tech',
                color: '#84cc16'
              }
            ]
          }
        ]
      },
      {
        id: '3',
        name: 'Harsh Makwana',
        role: 'Sales & Marketing Director',
        location: 'Ahmedabad',
        department: 'MANAGEMENT',
        initial: 'HM',
        type: 'management',
        isExpanded: false,
        color: '#8b5cf6', // Violet
      },
      {
        id: '4',
        name: 'Maulik Gajjar',
        role: 'Operation Director',
        location: 'Ahmedabad',
        department: 'MANAGEMENT',
        initial: 'MG',
        type: 'management',
        isExpanded: false,
        color: '#eab308', // Yellow
      }
    ]
  };

  // Zoom & Pan State
  zoomLevel = 1;
  panning = false;
  isDarkMode = false;
  isHorizontal = true; // Layout mode

  toggleNode(node: OrgNode): void {
    if (node.children && node.children.length > 0) {
      node.isExpanded = !node.isExpanded;
    }
  }

  // Zoom Controls
  zoomIn(): void {
    if (this.zoomLevel < 2) {
      this.zoomLevel += 0.1;
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.1;
    }
  }

  resetZoom(): void {
    this.zoomLevel = 1;
  }

  // Theme Toggle
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  // Layout Toggle
  toggleLayout(): void {
    this.isHorizontal = !this.isHorizontal;
  }
}
