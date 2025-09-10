import { PaymentMethod } from '../types/Payment';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  created_at: string;
  payment_method?: PaymentMethod;
  card_id?: string;
  installments?: number;
  parent_transaction_id?: string; // Para parcelas
  bank_loan_id?: string; // Referência ao empréstimo bancário
  total_amount?: number; // Para empréstimos
  principal_amount?: number; // Valor sem juros
  interest_amount?: number; // Total de juros
}
