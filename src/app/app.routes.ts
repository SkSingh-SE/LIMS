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
import { MetalClassificationComponent } from './components/metal-classification/metal-classification.component';
import { MaterialSpecificationFormComponent } from './components/material-specification/material-specification-form/material-specification-form.component';
import { MaterialSpecificationListComponent } from './components/material-specification/material-specification-list/material-specification-list.component';
import { CustomMaterialSpecificationListComponent } from './components/material-specification/custom-material-specification-list/custom-material-specification-list.component';
import { CustomMaterialSpecificationFormComponent } from './components/material-specification/custom-material-specification-form/custom-material-specification-form.component';
import { ProductSpecificationComponent } from './components/product-specification/product-specification.component';
import { CustomProductSpecificationComponent } from './components/product-specification/custom-product-specification/custom-product-specification.component';
import { SupplierListComponent } from './components/supplier/supplier-list/supplier-list.component';
import { SupplierFormComponent } from './components/supplier/supplier-form/supplier-form.component';
import { LaboratoryTestListComponent } from './components/test/laboratory-test-list/laboratory-test-list.component';
import { TestMethodSpecificationComponent } from './components/test/test-method-specification/test-method-specification.component';
import { TestMethodSpecificationListComponent } from './components/test/test-method-specification-list/test-method-specification-list.component';
import { ScopeComponent } from './components/iso/scope/scope.component';
import { ScopeListComponent } from './components/iso/scope-list/scope-list.component';
import { OEMFormComponent } from './components/equipment/oem-form/oem-form.component';
import { OemListComponent } from './components/equipment/oem-list/oem-list.component';
import { EquipmentFormComponent } from './components/equipment/equipment-form/equipment-form.component';
import { EquipmentListComponent } from './components/equipment/equipment-list/equipment-list.component';
import { InvoiceCaseConfigurationsComponent } from './components/test/invoice-case-configurations/invoice-case-configurations.component';
import { InvoiceCaseListComponent } from './components/test/invoice-case-list/invoice-case-list.component';
import { CalibrationAgencyFormComponent } from './components/equipment/calibration-agency-form/calibration-agency-form.component';
import { CalibrationAgencyComponent } from './components/equipment/calibration-agency/calibration-agency.component';
import { CuttingPriceMasterComponent } from './components/sample-prepration/cutting-price-master/cutting-price-master.component';
import { CuttingSampleFormComponent } from './components/sample-prepration/cutting-sample-form/cutting-sample-form.component';
import { MachiningChallanComponent } from './components/sample-prepration/machining-challan/machining-challan.component';
import { SampleInwardFormComponent } from './components/inward/sample-inward-form/sample-inward-form.component';
import { ConfigManagerComponent } from './components/configuration/configuration.component';
import { MenuManagementComponent } from './components/menu/menu-management/menu-management.component';
import { MenuManagementListComponent } from './components/menu/menu-management-list/menu-management-list.component';
import { RoleFormComponent } from './components/role/role-form/role-form.component';
import { UserPermissionComponent } from './components/employee/user-permission/user-permission.component';
import { MenuPermissionComponent } from './components/menu/menu-permission/menu-permission.component';

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
            { path: 'department/create', component: DepartmentFormComponent },
            { path: 'department/edit/:id', component: DepartmentFormComponent },
            { path: 'department/details/:id', component: DepartmentFormComponent },
            { path: 'company-category', component: CompanyCategoryComponent },
            { path: 'customer', component: CustomerListComponent },
            { path: 'customer/create', component: CustomerFormComponent },
            { path: 'customer/edit/:id', component: CustomerFormComponent },
            { path: 'customer/details/:id', component: CustomerFormComponent },
            { path: 'tax', component: TaxComponent },
            { path: 'test', component: LaboratoryTestListComponent },
            { path: 'test/create', component: LaboratoryTestComponent },
            { path: 'test/edit/:id', component: LaboratoryTestComponent },
            { path: 'test/details/:id', component: LaboratoryTestComponent },
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
            { path: 'material-specification', component: MaterialSpecificationListComponent },
            { path: 'material-specification/create', component: MaterialSpecificationFormComponent },
            { path: 'material-specification/edit/:id', component: MaterialSpecificationFormComponent },
            { path: 'material-specification/details/:id', component: MaterialSpecificationFormComponent },
            { path: 'custom-material-specification', component: CustomMaterialSpecificationListComponent },
            { path: 'custom-material-specification/create', component: CustomMaterialSpecificationFormComponent },
            { path: 'custom-material-specification/edit/:id', component: CustomMaterialSpecificationFormComponent },
            { path: 'custom-material-specification/details/:id', component: CustomMaterialSpecificationFormComponent },
            { path: 'product-specification', component: ProductSpecificationComponent },
            { path: 'custom-product-specification', component: CustomProductSpecificationComponent },
            { path: 'metal-classification', component: MetalClassificationComponent },
            { path: 'supplier', component: SupplierListComponent },
            { path: 'supplier/create', component: SupplierFormComponent },
            { path: 'supplier/edit/:id', component: SupplierFormComponent },
            { path: 'supplier/details/:id', component: SupplierFormComponent },
            { path: 'test-specification', component: TestMethodSpecificationListComponent },
            { path: 'test-specification/create', component: TestMethodSpecificationComponent },
            { path: 'test-specification/edit/:id', component: TestMethodSpecificationComponent },
            { path: 'test-specification/details/:id', component: TestMethodSpecificationComponent },
            { path: 'scope', component: ScopeListComponent },
            { path: 'scope/create', component: ScopeComponent },
            { path: 'scope/edit/:id', component: ScopeComponent },
            { path: 'scope/details/:id', component: ScopeComponent },
            { path: 'oem', component: OemListComponent },
            { path: 'oem/create', component: OEMFormComponent },
            { path: 'oem/edit/:id', component: OEMFormComponent },
            { path: 'oem/details/:id', component: OEMFormComponent },
            { path: 'equipment', component: EquipmentListComponent },
            { path: 'equipment/create', component: EquipmentFormComponent },
            { path: 'equipment/edit/:id', component: EquipmentFormComponent },
            { path: 'equipment/details/:id', component: EquipmentFormComponent },
            { path: 'invoice-case-config', component: InvoiceCaseConfigurationsComponent },
            { path: 'invoice-case', component: InvoiceCaseListComponent },
            { path: 'invoice-case/create', component: InvoiceCaseComponent },
            { path: 'invoice-case/edit/:id', component: InvoiceCaseComponent },
            { path: 'invoice-case/details/:id', component: InvoiceCaseComponent },
            { path: 'calibration-agency', component: CalibrationAgencyComponent },
            { path: 'calibration-agency/create', component: CalibrationAgencyFormComponent },
            { path: 'calibration-agency/edit/:id', component: CalibrationAgencyFormComponent },
            { path: 'calibration-agency/details/:id', component: CalibrationAgencyFormComponent },
            { path: 'cutting-price-master', component: CuttingPriceMasterComponent },
            { path: 'sample/cutting', component:CuttingSampleFormComponent},
            { path: 'sample/machining', component:MachiningChallanComponent},
            { path: 'sample/plan', component:SampleInwardFormComponent},
            { path: 'sample/inward', component:SampleInwardFormComponent},
            { path: 'config', component:ConfigManagerComponent },
            { path: 'menu', component: MenuManagementListComponent},
            { path: 'menu-permission', component: MenuPermissionComponent},
            { path: 'role', component: RoleFormComponent},
            { path: 'menu/create', component: MenuManagementComponent },
            { path: 'menu/edit/:id', component: MenuManagementComponent },
            { path: 'menu/details/:id', component: MenuManagementComponent },
            { path: 'user-permission', component: UserPermissionComponent },
        ]
    },
    { path: '**', redirectTo: '/login' }
];
