import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { ListDesignationComponent } from './components/designation/list-designation/list-designation.component';
import { UpdateDesignationComponent } from './components/designation/update-designation/update-designation.component';
import { DetailsDesignationComponent } from './components/designation/details-designation/details-designation.component';
import { CreateDesignationComponent } from './components/designation/create-designation/create-designation.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { EmployeeListComponent } from './components/employee/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employee/employee-form/employee-form.component';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            { path: 'designation', component: ListDesignationComponent },  // List Page
            { path: 'designation/create', component: CreateDesignationComponent },  // Create Page
            { path: 'designation/edit/:id', component: UpdateDesignationComponent }, // Edit Page (With ID)
            { path: 'designation/details/:id', component: DetailsDesignationComponent }, // Details Page (With ID)
            { path: 'file-upload', component: FileUploadComponent },
            { path: 'employee', component: EmployeeListComponent },
            { path: 'employee/create', component: EmployeeFormComponent },
            { path: 'employee/edit/:id', component: EmployeeFormComponent },
        ]
    }
];
