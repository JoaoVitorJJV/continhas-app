export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  FIXED_BILLS = 'fixed_bills'
}

export enum PaymentMethod {
  DEBIT_CARD = 'debit_card',
  CREDIT_CARD = 'credit_card',
  PIX = 'pix',
  CASH = 'cash',
  CARD_BILL = 'card_bill',
  BANK_LOAN = 'bank_loan'
}

export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  ELO = 'elo',
  AMERICAN_EXPRESS = 'american_express',
  OTHER = 'other'
}

export interface Card {
  id: string;
  brand: CardBrand;
  lastFourDigits: string;
  nickname: string;
  created_at: string;
}

export interface PaymentInfo {
  method: PaymentMethod;
  cardId?: string;
  installments?: number;
  totalAmount?: number;
  principalAmount?: number;
  interestAmount?: number;
}
