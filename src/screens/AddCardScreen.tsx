import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card } from '../models/Card';
import { CardService } from '../services/CardService';
import { CardBrand } from '../types/Payment';

interface AddCardScreenProps {
  onBack: () => void;
  onCardAdded: (cardId?: string) => void;
}

export default function AddCardScreen({ onBack, onCardAdded }: AddCardScreenProps) {
  const db = useSQLiteContext();
  const [nickname, setNickname] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<CardBrand>(CardBrand.VISA);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  useEffect(() => {
    loadCards();
  }, [db]);

  const loadCards = async () => {
    setIsLoadingCards(true);
    try {
      const allCards = await CardService.getAllCards(db);
      setCards(allCards);
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este cartão?',
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
              await CardService.deleteCard(db, cardId);
              await loadCards(); // Recarregar a lista
              Alert.alert('Sucesso', 'Cartão excluído com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir cartão:', error);
              Alert.alert('Erro', 'Não foi possível excluir o cartão');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!nickname.trim() || !lastFourDigits.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (lastFourDigits.length !== 4 || !/^\d{4}$/.test(lastFourDigits)) {
      Alert.alert('Erro', 'Os últimos 4 dígitos devem conter exatamente 4 números');
      return;
    }

    setIsLoading(true);

    try {
      const newCard = await CardService.addCard(db, {
        brand: selectedBrand,
        lastFourDigits: lastFourDigits.trim(),
        nickname: nickname.trim(),
      });

      Alert.alert('Sucesso', 'Cartão cadastrado com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            loadCards(); // Recarregar a lista
            onCardAdded(newCard.id);
            onBack();
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      Alert.alert('Erro', 'Não foi possível salvar o cartão');
    } finally {
      setIsLoading(false);
    }
  };

  const brandOptions = [
    { value: CardBrand.VISA, label: 'Visa' },
    { value: CardBrand.MASTERCARD, label: 'Mastercard' },
    { value: CardBrand.ELO, label: 'Elo' },
    { value: CardBrand.AMERICAN_EXPRESS, label: 'American Express' },
    { value: CardBrand.OTHER, label: 'Outro' },
  ];

  const getBrandDisplayName = (brand: CardBrand): string => {
    const brandNames = {
      [CardBrand.VISA]: 'Visa',
      [CardBrand.MASTERCARD]: 'Mastercard',
      [CardBrand.ELO]: 'Elo',
      [CardBrand.AMERICAN_EXPRESS]: 'American Express',
      [CardBrand.OTHER]: 'Outro'
    };
    return brandNames[brand];
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Cartões</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Existing Cards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cartões Cadastrados</Text>
          {isLoadingCards ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#2C3E50" size="small" />
              <Text style={styles.loadingText}>Carregando cartões...</Text>
            </View>
          ) : cards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#CCCCCC" />
              <Text style={styles.emptyText}>Nenhum cartão cadastrado</Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {cards.map((card) => (
                <View key={card.id} style={styles.cardItem}>
                  <View style={styles.cardInfo}>
                    <Ionicons name="card-outline" size={24} color="#2C3E50" />
                    <View style={styles.cardDetails}>
                      <Text style={styles.cardNickname}>{card.nickname}</Text>
                      <Text style={styles.cardInfoText}>
                        {getBrandDisplayName(card.brand)} • **** {card.lastFourDigits}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCard(card.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Add New Card Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adicionar Novo Cartão</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apelido do Cartão</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Ex: Cartão Principal, Nubank..."
            placeholderTextColor="#999"
          />
        </View>

        {/* Last Four Digits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos 4 Dígitos</Text>
          <TextInput
            style={styles.input}
            value={lastFourDigits}
            onChangeText={(text) => {
              const numbers = text.replace(/\D/g, '');
              if (numbers.length <= 4) {
                setLastFourDigits(numbers);
              }
            }}
            placeholder="1234"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={4}
          />
        </View>

        {/* Brand */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bandeira</Text>
          <View style={styles.brandContainer}>
            {brandOptions.map((brand) => (
              <TouchableOpacity
                key={brand.value}
                style={[
                  styles.brandButton,
                  selectedBrand === brand.value && styles.brandButtonActive,
                ]}
                onPress={() => setSelectedBrand(brand.value)}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={selectedBrand === brand.value ? '#fff' : '#666'}
                />
                <Text style={[
                  styles.brandButtonText,
                  selectedBrand === brand.value && styles.brandButtonTextActive,
                ]}>
                  {brand.label}
                </Text>
              </TouchableOpacity>
            ))}
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
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
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
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
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
  brandContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  brandButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  brandButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  brandButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
  },
  cardsList: {
    gap: 12,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardDetails: {
    flex: 1,
  },
  cardNickname: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  cardInfoText: {
    fontSize: 14,
    color: '#666666',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFF5F5',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
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
