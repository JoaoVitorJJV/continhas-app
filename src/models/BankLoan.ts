export interface BankLoan {
  id: string;
  description: string;
  total_amount: number;
  principal_amount: number;
  interest_amount: number;
  installment_amount: number;
  installments: number;
  category: string;
  start_date: string;
  created_at: string;
  status: 'active' | 'completed' | 'cancelled';
}
