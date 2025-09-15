import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSQLite } from '../contexts/SQLiteContext';
import { Profile } from '../models/Profile';
import { Transaction } from '../models/Transaction';
import { TransactionService } from '../services/TransactionService';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onAddTransaction: () => void;
  onViewDetails: () => void;
  onMyExpenses: () => void;
  onSavings: () => void;
  onShopping: () => void;
  onProfileManagement: () => void;
  currentProfile: Profile;
}

export default function HomeScreen({ onAddTransaction, onViewDetails, onMyExpenses, onSavings, onShopping, onProfileManagement, currentProfile }: HomeScreenProps) {
  const { database: db } = useSQLite();
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyBalance, setMonthlyBalance] = useState(0);
  const [totalDebts, setTotalDebts] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isMenuExpanded, setIsMenuExpanded] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      // Recarregar dados sempre que a tela ganhar foco
      console.log('HomeScreen ganhou foco - recarregando dados...');
      loadData();
    }, [db])
  );

  const loadData = async () => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [recent, monthly, debts, balance] = await Promise.all([
        TransactionService.getRecentTransactions(db, 5, currentProfile.id),
        TransactionService.getMonthlyBalance(db, currentYear, currentMonth, currentProfile.id),
        TransactionService.getTotalDebts(db, currentProfile.id),
        TransactionService.getTotalBalance(db, currentProfile.id)
      ]);

      setRecentTransactions(recent);
      setMonthlyBalance(monthly);
      setTotalDebts(debts);
      setTotalBalance(balance);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuExpanded(!isMenuExpanded);
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
              loadData();
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

  const getMonthName = (): string => {
    const now = new Date();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[now.getMonth()];
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <View style={styles.profileIcon}>
            <Ionicons name={currentProfile.icon as any} size={24} color="#2C3E50" />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{currentProfile.name}</Text>
            <Text style={styles.appTitle}>Continhas.</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Financial Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Dívidas</Text>
            <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
              {formatCurrency(totalDebts)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balanço</Text>
            <Text style={[styles.summaryValue, { color: '#4ECDC4' }]}>
              {formatCurrency(totalBalance)}
            </Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Saldo Mês</Text>
            <Text style={[styles.summaryValue, { color: '#4ECDC4' }]}>
              {formatCurrency(monthlyBalance)}
            </Text>
          </View>
        </View>
      </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity style={styles.closeButton} onPress={toggleMenu}>
              <Ionicons 
                name={isMenuExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#000" 
              />
            </TouchableOpacity>
          </View>

          {isMenuExpanded && (
            <ScrollView 
              style={styles.menuScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.menuScrollContent}
            >
              <View style={styles.menuGrid}>
                <TouchableOpacity style={styles.menuCard} onPress={onAddTransaction}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="add" size={32} color="#000" />
                  </View>
                  <Text style={styles.menuText}>Nova Continha</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={onSavings}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="laptop-outline" size={32} color="#000" />
                  </View>
                  <Text style={styles.menuText}>Caixinha</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={onMyExpenses}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="person-outline" size={32} color="#000" />
                  </View>
                  <Text style={styles.menuText}>Meus Gastos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuCard} onPress={onShopping}>
                  <View style={styles.menuIcon}>
                    <Ionicons name="cart-outline" size={32} color="#000" />
                  </View>
                  <Text style={styles.menuText}>Compras</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Acessados</Text>
            <Text style={styles.monthText}>{getMonthName()}/2025</Text>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Você está sem contas recentes</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.transactionsScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.transactionsScrollContent}
            >
              <View style={styles.transactionsList}>
                {recentTransactions.map((transaction, index) => (
                  <View key={transaction.id} style={styles.transactionItem}>
                    <View style={styles.transactionLeft}>
                      <View style={styles.transactionIcon}>
                        <Ionicons name="document-text-outline" size={20} color="#000" />
                      </View>
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={[
                        styles.transactionAmount,
                        { color: transaction.type === 'income' ? '#4ECDC4' : '#FF6B6B' }
                      ]}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteTransaction(transaction)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Modal de Configurações */}
        <Modal
          visible={showSettingsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSettingsModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSettingsModal(false)}
          >
            <View style={styles.settingsMenu}>
              <TouchableOpacity
                style={styles.settingsMenuItem}
                onPress={() => {
                  setShowSettingsModal(false);
                  onProfileManagement();
                }}
              >
                <Ionicons name="person-outline" size={24} color="#2C3E50" />
                <Text style={styles.settingsMenuText}>Alterar Perfil</Text>
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
  scrollView: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statusTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 35,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileText: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 25,
    fontWeight: 'bold',
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
    padding: 20,
    minWidth: 200,
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
  },
  settingsMenuText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 12,
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#2C3E50',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
  },
  detailsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuScrollView: {
    maxHeight: 300,
  },
  menuScrollContent: {
    paddingBottom: 10,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  recentSection: {
    paddingHorizontal: 20,
    flex: 1,
  },
  transactionsScrollView: {
    maxHeight: 300,
  },
  transactionsScrollContent: {
    paddingBottom: 10,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  monthText: {
    fontSize: 16,
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
  },
  transactionsList: {
    gap: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 4,
  },
});
