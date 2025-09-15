import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../models/Card';
import { Category } from '../models/Category';
import { Profile } from '../models/Profile';
import { BankLoanService } from '../services/BankLoanService';
import { CardService } from '../services/CardService';
import { FixedBillService } from '../services/FixedBillService';
import { RecurringIncomeService } from '../services/RecurringIncomeService';
import { TransactionService } from '../services/TransactionService';
import { TransactionValidationService } from '../services/TransactionValidationService';
import { PaymentMethod } from '../types/Payment';
import { formatCurrency, formatCurrencyInput, getCurrencyValue } from '../utils/currency';

interface AddTransactionScreenProps {
  onBack: () => void;
  onTransactionAdded: () => void;
  onAddCard: () => void;
  onViewFixedBills: () => void;
  onCategoryManagement: () => void;
  onTransactionsManagement: () => void;
  newCardId?: string | null;
  onCardSelected: () => void;
  currentProfile: Profile;
}

export default function AddTransactionScreen({ onBack, onTransactionAdded, onAddCard, onViewFixedBills, onCategoryManagement, onTransactionsManagement, newCardId, onCardSelected, currentProfile }: AddTransactionScreenProps) {
  const db = useSQLiteContext();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [formattedAmount, setFormattedAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'fixed_bills'>('expense');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [installments, setInstallments] = useState<number>(1);
  const [loanInstallments, setLoanInstallments] = useState<number>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Campos específicos para empréstimo bancário
  const [totalAmount, setTotalAmount] = useState('');
  const [formattedTotalAmount, setFormattedTotalAmount] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [formattedPrincipalAmount, setFormattedPrincipalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [formattedInterestAmount, setFormattedInterestAmount] = useState('');
  
  // Estados para contas fixas
  const [billName, setBillName] = useState('');
  const [billFrequency, setBillFrequency] = useState<'all_months' | 'specific_months'>('all_months');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  // Estados para receitas recorrentes
  const [isRecurringIncome, setIsRecurringIncome] = useState(false);
  const [incomeFrequency, setIncomeFrequency] = useState<'all_months' | 'specific_months'>('all_months');
  const [selectedIncomeMonths, setSelectedIncomeMonths] = useState<number[]>([]);

  // Salvar estado dos campos no AsyncStorage
  const saveFormState = async () => {
    try {
      const formState = {
        description,
        amount,
        formattedAmount,
        type,
        selectedCategory,
        paymentMethod,
        selectedCard,
        installments,
        loanInstallments,
        totalAmount,
        formattedTotalAmount,
        principalAmount,
        formattedPrincipalAmount,
        interestAmount,
        formattedInterestAmount,
        billName,
        billFrequency,
        selectedMonths,
        isRecurringIncome,
        incomeFrequency,
        selectedIncomeMonths
      };
      console.log('Salvando estado do formulário:', formState);
      await AsyncStorage.setItem('addTransactionFormState', JSON.stringify(formState));
    } catch (error) {
      console.error('Erro ao salvar estado do formulário:', error);
    }
  };

  // Carregar estado dos campos do AsyncStorage
  const loadFormState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('addTransactionFormState');
      console.log('Estado salvo encontrado:', savedState);
      if (savedState) {
        const formState = JSON.parse(savedState);
        console.log('Carregando estado do formulário:', formState);
        setDescription(formState.description || '');
        setAmount(formState.amount || '');
        setFormattedAmount(formState.formattedAmount || '');
        setType(formState.type || 'expense');
        setSelectedCategory(formState.selectedCategory || '');
        setPaymentMethod(formState.paymentMethod || null);
        setSelectedCard(formState.selectedCard || '');
        setInstallments(formState.installments || 1);
        setLoanInstallments(formState.loanInstallments || 1);
        setTotalAmount(formState.totalAmount || '');
        setFormattedTotalAmount(formState.formattedTotalAmount || '');
        setPrincipalAmount(formState.principalAmount || '');
        setFormattedPrincipalAmount(formState.formattedPrincipalAmount || '');
        setInterestAmount(formState.interestAmount || '');
        setFormattedInterestAmount(formState.formattedInterestAmount || '');
        setBillName(formState.billName || '');
        setBillFrequency(formState.billFrequency || 'all_months');
        setSelectedMonths(formState.selectedMonths || []);
        setIsRecurringIncome(formState.isRecurringIncome || false);
        setIncomeFrequency(formState.incomeFrequency || 'all_months');
        setSelectedIncomeMonths(formState.selectedIncomeMonths || []);
      }
    } catch (error) {
      console.error('Erro ao carregar estado do formulário:', error);
    }
  };

  // Limpar estado salvo
  const clearFormState = async () => {
    try {
      await AsyncStorage.removeItem('addTransactionFormState');
    } catch (error) {
      console.error('Erro ao limpar estado do formulário:', error);
    }
  };

  const loadData = async () => {
    try {
      const [allCategories, allCards] = await Promise.all([
        TransactionService.getAllCategories(db, currentProfile.id),
        CardService.getAllCards(db, currentProfile.id)
      ]);
      setCategories(allCategories);
      setCards(allCards);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadData();
      await loadFormState();
      setIsInitialized(true); // Marcar como inicializado após carregar os dados
    };
    initializeData();
  }, [db]);

  // Selecionar automaticamente o novo cartão quando ele for criado
  useEffect(() => {
    if (newCardId && cards.length > 0) {
      const newCard = cards.find(card => card.id === newCardId);
      if (newCard) {
        setSelectedCard(newCardId);
        onCardSelected(); // Limpar o newCardId
      }
    }
  }, [newCardId, cards, onCardSelected]);

  // Recarregar dados quando voltar da criação de cartão
  useEffect(() => {
    if (newCardId) {
      console.log('Novo cartão detectado, recarregando dados...');
      loadData();
    }
  }, [newCardId]);

  // Salvar estado dos campos sempre que eles mudarem (exceto na inicialização)
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (isInitialized) {
      console.log('Salvando estado do formulário...');
      saveFormState();
    }
  }, [description, amount, formattedAmount, type, selectedCategory, paymentMethod, selectedCard, installments, loanInstallments, totalAmount, formattedTotalAmount, principalAmount, formattedPrincipalAmount, interestAmount, formattedInterestAmount, billName, billFrequency, selectedMonths, isRecurringIncome, incomeFrequency, selectedIncomeMonths]);

  const handleAmountChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    setFormattedAmount(formatted);
    const numericValue = getCurrencyValue(formatted);
    setAmount(numericValue.toString());
  };

  const handleTotalAmountChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    setFormattedTotalAmount(formatted);
    const numericValue = getCurrencyValue(formatted);
    setTotalAmount(numericValue.toString());
  };

  const handlePrincipalAmountChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    setFormattedPrincipalAmount(formatted);
    const numericValue = getCurrencyValue(formatted);
    setPrincipalAmount(numericValue.toString());
  };


  const toggleMonth = (month: number) => {
    setSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const toggleIncomeMonth = (month: number) => {
    setSelectedIncomeMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };


  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    const labels = {
      [PaymentMethod.DEBIT_CARD]: 'Cartão de Débito',
      [PaymentMethod.CREDIT_CARD]: 'Cartão de Crédito',
      [PaymentMethod.PIX]: 'Pix',
      [PaymentMethod.CASH]: 'Dinheiro',
      [PaymentMethod.CARD_BILL]: 'Fatura Cartão',
      [PaymentMethod.BANK_LOAN]: 'Empréstimo Bancário'
    };
    return labels[method];
  };

  const handleSave = async () => {
    // Usar o serviço de validação
    const validationData = {
      type,
      description,
      amount,
      selectedCategory,
      paymentMethod,
      selectedCard,
      installments,
      loanInstallments,
      totalAmount,
      principalAmount,
      billName,
      billFrequency,
      selectedMonths,
      isRecurringIncome,
      incomeFrequency,
      selectedIncomeMonths
    };

    const validation = TransactionValidationService.validateTransaction(validationData);
    if (!validation.isValid) {
      Alert.alert('Erro', validation.message!);
      return;
    }

    // Validação específica para contas fixas
    if (type === 'fixed_bills') {
      setIsLoading(true);
      try {
        const numericAmount = parseFloat(amount);
        await FixedBillService.createFixedBill(db, {
          name: billName.trim(),
          amount: numericAmount,
          category: selectedCategory,
          frequency: billFrequency,
          selected_months: billFrequency === 'specific_months' ? selectedMonths : undefined,
          profile_id: currentProfile.id,
        });
        Alert.alert('Sucesso', 'Conta fixa adicionada com sucesso!', [
          {
            text: 'OK',
            onPress: async () => {
              await clearFormState();
              onTransactionAdded();
              onBack();
            },
          },
        ]);
      } catch (error) {
        console.error('Erro ao salvar conta fixa:', error);
        Alert.alert('Erro', 'Não foi possível salvar a conta fixa');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Validação específica para receitas recorrentes
    if (type === 'income' && isRecurringIncome) {
      if (!description.trim()) {
        Alert.alert('Erro', 'Por favor, preencha a descrição da receita');
        return;
      }
      if (incomeFrequency === 'specific_months' && selectedIncomeMonths.length === 0) {
        Alert.alert('Erro', 'Por favor, selecione pelo menos um mês');
        return;
      }

      setIsLoading(true);
      try {
        const numericAmount = parseFloat(amount);
        await RecurringIncomeService.createRecurringIncome(db, {
          name: description.trim(),
          amount: numericAmount,
          category: selectedCategory,
          frequency: incomeFrequency,
          selected_months: incomeFrequency === 'specific_months' ? selectedIncomeMonths : undefined,
          profile_id: currentProfile.id,
        });
        Alert.alert('Sucesso', 'Receita recorrente adicionada com sucesso!', [
          {
            text: 'OK',
            onPress: async () => {
              await clearFormState();
              onTransactionAdded();
              onBack();
            },
          },
        ]);
      } catch (error) {
        console.error('Erro ao salvar receita recorrente:', error);
        Alert.alert('Erro', 'Não foi possível salvar a receita recorrente');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const numericAmount = paymentMethod === PaymentMethod.BANK_LOAN ? 
      parseFloat(totalAmount) : parseFloat(amount);

    setIsLoading(true);

    try {
      let bankLoanId: string | undefined = undefined;
      
      // Se for empréstimo bancário, criar registro na tabela bank_loans primeiro
      if (paymentMethod === PaymentMethod.BANK_LOAN) {
        const bankLoan = await BankLoanService.createBankLoan(db, {
          description: description.trim(),
          total_amount: parseFloat(totalAmount),
          principal_amount: parseFloat(principalAmount),
          interest_amount: parseFloat(totalAmount) - parseFloat(principalAmount),
          installment_amount: parseFloat(totalAmount) / loanInstallments,
          installments: loanInstallments,
          category: selectedCategory,
          start_date: new Date(),
        });
        bankLoanId = bankLoan.id;
      }


      await TransactionService.addTransaction(db, {
        description: description.trim(),
        amount: numericAmount,
        type,
        category: selectedCategory,
        date: new Date(),
        payment_method: paymentMethod?.toString(),
        card_id: selectedCard || undefined,
        installments: (paymentMethod === PaymentMethod.CREDIT_CARD) ? installments : 
                     (paymentMethod === PaymentMethod.BANK_LOAN) ? loanInstallments : undefined,
        total_amount: paymentMethod === PaymentMethod.BANK_LOAN ? parseFloat(totalAmount) : undefined,
        principal_amount: paymentMethod === PaymentMethod.BANK_LOAN ? parseFloat(principalAmount) : undefined,
        interest_amount: paymentMethod === PaymentMethod.BANK_LOAN ? (parseFloat(totalAmount) - parseFloat(principalAmount)) : undefined,
        installment_amount: paymentMethod === PaymentMethod.BANK_LOAN ? (parseFloat(totalAmount) / loanInstallments) : undefined,
        bank_loan_id: bankLoanId,
        profile_id: currentProfile.id,
      });

      Alert.alert('Sucesso', 'Transação adicionada com sucesso!', [
        {
          text: 'OK',
          onPress: async () => {
            await clearFormState();
            onTransactionAdded();
            onBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      Alert.alert('Erro', 'Não foi possível salvar a transação');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => {
    if ((type as string) === 'fixed_bills') {
      return (cat.type as string) === 'fixed_bill';
    }
    return cat.type === type;
  });
  const fixedBillCategories = categories.filter(cat => (cat.type as string) === 'fixed_bill');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Nova Continha</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsMenu(true)}>
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && styles.typeButtonActive,
              ]}
              onPress={() => {
                setType('expense');
                // Limpar campos específicos de outros tipos
                const fieldsToClear = TransactionValidationService.clearFormFieldsByType('expense');
                if (fieldsToClear.paymentMethod !== undefined) {
                  setPaymentMethod(fieldsToClear.paymentMethod);
                }
                if (fieldsToClear.selectedCard !== undefined) {
                  setSelectedCard(fieldsToClear.selectedCard);
                }
                if (fieldsToClear.installments !== undefined) {
                  setInstallments(fieldsToClear.installments);
                }
                if (fieldsToClear.loanInstallments !== undefined) {
                  setLoanInstallments(fieldsToClear.loanInstallments);
                }
                if (fieldsToClear.totalAmount !== undefined) {
                  setTotalAmount(fieldsToClear.totalAmount);
                  setFormattedTotalAmount('');
                }
                if (fieldsToClear.principalAmount !== undefined) {
                  setPrincipalAmount(fieldsToClear.principalAmount);
                  setFormattedPrincipalAmount('');
                }
                if (fieldsToClear.billName !== undefined) {
                  setBillName(fieldsToClear.billName);
                }
                if (fieldsToClear.billFrequency !== undefined) {
                  setBillFrequency(fieldsToClear.billFrequency);
                }
                if (fieldsToClear.selectedMonths !== undefined) {
                  setSelectedMonths(fieldsToClear.selectedMonths);
                }
                if (fieldsToClear.isRecurringIncome !== undefined) {
                  setIsRecurringIncome(fieldsToClear.isRecurringIncome);
                }
                if (fieldsToClear.incomeFrequency !== undefined) {
                  setIncomeFrequency(fieldsToClear.incomeFrequency);
                }
                if (fieldsToClear.selectedIncomeMonths !== undefined) {
                  setSelectedIncomeMonths(fieldsToClear.selectedIncomeMonths);
                }
              }}
            >
              <Text style={[
                styles.typeButtonText,
                type === 'expense' && styles.typeButtonTextActive,
              ]}>
                Despesa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && styles.typeButtonActive,
              ]}
              onPress={() => {
                setType('income');
                // Limpar campos específicos de outros tipos
                const fieldsToClear = TransactionValidationService.clearFormFieldsByType('income');
                if (fieldsToClear.paymentMethod !== undefined) {
                  setPaymentMethod(fieldsToClear.paymentMethod);
                }
                if (fieldsToClear.selectedCard !== undefined) {
                  setSelectedCard(fieldsToClear.selectedCard);
                }
                if (fieldsToClear.installments !== undefined) {
                  setInstallments(fieldsToClear.installments);
                }
                if (fieldsToClear.loanInstallments !== undefined) {
                  setLoanInstallments(fieldsToClear.loanInstallments);
                }
                if (fieldsToClear.totalAmount !== undefined) {
                  setTotalAmount(fieldsToClear.totalAmount);
                  setFormattedTotalAmount('');
                }
                if (fieldsToClear.principalAmount !== undefined) {
                  setPrincipalAmount(fieldsToClear.principalAmount);
                  setFormattedPrincipalAmount('');
                }
                if (fieldsToClear.billName !== undefined) {
                  setBillName(fieldsToClear.billName);
                }
                if (fieldsToClear.billFrequency !== undefined) {
                  setBillFrequency(fieldsToClear.billFrequency);
                }
                if (fieldsToClear.selectedMonths !== undefined) {
                  setSelectedMonths(fieldsToClear.selectedMonths);
                }
                if (fieldsToClear.isRecurringIncome !== undefined) {
                  setIsRecurringIncome(fieldsToClear.isRecurringIncome);
                }
                if (fieldsToClear.incomeFrequency !== undefined) {
                  setIncomeFrequency(fieldsToClear.incomeFrequency);
                }
                if (fieldsToClear.selectedIncomeMonths !== undefined) {
                  setSelectedIncomeMonths(fieldsToClear.selectedIncomeMonths);
                }
              }}
            >
              <Text style={[
                styles.typeButtonText,
                type === 'income' && styles.typeButtonTextActive,
              ]}>
                Receita
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'fixed_bills' && styles.typeButtonActive,
              ]}
              onPress={() => {
                setType('fixed_bills');
                // Limpar campos específicos de outros tipos
                const fieldsToClear = TransactionValidationService.clearFormFieldsByType('fixed_bills');
                if (fieldsToClear.paymentMethod !== undefined) {
                  setPaymentMethod(fieldsToClear.paymentMethod);
                }
                if (fieldsToClear.selectedCard !== undefined) {
                  setSelectedCard(fieldsToClear.selectedCard);
                }
                if (fieldsToClear.installments !== undefined) {
                  setInstallments(fieldsToClear.installments);
                }
                if (fieldsToClear.loanInstallments !== undefined) {
                  setLoanInstallments(fieldsToClear.loanInstallments);
                }
                if (fieldsToClear.totalAmount !== undefined) {
                  setTotalAmount(fieldsToClear.totalAmount);
                  setFormattedTotalAmount('');
                }
                if (fieldsToClear.principalAmount !== undefined) {
                  setPrincipalAmount(fieldsToClear.principalAmount);
                  setFormattedPrincipalAmount('');
                }
                if (fieldsToClear.isRecurringIncome !== undefined) {
                  setIsRecurringIncome(fieldsToClear.isRecurringIncome);
                }
                if (fieldsToClear.incomeFrequency !== undefined) {
                  setIncomeFrequency(fieldsToClear.incomeFrequency);
                }
                if (fieldsToClear.selectedIncomeMonths !== undefined) {
                  setSelectedIncomeMonths(fieldsToClear.selectedIncomeMonths);
                }
              }}
            >
              <Text style={[
                styles.typeButtonText,
                type === 'fixed_bills' && styles.typeButtonTextActive,
              ]}>
                Fixas
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description - Only for income and expense */}
        {(type === 'income' || type === 'expense') && (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Almoço, Uber, Salário..."
            placeholderTextColor="#999"
          />
        </View>
        )}

        {/* Amount - Only for income and expense */}
        {(type === 'income' || type === 'expense') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valor</Text>
          <TextInput
            style={styles.input}
            value={formattedAmount}
            onChangeText={handleAmountChange}
            placeholder="R$ 0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        )}

        {/* Recurring Income - Only for income */}
        {type === 'income' && (
          <View style={styles.section}>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setIsRecurringIncome(!isRecurringIncome)}
              >
                {isRecurringIncome && (
                  <Ionicons name="checkmark" size={16} color="#2C3E50" />
                )}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Receita recorrente</Text>
            </View>

            {isRecurringIncome && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Frequência</Text>
                  <View style={styles.frequencyContainer}>
                    <TouchableOpacity
                      style={[
                        styles.frequencyButton,
                        incomeFrequency === 'all_months' && styles.frequencyButtonActive
                      ]}
                      onPress={() => setIncomeFrequency('all_months')}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        incomeFrequency === 'all_months' && styles.frequencyButtonTextActive
                      ]}>
                        Todos os meses
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.frequencyButton,
                        incomeFrequency === 'specific_months' && styles.frequencyButtonActive
                      ]}
                      onPress={() => setIncomeFrequency('specific_months')}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        incomeFrequency === 'specific_months' && styles.frequencyButtonTextActive
                      ]}>
                        Meses específicos
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {incomeFrequency === 'specific_months' && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Selecionar Meses</Text>
                    <View style={styles.monthsContainer}>
                      {[
                        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                      ].map((month, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.monthButton,
                            selectedIncomeMonths.includes(index + 1) && styles.monthButtonActive
                          ]}
                          onPress={() => toggleIncomeMonth(index + 1)}
                        >
                          <Text style={[
                            styles.monthButtonText,
                            selectedIncomeMonths.includes(index + 1) && styles.monthButtonTextActive
                          ]}>
                            {month}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Payment Method - Only for expenses */}
        {type === 'expense' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
            <View style={styles.paymentMethodContainer}>
              {Object.values(PaymentMethod).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === method && styles.paymentMethodButtonActive,
                  ]}
                  onPress={() => {
                    setPaymentMethod(method);
                    
                    // Usar o serviço de validação para limpar campos específicos
                    const fieldsToClear = TransactionValidationService.clearFormFieldsByPaymentMethod(method);
                    
                    if (fieldsToClear.selectedCard !== undefined) {
                      setSelectedCard(fieldsToClear.selectedCard);
                    }
                    if (fieldsToClear.installments !== undefined) {
                      setInstallments(fieldsToClear.installments);
                    }
                    if (fieldsToClear.loanInstallments !== undefined) {
                      setLoanInstallments(fieldsToClear.loanInstallments);
                    }
                    if (fieldsToClear.totalAmount !== undefined) {
                      setTotalAmount(fieldsToClear.totalAmount);
                      setFormattedTotalAmount('');
                    }
                    if (fieldsToClear.principalAmount !== undefined) {
                      setPrincipalAmount(fieldsToClear.principalAmount);
                      setFormattedPrincipalAmount('');
                    }
                  }}
                >
                  <Text style={[
                    styles.paymentMethodButtonText,
                    paymentMethod === method && styles.paymentMethodButtonTextActive,
                  ]}>
                    {getPaymentMethodLabel(method)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Card Selection - Only for credit card and card bill */}
        {type === 'expense' && (paymentMethod === PaymentMethod.CREDIT_CARD || paymentMethod === PaymentMethod.CARD_BILL) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cartão Utilizado</Text>
              <TouchableOpacity style={styles.addCardButton} onPress={onAddCard}>
                <Ionicons name="add" size={16} color="#2C3E50" />
                <Text style={styles.addCardButtonText}>Adicionar Cartão</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardContainer}>
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.cardButton,
                    selectedCard === card.id && styles.cardButtonActive,
                  ]}
                  onPress={() => setSelectedCard(card.id)}
                >
                  <Ionicons name="card-outline" size={20} color={selectedCard === card.id ? '#fff' : '#666'} />
                  <View style={styles.cardInfo}>
                    <Text style={[
                      styles.cardNickname,
                      selectedCard === card.id && styles.cardTextActive,
                    ]}>
                      {card.nickname}
                    </Text>
                    <Text style={[
                      styles.cardDigits,
                      selectedCard === card.id && styles.cardTextActive,
                    ]}>
                      **** {card.lastFourDigits}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Installments - Only for credit card */}
        {type === 'expense' && paymentMethod === PaymentMethod.CREDIT_CARD && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parcelas</Text>
            <View style={styles.installmentsContainer}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.installmentButton,
                    installments === num && styles.installmentButtonActive,
                  ]}
                  onPress={() => setInstallments(num)}
                >
                  <Text style={[
                    styles.installmentButtonText,
                    installments === num && styles.installmentButtonTextActive,
                  ]}>
                    {num}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loan Installments - Only for bank loan */}
        {type === 'expense' && paymentMethod === PaymentMethod.BANK_LOAN && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parcelas do Empréstimo</Text>
            <View style={styles.installmentsContainer}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.installmentButton,
                    loanInstallments === num && styles.installmentButtonActive,
                  ]}
                  onPress={() => setLoanInstallments(num)}
                >
                  <Text style={[
                    styles.installmentButtonText,
                    loanInstallments === num && styles.installmentButtonTextActive,
                  ]}>
                    {num}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Bank Loan Fields - Only for bank loan */}
        {type === 'expense' && paymentMethod === PaymentMethod.BANK_LOAN && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalhes do Empréstimo</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Valor Total</Text>
              <TextInput
                style={styles.input}
                value={formattedTotalAmount}
                onChangeText={handleTotalAmountChange}
                placeholder="R$ 0,00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Valor sem Juros</Text>
              <TextInput
                style={styles.input}
                value={formattedPrincipalAmount}
                onChangeText={handlePrincipalAmountChange}
                placeholder="R$ 0,00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Valor da Parcela (Calculado)</Text>
              <Text style={styles.calculatedValue}>
                {totalAmount && loanInstallments ? 
                  formatCurrency(parseFloat(totalAmount) / loanInstallments) : 
                  'R$ 0,00'
                }
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Total de Juros (Calculado)</Text>
              <Text style={styles.calculatedValue}>
                {totalAmount && principalAmount ? 
                  formatCurrency(Math.abs(parseFloat(principalAmount) - parseFloat(totalAmount))) : 
                  'R$ 0,00'
                }
              </Text>
            </View>
          </View>
        )}

        {/* Fixed Bills Fields - Only for fixed bills */}
        {type === 'fixed_bills' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Detalhes da Conta Fixa</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={onViewFixedBills}
              >
                <Ionicons name="list-outline" size={16} color="#2C3E50" />
                <Text style={styles.viewAllButtonText}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome da Conta</Text>
              <TextInput
                style={styles.input}
                value={billName}
                onChangeText={setBillName}
                placeholder="Ex: Aluguel, IPTU, Financiamento..."
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Valor</Text>
              <TextInput
                style={styles.input}
                value={formattedAmount}
                onChangeText={handleAmountChange}
                placeholder="R$ 0,00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Frequência</Text>
              <View style={styles.frequencyContainer}>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    billFrequency === 'all_months' && styles.frequencyButtonActive
                  ]}
                  onPress={() => setBillFrequency('all_months')}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    billFrequency === 'all_months' && styles.frequencyButtonTextActive
                  ]}>
                    Todos os meses
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    billFrequency === 'specific_months' && styles.frequencyButtonActive
                  ]}
                  onPress={() => setBillFrequency('specific_months')}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    billFrequency === 'specific_months' && styles.frequencyButtonTextActive
                  ]}>
                    Meses específicos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {billFrequency === 'specific_months' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Selecionar Meses</Text>
                <View style={styles.monthsContainer}>
                  {[
                    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                  ].map((month, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.monthButton,
                        selectedMonths.includes(index + 1) && styles.monthButtonActive
                      ]}
                      onPress={() => toggleMonth(index + 1)}
                    >
                      <Text style={[
                        styles.monthButtonText,
                        selectedMonths.includes(index + 1) && styles.monthButtonTextActive
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Category - Only for income and expense */}
        {(type === 'income' || type === 'expense') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoria</Text>
          <View style={styles.categoriesContainer}>
             {filteredCategories.map((category) => (
               <TouchableOpacity
                 key={category.id}
                 style={[
                   styles.categoryButton,
                   selectedCategory === category.name && styles.categoryButtonActive,
                 ]}
                 onPress={() => setSelectedCategory(category.name)}
               >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={selectedCategory === category.name ? '#fff' : category.color}
                />
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.name && styles.categoryButtonTextActive,
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        )}

        {/* Category - Only for fixed bills */}
        {type === 'fixed_bills' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categoria</Text>
            <View style={styles.categoriesContainer}>
               {fixedBillCategories.map((category) => (
                 <TouchableOpacity
                   key={category.id}
                   style={[
                     styles.categoryButton,
                     selectedCategory === category.name && styles.categoryButtonActive,
                   ]}
                   onPress={() => setSelectedCategory(category.name)}
                 >
                  <Ionicons
                    name={category.icon as any}
                    size={20}
                    color={selectedCategory === category.name ? '#fff' : category.color}
                  />
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category.name && styles.categoryButtonTextActive,
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Settings Menu Modal */}
      <Modal
        visible={showSettingsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        >
            <View style={styles.settingsMenu}>
              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  onCategoryManagement();
                }}
              >
                <Ionicons name="folder-outline" size={24} color="#2C3E50" />
                <Text style={styles.settingsMenuText}>Configurações de Categorias</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  onTransactionsManagement();
                }}
              >
                <Ionicons name="list-outline" size={24} color="#2C3E50" />
                <Text style={styles.settingsMenuText}>Gerenciar Transações</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsMenu(false);
                  onViewFixedBills();
                }}
              >
                <Ionicons name="receipt-outline" size={24} color="#2C3E50" />
                <Text style={styles.settingsMenuText}>Ver Contas Fixas</Text>
              </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 30,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  typeButtonTextActive: {
    color: '#2C3E50',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethodButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#ffffff',
  },
  paymentMethodButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  paymentMethodButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  paymentMethodButtonTextActive: {
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C3E50',
    gap: 4,
  },
  viewAllButtonText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C3E50',
    gap: 4,
  },
  addCardButtonText: {
    fontSize: 12,
    color: '#2C3E50',
    fontWeight: '500',
  },
  cardContainer: {
    gap: 8,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#ffffff',
    gap: 12,
  },
  cardButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  cardInfo: {
    flex: 1,
  },
  cardNickname: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  cardDigits: {
    fontSize: 14,
    color: '#666666',
  },
  cardTextActive: {
    color: '#ffffff',
  },
  installmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  installmentButton: {
    width: 50,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  installmentButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  installmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  installmentButtonTextActive: {
    color: '#ffffff',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#2C3E50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#95A5A6',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  calculatedValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  frequencyButtonTextActive: {
    color: '#FFF',
  },
  monthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    minWidth: 50,
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  monthButtonTextActive: {
    color: '#FFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2C3E50',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  settingsButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
  },
  settingsMenuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
});
