import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Keyboard,
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
import { PRODUCT_CATEGORIES } from '../enums/ProductCategory';
import { ShoppingList } from '../models/ShoppingList';
import { ShoppingListItem } from '../models/ShoppingListItem';
import { ShoppingListService } from '../services/ShoppingListService';

const { width } = Dimensions.get('window');

interface ShoppingListScreenProps {
  onBack: () => void;
}

export default function ShoppingListScreen({ onBack }: ShoppingListScreenProps) {
  const db = useSQLiteContext();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [listItems, setListItems] = useState<ShoppingListItem[]>([]);
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemDuration, setItemDuration] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);

  useEffect(() => {
    loadShoppingLists();
  }, []);

  useEffect(() => {
    if (selectedList) {
      loadListItems();
    }
  }, [selectedList]);

  const loadShoppingLists = async () => {
    try {
      const lists = await ShoppingListService.getAllShoppingLists(db);
      setShoppingLists(lists);
      if (lists.length > 0 && !selectedList) {
        setSelectedList(lists[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
    }
  };

  const loadListItems = async () => {
    if (!selectedList) return;
    
    try {
      const items = await ShoppingListService.getShoppingListItems(db, selectedList.id);
      setListItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome para a lista');
      return;
    }

    try {
      const newList = await ShoppingListService.createShoppingList(db, newListName.trim());
      setShoppingLists(prev => [newList, ...prev]);
      setSelectedList(newList);
      setNewListName('');
      setShowAddListModal(false);
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      Alert.alert('Erro', 'Não foi possível criar a lista');
    }
  };

  const handleDeleteList = (list: ShoppingList) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir a lista "${list.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ShoppingListService.deleteShoppingList(db, list.id);
              setShoppingLists(prev => prev.filter(l => l.id !== list.id));
              if (selectedList?.id === list.id) {
                const remainingLists = shoppingLists.filter(l => l.id !== list.id);
                setSelectedList(remainingLists.length > 0 ? remainingLists[0] : null);
              }
            } catch (error) {
              console.error('Erro ao excluir lista:', error);
              Alert.alert('Erro', 'Não foi possível excluir a lista');
            }
          }
        }
      ]
    );
  };

  const handleAddItem = async () => {
    if (!selectedList || !itemName.trim()) {
      Alert.alert('Erro', 'Por favor, selecione uma lista e insira o nome do item');
      return;
    }

    const quantity = parseInt(itemQuantity) || 1;
    const duration = itemDuration ? parseInt(itemDuration) : undefined;

    try {
      await ShoppingListService.addShoppingListItem(
        db,
        selectedList.id,
        itemName.trim(),
        quantity,
        duration,
        undefined,
        itemCategory || undefined
      );
      
      setItemName('');
      setItemQuantity('1');
      setItemDuration('');
      setItemCategory('');
      setShowAddItemModal(false);
      await loadListItems();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !itemName.trim()) {
      Alert.alert('Erro', 'Por favor, insira um nome válido');
      return;
    }

    const quantity = parseInt(itemQuantity) || 1;
    const duration = itemDuration ? parseInt(itemDuration) : undefined;

    try {
      await ShoppingListService.updateShoppingListItem(
        db,
        editingItem.id,
        itemName.trim(),
        quantity,
        duration,
        itemCategory || undefined
      );
      
      setEditingItem(null);
      setItemName('');
      setItemQuantity('1');
      setItemDuration('');
      setItemCategory('');
      setShowEditItemModal(false);
      await loadListItems();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o item');
    }
  };

  const handleDeleteItem = (item: ShoppingListItem) => {
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
              await ShoppingListService.deleteShoppingListItem(db, item.id);
              await loadListItems();
            } catch (error) {
              console.error('Erro ao excluir item:', error);
              Alert.alert('Erro', 'Não foi possível excluir o item');
            }
          }
        }
      ]
    );
  };

  const openEditItemModal = (item: ShoppingListItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemQuantity(item.quantity.toString());
    setItemDuration(item.duration_days?.toString() || '');
    setItemCategory(item.category || '');
    setShowEditItemModal(true);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
              <Text style={styles.title}>Listinha</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowAddListModal(true)}
              >
                <Ionicons name="add" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Lists Selector */}
            <View style={styles.listsSection}>
              <Text style={styles.sectionTitle}>Listas de Compras</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.listsContainer}>
                  {shoppingLists.map((list) => (
                    <TouchableOpacity
                      key={list.id}
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
                      <TouchableOpacity
                        style={styles.deleteListButton}
                        onPress={() => handleDeleteList(list)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Items Section */}
            {selectedList && (
              <View style={styles.itemsSection}>
                <View style={styles.itemsHeader}>
                  <Text style={styles.sectionTitle}>
                    {selectedList.name} ({listItems.length} itens)
                  </Text>
                  <TouchableOpacity
                    style={styles.addItemButton}
                    onPress={() => setShowAddItemModal(true)}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addItemButtonText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>

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
                            Qtd: {item.quantity}
                            {item.duration_days && ` • Duração: ${item.duration_days} dias`}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.itemRight}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => openEditItemModal(item)}
                        >
                          <Ionicons name="pencil-outline" size={18} color="#666" />
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
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Add List Modal */}
      <Modal
        visible={showAddListModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nova Lista de Compras</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome da Lista</Text>
              <TextInput
                style={styles.input}
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Ex: Lista do mês"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddListModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateList}
              >
                <Text style={styles.saveButtonText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Item</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome do Produto</Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Digite o nome do produto"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Quantidade</Text>
              <TextInput
                style={styles.input}
                value={itemQuantity}
                onChangeText={setItemQuantity}
                placeholder="1"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Duração (dias) - Opcional</Text>
              <TextInput
                style={styles.input}
                value={itemDuration}
                onChangeText={setItemDuration}
                placeholder="Ex: 7"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriesContainer}>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        itemCategory === cat && styles.categoryOptionActive
                      ]}
                      onPress={() => setItemCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        itemCategory === cat && styles.categoryOptionTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddItemModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddItem}
              >
                <Text style={styles.saveButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={showEditItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditItemModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Item</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome do Produto</Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Digite o nome do produto"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Quantidade</Text>
              <TextInput
                style={styles.input}
                value={itemQuantity}
                onChangeText={setItemQuantity}
                placeholder="1"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Duração (dias) - Opcional</Text>
              <TextInput
                style={styles.input}
                value={itemDuration}
                onChangeText={setItemDuration}
                placeholder="Ex: 7"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoriesContainer}>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        itemCategory === cat && styles.categoryOptionActive
                      ]}
                      onPress={() => setItemCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        itemCategory === cat && styles.categoryOptionTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditItemModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleEditItem}
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
  addButton: {
    padding: 8,
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
  listCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 120,
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
  deleteListButton: {
    alignSelf: 'flex-end',
  },
  itemsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addItemButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
});
