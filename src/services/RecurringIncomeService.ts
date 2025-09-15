import { RecurringIncome } from '../models/RecurringIncome';

export class RecurringIncomeService {
  static async createRecurringIncome(db: any, incomeData: {
    name: string;
    amount: number;
    category: string;
    frequency: 'all_months' | 'specific_months';
    selected_months?: number[];
    profile_id: string;
  }): Promise<RecurringIncome> {
    const id = 'rec_inc_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    const sql = `INSERT INTO recurring_incomes (
      id, name, amount, category, frequency, selected_months, profile_id, created_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      id,
      incomeData.name,
      incomeData.amount,
      incomeData.category,
      incomeData.frequency,
      incomeData.selected_months ? JSON.stringify(incomeData.selected_months) : null,
      incomeData.profile_id,
      new Date().toISOString(),
      'active'
    ];
    
    await db.runAsync(sql, params);
    
    const newRecurringIncome: RecurringIncome = {
      id,
      name: incomeData.name,
      amount: incomeData.amount,
      category: incomeData.category,
      frequency: incomeData.frequency,
      selected_months: incomeData.selected_months,
      created_at: new Date().toISOString(),
      status: 'active'
    };
    
    return newRecurringIncome;
  }

  static async getAllRecurringIncomes(db: any, profileId: string): Promise<RecurringIncome[]> {
    const incomes = await db.getAllAsync(
      'SELECT * FROM recurring_incomes WHERE status = ? AND profile_id = ? ORDER BY name', 
      ['active', profileId]
    );
    
    return incomes.map((income: any) => ({
      ...income,
      selected_months: income.selected_months ? JSON.parse(income.selected_months) : undefined
    }));
  }

  static async getRecurringIncomesForMonth(db: any, month: number, profileId: string): Promise<RecurringIncome[]> {
    const allIncomes = await this.getAllRecurringIncomes(db, profileId);
    
    return allIncomes.filter(income => {
      if (income.frequency === 'all_months') {
        return true;
      }
      
      if (income.frequency === 'specific_months' && income.selected_months) {
        return income.selected_months.includes(month);
      }
      
      return false;
    });
  }

  static async updateRecurringIncome(db: any, incomeId: string, incomeData: {
    name?: string;
    amount?: number;
    category?: string;
    frequency?: 'all_months' | 'specific_months';
    selected_months?: number[];
  }): Promise<void> {
    const fields = [];
    const params = [];
    
    if (incomeData.name !== undefined) {
      fields.push('name = ?');
      params.push(incomeData.name);
    }
    
    if (incomeData.amount !== undefined) {
      fields.push('amount = ?');
      params.push(incomeData.amount);
    }
    
    if (incomeData.category !== undefined) {
      fields.push('category = ?');
      params.push(incomeData.category);
    }
    
    if (incomeData.frequency !== undefined) {
      fields.push('frequency = ?');
      params.push(incomeData.frequency);
    }
    
    if (incomeData.selected_months !== undefined) {
      fields.push('selected_months = ?');
      params.push(incomeData.selected_months ? JSON.stringify(incomeData.selected_months) : null);
    }
    
    if (fields.length === 0) {
      return;
    }
    
    params.push(incomeId);
    
    const sql = `UPDATE recurring_incomes SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(sql, params);
  }

  static async deleteRecurringIncome(db: any, incomeId: string): Promise<void> {
    await db.runAsync('UPDATE recurring_incomes SET status = ? WHERE id = ?', ['inactive', incomeId]);
  }

  static async getTotalRecurringIncomeForMonth(db: any, month: number, profileId: string): Promise<number> {
    const incomes = await this.getRecurringIncomesForMonth(db, month, profileId);
    return incomes.reduce((total, income) => total + income.amount, 0);
  }
}
