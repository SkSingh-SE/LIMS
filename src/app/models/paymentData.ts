export interface PaymentData {
  customerName: string;
  orderNo: string;
  paymentType: PaymentType;
  amount: number;
  currency: string;
  razorpayKey: string;
  razorpayOrderId: string;
}
enum PaymentType {
  PIInvoice = 'PIInvoice',
  Invoice = 'Invoice',
  AmendmentInvoice = 'AmendmentInvoice',
  Advance = 'Advance'
}
export interface PaymentTokenValidationResponse {
  isValid: boolean;
  message?: string;
  data?: PaymentData;
}
