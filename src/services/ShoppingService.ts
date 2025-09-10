import { SQLiteDatabase } from 'expo-sqlite';
import { Product } from '../models/Product';
import { SavedShoppingItem } from '../models/SavedShoppingItem';
import { SavedShoppingList } from '../models/SavedShoppingList';
import { ShoppingItem } from '../models/ShoppingItem';
import { ShoppingMonth } from '../models/ShoppingMonth';

export class ShoppingService {
  static async getOrCreateShoppingMonth(db: SQLiteDatabase, year: number, month: number): Promise<ShoppingMonth> {
    try {
      // Tentar buscar o mês existente
      const existingMonth = await db.getFirstAsync<ShoppingMonth>(
        'SELECT * FROM shopping_months WHERE year = ? AND month = ?',
        [year, month]
      );

      if (existingMonth) {
        return existingMonth;
      }

      // Criar novo mês se não existir
      const id = `shopping_${year}_${month}`;
      await db.runAsync(
        'INSERT INTO shopping_months (id, year, month, voucher_limit) VALUES (?, ?, ?, ?)',
        [id, year, month, 0]
      );

      return {
        id,
        year,
        month,
        voucher_limit: 0,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao buscar/criar mês de compras:', error);
      throw error;
    }
  }

  static async updateVoucherLimit(db: SQLiteDatabase, shoppingMonthId: string, limit: number): Promise<void> {
    try {
      await db.runAsync(
        'UPDATE shopping_months SET voucher_limit = ? WHERE id = ?',
        [limit, shoppingMonthId]
      );
    } catch (error) {
      console.error('Erro ao atualizar limite do vale:', error);
      throw error;
    }
  }

  static async addShoppingItem(
    db: SQLiteDatabase, 
    shoppingMonthId: string, 
    amount: number,
    quantity: number = 1,
    productName?: string,
    fromListId?: string,
    category?: string
  ): Promise<ShoppingItem> {
    try {
      const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let productId: string | undefined;

      // Se tem nome do produto, criar ou buscar produto
      if (productName && productName.trim()) {
        const existingProduct = await db.getFirstAsync<Product>(
          'SELECT * FROM products WHERE name = ?',
          [productName.trim()]
        );

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          const productIdNew = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.runAsync(
            'INSERT INTO products (id, name, category) VALUES (?, ?, ?)',
            [productIdNew, productName.trim(), category || null]
          );
          productId = productIdNew;
        }
      }

      // Adicionar item
      await db.runAsync(
        'INSERT INTO shopping_items (id, shopping_month_id, product_id, name, amount, quantity, category, from_list_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, shoppingMonthId, productId || null, productName || null, amount, quantity, category || null, fromListId || null]
      );

      return {
        id,
        shopping_month_id: shoppingMonthId,
        product_id: productId,
        name: productName,
        amount,
        quantity,
        category,
        from_list_id: fromListId,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao adicionar item de compra:', error);
      throw error;
    }
  }

  static async getShoppingItems(db: SQLiteDatabase, shoppingMonthId: string): Promise<ShoppingItem[]> {
    try {
      const items = await db.getAllAsync<ShoppingItem>(
        'SELECT * FROM shopping_items WHERE shopping_month_id = ? ORDER BY created_at DESC',
        [shoppingMonthId]
      );
      return items;
    } catch (error) {
      console.error('Erro ao buscar itens de compra:', error);
      throw error;
    }
  }

  static async removeShoppingItem(db: SQLiteDatabase, itemId: string): Promise<void> {
    try {
      await db.runAsync('DELETE FROM shopping_items WHERE id = ?', [itemId]);
    } catch (error) {
      console.error('Erro ao remover item de compra:', error);
      throw error;
    }
  }

  static async getTotalAmount(db: SQLiteDatabase, shoppingMonthId: string): Promise<number> {
    try {
      const result = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(amount * quantity), 0) as total FROM shopping_items WHERE shopping_month_id = ?',
        [shoppingMonthId]
      );
      return result?.total || 0;
    } catch (error) {
      console.error('Erro ao calcular total:', error);
      throw error;
    }
  }

  static async getAllProducts(db: SQLiteDatabase): Promise<Product[]> {
    try {
      const products = await db.getAllAsync<Product>(
        'SELECT * FROM products ORDER BY name ASC'
      );
      return products;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  static async searchProducts(db: SQLiteDatabase, query: string): Promise<Product[]> {
    try {
      const products = await db.getAllAsync<Product>(
        'SELECT * FROM products WHERE name LIKE ? ORDER BY name ASC LIMIT 10',
        [`%${query}%`]
      );
      return products;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  static async saveShoppingList(
    db: SQLiteDatabase, 
    shoppingMonthId: string, 
    listName: string, 
    items: ShoppingItem[]
  ): Promise<SavedShoppingList> {
    try {
      const savedListId = `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const itemCount = items.length;

      // Criar a lista salva
      await db.runAsync(
        'INSERT INTO saved_shopping_lists (id, shopping_month_id, name, total_amount, item_count) VALUES (?, ?, ?, ?, ?)',
        [savedListId, shoppingMonthId, listName, totalAmount, itemCount]
      );

      // Salvar os itens da lista
      for (const item of items) {
        const savedItemId = `saved_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.runAsync(
          'INSERT INTO saved_shopping_items (id, saved_list_id, product_id, name, amount, quantity, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [savedItemId, savedListId, item.product_id || null, item.name || null, item.amount, item.quantity, item.category || null]
        );
      }

      return {
        id: savedListId,
        shopping_month_id: shoppingMonthId,
        name: listName,
        total_amount: totalAmount,
        item_count: itemCount,
        saved_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao salvar lista de compras:', error);
      throw error;
    }
  }

  static async getSavedShoppingLists(db: SQLiteDatabase, shoppingMonthId: string): Promise<SavedShoppingList[]> {
    try {
      const lists = await db.getAllAsync<SavedShoppingList>(
        'SELECT * FROM saved_shopping_lists WHERE shopping_month_id = ? ORDER BY saved_at DESC',
        [shoppingMonthId]
      );
      return lists;
    } catch (error) {
      console.error('Erro ao buscar listas salvas:', error);
      throw error;
    }
  }

  static async getSavedShoppingItems(db: SQLiteDatabase, savedListId: string): Promise<SavedShoppingItem[]> {
    try {
      const items = await db.getAllAsync<SavedShoppingItem>(
        'SELECT * FROM saved_shopping_items WHERE saved_list_id = ? ORDER BY id',
        [savedListId]
      );
      return items;
    } catch (error) {
      console.error('Erro ao buscar itens salvos:', error);
      throw error;
    }
  }

  static async updateItemQuantity(db: SQLiteDatabase, itemId: string, quantity: number): Promise<void> {
    try {
      await db.runAsync(
        'UPDATE shopping_items SET quantity = ? WHERE id = ?',
        [quantity, itemId]
      );
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      throw error;
    }
  }

  static async clearShoppingItems(db: SQLiteDatabase, shoppingMonthId: string): Promise<void> {
    try {
      await db.runAsync(
        'DELETE FROM shopping_items WHERE shopping_month_id = ?',
        [shoppingMonthId]
      );
    } catch (error) {
      console.error('Erro ao limpar itens de compra:', error);
      throw error;
    }
  }

  static async updateSavedShoppingItem(
    db: SQLiteDatabase,
    itemId: string,
    name: string,
    amount: number,
    category?: string
  ): Promise<void> {
    try {
      await db.runAsync(
        'UPDATE saved_shopping_items SET name = ?, amount = ?, category = ? WHERE id = ?',
        [name, amount, category || null, itemId]
      );
    } catch (error) {
      console.error('Erro ao atualizar item salvo:', error);
      throw error;
    }
  }

  static async deleteSavedShoppingItem(db: SQLiteDatabase, itemId: string): Promise<void> {
    try {
      await db.runAsync('DELETE FROM saved_shopping_items WHERE id = ?', [itemId]);
    } catch (error) {
      console.error('Erro ao excluir item salvo:', error);
      throw error;
    }
  }

  static async deleteSavedShoppingList(db: SQLiteDatabase, listId: string): Promise<void> {
    try {
      // Primeiro excluir todos os itens da lista
      await db.runAsync('DELETE FROM saved_shopping_items WHERE saved_list_id = ?', [listId]);
      // Depois excluir a lista
      await db.runAsync('DELETE FROM saved_shopping_lists WHERE id = ?', [listId]);
    } catch (error) {
      console.error('Erro ao excluir lista salva:', error);
      throw error;
    }
  }
}
