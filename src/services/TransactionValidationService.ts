import { PaymentMethod } from '../types/Payment';

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface TransactionValidationData {
  type: 'income' | 'expense' | 'fixed_bills';
  description?: string;
  amount?: string;
  selectedCategory?: string;
  paymentMethod?: PaymentMethod | null;
  selectedCard?: string;
  installments?: number;
  loanInstallments?: number;
  totalAmount?: string;
  principalAmount?: string;
  billName?: string;
  billFrequency?: 'all_months' | 'specific_months';
  selectedMonths?: number[];
  isRecurringIncome?: boolean;
  incomeFrequency?: 'all_months' | 'specific_months';
  selectedIncomeMonths?: number[];
}

export class TransactionValidationService {
  static validateTransaction(data: TransactionValidationData): ValidationResult {
    switch (data.type) {
      case 'income':
        return this.validateIncome(data);
      case 'expense':
        return this.validateExpense(data);
      case 'fixed_bills':
        return this.validateFixedBill(data);
      default:
        return { isValid: false, message: 'Tipo de transação inválido' };
    }
  }

  private static validateIncome(data: TransactionValidationData): ValidationResult {
    // Validações básicas para receita
    if (!data.description?.trim()) {
      return { isValid: false, message: 'Por favor, preencha a descrição' };
    }

    if (!data.selectedCategory) {
      return { isValid: false, message: 'Por favor, selecione uma categoria' };
    }

    if (!data.amount?.trim()) {
      return { isValid: false, message: 'Por favor, preencha o valor' };
    }

    const numericAmount = parseFloat(data.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return { isValid: false, message: 'Por favor, insira um valor válido' };
    }

    // Validações específicas para receitas recorrentes
    if (data.isRecurringIncome) {
      if (data.incomeFrequency === 'specific_months' && (!data.selectedIncomeMonths || data.selectedIncomeMonths.length === 0)) {
        return { isValid: false, message: 'Por favor, selecione pelo menos um mês' };
      }
    }

    return { isValid: true };
  }

  private static validateExpense(data: TransactionValidationData): ValidationResult {
    // Validações básicas para despesa
    if (!data.description?.trim()) {
      return { isValid: false, message: 'Por favor, preencha a descrição' };
    }

    if (!data.selectedCategory) {
      return { isValid: false, message: 'Por favor, selecione uma categoria' };
    }

    if (!data.amount?.trim()) {
      return { isValid: false, message: 'Por favor, preencha o valor' };
    }

    const numericAmount = parseFloat(data.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return { isValid: false, message: 'Por favor, insira um valor válido' };
    }

    if (!data.paymentMethod) {
      return { isValid: false, message: 'Por favor, selecione a forma de pagamento' };
    }

    // Validações específicas por método de pagamento
    const paymentValidation = this.validatePaymentMethod(data);
    if (!paymentValidation.isValid) {
      return paymentValidation;
    }

    return { isValid: true };
  }

  private static validateFixedBill(data: TransactionValidationData): ValidationResult {
    if (!data.billName?.trim()) {
      return { isValid: false, message: 'Por favor, preencha o nome da conta' };
    }

    if (!data.selectedCategory) {
      return { isValid: false, message: 'Por favor, selecione uma categoria' };
    }

    if (!data.amount?.trim()) {
      return { isValid: false, message: 'Por favor, preencha o valor' };
    }

    const numericAmount = parseFloat(data.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return { isValid: false, message: 'Por favor, insira um valor válido' };
    }

    if (data.billFrequency === 'specific_months' && (!data.selectedMonths || data.selectedMonths.length === 0)) {
      return { isValid: false, message: 'Por favor, selecione pelo menos um mês' };
    }

    return { isValid: true };
  }

  private static validatePaymentMethod(data: TransactionValidationData): ValidationResult {
    if (!data.paymentMethod) {
      return { isValid: true }; // Já validado acima
    }

    switch (data.paymentMethod) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.CARD_BILL:
        if (!data.selectedCard) {
          return { isValid: false, message: 'Por favor, selecione o cartão utilizado' };
        }
        if (data.installments && data.installments < 1) {
          return { isValid: false, message: 'Número de parcelas inválido' };
        }
        break;

      case PaymentMethod.BANK_LOAN:
        return this.validateBankLoan(data);

      case PaymentMethod.DEBIT_CARD:
      case PaymentMethod.PIX:
      case PaymentMethod.CASH:
        // Não precisam de validações adicionais
        break;

      default:
        return { isValid: false, message: 'Método de pagamento inválido' };
    }

    return { isValid: true };
  }

  private static validateBankLoan(data: TransactionValidationData): ValidationResult {
    if (!data.totalAmount?.trim()) {
      return { isValid: false, message: 'Por favor, preencha o valor total do empréstimo' };
    }

    if (!data.principalAmount?.trim()) {
      return { isValid: false, message: 'Por favor, preencha o valor sem juros' };
    }

    const totalAmount = parseFloat(data.totalAmount);
    const principalAmount = parseFloat(data.principalAmount);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      return { isValid: false, message: 'Valor total do empréstimo inválido' };
    }

    if (isNaN(principalAmount) || principalAmount <= 0) {
      return { isValid: false, message: 'Valor sem juros inválido' };
    }

    if (principalAmount > totalAmount) {
      return { isValid: false, message: 'O valor sem juros não pode ser maior que o valor total' };
    }

    if (data.loanInstallments && data.loanInstallments < 1) {
      return { isValid: false, message: 'Número de parcelas do empréstimo inválido' };
    }

    return { isValid: true };
  }

  static clearFormFieldsByType(type: 'income' | 'expense' | 'fixed_bills'): Partial<TransactionValidationData> {
    const fieldsToClear: Partial<TransactionValidationData> = {};

    switch (type) {
      case 'income':
        // Para receita, limpar campos específicos de despesa e contas fixas
        fieldsToClear.paymentMethod = null;
        fieldsToClear.selectedCard = '';
        fieldsToClear.installments = 1;
        fieldsToClear.loanInstallments = 1;
        fieldsToClear.totalAmount = '';
        fieldsToClear.principalAmount = '';
        fieldsToClear.billName = '';
        fieldsToClear.billFrequency = 'all_months';
        fieldsToClear.selectedMonths = [];
        fieldsToClear.isRecurringIncome = false;
        fieldsToClear.incomeFrequency = 'all_months';
        fieldsToClear.selectedIncomeMonths = [];
        break;

      case 'expense':
        // Para despesa, limpar campos específicos de contas fixas e receitas recorrentes
        fieldsToClear.billName = '';
        fieldsToClear.billFrequency = 'all_months';
        fieldsToClear.selectedMonths = [];
        fieldsToClear.isRecurringIncome = false;
        fieldsToClear.incomeFrequency = 'all_months';
        fieldsToClear.selectedIncomeMonths = [];
        break;

      case 'fixed_bills':
        // Para contas fixas, limpar campos específicos de despesa e receitas recorrentes
        fieldsToClear.paymentMethod = null;
        fieldsToClear.selectedCard = '';
        fieldsToClear.installments = 1;
        fieldsToClear.loanInstallments = 1;
        fieldsToClear.totalAmount = '';
        fieldsToClear.principalAmount = '';
        fieldsToClear.isRecurringIncome = false;
        fieldsToClear.incomeFrequency = 'all_months';
        fieldsToClear.selectedIncomeMonths = [];
        break;
    }

    return fieldsToClear;
  }

  static clearFormFieldsByPaymentMethod(paymentMethod: PaymentMethod): Partial<TransactionValidationData> {
    const fieldsToClear: Partial<TransactionValidationData> = {};

    switch (paymentMethod) {
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.CARD_BILL:
        // Manter campos de cartão e parcelas
        break;

      case PaymentMethod.BANK_LOAN:
        // Limpar campos de cartão, manter campos de empréstimo
        fieldsToClear.selectedCard = '';
        fieldsToClear.installments = 1;
        break;

      case PaymentMethod.DEBIT_CARD:
      case PaymentMethod.PIX:
      case PaymentMethod.CASH:
        // Limpar todos os campos específicos de outros métodos
        fieldsToClear.selectedCard = '';
        fieldsToClear.installments = 1;
        fieldsToClear.loanInstallments = 1;
        fieldsToClear.totalAmount = '';
        fieldsToClear.principalAmount = '';
        break;
    }

    return fieldsToClear;
  }
}
