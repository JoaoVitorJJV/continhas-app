export interface ShoppingItem {
  id: string;
  shopping_month_id: string;
  product_id?: string;
  name?: string;
  amount: number;
  quantity: number;
  category?: string;
  from_list_id?: string;
  created_at: string;
}
