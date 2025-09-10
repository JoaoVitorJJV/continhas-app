import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
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
import { Product } from '../models/Product';
import { SavedShoppingList } from '../models/SavedShoppingList';
import { ShoppingItem } from '../models/ShoppingItem';
import { ShoppingList } from '../models/ShoppingList';
import { ShoppingListItem } from '../models/ShoppingListItem';
import { ShoppingMonth } from '../models/ShoppingMonth';
import { SettingsService } from '../services/SettingsService';
import { ShoppingListService } from '../services/ShoppingListService';
import { ShoppingService } from '../services/ShoppingService';

const { width } = Dimensions.get('window');

interface ShoppingScreenProps {
  onBack: () => void;
  onNewShopping: () => void;
  onShoppingList: () => void;
  onSettings: () => void;
}

export default function NewShoppingScreen({ onBack, onNewShopping, onShoppingList, onSettings }: ShoppingScreenProps) {
  const db = useSQLiteContext();
  const [shoppingMonth, setShoppingMonth] = useState<ShoppingMonth | null>(null);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [voucherLimit, setVoucherLimit] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [mode, setMode] = useState<'withName' | 'withoutName'>('withName');
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveListName, setSaveListName] = useState('');
  const [savedLists, setSavedLists] = useState<SavedShoppingList[]>([]);
  const [showListItemsModal, setShowListItemsModal] = useState(false);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedShoppingList, setSelectedShoppingList] = useState<ShoppingList | null>(null);
  const [listItems, setListItems] = useState<ShoppingListItem[]>([]);
  const [showShoppingListModal, setShowShoppingListModal] = useState(false);
  const [monthShoppingListItems, setMonthShoppingListItems] = useState<ShoppingListItem[]>([]);

  useEffect(() => {
    loadShoppingMonth();
  }, [selectedYear, selectedMonth]);

  // Recarregar limite do vale quando a tela receber foco (voltar das configurações)
  useFocusEffect(
    useCallback(() => {
      const reloadVoucherLimit = async () => {
        try {
          const voucherLimitFromSettings = await SettingsService.getVoucherLimit(db);
          setVoucherLimit(voucherLimitFromSettings);
        } catch (error) {
          console.error('Erro ao recarregar limite do vale:', error);
        }
      };
      
      reloadVoucherLimit();
    }, [db])
  );

  useEffect(() => {
    if (shoppingMonth) {
      loadShoppingItems();
      loadTotalAmount();
    }
  }, [shoppingMonth]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadShoppingLists();
  }, []);

  useEffect(() => {
    if (shoppingMonth) {
      loadSavedLists();
    }
  }, [shoppingMonth]);

  const loadShoppingMonth = async () => {
    try {
      const month = await ShoppingService.getOrCreateShoppingMonth(db, selectedYear, selectedMonth);
      setShoppingMonth(month);
      
      // Carregar limite do vale das configurações
      const voucherLimitFromSettings = await SettingsService.getVoucherLimit(db);
      setVoucherLimit(voucherLimitFromSettings);
    } catch (error) {
      console.error('Erro ao carregar mês de compras:', error);
    }
  };

  const loadShoppingItems = async () => {
    if (!shoppingMonth) return;
    
    try {
      const items = await ShoppingService.getShoppingItems(db, shoppingMonth.id);
      setShoppingItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  const loadTotalAmount = async () => {
    if (!shoppingMonth) return;
    
    try {
      const total = await ShoppingService.getTotalAmount(db, shoppingMonth.id);
      setTotalAmount(total);
    } catch (error) {
      console.error('Erro ao calcular total:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const allProducts = await ShoppingService.getAllProducts(db);
      setProducts(allProducts);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const loadShoppingLists = async () => {
    try {
      const lists = await ShoppingListService.getAllShoppingLists(db);
      setShoppingLists(lists);
      if (lists.length > 0 && !selectedShoppingList) {
        setSelectedShoppingList(lists[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar listas de compras:', error);
    }
  };

  const loadSavedLists = async () => {
    if (!shoppingMonth) return;
    
    try {
      const lists = await ShoppingService.getSavedShoppingLists(db, shoppingMonth.id);
      setSavedLists(lists);
    } catch (error) {
      console.error('Erro ao carregar listas salvas:', error);
    }
  };

  const handleSaveShoppingList = async () => {
    if (!shoppingMonth || !saveListName.trim() || shoppingItems.length === 0) {
      Alert.alert('Erro', 'Por favor, insira um nome para a lista e certifique-se de que há itens para salvar');
      return;
    }

    try {
      await ShoppingService.saveShoppingList(db, shoppingMonth.id, saveListName.trim(), shoppingItems);
      
      // Limpar todos os itens da lista atual após salvar
      await ShoppingService.clearShoppingItems(db, shoppingMonth.id);
      setShoppingItems([]);
      
      setShowSaveModal(false);
      setSaveListName('');
      await loadSavedLists();
      Alert.alert('Sucesso', 'Lista de compras salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar lista:', error);
      Alert.alert('Erro', 'Não foi possível salvar a lista de compras');
    }
  };

  const handleClearShoppingList = () => {
    if (shoppingItems.length === 0) {
      Alert.alert('Aviso', 'Não há itens para limpar');
      return;
    }

    Alert.alert(
      'Limpar Lista',
      'Tem certeza que deseja limpar todos os itens da lista atual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            if (!shoppingMonth) return;
            
            try {
              await ShoppingService.clearShoppingItems(db, shoppingMonth.id);
              await loadShoppingItems();
              await loadTotalAmount();
              Alert.alert('Sucesso', 'Lista limpa com sucesso!');
            } catch (error) {
              console.error('Erro ao limpar lista:', error);
              Alert.alert('Erro', 'Não foi possível limpar a lista');
            }
          }
        }
      ]
    );
  };

  const handleDeleteSavedList = (listId: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta lista salva?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ShoppingService.deleteSavedShoppingList(db, listId);
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

  const handleAddItem = async () => {
    if (!shoppingMonth || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido');
      return;
    }

    if (mode === 'withName' && !productName.trim()) {
      Alert.alert('Erro', 'Por favor, insira o nome do produto');
      return;
    }

    const quantityValue = parseInt(quantity) || 1;
    if (quantityValue <= 0) {
      Alert.alert('Erro', 'A quantidade deve ser maior que zero');
      return;
    }

    try {
      const amountValue = parseCurrencyInput(amount);
      await ShoppingService.addShoppingItem(
        db, 
        shoppingMonth.id, 
        amountValue,
        quantityValue,
        mode === 'withName' ? productName.trim() : undefined,
        undefined,
        category || undefined
      );
      
      setProductName('');
      setAmount('');
      setQuantity('1');
      setCategory('');
      setShowProductSuggestions(false);
      await loadShoppingItems();
      await loadTotalAmount();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      Alert.alert('Erro', 'A quantidade deve ser maior que zero');
      return;
    }

    try {
      await ShoppingService.updateItemQuantity(db, itemId, newQuantity);
      await loadShoppingItems();
      await loadTotalAmount();
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a quantidade');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja remover este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await ShoppingService.removeShoppingItem(db, itemId);
              await loadShoppingItems();
              await loadTotalAmount();
              // Recarregar itens da lista se o modal estiver aberto
              if (showShoppingListModal) {
                await loadMonthShoppingListItems();
              }
            } catch (error) {
              console.error('Erro ao remover item:', error);
              Alert.alert('Erro', 'Não foi possível remover o item');
            }
          }
        }
      ]
    );
  };


  const handleProductNameChange = (text: string) => {
    setProductName(text);
    
    if (text.trim().length > 0) {
      // Buscar em produtos salvos
      const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(text.toLowerCase())
      );
      
      // Buscar em itens da lista
      const filteredListItems = listItems.filter(item => 
        item.name.toLowerCase().includes(text.toLowerCase())
      );
      
      // Combinar resultados
      const allSuggestions = [
        ...filteredProducts.map(p => ({ ...p, type: 'product' })),
        ...filteredListItems.map(i => ({ ...i, type: 'list' }))
      ];
      
      setFilteredProducts(allSuggestions as any);
      setShowProductSuggestions(true);
    } else {
      setShowProductSuggestions(false);
    }
  };

  const selectProduct = (item: any) => {
    setProductName(item.name);
    if (item.type === 'list') {
      setQuantity(item.quantity.toString());
    }
    setShowProductSuggestions(false);
  };

  const openListItemsModal = async () => {
    if (shoppingLists.length === 0) {
      Alert.alert('Aviso', 'Não há listas de compras disponíveis');
      return;
    }
    
    if (!selectedShoppingList) {
      setSelectedShoppingList(shoppingLists[0]);
    }
    
    await loadListItems();
    setShowListItemsModal(true);
  };

  const loadListItems = async () => {
    if (!selectedShoppingList) return;
    
    try {
      const items = await ShoppingListService.getShoppingListItems(db, selectedShoppingList.id);
      setListItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens da lista:', error);
    }
  };

  const selectListItem = (item: ShoppingListItem) => {
    setProductName(item.name);
    setQuantity(item.quantity.toString());
    setCategory(item.category || '');
    setShowListItemsModal(false);
  };

  const openShoppingListModal = async () => {
    if (shoppingLists.length === 0) {
      Alert.alert('Aviso', 'Não há listas de compras disponíveis');
      return;
    }
    
    if (!selectedShoppingList) {
      setSelectedShoppingList(shoppingLists[0]);
    }
    
    await loadMonthShoppingListItems();
    setShowShoppingListModal(true);
  };

  const loadMonthShoppingListItems = async () => {
    if (!selectedShoppingList) return;
    
    try {
      const items = await ShoppingListService.getShoppingListItems(db, selectedShoppingList.id);
      setMonthShoppingListItems(items);
    } catch (error) {
      console.error('Erro ao carregar itens da lista do mês:', error);
    }
  };

  const addItemFromShoppingList = (item: ShoppingListItem) => {
    // Preencher os campos da tela de nova compra
    setProductName(item.name);
    setQuantity(item.quantity.toString());
    setCategory(item.category || '');
    
    // Fechar o modal
    setShowShoppingListModal(false);
    
    // Mudar para modo "com nome" se estiver em "sem nome"
    setMode('withName');
  };

  const isItemInShoppingCart = (item: ShoppingListItem): boolean => {
    return shoppingItems.some(shoppingItem => 
      shoppingItem.name === item.name && 
      shoppingItem.product_id === item.product_id
    );
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCurrencyInput = (text: string): string => {
    // Remove tudo que não é dígito
    const numbers = text.replace(/\D/g, '');
    
    if (numbers === '') return '';
    
    // Converte para centavos
    const value = parseInt(numbers) / 100;
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const parseCurrencyInput = (text: string): number => {
    const numbers = text.replace(/\D/g, '');
    return parseInt(numbers) / 100;
  };

  const getMonthName = (month: number): string => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const remainingAmount = voucherLimit - totalAmount;
  const isOverLimit = remainingAmount < 0;

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
        <Text style={styles.title}>Compras</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={onSettings}>
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
            </View>

            {/* Internal Menu */}
            <View style={styles.internalMenuSection}>
              <View style={styles.internalMenuGrid}>
                <TouchableOpacity 
                  style={styles.internalMenuCard}
                  onPress={onShoppingList}
                >
                  <View style={styles.internalMenuIcon}>
                    <Ionicons name="list-outline" size={32} color="#000" />
                  </View>
                  <Text style={styles.internalMenuText}>Listinha</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* View Shopping List Button */}
            <View style={styles.viewListSection}>
              <TouchableOpacity 
                style={styles.viewListButton}
                onPress={openShoppingListModal}
              >
                <Ionicons name="eye-outline" size={20} color="#4ECDC4" />
                <Text style={styles.viewListButtonText}>Ver Listinha de compras</Text>
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

      {/* Voucher Card */}
      <View style={styles.voucherCard}>
        <View style={styles.voucherHeader}>
          <Text style={styles.voucherTitle}>Vale-Supermercado</Text>
        </View>
        <Text style={styles.voucherLimit}>
          Limite: {formatCurrency(voucherLimit)}
        </Text>
        <Text style={styles.voucherSpent}>
          Gasto: {formatCurrency(totalAmount)}
        </Text>
        <Text style={[
          styles.voucherRemaining,
          { color: isOverLimit ? '#FF6B6B' : '#4ECDC4' }
        ]}>
          Restante: {formatCurrency(remainingAmount)}
        </Text>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'withName' && styles.modeButtonActive]}
          onPress={() => setMode('withName')}
        >
          <Text style={[styles.modeText, mode === 'withName' && styles.modeTextActive]}>
            Produto com nome
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, mode === 'withoutName' && styles.modeButtonActive]}
          onPress={() => setMode('withoutName')}
        >
          <Text style={[styles.modeText, mode === 'withoutName' && styles.modeTextActive]}>
            Produto sem nome
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Item Form */}
      <View style={styles.addForm}>
         {mode === 'withName' && (
           <View style={styles.inputContainer}>
             <View style={styles.productNameHeader}>
               <Text style={styles.inputLabel}>Nome do Produto</Text>
               <TouchableOpacity
                 style={styles.addFromListButton}
                 onPress={openListItemsModal}
               >
                 <Ionicons name="list-outline" size={16} color="#4ECDC4" />
                 <Text style={styles.addFromListButtonText}>Adicionar item da lista</Text>
               </TouchableOpacity>
             </View>
             <TextInput
               style={styles.input}
               value={productName}
               onChangeText={handleProductNameChange}
               placeholder="Digite o nome do produto"
               placeholderTextColor="#999"
             />
             {showProductSuggestions && filteredProducts.length > 0 && (
               <View style={styles.suggestionsContainer}>
                 <FlatList
                   data={filteredProducts}
                   keyExtractor={(item) => item.id}
                   renderItem={({ item }) => (
                     <TouchableOpacity
                       style={styles.suggestionItem}
                       onPress={() => selectProduct(item)}
                     >
                       <View style={styles.suggestionContent}>
                         <Text style={styles.suggestionText}>{item.name}</Text>
                         {(item as any).type === 'list' && (
                           <Text style={styles.suggestionType}>Item da lista</Text>
                         )}
                       </View>
                     </TouchableOpacity>
                   )}
                   style={styles.suggestionsList}
                 />
               </View>
             )}
           </View>
         )}
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Valor</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={(text) => setAmount(formatCurrencyInput(text))}
            placeholder="R$ 0,00"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

         <View style={styles.inputContainer}>
           <Text style={styles.inputLabel}>Quantidade</Text>
           <View style={styles.quantityControls}>
             <TouchableOpacity
               style={styles.quantityButton}
               onPress={() => {
                 const currentQty = parseInt(quantity) || 1;
                 if (currentQty > 1) {
                   setQuantity((currentQty - 1).toString());
                 }
               }}
             >
               <Ionicons name="remove" size={20} color="#2C3E50" />
             </TouchableOpacity>
             <Text style={styles.quantityText}>{quantity}</Text>
             <TouchableOpacity
               style={styles.quantityButton}
               onPress={() => {
                 const currentQty = parseInt(quantity) || 1;
                 setQuantity((currentQty + 1).toString());
               }}
             >
               <Ionicons name="add" size={20} color="#2C3E50" />
             </TouchableOpacity>
           </View>
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
                     category === cat && styles.categoryOptionActive
                   ]}
                   onPress={() => setCategory(cat)}
                 >
                   <Text style={[
                     styles.categoryOptionText,
                     category === cat && styles.categoryOptionTextActive
                   ]}>
                     {cat}
                   </Text>
                 </TouchableOpacity>
               ))}
             </View>
           </ScrollView>
         </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.actionSaveButton]}
          onPress={() => setShowSaveModal(true)}
          disabled={shoppingItems.length === 0}
        >
          <Ionicons name="save-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Salvar Compras</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.clearButton]}
          onPress={handleClearShoppingList}
          disabled={shoppingItems.length === 0}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Limpar Lista</Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <View style={styles.itemsSection}>
        <Text style={styles.itemsTitle}>Itens ({shoppingItems.length})</Text>
        <View style={styles.itemsList}>
          {shoppingItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemLeft}>
                <View style={styles.itemIcon}>
                  <Ionicons name="basket-outline" size={20} color="#000" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.name || 'Produto sem nome'}
                  </Text>
                  <Text style={styles.itemDate}>
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>
              <View style={styles.itemRight}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemAmount}>
                  {formatCurrency(item.amount * item.quantity)}
                </Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Saved Lists Section */}
      {savedLists.length > 0 && (
        <View style={styles.savedListsSection}>
          <Text style={styles.savedListsTitle}>Listas Salvas ({savedLists.length})</Text>
          <View style={styles.savedListsList}>
            {savedLists.map((list) => (
              <View key={list.id} style={styles.savedListCard}>
                <View style={styles.savedListLeft}>
                  <View style={styles.savedListIcon}>
                    <Ionicons name="list-outline" size={20} color="#000" />
                  </View>
                  <View style={styles.savedListInfo}>
                    <Text style={styles.savedListName}>{list.name}</Text>
                    <Text style={styles.savedListDetails}>
                      {list.item_count} itens
                    </Text>
                    <Text style={styles.savedListDate}>
                      {new Date(list.saved_at).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
                <View style={styles.savedListRight}>
                  <Text style={styles.savedListTotal}>
                    {formatCurrency(list.total_amount)}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteListButton}
                    onPress={() => handleDeleteSavedList(list.id)}
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


      {/* Save Shopping List Modal */}
      <Modal
        visible={showSaveModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Salvar Lista de Compras</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome da Lista</Text>
              <TextInput
                style={styles.input}
                value={saveListName}
                onChangeText={setSaveListName}
                placeholder="Ex: Compras do fim de semana"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.saveModalInfo}>
              <Text style={styles.saveModalInfoText}>
                Total: {formatCurrency(totalAmount)}
              </Text>
              <Text style={styles.saveModalInfoText}>
                Itens: {shoppingItems.length}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveShoppingList}
              >
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* List Items Modal */}
      <Modal
        visible={showListItemsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowListItemsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Item da Lista</Text>
            
            {/* List Selector */}
            {shoppingLists.length > 0 && (
              <View style={styles.listSelector}>
                <Text style={styles.inputLabel}>Lista:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.listsContainer}>
                    {shoppingLists.map((list) => (
                      <TouchableOpacity
                        key={list.id}
                        style={[
                          styles.listCard,
                          selectedShoppingList?.id === list.id && styles.listCardActive
                        ]}
                        onPress={() => {
                          setSelectedShoppingList(list);
                          loadListItems();
                        }}
                      >
                        <Text style={[
                          styles.listName,
                          selectedShoppingList?.id === list.id && styles.listNameActive
                        ]}>
                          {list.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Items List */}
            <View style={styles.listItemsContainer}>
              <Text style={styles.inputLabel}>
                Itens ({listItems.length})
              </Text>
              <View style={styles.listItemsList}>
                {listItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.listItemCard}
                    onPress={() => selectListItem(item)}
                  >
                    <View style={styles.listItemLeft}>
                      <View style={styles.listItemIcon}>
                        <Ionicons name="basket-outline" size={20} color="#000" />
                      </View>
                      <View style={styles.listItemInfo}>
                        <Text style={styles.listItemName}>{item.name}</Text>
                        <Text style={styles.listItemDetails}>
                          Qtd: {item.quantity}
                          {item.duration_days && ` • Duração: ${item.duration_days} dias`}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowListItemsModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shopping List Modal */}
      <Modal
        visible={showShoppingListModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShoppingListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shoppingListModalContent}>
            <Text style={styles.modalTitle}>Listinha de Compras</Text>
            
            {/* Month Info */}
            <View style={styles.monthInfo}>
              <Text style={styles.monthInfoText}>
                {getMonthName(selectedMonth)}/{selectedYear}
              </Text>
            </View>

            {/* List Selector */}
            {shoppingLists.length > 0 && (
              <View style={styles.listSelector}>
                <Text style={styles.inputLabel}>Lista:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.listsContainer}>
                    {shoppingLists.map((list) => (
                      <TouchableOpacity
                        key={list.id}
                        style={[
                          styles.listCard,
                          selectedShoppingList?.id === list.id && styles.listCardActive
                        ]}
                        onPress={() => {
                          setSelectedShoppingList(list);
                          loadMonthShoppingListItems();
                        }}
                      >
                        <Text style={[
                          styles.listName,
                          selectedShoppingList?.id === list.id && styles.listNameActive
                        ]}>
                          {list.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Items List */}
            <ScrollView style={styles.shoppingListItemsContainer}>
              <Text style={styles.inputLabel}>
                Itens ({monthShoppingListItems.length})
              </Text>
              <View style={styles.shoppingListItemsList}>
                {monthShoppingListItems.map((item) => {
                  const isInCart = isItemInShoppingCart(item);
                  return (
                    <View key={item.id} style={styles.shoppingListItemCard}>
                      <View style={styles.shoppingListItemLeft}>
                        <View style={styles.shoppingListItemIcon}>
                          <Ionicons name="basket-outline" size={20} color="#000" />
                        </View>
                        <View style={styles.shoppingListItemInfo}>
                          <Text style={[
                            styles.shoppingListItemName,
                            isInCart && styles.shoppingListItemNameCompleted
                          ]}>
                            {item.name}
                          </Text>
                          <Text style={styles.shoppingListItemDetails}>
                            Qtd: {item.quantity}
                            {item.duration_days && ` • Duração: ${item.duration_days} dias`}
                            {item.category && ` • ${item.category}`}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.addToCartButton,
                          isInCart && styles.addToCartButtonCompleted
                        ]}
                        onPress={() => addItemFromShoppingList(item)}
                        disabled={isInCart}
                      >
                        <Ionicons 
                          name={isInCart ? "checkmark" : "arrow-forward"} 
                          size={16} 
                          color={isInCart ? "#fff" : "#4ECDC4"} 
                        />
                        <Text style={[
                          styles.addToCartButtonText,
                          isInCart && styles.addToCartButtonTextCompleted
                        ]}>
                          {isInCart ? 'Adicionado' : 'Usar'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowShoppingListModal(false)}
              >
                <Text style={styles.cancelButtonText}>Fechar</Text>
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
  internalMenuSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  internalMenuGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  internalMenuCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  internalMenuIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  internalMenuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
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
    padding: 12,
    gap: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    flex: 1,
  },
  voucherCard: {
    backgroundColor: '#2C3E50',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  voucherTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editButton: {
    padding: 4,
  },
  voucherLimit: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  voucherSpent: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 4,
  },
  voucherRemaining: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modeTextActive: {
    color: '#000',
  },
  addForm: {
    paddingHorizontal: 20,
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
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 150,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#000',
  },
  addButton: {
    backgroundColor: '#4ECDC4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
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
    marginBottom: 12,
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
  itemDate: {
    fontSize: 12,
    color: '#666',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  removeButton: {
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
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  actionSaveButton: {
    backgroundColor: '#4ECDC4',
  },
  clearButton: {
    backgroundColor: '#FF6B6B',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  savedListsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  savedListsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  savedListsList: {
    gap: 12,
  },
  savedListCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'row'
  },
  savedListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savedListIcon: {
    marginRight: 12,
  },
  savedListInfo: {
    flex: 1,
  },
  savedListName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  savedListDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  savedListDate: {
    fontSize: 12,
    color: '#999',
  },
  savedListRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  savedListTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  deleteListButton: {
    padding: 4,
  },
  saveModalInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  saveModalInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productNameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addFromListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  addFromListButtonText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionType: {
    fontSize: 12,
    color: '#4ECDC4',
    fontStyle: 'italic',
  },
  listSelector: {
    marginBottom: 20,
  },
  listsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  listCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 100,
  },
  listCardActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  listName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  listNameActive: {
    color: '#ffffff',
  },
  listItemsContainer: {
    marginBottom: 20,
  },
  listItemsList: {
    maxHeight: 300,
    marginTop: 8,
  },
  listItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemIcon: {
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  listItemDetails: {
    fontSize: 12,
    color: '#666',
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
  viewListSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  viewListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  viewListButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  shoppingListModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: width * 0.95,
    maxWidth: 500,
    maxHeight: '80%',
  },
  monthInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  monthInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  shoppingListItemsContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  shoppingListItemsList: {
    marginTop: 8,
  },
  shoppingListItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  shoppingListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shoppingListItemIcon: {
    marginRight: 12,
  },
  shoppingListItemInfo: {
    flex: 1,
  },
  shoppingListItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  shoppingListItemNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#4ECDC4',
  },
  shoppingListItemDetails: {
    fontSize: 12,
    color: '#666',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  addToCartButtonCompleted: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  addToCartButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4ECDC4',
  },
  addToCartButtonTextCompleted: {
    color: '#ffffff',
  },
});
