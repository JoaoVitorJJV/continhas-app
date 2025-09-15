import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import PieChart from 'react-native-pie-chart';
import { PRODUCT_CATEGORIES } from '../enums/ProductCategory';
import { Profile } from '../models/Profile';
import { SavedShoppingItem } from '../models/SavedShoppingItem';
import { SavedShoppingList } from '../models/SavedShoppingList';
import { ShoppingService } from '../services/ShoppingService';

const { width } = Dimensions.get('window');

interface MyShoppingScreenProps {
  onBack: () => void;
  currentProfile: Profile;
}

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

export default function MyShoppingScreen({ onBack, currentProfile }: MyShoppingScreenProps) {
  const db = useSQLiteContext();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [savedLists, setSavedLists] = useState<SavedShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<SavedShoppingList | null>(null);
  const [listItems, setListItems] = useState<SavedShoppingItem[]>([]);
  const [allMonthItems, setAllMonthItems] = useState<SavedShoppingItem[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedShoppingItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  useEffect(() => {
    loadSavedLists();
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedList) {
      loadListItems();
    }
  }, [selectedList]);

  useEffect(() => {
    if (allMonthItems.length > 0) {
      calculateCategoryData();
    } else {
      setCategoryData([]);
    }
  }, [allMonthItems]);

  const loadSavedLists = async () => {
    try {
      const year = selectedYear;
      const month = selectedMonth;
      
      // Buscar mês de compras
      const shoppingMonth = await ShoppingService.getOrCreateShoppingMonth(db, year, month, currentProfile.id);
      
      // Buscar listas salvas do mês
      const lists = await ShoppingService.getSavedShoppingLists(db, shoppingMonth.id, currentProfile.id);
      console.log("🚀 ~ loadSavedLists ~ lists:", lists)
      setSavedLists(lists);
      
      // Carregar todos os itens de todas as listas do mês para o gráfico
      const allItems: SavedShoppingItem[] = [];
      for (const list of lists) {
        const items = await ShoppingService.getSavedShoppingItems(db, list.id);
        console.log("🚀 ~ loadSavedLists ~ items:", items)
        allItems.push(...items);
      }
      setAllMonthItems(allItems);
      
      if (lists.length > 0 && !selectedList) {
        setSelectedList(lists[0]);
      } else if (lists.length === 0) {
        setSelectedList(null);
      }
    } catch (error) {
      console.error('Erro ao carregar listas salvas:', error);
    }
  };

  const loadListItems = async () => {
    if (!selectedList) return;
    
    try {
      const items = await ShoppingService.getSavedShoppingItems(db, selectedList.id);
      setListItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  const calculateCategoryData = () => {
    const categoryMap = new Map<string, number>();
    
    allMonthItems.forEach(item => {
      const category = item.category || 'Outros';
      const totalAmount = item.amount * item.quantity;
      categoryMap.set(category, (categoryMap.get(category) || 0) + totalAmount);
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

  const handleEditItem = (item: SavedShoppingItem) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditAmount(item.amount.toString());
    setEditCategory(item.category || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim() || !editAmount) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Erro', 'Por favor, insira um valor válido');
        return;
      }

      await ShoppingService.updateSavedShoppingItem(
        db,
        editingItem.id,
        editName.trim(),
        amount,
        editCategory || undefined
      );

      setShowEditModal(false);
      await loadListItems();
      await loadSavedLists(); // Recarregar dados do mês para o gráfico
      Alert.alert('Sucesso', 'Item atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o item');
    }
  };

  const handleDeleteItem = (item: SavedShoppingItem) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir "${item.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ShoppingService.deleteSavedShoppingItem(db, item.id);
              
              // Verificar se a lista ficou vazia após a exclusão
              const remainingItems = await ShoppingService.getSavedShoppingItems(db, selectedList!.id);
              
              if (remainingItems.length === 0) {
                // Se não há mais itens, excluir a lista também
                await ShoppingService.deleteSavedShoppingList(db, selectedList!.id);
                setSelectedList(null);
                Alert.alert('Sucesso', 'Item e lista excluídos com sucesso!');
              } else {
                Alert.alert('Sucesso', 'Item excluído com sucesso!');
              }
              
              await loadSavedLists(); // Recarregar dados do mês para o gráfico
            } catch (error) {
              console.error('Erro ao excluir item:', error);
              Alert.alert('Erro', 'Não foi possível excluir o item');
            }
          }
        }
      ]
    );
  };

  const handleDeleteList = (listId: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta lista de compras? Todos os itens serão removidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ShoppingService.deleteSavedShoppingList(db, listId);
              
              // Se a lista excluída era a selecionada, limpar a seleção
              if (selectedList?.id === listId) {
                setSelectedList(null);
              }
              
              await loadSavedLists();
              Alert.alert('Sucesso', 'Lista excluída com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir lista:', error);
              Alert.alert('Erro', 'Não foi possível excluir a lista');
            }
          }
        }
      ]
    );
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

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <TouchableWithoutFeedback>
        <View style={styles.container}>
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Ionicons name="arrow-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.title}>Minhas Compras</Text>
              <TouchableOpacity style={styles.settingsButton}>
                <Ionicons name="settings-outline" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Month Selector */}
            <View style={styles.monthSelector}>
              <TouchableOpacity 
                style={styles.monthButton}
                onPress={() => setShowMonthPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#000" />
                <Text style={styles.monthText}>
                  {getMonthName(selectedMonth)}/{selectedYear}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Lists Selector */}
            {savedLists.length > 0 && (
              <View style={styles.listsSection}>
                <Text style={styles.sectionTitle}>Listas Salvas</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.listsContainer}>
                    {savedLists.map((list) => (
                      <View key={list.id} style={styles.listCardContainer}>
                        <TouchableOpacity
                          style={[
                            styles.listCard,
                            selectedList?.id === list.id && styles.listCardActive
                          ]}
                          onPress={() => setSelectedList(list)}
                        >
                          <Text style={[
                            styles.listName,
                            selectedList?.id === list.id && styles.listNameActive
                          ]}>
                            {list.name}
                          </Text>
                          <Text style={styles.listDetails}>
                            {list.item_count} itens • {formatCurrency(list.total_amount)}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteListButton}
                          onPress={() => handleDeleteList(list.id)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

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

            {/* Items List */}
            {selectedList && listItems.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>
                  {selectedList.name} ({listItems.length} itens)
                </Text>
                <View style={styles.itemsList}>
                  {listItems.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={styles.itemLeft}>
                        <View style={styles.itemIcon}>
                          <Ionicons name="basket-outline" size={20} color="#000" />
                        </View>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemDetails}>
                            {formatCurrency(item.amount)} • Qtd: {item.quantity}
                            {item.category && ` • ${item.category}`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.itemRight}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditItem(item)}
                        >
                          <Ionicons name="pencil-outline" size={18} color="#4ECDC4" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteItem(item)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            {savedLists.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  Nenhuma lista salva encontrada para {getMonthName(selectedMonth)}/{selectedYear}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Mês</Text>
            
            <View style={styles.yearSelector}>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}>
                <Ionicons name="chevron-back" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(selectedYear + 1)}>
                <Ionicons name="chevron-forward" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthsGrid}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[
                    styles.monthOption,
                    selectedMonth === month && styles.monthOptionActive
                  ]}
                  onPress={() => setSelectedMonth(month)}
                >
                  <Text style={[
                    styles.monthOptionText,
                    selectedMonth === month && styles.monthOptionTextActive
                  ]}>
                    {getMonthName(month).substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowMonthPicker(false)}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
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
              <Text style={styles.inputLabel}>Nome do Produto</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Digite o nome do produto"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Valor</Text>
              <TextInput
                style={styles.input}
                value={editAmount}
                onChangeText={setEditAmount}
                placeholder="0,00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriesContainer}>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        editCategory === category && styles.categoryOptionActive
                      ]}
                      onPress={() => setEditCategory(category)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        editCategory === category && styles.categoryOptionTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
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
    </KeyboardAvoidingView>
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
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  settingsButton: {
    padding: 8,
  },
  monthSelector: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  listsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  listsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  listCardContainer: {
    position: 'relative',
    minWidth: 150,
  },
  listCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 150,
  },
  listCardActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  listName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  listNameActive: {
    color: '#ffffff',
  },
  listDetails: {
    fontSize: 12,
    color: 'black',
  },
  deleteListButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  itemsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
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
    width: width * 0.9,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthOption: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  monthOptionActive: {
    backgroundColor: '#4ECDC4',
  },
  monthOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  monthOptionTextActive: {
    color: '#ffffff',
  },
  confirmButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryOptionActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  categoryOptionTextActive: {
    color: '#ffffff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
