export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  FIXED_BILL = 'fixed_bill'
}

export const CATEGORY_TYPES = [
  { value: CategoryType.EXPENSE, label: 'Despesa', description: 'Para categorias de gastos' },
  { value: CategoryType.INCOME, label: 'Receita', description: 'Para categorias de ganhos' },
  { value: CategoryType.FIXED_BILL, label: 'Contas Fixas', description: 'Para categorias de contas recorrentes' }
];

export const getCategoryTypeLabel = (type: CategoryType): string => {
  const categoryType = CATEGORY_TYPES.find(ct => ct.value === type);
  return categoryType ? categoryType.label : type;
};

export const getCategoryTypeDescription = (type: CategoryType): string => {
  const categoryType = CATEGORY_TYPES.find(ct => ct.value === type);
  return categoryType ? categoryType.description : '';
};
