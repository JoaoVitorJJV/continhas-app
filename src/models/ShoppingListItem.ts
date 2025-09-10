export interface ShoppingListItem {
  id: string;
  list_id: string;
  product_id?: string;
  name: string;
  quantity: number;
  duration_days?: number;
  category?: string;
  created_at: string;
}
