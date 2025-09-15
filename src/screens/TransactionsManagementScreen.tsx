import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
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
import { useSQLite } from '../contexts/SQLiteContext';
import { FixedBill } from '../models/FixedBill';
import { Profile } from '../models/Profile';
import { RecurringIncome } from '../models/RecurringIncome';
import { Transaction } from '../models/Transaction';
import { FixedBillService } from '../services/FixedBillService';
import { RecurringIncomeService } from '../services/RecurringIncomeService';
import { TransactionService } from '../services/TransactionService';
import { PaymentMethod } from '../types/Payment';
import { formatCurrency } from '../utils/currency';

interface TransactionsManagementScreenProps {
  onBack: () => void;
  currentProfile: Profile;
}

type TransactionType = 'all' | 'transactions' | 'recurring_incomes' | 'fixed_bills';

export default function TransactionsManagementScreen({ onBack, currentProfile }: TransactionsManagementScreenProps) {
  const { database: db } = useSQLite();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>([]);
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);
  const [selectedType, setSelectedType] = useState<TransactionType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [db])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transactionsData, recurringIncomesData, fixedBillsData] = await Promise.all([
        TransactionService.getAllTransactions(db, currentProfile.id),
        RecurringIncomeService.getAllRecurringIncomes(db, currentProfile.id),
        FixedBillService.getAllFixedBills(db, currentProfile.id)
      ]);

      setTransactions(transactionsData);
      setRecurringIncomes(recurringIncomesData);
      setFixedBills(fixedBillsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar as transações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir a transação "${transaction.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await TransactionService.deleteTransaction(db, transaction.id);
              await loadData();
              Alert.alert('Sucesso', 'Transação excluída com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir transação:', error);
              Alert.alert('Erro', 'Não foi possível excluir a transação');
            }
          }
        }
      ]
    );
  };

  const handleDeleteRecurringIncome = async (income: RecurringIncome) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir a receita recorrente "${income.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await RecurringIncomeService.deleteRecurringIncome(db, income.id);
              await loadData();
              Alert.alert('Sucesso', 'Receita recorrente excluída com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir receita recorrente:', error);
              Alert.alert('Erro', 'Não foi possível excluir a receita recorrente');
            }
          }
        }
      ]
    );
  };

  const handleDeleteFixedBill = async (bill: FixedBill) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir a conta fixa "${bill.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await FixedBillService.deleteFixedBill(db, bill.id);
              await loadData();
              Alert.alert('Sucesso', 'Conta fixa excluída com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir conta fixa:', error);
              Alert.alert('Erro', 'Não foi possível excluir a conta fixa');
            }
          }
        }
      ]
    );
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingItem(transaction);
    setEditDescription(transaction.description);
    setEditAmount(transaction.amount.toString());
    setShowEditModal(true);
  };

  const handleEditRecurringIncome = (income: RecurringIncome) => {
    setEditingItem(income);
    setEditDescription(income.name);
    setEditAmount(income.amount.toString());
    setShowEditModal(true);
  };

  const handleEditFixedBill = (bill: FixedBill) => {
    setEditingItem(bill);
    setEditDescription(bill.name);
    setEditAmount(bill.amount.toString());
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editDescription.trim() || !editAmount.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    const numericAmount = parseFloat(editAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido');
      return;
    }

    try {
      if (editingItem.type === 'transaction') {
        // Para transações, vamos apenas mostrar uma mensagem por enquanto
        Alert.alert('Info', 'Edição de transações não implementada ainda');
        setShowEditModal(false);
        return;
      } else if (editingItem.type === 'recurring_income') {
        await RecurringIncomeService.updateRecurringIncome(db, editingItem.id, {
          name: editDescription.trim(),
          amount: numericAmount
        });
      } else if (editingItem.type === 'fixed_bill') {
        await FixedBillService.updateFixedBill(db, editingItem.id, {
          name: editDescription.trim(),
          amount: numericAmount
        });
      }

      setShowEditModal(false);
      await loadData();
      Alert.alert('Sucesso', 'Item atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o item');
    }
  };

  const toggleSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleSelectAll = () => {
    const filteredData = getFilteredData();
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map(item => item.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('Erro', 'Nenhum item selecionado');
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir ${selectedItems.size} item(ns) selecionado(s)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const filteredData = getFilteredData();
              const itemsToDelete = filteredData.filter(item => selectedItems.has(item.id));
              
              for (const item of itemsToDelete) {
                if (item.type === 'transaction') {
                  await TransactionService.deleteTransaction(db, item.id);
                } else if (item.type === 'recurring_income') {
                  await RecurringIncomeService.deleteRecurringIncome(db, item.id);
                } else if (item.type === 'fixed_bill') {
                  await FixedBillService.deleteFixedBill(db, item.id);
                }
              }
              
              setSelectedItems(new Set());
              setIsSelectionMode(false);
              await loadData();
              Alert.alert('Sucesso', `${itemsToDelete.length} item(ns) excluído(s) com sucesso!`);
            } catch (error) {
              console.error('Erro ao excluir itens:', error);
              Alert.alert('Erro', 'Não foi possível excluir alguns itens');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const getFilteredData = () => {
    switch (selectedType) {
      case 'transactions':
        return transactions.map(t => ({ ...t, type: 'transaction' }));
      case 'recurring_incomes':
        return recurringIncomes.map(i => ({ ...i, type: 'recurring_income' }));
      case 'fixed_bills':
        return fixedBills.map(b => ({ ...b, type: 'fixed_bill' }));
      default:
        return [
          ...transactions.map(t => ({ ...t, type: 'transaction' })),
          ...recurringIncomes.map(i => ({ ...i, type: 'recurring_income' })),
          ...fixedBills.map(b => ({ ...b, type: 'fixed_bill' }))
        ];
    }
  };

  const renderTransactionItem = (transaction: Transaction) => (
    <View key={`transaction_${transaction.id}`} style={styles.itemContainer}>
      {isSelectionMode && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleSelection(transaction.id)}
        >
          {selectedItems.has(transaction.id) && (
            <Ionicons name="checkmark" size={16} color="#2C3E50" />
          )}
        </TouchableOpacity>
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemDescription}>{transaction.description}</Text>
          <Text style={[styles.itemAmount, { color: transaction.type === 'income' ? '#4ECDC4' : '#FF6B6B' }]}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemDate}>{new Date(transaction.date).toLocaleDateString('pt-BR')}</Text>
          <Text style={styles.itemCategory}>{transaction.category}</Text>
          {transaction.payment_method && (
            <Text style={styles.itemPaymentMethod}>
              {PaymentMethod[transaction.payment_method as unknown as keyof typeof PaymentMethod]}
            </Text>
          )}
        </View>
        {!isSelectionMode && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditTransaction(transaction)}
            >
              <Ionicons name="pencil" size={16} color="#2C3E50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteTransaction(transaction)}
            >
              <Ionicons name="trash" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderRecurringIncomeItem = (income: RecurringIncome) => (
    <View key={`recurring_income_${income.id}`} style={styles.itemContainer}>
      {isSelectionMode && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleSelection(income.id)}
        >
          {selectedItems.has(income.id) && (
            <Ionicons name="checkmark" size={16} color="#2C3E50" />
          )}
        </TouchableOpacity>
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemDescription}>{income.name}</Text>
          <Text style={[styles.itemAmount, { color: '#4ECDC4' }]}>
            +{formatCurrency(income.amount)}
          </Text>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemCategory}>Receita Recorrente</Text>
          <Text style={styles.itemFrequency}>
            {income.frequency === 'all_months' ? 'Todos os meses' : 'Meses específicos'}
          </Text>
          {income.selected_months && Array.isArray(income.selected_months) && income.selected_months.length > 0 && (
            <Text style={styles.itemMonths}>
              Meses: {income.selected_months.join(', ')}
            </Text>
          )}
        </View>
        {!isSelectionMode && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditRecurringIncome(income)}
            >
              <Ionicons name="pencil" size={16} color="#2C3E50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteRecurringIncome(income)}
            >
              <Ionicons name="trash" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderFixedBillItem = (bill: FixedBill) => (
    <View key={`fixed_bill_${bill.id}`} style={styles.itemContainer}>
      {isSelectionMode && (
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => toggleSelection(bill.id)}
        >
          {selectedItems.has(bill.id) && (
            <Ionicons name="checkmark" size={16} color="#2C3E50" />
          )}
        </TouchableOpacity>
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemDescription}>{bill.name}</Text>
          <Text style={[styles.itemAmount, { color: '#FF6B6B' }]}>
            -{formatCurrency(bill.amount)}
          </Text>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemCategory}>Conta Fixa</Text>
          <Text style={styles.itemFrequency}>
            {bill.frequency === 'all_months' ? 'Todos os meses' : 'Meses específicos'}
          </Text>
          {bill.selected_months && Array.isArray(bill.selected_months) && bill.selected_months.length > 0 && (
            <Text style={styles.itemMonths}>
              Meses: {bill.selected_months.join(', ')}
            </Text>
          )}
        </View>
        {!isSelectionMode && (
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditFixedBill(bill)}
            >
              <Ionicons name="pencil" size={16} color="#2C3E50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteFixedBill(bill)}
            >
              <Ionicons name="trash" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderItem = (item: any) => {
    if (item.type === 'transaction') {
      return renderTransactionItem(item);
    } else if (item.type === 'recurring_income') {
      return renderRecurringIncomeItem(item);
    } else if (item.type === 'fixed_bill') {
      return renderFixedBillItem(item);
    }
    return null;
  };

  const filteredData = getFilteredData();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Transações</Text>
        <TouchableOpacity 
          style={styles.selectionButton} 
          onPress={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedItems(new Set());
          }}
        >
          <Ionicons 
            name={isSelectionMode ? "close" : "checkmark-circle-outline"} 
            size={24} 
            color="#2C3E50" 
          />
        </TouchableOpacity>
      </View>

      {/* Barra de ações para seleção múltipla */}
      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={toggleSelectAll}
          >
            <Text style={styles.selectAllText}>
              {selectedItems.size === getFilteredData().length ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.selectionCount}>
            {selectedItems.size} selecionado(s)
          </Text>
          
          {selectedItems.size > 0 && (
            <TouchableOpacity
              style={styles.bulkDeleteButton}
              onPress={handleBulkDelete}
            >
              <Ionicons name="trash" size={20} color="#ffffff" />
              <Text style={styles.bulkDeleteText}>Excluir</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedType('all')}
          >
            <Text style={[styles.filterButtonText, selectedType === 'all' && styles.filterButtonTextActive]}>
              Todas
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'transactions' && styles.filterButtonActive]}
            onPress={() => setSelectedType('transactions')}
          >
            <Text style={[styles.filterButtonText, selectedType === 'transactions' && styles.filterButtonTextActive]}>
              Transações
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'recurring_incomes' && styles.filterButtonActive]}
            onPress={() => setSelectedType('recurring_incomes')}
          >
            <Text style={[styles.filterButtonText, selectedType === 'recurring_incomes' && styles.filterButtonTextActive]}>
              Receitas Recorrentes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, selectedType === 'fixed_bills' && styles.filterButtonActive]}
            onPress={() => setSelectedType('fixed_bills')}
          >
            <Text style={[styles.filterButtonText, selectedType === 'fixed_bills' && styles.filterButtonTextActive]}>
              Contas Fixas
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de itens */}
      <ScrollView style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum item encontrado</Text>
          </View>
        ) : (
          filteredData.map((item, index) => (
            <View key={`${item.type}_${item.id}_${index}`}>
              {renderItem(item)}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de Edição */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Item</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={styles.input}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Digite a descrição"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Valor</Text>
              <TextInput
                style={styles.input}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="Digite o valor"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    marginTop: 30,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  selectionButton: {
    padding: 5,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#2C3E50',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  selectAllText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  selectionCount: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
    gap: 4,
  },
  bulkDeleteText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  filterButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  itemContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#e1e8ed',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
    marginRight: 10,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetails: {
    marginBottom: 10,
  },
  itemDate: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  itemPaymentMethod: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  itemFrequency: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  itemMonths: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fed7d7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2C3E50',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2C3E50',
    marginLeft: 10,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
