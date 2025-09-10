import { BankLoan } from '../models/BankLoan';

export class BankLoanService {
  static async createBankLoan(db: any, loanData: {
    description: string;
    total_amount: number;
    principal_amount: number;
    interest_amount: number;
    installment_amount: number;
    installments: number;
    category: string;
    start_date: Date;
  }): Promise<BankLoan> {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const startDateStr = loanData.start_date.toISOString().split('T')[0];
    
    const sql = `INSERT INTO bank_loans (
      id, description, total_amount, principal_amount, interest_amount,
      installment_amount, installments, category, start_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      id,
      loanData.description,
      loanData.total_amount,
      loanData.principal_amount,
      loanData.interest_amount,
      loanData.installment_amount,
      loanData.installments,
      loanData.category,
      startDateStr,
      'active'
    ];
    
    await db.runAsync(sql, params);
    
    const newLoan: BankLoan = {
      id,
      description: loanData.description,
      total_amount: loanData.total_amount,
      principal_amount: loanData.principal_amount,
      interest_amount: loanData.interest_amount,
      installment_amount: loanData.installment_amount,
      installments: loanData.installments,
      category: loanData.category,
      start_date: startDateStr,
      created_at: new Date().toISOString(),
      status: 'active'
    };
    
    return newLoan;
  }

  static async getAllBankLoans(db: any): Promise<BankLoan[]> {
    return await db.getAllAsync('SELECT * FROM bank_loans ORDER BY created_at DESC');
  }

  static async getActiveBankLoans(db: any): Promise<BankLoan[]> {
    return await db.getAllAsync("SELECT * FROM bank_loans WHERE status = 'active' ORDER BY created_at DESC");
  }

  static async getBankLoanById(db: any, id: string): Promise<BankLoan | null> {
    const result = await db.getFirstAsync('SELECT * FROM bank_loans WHERE id = ?', [id]);
    return result || null;
  }

  static async updateBankLoanStatus(db: any, id: string, status: 'active' | 'completed' | 'cancelled'): Promise<void> {
    await db.runAsync('UPDATE bank_loans SET status = ? WHERE id = ?', [status, id]);
  }

  static async deleteBankLoan(db: any, id: string): Promise<void> {
    await db.runAsync('DELETE FROM bank_loans WHERE id = ?', [id]);
  }
}
