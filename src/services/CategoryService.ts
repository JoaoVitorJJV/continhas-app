import { Category } from '../models/Category';

export class CategoryService {
  static async getAllCategories(db: any, profileId: string): Promise<Category[]> {
    return await db.getAllAsync('SELECT * FROM categories WHERE profile_id = ? ORDER BY name', [profileId]);
  }

  static async getCategoriesByType(db: any, type: 'income' | 'expense' | 'fixed_bill', profileId: string): Promise<Category[]> {
    return await db.getAllAsync(
      'SELECT * FROM categories WHERE type = ? AND profile_id = ? ORDER BY name',
      [type, profileId]
    );
  }

  static async createCategory(db: any, categoryData: {
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense' | 'fixed_bill';
    profile_id: string;
  }): Promise<Category> {
    const id = 'cat_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    const sql = `INSERT INTO categories (id, name, icon, color, type, profile_id, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      id,
      categoryData.name,
      categoryData.icon,
      categoryData.color,
      categoryData.type,
      categoryData.profile_id,
      new Date().toISOString()
    ];
    
    await db.runAsync(sql, params);
    
    const newCategory: Category = {
      id,
      name: categoryData.name,
      icon: categoryData.icon,
      color: categoryData.color,
      type: categoryData.type,
      created_at: new Date().toISOString()
    };
    
    return newCategory;
  }

  static async updateCategory(db: any, categoryId: string, categoryData: {
    name?: string;
    icon?: string;
    color?: string;
    type?: 'income' | 'expense' | 'fixed_bill';
  }): Promise<void> {
    const fields = [];
    const params = [];
    
    if (categoryData.name !== undefined) {
      fields.push('name = ?');
      params.push(categoryData.name);
    }
    
    if (categoryData.icon !== undefined) {
      fields.push('icon = ?');
      params.push(categoryData.icon);
    }
    
    if (categoryData.color !== undefined) {
      fields.push('color = ?');
      params.push(categoryData.color);
    }
    
    if (categoryData.type !== undefined) {
      fields.push('type = ?');
      params.push(categoryData.type);
    }
    
    if (fields.length === 0) {
      return;
    }
    
    params.push(categoryId);
    
    const sql = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(sql, params);
  }

  static async deleteCategory(db: any, categoryId: string): Promise<void> {
    // Verificar se a categoria está sendo usada em transações
    const transactionCount = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM transactions WHERE category = (SELECT name FROM categories WHERE id = ?)',
      [categoryId]
    );
    
    if (transactionCount && transactionCount.count > 0) {
      throw new Error('Não é possível deletar uma categoria que está sendo usada em transações');
    }
    
    // Verificar se a categoria está sendo usada em contas fixas
    const fixedBillCount = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM fixed_bills WHERE category = (SELECT name FROM categories WHERE id = ?)',
      [categoryId]
    );
    
    if (fixedBillCount && fixedBillCount.count > 0) {
      throw new Error('Não é possível deletar uma categoria que está sendo usada em contas fixas');
    }
    
    await db.runAsync('DELETE FROM categories WHERE id = ?', [categoryId]);
  }

  static async getCategoryById(db: any, categoryId: string): Promise<Category | null> {
    return await db.getFirstAsync('SELECT * FROM categories WHERE id = ?', [categoryId]);
  }

  static async getCategoryByName(db: any, categoryName: string): Promise<Category | null> {
    return await db.getFirstAsync('SELECT * FROM categories WHERE name = ?', [categoryName]);
  }

  static async getDefaultCategories(): Promise<Category[]> {
    return [
      // Categorias de Despesa
      { id: 'cat_exp_1', name: 'Alimentação', icon: 'restaurant', color: '#FF6B6B', type: 'expense', created_at: new Date().toISOString() },
      { id: 'cat_exp_2', name: 'Transporte', icon: 'car', color: '#4ECDC4', type: 'expense', created_at: new Date().toISOString() },
      { id: 'cat_exp_3', name: 'Lazer', icon: 'game-controller', color: '#45B7D1', type: 'expense', created_at: new Date().toISOString() },
      { id: 'cat_exp_4', name: 'Saúde', icon: 'medical', color: '#96CEB4', type: 'expense', created_at: new Date().toISOString() },
      { id: 'cat_exp_5', name: 'Conta Energia', icon: 'flash', color: '#FFA500', type: 'expense', created_at: new Date().toISOString() },
      { id: 'cat_exp_6', name: 'Gás', icon: 'flame', color: '#FF4500', type: 'expense', created_at: new Date().toISOString() },
      { id: 'cat_exp_7', name: 'Conta Internet', icon: 'wifi', color: '#4169E1', type: 'expense', created_at: new Date().toISOString() },
      { id: 'cat_exp_8', name: 'Manutenção Veículos', icon: 'construct', color: '#8B4513', type: 'expense', created_at: new Date().toISOString() },
      
      // Categorias de Receita
      { id: 'cat_inc_1', name: 'Salário', icon: 'briefcase', color: '#FFEAA7', type: 'income', created_at: new Date().toISOString() },
      { id: 'cat_inc_2', name: 'Freelance', icon: 'laptop', color: '#DDA0DD', type: 'income', created_at: new Date().toISOString() },
      { id: 'cat_inc_3', name: 'Mesada, Rendimentos e Outros', icon: 'cash', color: '#32CD32', type: 'income', created_at: new Date().toISOString() },
      
      // Categorias de Contas Fixas
      { id: 'cat_fix_1', name: 'Aluguel', icon: 'home', color: '#8B0000', type: 'fixed_bill', created_at: new Date().toISOString() },
      { id: 'cat_fix_2', name: 'IPTU', icon: 'business', color: '#2F4F4F', type: 'fixed_bill', created_at: new Date().toISOString() },
      { id: 'cat_fix_3', name: 'IPVA', icon: 'car', color: '#4682B4', type: 'fixed_bill', created_at: new Date().toISOString() },
      { id: 'cat_fix_4', name: 'Financiamento', icon: 'card', color: '#800080', type: 'fixed_bill', created_at: new Date().toISOString() },
      { id: 'cat_fix_5', name: 'Consórcios', icon: 'people', color: '#DAA520', type: 'fixed_bill', created_at: new Date().toISOString() },
      { id: 'cat_fix_6', name: 'Contas da Casa', icon: 'home-outline', color: '#8B4513', type: 'fixed_bill', created_at: new Date().toISOString() },
    ];
  }
}
