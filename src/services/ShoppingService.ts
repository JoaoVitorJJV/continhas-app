import { SQLiteDatabase } from 'expo-sqlite';
import { Product } from '../models/Product';
import { SavedShoppingItem } from '../models/SavedShoppingItem';
import { SavedShoppingList } from '../models/SavedShoppingList';
import { ShoppingItem } from '../models/ShoppingItem';
import { ShoppingMonth } from '../models/ShoppingMonth';

export class ShoppingService {
  static async getOrCreateShoppingMonth(db: SQLiteDatabase, year: number, month: number, profileId: string): Promise<ShoppingMonth> {
    try {
      // Tentar buscar o mês existente
      const existingMonth = await db.getFirstAsync<ShoppingMonth>(
        'SELECT * FROM shopping_months WHERE year = ? AND month = ? AND profile_id = ?',
        [year, month, profileId]
      );

      if (existingMonth) {
        return existingMonth;
      }

      // Criar novo mês se não existir
      const id = `shopping_${year}_${month}_${profileId}`;
      
      try {
        await db.runAsync(
          'INSERT INTO shopping_months (id, year, month, voucher_limit, profile_id) VALUES (?, ?, ?, ?, ?)',
          [id, year, month, 0, profileId]
        );
      } catch (insertError: any) {
        // Se houve erro de constraint, tentar buscar novamente (pode ter sido criado por outra thread)
        if (insertError.message?.includes('UNIQUE constraint failed')) {
          console.log('Constraint UNIQUE falhou, tentando buscar o registro existente...');
          
          // Tentar buscar com profile_id primeiro
          let existingMonthAfterError = await db.getFirstAsync<ShoppingMonth>(
            'SELECT * FROM shopping_months WHERE year = ? AND month = ? AND profile_id = ?',
            [year, month, profileId]
          );
          
          // Se não encontrou, tentar buscar sem profile_id (dados antigos)
          if (!existingMonthAfterError) {
            existingMonthAfterError = await db.getFirstAsync<ShoppingMonth>(
              'SELECT * FROM shopping_months WHERE year = ? AND month = ?',
              [year, month]
            );
          }
          
          if (existingMonthAfterError) {
            console.log('Registro existente encontrado:', existingMonthAfterError.id);
            
            // Se o registro não tem profile_id, atualizar
            if (!existingMonthAfterError.profile_id) {
              console.log('Atualizando profile_id do registro existente...');
              await db.runAsync(
                'UPDATE shopping_months SET profile_id = ? WHERE id = ?',
                [profileId, existingMonthAfterError.id]
              );
              existingMonthAfterError.profile_id = profileId;
            }
            
            return existingMonthAfterError;
          }
        }
        throw insertError;
      }

      return {
        id,
        year,
        month,
        voucher_limit: 0,
        profile_id: profileId,
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
    category?: string,
    profileId?: string
  ): Promise<ShoppingItem> {
    try {
      const id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      let productId: string | undefined;

      // Se tem nome do produto, criar ou buscar produto
      if (productName && productName.trim()) {
        try {
          const existingProduct = await db.getFirstAsync<Product>(
            'SELECT * FROM products WHERE name = ? AND profile_id = ?',
            [productName.trim(), profileId || '']
          );

          if (existingProduct) {
            productId = existingProduct.id;
          } else {
            const productIdNew = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.runAsync(
              'INSERT INTO products (id, name, category, profile_id) VALUES (?, ?, ?, ?)',
              [productIdNew, productName.trim(), category || null, profileId || '']
            );
            productId = productIdNew;
          }
        } catch (productError: any) {
          // Se houve erro de constraint, tentar buscar o produto existente
          if (productError.message?.includes('UNIQUE constraint failed')) {
            console.log('Constraint UNIQUE falhou para produto, tentando buscar existente...');
            
            // Tentar buscar com profile_id primeiro
            let existingProduct = await db.getFirstAsync<Product>(
              'SELECT * FROM products WHERE name = ? AND profile_id = ?',
              [productName.trim(), profileId || '']
            );
            
            // Se não encontrou, tentar buscar sem profile_id (dados antigos)
            if (!existingProduct) {
              existingProduct = await db.getFirstAsync<Product>(
                'SELECT * FROM products WHERE name = ?',
                [productName.trim()]
              );
            }
            
            if (existingProduct) {
              productId = existingProduct.id;
              console.log('Produto existente encontrado:', existingProduct.name);
            } else {
              console.error('Erro ao criar produto e não foi possível encontrar existente:', productError);
              throw productError;
            }
          } else {
            throw productError;
          }
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

  static async getAllProducts(db: SQLiteDatabase, profileId: string): Promise<Product[]> {
    try {
      const products = await db.getAllAsync<Product>(
        'SELECT * FROM products WHERE profile_id = ? ORDER BY name ASC',
        [profileId]
      );
      return products;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  static async searchProducts(db: SQLiteDatabase, query: string, profileId: string): Promise<Product[]> {
    try {
      const products = await db.getAllAsync<Product>(
        'SELECT * FROM products WHERE name LIKE ? AND profile_id = ? ORDER BY name ASC LIMIT 10',
        [`%${query}%`, profileId]
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
    items: ShoppingItem[],
    profileId: string
  ): Promise<SavedShoppingList> {
    try {
      const savedListId = `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const itemCount = items.length;

      // Criar a lista salva
      await db.runAsync(
        'INSERT INTO saved_shopping_lists (id, shopping_month_id, name, total_amount, item_count, profile_id) VALUES (?, ?, ?, ?, ?, ?)',
        [savedListId, shoppingMonthId, listName, totalAmount, itemCount, profileId]
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
        profile_id: profileId,
        saved_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao salvar lista de compras:', error);
      throw error;
    }
  }

  static async getSavedShoppingLists(db: SQLiteDatabase, shoppingMonthId: string, profileId: string): Promise<SavedShoppingList[]> {
    try {
      const lists = await db.getAllAsync<SavedShoppingList>(
        'SELECT * FROM saved_shopping_lists WHERE shopping_month_id = ? AND profile_id = ? ORDER BY saved_at DESC',
        [shoppingMonthId, profileId]
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
