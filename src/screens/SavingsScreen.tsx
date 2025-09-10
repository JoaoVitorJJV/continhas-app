import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Transaction } from '../models/Transaction';
import { TransactionService } from '../services/TransactionService';

const { width } = Dimensions.get('window');

interface SavingsScreenProps {
  onBack: () => void;
}

export default function SavingsScreen({ onBack }: SavingsScreenProps) {
  const db = useSQLiteContext();
  const [savings, setSavings] = useState<Transaction[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);

  useEffect(() => {
    loadSavings();
  }, [db]);

  const loadSavings = async () => {
    try {
      const allTransactions = await TransactionService.getAllTransactions(db);
      const savingsTransactions = allTransactions.filter(t => t.type === 'income');
      setSavings(savingsTransactions);
      
      const total = savingsTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      setTotalSavings(total);
    } catch (error) {
      console.error('Erro ao carregar poupança:', error);
    }
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Caixinha</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Total Savings Card */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Poupança</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalSavings)}</Text>
      </View>

      {/* Savings List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {savings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>Nenhuma poupança registrada</Text>
          </View>
        ) : (
          <View style={styles.savingsList}>
            {savings.map((saving) => (
              <View key={saving.id} style={styles.savingItem}>
                <View style={styles.savingLeft}>
                  <View style={styles.savingIcon}>
                    <Ionicons name="wallet-outline" size={20} color="#4ECDC4" />
                  </View>
                  <View style={styles.savingInfo}>
                    <Text style={styles.savingDescription}>{saving.description}</Text>
                    <Text style={styles.savingCategory}>{saving.category}</Text>
                    <Text style={styles.savingDate}>{formatDate(saving.date)}</Text>
                  </View>
                </View>
                <Text style={styles.savingAmount}>
                  +{formatCurrency(saving.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    color: '#4ECDC4',
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
  savingsList: {
    gap: 12,
  },
  savingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
  },
  savingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savingIcon: {
    marginRight: 12,
  },
  savingInfo: {
    flex: 1,
  },
  savingDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  savingCategory: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  savingDate: {
    fontSize: 12,
    color: '#999999',
  },
  savingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
  },
});
