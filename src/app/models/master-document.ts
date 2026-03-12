export interface MasterDocument {
    id: number;
    srNo: number;
    documentName: string;
    documentNo: string;
    issueNo: string | number;
    issueDate: string | Date;
    revNo: string | number;
    revDate: string | Date;
    copyHolder: string;

    // Header standard fields
    formatNo: string;
    docNo: string;
}
