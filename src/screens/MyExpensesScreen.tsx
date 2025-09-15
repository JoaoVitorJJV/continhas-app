import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import PieChart from 'react-native-pie-chart';
import { Card } from '../models/Card';
import { Transaction } from '../models/Transaction';
import { CardService } from '../services/CardService';
import { FixedBillService } from '../services/FixedBillService';
import { TransactionService } from '../services/TransactionService';

const { width } = Dimensions.get('window');

interface MyExpensesScreenProps {
  onBack: () => void;
  onViewFixedBills: () => void;
  currentProfile: Profile;
}

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

export default function MyExpensesScreen({ onBack, onViewFixedBills, currentProfile }: MyExpensesScreenProps) {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showFilter, setShowFilter] = useState(false);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [monthlyBalance, setMonthlyBalance] = useState(0);
  const [totalFixedBills, setTotalFixedBills] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    loadExpenses();
    loadMonthlyBalance();
    loadFixedBills();
    loadIncome();
  }, [db, selectedYear, selectedMonth, selectedCardId]);

  useEffect(() => {
    loadCards();
  }, [db]);

  useEffect(() => {
    if (expenses.length > 0) {
      calculateCategoryData();
    } else {
      setCategoryData([]);
    }
  }, [expenses]);

  const loadExpenses = async () => {
    try {
      let expenseTransactions: Transaction[];
      
      if (selectedCardId) {
        expenseTransactions = await TransactionService.getExpensesByMonthAndCard(db, selectedYear, selectedMonth, selectedCardId, currentProfile.id);
      } else {
        expenseTransactions = await TransactionService.getExpensesByMonth(db, selectedYear, selectedMonth, currentProfile.id);
      }
      
      setExpenses(expenseTransactions);

      const total = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      setTotalExpenses(total);
    } catch (error) {
      console.error('Erro ao carregar gastos:', error);
    }
  };

  const loadCards = async () => {
    try {
      const allCards = await CardService.getAllCards(db, currentProfile.id);
      setCards(allCards);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    }
  };

  const loadMonthlyBalance = async () => {
    try {
      const balance = await TransactionService.getMonthlyBalance(db, selectedYear, selectedMonth);
      setMonthlyBalance(balance);
    } catch (error) {
      console.error('Erro ao carregar balanço mensal:', error);
    }
  };

  const loadFixedBills = async () => {
    try {
      const fixedBills = await FixedBillService.getFixedBillsForMonth(db, selectedMonth);
      const total = fixedBills.reduce((sum, bill) => sum + bill.amount, 0);
      setTotalFixedBills(total);
    } catch (error) {
      console.error('Erro ao carregar contas fixas:', error);
    }
  };

  const loadIncome = async () => {
    try {
      const total = await TransactionService.getTotalIncomesByMonth(db, selectedYear, selectedMonth, currentProfile.id);
      setTotalIncome(total);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    }
  };

  const calculateCategoryData = () => {
    const categoryMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const category = expense.category || 'Outros';
      categoryMap.set(category, (categoryMap.get(category) || 0) + expense.amount);
    });

    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
    ];

    const data: CategoryData[] = Array.from(categoryMap.entries()).map(([category, amount], index) => ({
      category,
      amount,
      color: colors[index % colors.length]
    }));

    setCategoryData(data);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    const isInstallment = transaction.installments && transaction.installments > 1;
    const alertTitle = isInstallment ? 'Confirmar Exclusão de Parcelas' : 'Confirmar Exclusão';
    const alertMessage = isInstallment 
      ? `Tem certeza que deseja excluir "${transaction.description}"?\n\nEsta ação irá excluir TODAS as parcelas desta compra em todos os meses.`
      : `Tem certeza que deseja excluir "${transaction.description}"?`;

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await TransactionService.deleteTransaction(db, transaction.id);
              // Recarregar dados após exclusão
              loadExpenses();
              console.log('Transação excluída com sucesso');
            } catch (error) {
              console.error('Erro ao excluir transação:', error);
              Alert.alert('Erro', 'Não foi possível excluir a transação');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getMonthName = (month: number): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const generateYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const generateMonthOptions = (): { value: number; label: string }[] => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months.map((month, index) => ({
      value: index + 1,
      label: month
    }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Meus Gastos</Text>
            <Text style={styles.subtitle}>{getMonthName(selectedMonth)}/{selectedYear}</Text>
          </View>
          <TouchableOpacity 
            style={styles.filterButton} 
            onPress={() => setShowFilter(!showFilter)}
          >
            <Ionicons name="filter-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Filter Section */}
        {showFilter && (
          <View style={styles.filterSection}>
            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Mês</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                  {generateMonthOptions().map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.filterOption,
                        selectedMonth === month.value && styles.filterOptionActive
                      ]}
                      onPress={() => setSelectedMonth(month.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedMonth === month.value && styles.filterOptionTextActive
                      ]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Ano</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.yearScroll}>
                  {generateYearOptions().map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.filterOption,
                        selectedYear === year && styles.filterOptionActive
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedYear === year && styles.filterOptionTextActive
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Cartão</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      selectedCardId === null && styles.filterOptionActive
                    ]}
                    onPress={() => setSelectedCardId(null)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      selectedCardId === null && styles.filterOptionTextActive
                    ]}>
                      Todos
                    </Text>
                  </TouchableOpacity>
                  {cards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.filterOption,
                        selectedCardId === card.id && styles.filterOptionActive
                      ]}
                      onPress={() => setSelectedCardId(card.id)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedCardId === card.id && styles.filterOptionTextActive
                      ]}>
                        {card.nickname} ****{card.lastFourDigits}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

        {/* Total Expenses Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total de Gastos</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalExpenses)}</Text>
          
          {/* Income Section */}
          <View style={styles.incomeSection}>
            <Text style={styles.incomeLabel}>Total de Receitas</Text>
            <Text style={styles.incomeValue}>{formatCurrency(totalIncome)}</Text>
          </View>
          
          {/* Monthly Balance */}
          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Balanço do Mês</Text>
            <Text style={[
              styles.balanceValue,
              { color: monthlyBalance >= 0 ? '#4ECDC4' : '#FF6B6B' }
            ]}>
              {formatCurrency(monthlyBalance)}
            </Text>
            <Text style={styles.balanceSubtext}>
              {monthlyBalance >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
            </Text>
          </View>

          {/* Fixed Bills Section */}
          <View style={styles.fixedBillsSection}>
            <View style={styles.fixedBillsInfo}>
              <Text style={styles.fixedBillsLabel}>Contas Fixas</Text>
              <Text style={styles.fixedBillsValue}>{formatCurrency(totalFixedBills)}</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewFixedBillsButton}
              onPress={onViewFixedBills}
            >
              <Ionicons name="list-outline" size={16} color="#2C3E50" />
              <Text style={styles.viewFixedBillsText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chart Section */}
        {categoryData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Gastos por Categoria</Text>
            <View style={styles.chartContainer}>
              <PieChart
                widthAndHeight={250}
                series={categoryData.map(item => ({ value: item.amount, color: item.color }))}
              />
            </View>
            <View style={styles.legendContainer}>
              {categoryData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>
                    {item.category}: {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expenses List */}
        <View style={styles.content}>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>Nenhum gasto registrado</Text>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {expenses.map((expense) => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseLeft}>
                    <View style={styles.expenseIcon}>
                      <Ionicons name="receipt-outline" size={20} color="#FF6B6B" />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseDescription}>{expense.description}</Text>
                      <Text style={styles.expenseCategory}>{expense.category}</Text>
                      <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
                    </View>
                  </View>
                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>
                      -{formatCurrency(expense.amount)}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteTransaction(expense)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 30,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  filterButton: {
    padding: 8,
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterRow: {
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  monthScroll: {
    maxHeight: 50,
  },
  yearScroll: {
    maxHeight: 50,
  },
  cardScroll: {
    maxHeight: 50,
  },
  filterOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterOptionActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  totalCard: {
    backgroundColor: '#2C3E50',
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 16,
  },
  incomeSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  incomeLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  incomeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
    opacity: 0.8,
  },
  fixedBillsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    width: '100%',
  },
  fixedBillsInfo: {
    alignItems: 'center',
  },
  fixedBillsLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  fixedBillsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFEAA7',
  },
  viewFixedBillsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewFixedBillsText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    marginTop: 16,
  },
  expensesList: {
    gap: 12,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIcon: {
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999999',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
});
