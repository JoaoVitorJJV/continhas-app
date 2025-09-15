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
import { CATEGORY_TYPES, CategoryType, getCategoryTypeLabel } from '../enums/CategoryType';
import { Category } from '../models/Category';
import { Profile } from '../models/Profile';
import { CategoryService } from '../services/CategoryService';

interface CategoryManagementScreenProps {
  onBack: () => void;
  currentProfile: Profile;
}

export default function CategoryManagementScreen({ onBack, currentProfile }: CategoryManagementScreenProps) {
  const db = useSQLiteContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedType, setSelectedType] = useState<CategoryType>(CategoryType.EXPENSE);
  
  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('circle');
  const [categoryColor, setCategoryColor] = useState('#FF6B6B');

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const allCategories = await CategoryService.getAllCategories(db, currentProfile.id);
      setCategories(allCategories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [db]);

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome da categoria');
      return;
    }

    try {
      setIsLoading(true);
      await CategoryService.createCategory(db, {
        name: categoryName.trim(),
        icon: categoryIcon,
        color: categoryColor,
        type: selectedType,
        profile_id: currentProfile.id
      });
      
      Alert.alert('Sucesso', 'Categoria criada com sucesso!');
      setCategoryName('');
      setCategoryIcon('circle');
      setCategoryColor('#FF6B6B');
      setShowAddForm(false);
      await loadCategories();
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !categoryName.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome da categoria');
      return;
    }

    try {
      setIsLoading(true);
      await CategoryService.updateCategory(db, editingCategory.id, {
        name: categoryName.trim(),
        icon: categoryIcon,
        color: categoryColor,
        type: selectedType
      });
      
      Alert.alert('Sucesso', 'Categoria atualizada com sucesso!');
      setCategoryName('');
      setCategoryIcon('circle');
      setCategoryColor('#FF6B6B');
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a categoria');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Tem certeza que deseja excluir a categoria "${category.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await CategoryService.deleteCategory(db, category.id);
              Alert.alert('Sucesso', 'Categoria excluída com sucesso!');
              await loadCategories();
            } catch (error) {
              console.error('Erro ao excluir categoria:', error);
              Alert.alert('Erro', error instanceof Error ? error.message : 'Não foi possível excluir a categoria');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryIcon(category.icon);
    setCategoryColor(category.color);
    setSelectedType(category.type as CategoryType);
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryIcon('circle');
    setCategoryColor('#FF6B6B');
    setShowAddForm(false);
  };

  const filteredCategories = categories.filter(cat => cat.type === selectedType);

  const predefinedColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FFA500', '#FF4500', '#4169E1', '#8B4513',
    '#8B0000', '#2F4F4F', '#4682B4', '#800080', '#DAA520',
    '#32CD32', '#FF1493', '#00CED1', '#FFD700', '#DC143C'
  ];

  const predefinedIcons = [
    'restaurant', 'car', 'game-controller', 'medical', 'briefcase',
    'laptop', 'flash', 'flame', 'wifi', 'construct', 'home',
    'business', 'card', 'people', 'home-outline', 'cash',
    'shopping-cart', 'fitness', 'school', 'airplane', 'heart'
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Categorias</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => {
            setShowAddForm(true);
            setEditingCategory(null);
            setCategoryName('');
            setCategoryIcon('circle');
            setCategoryColor('#FF6B6B');
          }}
        >
          <Ionicons name="add" size={24} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Categoria</Text>
          <View style={styles.typeSelector}>
            {CATEGORY_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  selectedType === type.value && styles.typeButtonActive,
                ]}
                onPress={() => setSelectedType(type.value)}
              >
                <Text style={[
                  styles.typeButtonText,
                  selectedType === type.value && styles.typeButtonTextActive,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Add/Edit Form */}
        {showAddForm && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>
            
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Nome da Categoria</Text>
              <TextInput
                style={styles.input}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="Ex: Alimentação, Transporte..."
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Ícone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconContainer}>
                {predefinedIcons.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconButton,
                      categoryIcon === icon && styles.iconButtonActive,
                    ]}
                    onPress={() => setCategoryIcon(icon)}
                  >
                    <Ionicons name={icon as any} size={24} color={categoryIcon === icon ? '#fff' : '#666'} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Cor</Text>
              <View style={styles.colorContainer}>
                {predefinedColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      categoryColor === color && styles.colorButtonActive,
                    ]}
                    onPress={() => setCategoryColor(color)}
                  />
                ))}
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={cancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
                  onPress={editingCategory ? handleEditCategory : handleAddCategory}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingCategory ? 'Atualizar' : 'Criar'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Categories List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Categorias de {getCategoryTypeLabel(selectedType)} ({filteredCategories.length})
          </Text>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2C3E50" />
            </View>
          ) : (
            <View style={styles.categoriesContainer}>
              {filteredCategories.map((category) => (
                <View key={category.id} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Ionicons
                      name={category.icon as any}
                      size={24}
                      color={category.color}
                    />
                    <View style={styles.categoryDetails}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryType}>
                        {getCategoryTypeLabel(category.type as CategoryType)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.categoryActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => startEdit(category)}
                    >
                      <Ionicons name="pencil" size={20} color="#2C3E50" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCategory(category)}
                    >
                      <Ionicons name="trash" size={20} color="#DC143C" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              
              {filteredCategories.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-open" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    Nenhuma categoria encontrada para {getCategoryTypeLabel(selectedType).toLowerCase()}
                  </Text>
                </View>
              )}
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
  addButton: {
    padding: 8,
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
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  typeButtonTextActive: {
    color: '#2C3E50',
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
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
  iconContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconButtonActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  colorButtonActive: {
    borderColor: '#2C3E50',
    borderWidth: 3,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
    fontWeight: '500',
    color: '#666666',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDetails: {
    marginLeft: 12,
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  categoryType: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#E8F4FD',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFE8E8',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 12,
  },
});
