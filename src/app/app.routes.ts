import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { ListDesignationComponent } from './components/designation/list-designation/list-designation.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { EmployeeListComponent } from './components/employee/employee-list/employee-list.component';
import { EmployeeFormComponent } from './components/employee/employee-form/employee-form.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';
import { DepartmentListComponent } from './components/department/department-list/department-list.component';
import { DepartmentFormComponent } from './components/department/department-form/department-form.component';
import { DesignationFormComponent } from './components/designation/designation-form/designation-form.component';
import { LaboratoryTestComponent } from './components/test/laboratory-test/laboratory-test.component';
import { CustomerFormComponent } from './components/customer/customer-form/customer-form.component';
import { CompanyCategoryComponent } from './components/company-category/company-category.component';
import { CustomerListComponent } from './components/customer/customer-list/customer-list.component';
import { TaxComponent } from './components/tax/tax.component';
import { BankComponent } from './components/bank/bank.component';
import { CourierComponent } from './components/courier/courier.component';
import { TPIComponent } from './components/tpi/tpi.component';
import { DimensionalFactorComponent } from './components/dimensional-factor/dimensional-factor.component';
import { HeatTreatmentComponent } from './components/heat-treatment/heat-treatment.component';
import { ProductConditionComponent } from './components/product-condition/product-condition.component';
import { SpecimenOrientationComponent } from './components/specimen-orientation/specimen-orientation.component';
import { ChemicalParameterComponent } from './components/parameter/chemical-parameter/chemical-parameter.component';
import { MechanicalParameterComponent } from './components/parameter/mechanical-parameter/mechanical-parameter.component';
import { StandardOrgnizationComponent } from './components/standard-orgnization/standard-orgnization.component';
import { UniversalCodeTypeComponent } from './components/universal-code-type/universal-code-type.component';
import { InvoiceCaseComponent } from './components/test/invoice-case/invoice-case.component';
import { MaterialSpecificationComponent } from './components/material-specification/material-specification.component';
import { MetalClassificationComponent } from './components/metal-classification/metal-classification.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: 'designation', component: ListDesignationComponent },  
            { path: 'designation/create', component: DesignationFormComponent }, 
            { path: 'designation/edit/:id', component: DesignationFormComponent }, 
            { path: 'designation/details/:id', component: DesignationFormComponent }, 
            { path: 'file-upload', component: FileUploadComponent },
            { path: 'employee', component: EmployeeListComponent },
            { path: 'employee/create', component: EmployeeFormComponent },
            { path: 'employee/edit/:id', component: EmployeeFormComponent },
            { path: 'employee/details/:id', component: EmployeeFormComponent },
            { path: 'department', component: DepartmentListComponent }, 
            { path: 'department/create', component: DepartmentFormComponent},
            { path: 'department/edit/:id', component: DepartmentFormComponent }, 
            { path: 'department/details/:id', component: DepartmentFormComponent },
            { path: 'company-category', component: CompanyCategoryComponent },
            { path: 'customer', component: CustomerListComponent },
            { path: 'customer/create', component: CustomerFormComponent },
            { path: 'customer/edit/:id', component: CustomerFormComponent },
            { path: 'customer/details/:id', component: CustomerFormComponent },
            { path: 'tax', component: TaxComponent },
            { path: 'test', component: InvoiceCaseComponent },
            { path: 'bank', component: BankComponent },
            { path: 'courier', component: CourierComponent },
            { path: 'tpi', component: TPIComponent },
            { path: 'dimesional-factor', component: DimensionalFactorComponent },
            { path: 'heat-treatment', component: HeatTreatmentComponent },
            { path: 'product-condition', component: ProductConditionComponent },
            { path: 'specimen-orientation', component: SpecimenOrientationComponent },
            { path: 'chemical-parameter', component: ChemicalParameterComponent },
            { path: 'mechanical-parameter', component: MechanicalParameterComponent },
            { path: 'standard-organization', component: StandardOrgnizationComponent },
            { path: 'universal-code-type', component: UniversalCodeTypeComponent },
            { path: 'material-specification', component: MaterialSpecificationComponent },
            { path: 'metal-classification', component: MetalClassificationComponent },
        ]
    },
    { path: '**', redirectTo: '/login' }
];
