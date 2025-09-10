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
import { SettingsService } from '../services/SettingsService';
import { formatCurrency, formatCurrencyInput, getCurrencyValue } from '../utils/currency';

interface ShoppingSettingsScreenProps {
  onBack: () => void;
}

export default function ShoppingSettingsScreen({ onBack }: ShoppingSettingsScreenProps) {
  const db = useSQLiteContext();
  const [voucherLimit, setVoucherLimit] = useState('');
  const [formattedVoucherLimit, setFormattedVoucherLimit] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [db]);

  const loadSettings = async () => {
    try {
      const limit = await SettingsService.getVoucherLimit(db);
      setVoucherLimit(limit.toString());
      // Usar formatCurrency diretamente para valores já em reais
      setFormattedVoucherLimit(formatCurrency(limit));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleVoucherLimitChange = (text: string) => {
    const formatted = formatCurrencyInput(text);
    setFormattedVoucherLimit(formatted);
    const numericValue = getCurrencyValue(formatted);
    setVoucherLimit(numericValue.toString());
  };

  const handleSave = async () => {
    if (!voucherLimit.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o limite do vale-supermercado');
      return;
    }

    const numericLimit = parseFloat(voucherLimit);
    if (isNaN(numericLimit) || numericLimit < 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido');
      return;
    }

    setIsLoading(true);

    try {
      await SettingsService.setVoucherLimit(db, numericLimit);
      Alert.alert('Sucesso', 'Configurações salvas com sucesso!', [
        {
          text: 'OK',
          onPress: () => onBack(),
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Voucher Limit Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limite do Vale-Supermercado</Text>
          <Text style={styles.sectionDescription}>
            Este valor será usado como limite padrão em todas as compras. 
            Você pode alterá-lo a qualquer momento.
          </Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Valor do Limite</Text>
            <TextInput
              style={styles.input}
              value={formattedVoucherLimit}
              onChangeText={handleVoucherLimitChange}
              placeholder="R$ 0,00"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </Text>
        </TouchableOpacity>
      </View>
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
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
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
    backgroundColor: '#ffffff',
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
});
