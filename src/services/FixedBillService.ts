import { FixedBill } from '../models/FixedBill';

export class FixedBillService {
  static async createFixedBill(db: any, billData: {
    name: string;
    amount: number;
    category: string;
    frequency: 'all_months' | 'specific_months';
    selected_months?: number[];
    profile_id: string;
  }): Promise<FixedBill> {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    const sql = `INSERT INTO fixed_bills (
      id, name, amount, category, frequency, selected_months, profile_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const selectedMonthsJson = billData.selected_months ? JSON.stringify(billData.selected_months) : null;
    
    const params = [
      id,
      billData.name,
      billData.amount,
      billData.category,
      billData.frequency,
      selectedMonthsJson,
      billData.profile_id,
      'active'
    ];
    
    await db.runAsync(sql, params);
    
    const newBill: FixedBill = {
      id,
      name: billData.name,
      amount: billData.amount,
      category: billData.category,
      frequency: billData.frequency,
      selected_months: selectedMonthsJson || undefined,
      created_at: new Date().toISOString(),
      status: 'active'
    };
    
    return newBill;
  }

  static async getAllFixedBills(db: any, profileId: string): Promise<FixedBill[]> {
    return await db.getAllAsync('SELECT * FROM fixed_bills WHERE profile_id = ? ORDER BY created_at DESC', [profileId]);
  }

  static async getActiveFixedBills(db: any, profileId: string): Promise<FixedBill[]> {
    return await db.getAllAsync("SELECT * FROM fixed_bills WHERE status = 'active' AND profile_id = ? ORDER BY created_at DESC", [profileId]);
  }

  static async getFixedBillsForMonth(db: any, month: number, profileId: string): Promise<FixedBill[]> {
    const bills = await this.getActiveFixedBills(db, profileId);
    
    return bills.filter(bill => {
      if (bill.frequency === 'all_months') {
        return true;
      }
      
      if (bill.frequency === 'specific_months' && bill.selected_months) {
        const selectedMonths = JSON.parse(bill.selected_months);
        return selectedMonths.includes(month);
      }
      
      return false;
    });
  }

  static async getFixedBillById(db: any, id: string): Promise<FixedBill | null> {
    const result = await db.getFirstAsync('SELECT * FROM fixed_bills WHERE id = ?', [id]);
    return result || null;
  }

  static async updateFixedBill(db: any, id: string, updates: Partial<FixedBill>): Promise<void> {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.frequency !== undefined) {
      fields.push('frequency = ?');
      values.push(updates.frequency);
    }
    if (updates.selected_months !== undefined) {
      fields.push('selected_months = ?');
      values.push(updates.selected_months);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    
    if (fields.length === 0) return;
    
    values.push(id);
    const sql = `UPDATE fixed_bills SET ${fields.join(', ')} WHERE id = ?`;
    
    await db.runAsync(sql, values);
  }

  static async deleteFixedBill(db: any, id: string): Promise<void> {
    await db.runAsync('DELETE FROM fixed_bills WHERE id = ?', [id]);
  }

  static async getTotalFixedBillsForMonth(db: any, month: number, profileId: string): Promise<number> {
    const bills = await this.getFixedBillsForMonth(db, month, profileId);
    return bills.reduce((total, bill) => total + bill.amount, 0);
  }
}
