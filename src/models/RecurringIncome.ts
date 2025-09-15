export interface RecurringIncome {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'all_months' | 'specific_months';
  selected_months?: number[];
  created_at: string;
  status: 'active' | 'inactive';
}
