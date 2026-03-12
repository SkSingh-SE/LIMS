import { ReferenceMaterial } from "./referenceMaterialModel";

// F-19: Supplier Registration Form
export interface SupplierRegistration {
    id?: number;
    formatNo: string; // F-19
    documentNo: string;
    issueNo: string;
    revNo: string;
    date: Date | string;

    // Supplier Basic Info
    supplierName: string;
    address: string;
    contactPerson: string;
    designation: string;
    mobileNo: string;
    email: string;
    website?: string;

    // Registration Details
    natureOfBusiness: string; // e.g., Manufacturer, Authorized Dealer, Stockist
    productsServicesOffered: string; // Rich text/List
    gstNo: string;
    panNo: string;
    isoCertified: boolean;
    isoDetails?: string;

    // Qualifications
    bankDetails: {
        bankName: string;
        accountNo: string;
        ifscCode: string;
        branch: string;
    };

    // Evaluation/Checklist
    documentsSubmitted: {
        gstCertificate: boolean;
        panCard: boolean;
        isoCertificate: boolean;
        cancelledCheque: boolean;
        msmeCertificate: boolean;
        otherDocs?: string;
    };

    // Status
    registrationStatus: 'Pending' | 'Approved' | 'Rejected';
    remarks?: string;

    // Personnel
    recordedBy: string;
    verifiedBy?: string;

    // Audit Fields
    createdBy?: string;
    createdOn?: Date | string;
    modifiedBy?: string;
    modifiedOn?: Date | string;
    isActive?: boolean;
}

export interface SupplierRegistrationResponse {
    status: number;
    message: string;
    data: SupplierRegistration;
    success: boolean;
}

export interface SupplierRegistrationListResponse {
    status: number;
    message: string;
    items: SupplierRegistration[];
    totalRecords: number;
    pageNumber: number;
    pageSize: number;
    success: boolean;
}
