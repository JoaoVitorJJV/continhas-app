export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  // Remove todos os caracteres não numéricos exceto vírgula e ponto
  const cleanValue = value.replace(/[^\d,.-]/g, '');
  
  // Substitui vírgula por ponto para conversão
  const normalizedValue = cleanValue.replace(',', '.');
  
  const parsed = parseFloat(normalizedValue);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrencyInput = (value: string): string => {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '');
  
  if (numbers === '') return '';
  
  // Converte para centavos
  const cents = parseInt(numbers) || 0;
  
  // Converte de volta para reais
  const reais = cents / 100;
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais);
};

export const getCurrencyValue = (formattedValue: string): number => {
  // Remove símbolos de moeda e espaços
  const cleanValue = formattedValue.replace(/[R$\s]/g, '');
  
  // No formato brasileiro, vírgula é separador decimal e ponto é separador de milhares
  // Exemplo: "1.250,00" -> "1250.00"
  if (cleanValue.includes(',')) {
    // Se tem vírgula, ela é o separador decimal
    // Remove pontos (separadores de milhares) e substitui vírgula por ponto
    const withoutThousands = cleanValue.replace(/\./g, '');
    const normalizedValue = withoutThousands.replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    return isNaN(parsed) ? 0 : parsed;
  } else {
    // Se não tem vírgula, pode ser um valor inteiro ou com ponto decimal
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
  }
};
