import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

import { PaymentsManagement } from './payments-management';
import { PaymentService } from '../../../core/services/payment.service';
import { PaymentDTO, PaymentRequestDTO } from '../../../core/models/Payment/payment.model';

describe('PaymentsManagement Component', () => {
  let component: PaymentsManagement;
  let paymentServiceMock: any;
  let messageServiceMock: any;
  let translateServiceMock: any;

  const mockPayments: PaymentDTO[] = [
    {
      id: 1,
      amount: 250.0,
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'COMPLETED',
      transactionDate: '2026-11-17T10:00:00',
      hotelBookingId: 101,
      busBookingId: null,
    },
    {
      id: 2,
      amount: 75.5,
      paymentMethod: 'PAYPAL',
      paymentStatus: 'PENDING',
      transactionDate: '2026-11-17T11:00:00',
      hotelBookingId: null,
      busBookingId: 202,
    },
    {
      id: 3,
      amount: 120.0,
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'REFUNDED',
      transactionDate: '2026-11-17T12:00:00',
      hotelBookingId: null,
      busBookingId: null,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    paymentServiceMock = {
      getPayments: vi.fn().mockReturnValue(of(mockPayments)),
      createPayment: vi.fn().mockImplementation((payload: PaymentRequestDTO) =>
        of({ id: 99, ...payload, transactionDate: payload.transactionDate || '' })
      ),
      updatePayment: vi.fn().mockImplementation((id: number, payload: PaymentRequestDTO) =>
        of({ id, ...payload, transactionDate: payload.transactionDate || '' })
      ),
      deletePayment: vi.fn().mockReturnValue(of(undefined)),
    };

    messageServiceMock = {
      add: vi.fn(),
    };

    translateServiceMock = {
      instant: vi.fn((key: string) => key),
    };

    const injector = Injector.create({
      providers: [
        { provide: PaymentService, useValue: paymentServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: TranslateService, useValue: translateServiceMock },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new PaymentsManagement());
    component.ngOnInit();
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize and load payments from service', () => {
    expect(component).toBeTruthy();
    expect(paymentServiceMock.getPayments).toHaveBeenCalled();
    expect(component.payments().length).toBe(3);
    expect(component.filteredPayments().length).toBe(3);
  });

  it('should calculate total completed revenue correctly', () => {
    // Only payment #1 is COMPLETED with amount 250.0
    expect(component.totalCompletedRevenue()).toBe(250.0);
  });

  it('should filter payments by search query', () => {
    component.searchQuery.set('101');
    expect(component.filteredPayments().length).toBe(1);
    expect(component.filteredPayments()[0].id).toBe(1);

    component.searchQuery.set('202');
    expect(component.filteredPayments().length).toBe(1);
    expect(component.filteredPayments()[0].id).toBe(2);
  });

  it('should filter payments by payment method', () => {
    component.onMethodChange('PAYPAL');
    expect(component.filteredPayments().length).toBe(1);
    expect(component.filteredPayments()[0].paymentMethod).toBe('PAYPAL');
  });

  it('should filter payments by payment status', () => {
    component.onStatusChange('REFUNDED');
    expect(component.filteredPayments().length).toBe(1);
    expect(component.filteredPayments()[0].paymentStatus).toBe('REFUNDED');
  });

  it('should clear all filters', () => {
    component.searchQuery.set('test');
    component.methodFilter.set('CREDIT_CARD');
    component.statusFilter.set('COMPLETED');
    expect(component.hasActiveFilters()).toBe(true);

    component.clearFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.methodFilter()).toBe('');
    expect(component.statusFilter()).toBe('');
    expect(component.hasActiveFilters()).toBe(false);
  });

  it('should open create dialog with clean default form state', () => {
    component.openCreateDialog();
    expect(component.dialogVisible()).toBe(true);
    expect(component.isEditMode()).toBe(false);
    expect(component.editingPaymentId()).toBeNull();
    expect(component.paymentForm.get('amount')?.value).toBe(100);
    expect(component.paymentForm.get('paymentMethod')?.value).toBe('CREDIT_CARD');
  });

  it('should open edit dialog with payment details', () => {
    const payment = mockPayments[0]; // hotelBookingId: 101
    component.openEditDialog(payment);
    expect(component.dialogVisible()).toBe(true);
    expect(component.isEditMode()).toBe(true);
    expect(component.editingPaymentId()).toBe(1);
    expect(component.paymentForm.get('amount')?.value).toBe(250.0);
    expect(component.paymentForm.get('bookingType')?.value).toBe('HOTEL');
    expect(component.paymentForm.get('bookingId')?.value).toBe(101);
  });

  it('should correctly call createPayment with null for opposite bookingId on save', () => {
    component.openCreateDialog();
    component.paymentForm.patchValue({
      amount: 300,
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'COMPLETED',
      transactionDate: '2026-11-17T14:30',
      bookingType: 'HOTEL',
      bookingId: 105,
    });

    component.savePayment();

    expect(paymentServiceMock.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 300,
        paymentMethod: 'CREDIT_CARD',
        paymentStatus: 'COMPLETED',
        transactionDate: '2026-11-17T14:30:00',
        hotelBookingId: 105,
        busBookingId: null, // Critical: must be null, never 0
      })
    );
    expect(component.dialogVisible()).toBe(false);
    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Payment Recorded',
      })
    );
  });

  it('should correctly call updatePayment with null for opposite bookingId on save', () => {
    const payment = mockPayments[1]; // bus booking
    component.openEditDialog(payment);
    component.paymentForm.patchValue({
      amount: 85,
      bookingType: 'BUS',
      bookingId: 202,
    });

    component.savePayment();

    expect(paymentServiceMock.updatePayment).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        amount: 85,
        hotelBookingId: null, // Critical: must be null, never 0
        busBookingId: 202,
      })
    );
    expect(component.dialogVisible()).toBe(false);
    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Payment Updated',
      })
    );
  });

  it('should handle delete confirmation dialog and call deletePayment', () => {
    const payment = mockPayments[0];
    component.openDeleteDialog(payment);
    expect(component.deleteDialogVisible()).toBe(true);
    expect(component.paymentToDelete()).toEqual(payment);

    component.confirmDeletePayment();

    expect(paymentServiceMock.deletePayment).toHaveBeenCalledWith(1);
    expect(component.deleteDialogVisible()).toBe(false);
    expect(component.paymentToDelete()).toBeNull();
    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Payment Deleted',
      })
    );
  });

  it('should display error toast when createPayment fails', () => {
    paymentServiceMock.createPayment.mockReturnValue(
      throwError(() => new Error('Booking conflict: payment already completed'))
    );

    component.openCreateDialog();
    component.paymentForm.patchValue({
      amount: 150,
      paymentMethod: 'PAYPAL',
      paymentStatus: 'COMPLETED',
      transactionDate: '2026-11-17T10:00',
      bookingType: 'HOTEL',
      bookingId: 101,
    });

    component.savePayment();

    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Creation Failed',
        detail: 'Booking conflict: payment already completed',
      })
    );
  });

  it('should display error toast when deletePayment fails', () => {
    paymentServiceMock.deletePayment.mockReturnValue(
      throwError(() => new Error('Access denied'))
    );

    component.openDeleteDialog(mockPayments[0]);
    component.confirmDeletePayment();

    expect(messageServiceMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Delete Failed',
        detail: 'Access denied',
      })
    );
  });
});
