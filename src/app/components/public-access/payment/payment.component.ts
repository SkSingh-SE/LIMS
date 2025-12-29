import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import { PaymentData, PaymentTokenValidationResponse } from '../../../models/paymentData';
import { CommonModule } from '@angular/common';

declare const Razorpay: any;



@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
  imports: [CommonModule, ReactiveFormsModule]
})
export class PaymentComponent implements OnInit {

  token!: string;
  paymentForm!: FormGroup;
  loading = true;
  error: string | null = null;
  success = false;

  constructor(private fb: FormBuilder,
    private route: ActivatedRoute,
    private paymentService: PaymentService
  ) { }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.buildForm();
    this.validateToken();
  }

  private buildForm(): void {
    this.paymentForm = this.fb.nonNullable.group({
      customerName: [''],
      orderNo: [''],
      paymentType: [''],
      amount: [0]
    });
  }

  private validateToken(): void {
    this.loading = true;

    this.paymentService.validateToken(this.token).subscribe({
      next: (res: PaymentTokenValidationResponse) => {
        if (!res.isValid || !res.data) {
          this.error = res.message ?? 'Invalid or expired payment link';
          this.loading = false;
          return;
        }

        this.paymentForm.patchValue({
          customerName: res.data.customerName,
          orderNo: res.data.orderNo,
          paymentType: res.data.paymentType,
          amount: res.data.amount
        });

        this.loading = false;
      },
      error: () => {
        this.error = 'Invalid or expired payment link';
        this.loading = false;
      }
    });
  }

  payNow(): void {
    if (this.paymentForm.invalid) return;

    const data = this.paymentForm.getRawValue() as PaymentData;

    const options = {
      key: data.razorpayKey,
      amount: data.amount * 100,
      currency: data.currency,
      name: 'Divine Metallurgical Services',
      description: `${data.paymentType} - ${data.orderNo}`,
      order_id: data.razorpayOrderId,
      handler: (response: any) => this.verifyPayment(response),
      theme: { color: '#495057' }
    };

    new Razorpay(options).open();
  }

  private verifyPayment(response: any): void {
    const payload = {
      paymentToken: this.token,
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    };

    this.paymentService.processPayment(payload).subscribe({
      next: () => this.success = true,
      error: () =>
        this.error = 'Payment verification failed. Please contact support.'
    });
  }
}
