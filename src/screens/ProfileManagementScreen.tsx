import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
import { Profile } from '../models/Profile';
import { ProfileService } from '../services/ProfileService';

interface ProfileManagementScreenProps {
  onBack: () => void;
  onProfileChanged: (profile: Profile) => void;
  currentProfile: Profile;
}

const AVAILABLE_ICONS = [
  'person', 'person-circle', 'person-outline', 'person-add',
  'man', 'woman', 'people', 'people-circle',
  'star', 'heart', 'home', 'car', 'briefcase',
  'game-controller', 'musical-notes', 'camera', 'book',
  'airplane', 'restaurant', 'fitness', 'school'
];

export default function ProfileManagementScreen({ 
  onBack, 
  onProfileChanged, 
  currentProfile 
}: ProfileManagementScreenProps) {
  const { database: db } = useSQLite();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('person');

  useEffect(() => {
    loadProfiles();
  }, [db, currentProfile]);

  const loadProfiles = async () => {
    try {
      const profilesData = await ProfileService.getAllProfiles(db);
      setProfiles(profilesData);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      Alert.alert('Erro', 'Não foi possível carregar os perfis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert('Erro', 'Por favor, digite um nome para o perfil');
      return;
    }

    try {
      const newProfile = await ProfileService.createProfile(db, {
        name: newProfileName.trim(),
        icon: selectedIcon
      });

      setProfiles(prev => [...prev, newProfile]);
      setShowCreateModal(false);
      setNewProfileName('');
      setSelectedIcon('person');
      
      Alert.alert('Sucesso', 'Perfil criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      Alert.alert('Erro', 'Não foi possível criar o perfil');
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setSelectedIcon(profile.icon);
    setShowEditModal(true);
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile || !newProfileName.trim()) {
      Alert.alert('Erro', 'Por favor, digite um nome para o perfil');
      return;
    }

    try {
      await ProfileService.updateProfile(db, editingProfile.id, {
        name: newProfileName.trim(),
        icon: selectedIcon
      });

      const updatedProfiles = profiles.map(p => 
        p.id === editingProfile.id 
          ? { ...p, name: newProfileName.trim(), icon: selectedIcon }
          : p
      );
      setProfiles(updatedProfiles);

      // Se estamos editando o perfil atual, atualizar o contexto
      if (editingProfile.id === currentProfile.id) {
        onProfileChanged({ ...editingProfile, name: newProfileName.trim(), icon: selectedIcon });
      }

      setShowEditModal(false);
      setEditingProfile(null);
      setNewProfileName('');
      setSelectedIcon('person');
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil');
    }
  };

  const handleDeleteProfile = async (profile: Profile) => {
    if (profiles.length <= 1) {
      Alert.alert('Erro', 'Não é possível excluir o último perfil');
      return;
    }

    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir o perfil "${profile.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProfileService.deleteProfile(db, profile.id);
              const updatedProfiles = profiles.filter(p => p.id !== profile.id);
              setProfiles(updatedProfiles);

              // Se excluímos o perfil atual, trocar para outro perfil
              if (profile.id === currentProfile.id) {
                const newCurrentProfile = updatedProfiles[0];
                await ProfileService.setDefaultProfile(db, newCurrentProfile.id);
                onProfileChanged(newCurrentProfile);
              }

              Alert.alert('Sucesso', 'Perfil excluído com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir perfil:', error);
              Alert.alert('Erro', 'Não foi possível excluir o perfil');
            }
          }
        }
      ]
    );
  };

  const handleSelectProfile = async (profile: Profile) => {
    try {
      await ProfileService.setDefaultProfile(db, profile.id);
      onProfileChanged(profile);
      Alert.alert('Sucesso', `Perfil "${profile.name}" selecionado!`);
    } catch (error) {
      console.error('Erro ao selecionar perfil:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o perfil');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Text style={styles.loadingText}>Carregando perfis...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Gerenciar Perfis</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#2C3E50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.profilesContainer}>
        {profiles.map((profile) => (
          <View key={profile.id} style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.profileIcon}>
                <Ionicons name={profile.icon as any} size={32} color="#2C3E50" />
              </View>
              <View style={styles.profileDetails}>
                <Text style={styles.profileName}>{profile.name}</Text>
                {profile.is_default && (
                  <Text style={styles.defaultText}>Perfil Atual</Text>
                )}
              </View>
            </View>
            
            <View style={styles.profileActions}>
              {!profile.is_default && (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => handleSelectProfile(profile)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditProfile(profile)}
              >
                <Ionicons name="pencil" size={20} color="#2C3E50" />
              </TouchableOpacity>
              
              {profiles.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteProfile(profile)}
                >
                  <Ionicons name="trash" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal para criar perfil */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Criar Novo Perfil</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome do Perfil</Text>
              <TextInput
                style={styles.input}
                value={newProfileName}
                onChangeText={setNewProfileName}
                placeholder="Digite o nome do perfil"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ícone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                {AVAILABLE_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === icon && styles.iconOptionSelected
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons 
                      name={icon as any} 
                      size={24} 
                      color={selectedIcon === icon ? '#ffffff' : '#2C3E50'} 
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateProfile}
              >
                <Text style={styles.createButtonText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para editar perfil */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nome do Perfil</Text>
              <TextInput
                style={styles.input}
                value={newProfileName}
                onChangeText={setNewProfileName}
                placeholder="Digite o nome do perfil"
                placeholderTextColor="#999"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ícone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                {AVAILABLE_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      selectedIcon === icon && styles.iconOptionSelected
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons 
                      name={icon as any} 
                      size={24} 
                      color={selectedIcon === icon ? '#ffffff' : '#2C3E50'} 
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.createButtonText}>Salvar</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    color: '#7f8c8d',
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
    marginTop: 35,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  addButton: {
    padding: 5,
  },
  profilesContainer: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  defaultText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
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
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  iconScroll: {
    marginTop: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e1e8ed',
  },
  iconOptionSelected: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
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
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2C3E50',
    marginLeft: 10,
  },
  createButtonText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
