export interface FixedBill {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'all_months' | 'specific_months';
  selected_months?: string; // JSON string com array de meses (1-12)
  created_at: string;
  status: 'active' | 'inactive';
}
