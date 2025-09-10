import { Category } from '../models/Category';
import { Transaction } from '../models/Transaction';
import { FixedBillService } from './FixedBillService';

export class TransactionService {
  static async getAllTransactions(db: any): Promise<Transaction[]> {
    return await db.getAllAsync('SELECT * FROM transactions ORDER BY date DESC');
  }

  static async getTransactionsByMonth(db: any, year: number, month: number): Promise<Transaction[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    
    return await db.getAllAsync(
      'SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC',
      [startDate, endDate]
    );
  }

  static async getRecentTransactions(db: any, limit: number = 5): Promise<Transaction[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`;

    // Buscar transações do mês atual, incluindo parcelas
    const transactions = await db.getAllAsync(
      'SELECT * FROM transactions WHERE date >= ? AND date < ? ORDER BY date DESC LIMIT ?',
      [startDate, endDate, limit]
    );

    return transactions;
  }

  static async addTransaction(db: any, transactionData: {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: Date;
    payment_method?: string;
    card_id?: string;
    installments?: number;
    total_amount?: number;
    principal_amount?: number;
    interest_amount?: number;
    installment_amount?: number;
    bank_loan_id?: string;
  }): Promise<Transaction> {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    const dateStr = transactionData.date.toISOString().split('T')[0];
    
    // Preparar valores para evitar undefined
    const paymentMethod = transactionData.payment_method || null;
    const cardId = transactionData.card_id || null;
    const installments = transactionData.installments || null;
    const totalAmount = transactionData.total_amount || null;
    const principalAmount = transactionData.principal_amount || null;
    const interestAmount = transactionData.interest_amount || null;
    const installmentAmount = transactionData.installment_amount || null;
    const bankLoanId = transactionData.bank_loan_id || null;
    
    try {
      // Se for cartão de crédito ou empréstimo bancário com parcelas, criar transações para cada parcela
      if ((paymentMethod === 'credit_card' || paymentMethod === 'bank_loan') && installments && installments > 1) {
        const installmentAmountValue = installmentAmount || (transactionData.amount / installments);
        const parentId = id;
        
        // Criar todas as parcelas
        for (let i = 0; i < installments; i++) {
          const installmentId = i === 0 ? parentId : parentId + '_' + (i + 1);
          const installmentDate = new Date(transactionData.date);
          installmentDate.setMonth(installmentDate.getMonth() + i);
          const installmentDateStr = installmentDate.toISOString().split('T')[0];
          
          const sql = `INSERT INTO transactions (
            id, description, amount, type, category, date, 
            payment_method, card_id, installments, parent_transaction_id,
            total_amount, principal_amount, interest_amount, bank_loan_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          
          const params = [
            installmentId,
            `${transactionData.description} (${i + 1}/${installments})`,
            installmentAmountValue,
            transactionData.type,
            transactionData.category,
            installmentDateStr,
            paymentMethod,
            cardId,
            installments,
            parentId,
            totalAmount,
            principalAmount,
            interestAmount,
            bankLoanId
          ];
          
          console.log('Executando SQL:', sql);
          console.log('Parâmetros:', params);
          
          await db.runAsync(sql, params);
        }
        
        // Retornar a primeira parcela
        const newTransaction: Transaction = {
          id: parentId,
          description: `${transactionData.description} (1/${installments})`,
          amount: installmentAmountValue,
          type: transactionData.type,
          category: transactionData.category,
          date: dateStr,
          created_at: new Date().toISOString(),
          payment_method: paymentMethod as any,
          card_id: cardId || undefined,
          installments: installments || undefined,
          parent_transaction_id: parentId
        };

        return newTransaction;
      } else {
        // Transação única
        const sql = `INSERT INTO transactions (
          id, description, amount, type, category, date, 
          payment_method, card_id, installments,
          total_amount, principal_amount, interest_amount, bank_loan_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const params = [
          id,
          transactionData.description,
          transactionData.amount,
          transactionData.type,
          transactionData.category,
          dateStr,
          paymentMethod,
          cardId,
          installments,
          totalAmount,
          principalAmount,
          interestAmount,
          bankLoanId
        ];
        
        console.log('Executando SQL:', sql);
        console.log('Parâmetros:', params);
        
        await db.runAsync(sql, params);

        const newTransaction: Transaction = {
          id,
          description: transactionData.description,
          amount: transactionData.amount,
          type: transactionData.type,
          category: transactionData.category,
          date: dateStr,
          created_at: new Date().toISOString(),
          payment_method: paymentMethod as any,
          card_id: cardId || undefined,
          installments: installments || undefined,
          bank_loan_id: bankLoanId || undefined,
          total_amount: totalAmount || undefined,
          principal_amount: principalAmount || undefined,
          interest_amount: interestAmount || undefined
        };

        return newTransaction;
      }
    } catch (error) {
      console.error('Erro detalhado ao salvar transação:', error);
      throw error;
    }
  }

  static async getMonthlyBalance(db: any, year: number, month: number): Promise<number> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
    
    const transactions = await db.getAllAsync(
      'SELECT type, amount FROM transactions WHERE date >= ? AND date < ?',
      [startDate, endDate]
    );

    let balance = 0;
    transactions.forEach((transaction: Transaction) => {
      if (transaction.type === 'income') {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
    });

    // Adicionar contas fixas do mês
    const fixedBills = await FixedBillService.getFixedBillsForMonth(db, month);
    const fixedBillsTotal = fixedBills.reduce((total, bill) => total + bill.amount, 0);
    balance -= fixedBillsTotal;

    return balance;
  }

  static async getTotalDebts(db: any): Promise<number> {
    const result = await db.getFirstAsync(
      'SELECT SUM(amount) as total FROM transactions WHERE type = ?',
      ['expense']
    );
    return result?.total || 0;
  }

  static async getTotalBalance(db: any): Promise<number> {
    const results = await db.getAllAsync(
      'SELECT type, SUM(amount) as total FROM transactions GROUP BY type'
    );

    let balance = 0;
    results.forEach((row: any) => {
      if (row.type === 'income') {
        balance += row.total;
      } else {
        balance -= row.total;
      }
    });

    // Adicionar todas as contas fixas ativas (todos os meses)
    const allFixedBills = await FixedBillService.getActiveFixedBills(db);
    const allFixedBillsTotal = allFixedBills.reduce((total, bill) => total + bill.amount, 0);
    balance -= allFixedBillsTotal;

    return balance;
  }

  static async getExpensesByMonth(db: any, year: number, month: number): Promise<Transaction[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    const transactions = await db.getAllAsync(
      'SELECT * FROM transactions WHERE date >= ? AND date < ? AND type = ? ORDER BY date DESC',
      [startDate, endDate, 'expense']
    );

    return transactions;
  }

  static async getExpensesByMonthAndCard(db: any, year: number, month: number, cardId: string): Promise<Transaction[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    const transactions = await db.getAllAsync(
      'SELECT * FROM transactions WHERE date >= ? AND date < ? AND type = ? AND card_id = ? ORDER BY date DESC',
      [startDate, endDate, 'expense', cardId]
    );

    return transactions;
  }

  static async deleteTransaction(db: any, transactionId: string): Promise<void> {
    // Primeiro, verificar se é uma transação parcelada
    const transaction = await db.getFirstAsync(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    if (transaction && transaction.parent_transaction_id) {
      // Se é uma parcela, deletar todas as parcelas da transação pai
      await db.runAsync(
        'DELETE FROM transactions WHERE parent_transaction_id = ? OR id = ?',
        [transaction.parent_transaction_id, transaction.parent_transaction_id]
      );
    } else if (transaction && transaction.installments && transaction.installments > 1) {
      // Se é a transação pai com parcelas, deletar todas as parcelas
      await db.runAsync(
        'DELETE FROM transactions WHERE parent_transaction_id = ? OR id = ?',
        [transactionId, transactionId]
      );
    } else {
      // Transação simples, deletar apenas ela
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [transactionId]);
    }
  }

  static async getAllCategories(db: any): Promise<Category[]> {
    return await db.getAllAsync('SELECT * FROM categories ORDER BY name');
  }
}
