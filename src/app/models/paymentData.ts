export interface PaymentData {
  customerName: string;
  orderNo: string;
  paymentType: number; // Numeric value for backend
  amount: number;
  currency: string;
  razorpayKey: string;
  razorpayOrderId: string;
}
export enum PaymentType {
  PIInvoice = 1,
  Invoice = 2,
  AmendmentInvoice = 3,
  Advance = 4
}

// Utility function to get payment type string for display
export function getPaymentTypeString(paymentType: number): string {
  switch (paymentType) {
    case PaymentType.PIInvoice:
      return 'PIInvoice';
    case PaymentType.Invoice:
      return 'Invoice';
    case PaymentType.AmendmentInvoice:
      return 'AmendmentInvoice';
    case PaymentType.Advance:
      return 'Advance';
    default:
      return 'Unknown';
  }
}
export interface PaymentTokenValidationResponse {
  isValid: boolean;
  message?: string | null;
  orderNo: string;
  paymentType: number;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayKey: string;
  customerName: string;
}
