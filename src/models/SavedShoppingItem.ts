export interface SavedShoppingItem {
  id: string;
  saved_list_id: string;
  product_id?: string;
  name?: string;
  amount: number;
  quantity: number;
  category?: string;
}
