import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { FixedBill } from '../models/FixedBill';
import { FixedBillService } from '../services/FixedBillService';
import { formatCurrencyInput, getCurrencyValue } from '../utils/currency';

interface FixedBillsScreenProps {
  onBack: () => void;
}

export default function FixedBillsScreen({ onBack }: FixedBillsScreenProps) {
  const db = useSQLiteContext();
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editFormattedAmount, setEditFormattedAmount] = useState('');
  const [editFrequency, setEditFrequency] = useState<'all_months' | 'specific_months'>('all_months');
  const [editSelectedMonths, setEditSelectedMonths] = useState<number[]>([]);

  useEffect(() => {
    loadFixedBills();
  }, [db]);

  const loadFixedBills = async () => {
    try {
      const bills = await FixedBillService.getAllFixedBills(db);
      setFixedBills(bills);
    } catch (error) {
      console.error('Erro ao carregar contas fixas:', error);
    }
  };

  const handleDeleteBill = (bill: FixedBill) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir "${bill.name}"?`,
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
              await FixedBillService.deleteFixedBill(db, bill.id);
              loadFixedBills();
              console.log('Conta fixa excluída com sucesso');
            } catch (error) {
              console.error('Erro ao excluir conta fixa:', error);
              Alert.alert('Erro', 'Não foi possível excluir a conta fixa');
            }
          },
        },
      ]
    );
  };

  const handleEditBill = (bill: FixedBill) => {
    setEditingBill(bill);
    setEditName(bill.name);
    setEditAmount(bill.amount.toString());
    setEditFormattedAmount(formatCurrency(bill.amount));
    setEditFrequency(bill.frequency);
    setEditSelectedMonths(bill.selected_months || []);
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    setEditFormattedAmount(formatted);
    const numericValue = getCurrencyValue(formatted);
    setEditAmount(numericValue.toString());
  };

  const toggleMonth = (month: number) => {
    setEditSelectedMonths(prev => 
      prev.includes(month) 
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editAmount.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (editFrequency === 'specific_months' && editSelectedMonths.length === 0) {
      Alert.alert('Erro', 'Por favor, selecione pelo menos um mês');
      return;
    }

    if (!editingBill) return;

    setIsLoading(true);
    try {
      await FixedBillService.updateFixedBill(db, editingBill.id, {
        name: editName.trim(),
        amount: parseFloat(editAmount),
        frequency: editFrequency,
        selected_months: editFrequency === 'specific_months' ? editSelectedMonths : undefined,
      });
      
      Alert.alert('Sucesso', 'Conta fixa atualizada com sucesso!');
      setEditingBill(null);
      loadFixedBills();
    } catch (error) {
      console.error('Erro ao atualizar conta fixa:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a conta fixa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingBill(null);
    setEditName('');
    setEditAmount('');
    setEditFormattedAmount('');
    setEditFrequency('all_months');
    setEditSelectedMonths([]);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getMonthName = (month: number): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const getFrequencyText = (bill: FixedBill): string => {
    if (bill.frequency === 'all_months') {
      return 'Todos os meses';
    }
    if (bill.selected_months && bill.selected_months.length > 0) {
      return bill.selected_months.map(m => getMonthName(m)).join(', ');
    }
    return 'Meses específicos';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Contas Fixas</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {fixedBills.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>Nenhuma conta fixa registrada</Text>
          </View>
        ) : (
          <View style={styles.billsList}>
            {fixedBills.map((bill) => (
              <View key={bill.id} style={styles.billItem}>
                <View style={styles.billLeft}>
                  <View style={styles.billIcon}>
                    <Ionicons name="receipt-outline" size={20} color="#2C3E50" />
                  </View>
                  <View style={styles.billInfo}>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billCategory}>{bill.category}</Text>
                    <Text style={styles.billFrequency}>{getFrequencyText(bill)}</Text>
                    <Text style={styles.billDate}>
                      Criado em: {new Date(bill.created_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
                <View style={styles.billRight}>
                  <Text style={styles.billAmount}>
                    {formatCurrency(bill.amount)}
                  </Text>
                  <View style={styles.billActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditBill(bill)}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#2C3E50" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteBill(bill)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      {editingBill && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Conta Fixa</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome da Conta</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ex: Aluguel, IPTU..."
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Valor</Text>
              <TextInput
                style={styles.input}
                value={editFormattedAmount}
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
                    editFrequency === 'all_months' && styles.frequencyButtonActive
                  ]}
                  onPress={() => {
                    setEditFrequency('all_months');
                    setEditSelectedMonths([]);
                  }}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    editFrequency === 'all_months' && styles.frequencyButtonTextActive
                  ]}>
                    Todos os meses
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    editFrequency === 'specific_months' && styles.frequencyButtonActive
                  ]}
                  onPress={() => setEditFrequency('specific_months')}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    editFrequency === 'specific_months' && styles.frequencyButtonTextActive
                  ]}>
                    Meses específicos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {editFrequency === 'specific_months' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Selecionar Meses</Text>
                <View style={styles.monthsGrid}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.monthButton,
                        editSelectedMonths.includes(month) && styles.monthButtonActive
                      ]}
                      onPress={() => toggleMonth(month)}
                    >
                      <Text style={[
                        styles.monthButtonText,
                        editSelectedMonths.includes(month) && styles.monthButtonTextActive
                      ]}>
                        {getMonthName(month)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  placeholder: {
    width: 40,
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
  billsList: {
    gap: 12,
    paddingVertical: 20,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  billIcon: {
    marginRight: 12,
  },
  billInfo: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  billCategory: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  billFrequency: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 12,
    color: '#999999',
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  billActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 4,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
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
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  frequencyButtonTextActive: {
    color: '#ffffff',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#ffffff',
  },
  monthButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  monthButtonText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  monthButtonTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2C3E50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#95A5A6',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
