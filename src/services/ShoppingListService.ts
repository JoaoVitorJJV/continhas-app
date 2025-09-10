import { SQLiteDatabase } from 'expo-sqlite';
import { Product } from '../models/Product';
import { ShoppingList } from '../models/ShoppingList';
import { ShoppingListItem } from '../models/ShoppingListItem';

export class ShoppingListService {
  static async createShoppingList(db: SQLiteDatabase, name: string): Promise<ShoppingList> {
    try {
      const id = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.runAsync(
        'INSERT INTO shopping_lists (id, name) VALUES (?, ?)',
        [id, name]
      );

      return {
        id,
        name,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao criar lista de compras:', error);
      throw error;
    }
  }

  static async getAllShoppingLists(db: SQLiteDatabase): Promise<ShoppingList[]> {
    try {
      const lists = await db.getAllAsync<ShoppingList>(
        'SELECT * FROM shopping_lists ORDER BY created_at DESC'
      );
      return lists;
    } catch (error) {
      console.error('Erro ao buscar listas de compras:', error);
      throw error;
    }
  }

  static async deleteShoppingList(db: SQLiteDatabase, listId: string): Promise<void> {
    try {
      await db.runAsync('DELETE FROM shopping_lists WHERE id = ?', [listId]);
    } catch (error) {
      console.error('Erro ao excluir lista de compras:', error);
      throw error;
    }
  }

  static async addShoppingListItem(
    db: SQLiteDatabase,
    listId: string,
    name: string,
    quantity: number = 1,
    durationDays?: number,
    productId?: string,
    category?: string
  ): Promise<ShoppingListItem> {
    try {
      const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Se tem productId, usar ele, senão criar produto
      let finalProductId = productId;
      if (!productId) {
        const existingProduct = await db.getFirstAsync<Product>(
          'SELECT * FROM products WHERE name = ?',
          [name.trim()]
        );

        if (existingProduct) {
          finalProductId = existingProduct.id;
        } else {
          const productIdNew = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.runAsync(
            'INSERT INTO products (id, name, category) VALUES (?, ?, ?)',
            [productIdNew, name.trim(), category || null]
          );
          finalProductId = productIdNew;
        }
      }

      await db.runAsync(
        'INSERT INTO shopping_list_items (id, list_id, product_id, name, quantity, duration_days, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, listId, finalProductId || null, name.trim(), quantity, durationDays || null, category || null]
      );

      return {
        id,
        list_id: listId,
        product_id: finalProductId,
        name: name.trim(),
        quantity,
        duration_days: durationDays,
        category,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao adicionar item à lista:', error);
      throw error;
    }
  }

  static async getShoppingListItems(db: SQLiteDatabase, listId: string): Promise<ShoppingListItem[]> {
    try {
      const items = await db.getAllAsync<ShoppingListItem>(
        'SELECT * FROM shopping_list_items WHERE list_id = ? ORDER BY created_at ASC',
        [listId]
      );
      return items;
    } catch (error) {
      console.error('Erro ao buscar itens da lista:', error);
      throw error;
    }
  }

  static async updateShoppingListItem(
    db: SQLiteDatabase,
    itemId: string,
    name?: string,
    quantity?: number,
    durationDays?: number,
    category?: string
  ): Promise<void> {
    try {
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name.trim());
      }
      if (quantity !== undefined) {
        updates.push('quantity = ?');
        values.push(quantity);
      }
      if (durationDays !== undefined) {
        updates.push('duration_days = ?');
        values.push(durationDays);
      }
      if (category !== undefined) {
        updates.push('category = ?');
        values.push(category);
      }

      if (updates.length > 0) {
        values.push(itemId);
        await db.runAsync(
          `UPDATE shopping_list_items SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }
    } catch (error) {
      console.error('Erro ao atualizar item da lista:', error);
      throw error;
    }
  }

  static async deleteShoppingListItem(db: SQLiteDatabase, itemId: string): Promise<void> {
    try {
      await db.runAsync('DELETE FROM shopping_list_items WHERE id = ?', [itemId]);
    } catch (error) {
      console.error('Erro ao excluir item da lista:', error);
      throw error;
    }
  }

  static async searchShoppingListItems(db: SQLiteDatabase, query: string): Promise<ShoppingListItem[]> {
    try {
      const items = await db.getAllAsync<ShoppingListItem>(
        'SELECT * FROM shopping_list_items WHERE name LIKE ? ORDER BY name ASC LIMIT 10',
        [`%${query}%`]
      );
      return items;
    } catch (error) {
      console.error('Erro ao buscar itens da lista:', error);
      throw error;
    }
  }
}
