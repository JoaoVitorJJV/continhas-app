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

interface ProfileSelectionScreenProps {
  onProfileSelected: (profile: Profile) => void;
}

const AVAILABLE_ICONS = [
  'person', 'person-circle', 'person-outline', 'person-add',
  'man', 'woman', 'people', 'people-circle',
  'star', 'heart', 'home', 'car', 'briefcase',
  'game-controller', 'musical-notes', 'camera', 'book',
  'airplane', 'restaurant', 'fitness', 'school'
];

export default function ProfileSelectionScreen({ onProfileSelected }: ProfileSelectionScreenProps) {
  const { database: db } = useSQLite();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('person');

  useEffect(() => {
    loadProfiles();
  }, [db]);

  const loadProfiles = async () => {
    try {
      const profilesData = await ProfileService.getAllProfiles(db);
      setProfiles(profilesData);
      
      // Se não há perfis, criar um perfil padrão
      if (profilesData.length === 0) {
        const defaultProfile = await ProfileService.initializeDefaultProfile(db);
        setProfiles([defaultProfile]);
      }
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
        icon: selectedIcon,
        is_default: profiles.length === 0
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

  const handleSelectProfile = (profile: Profile) => {
    onProfileSelected(profile);
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
        <Text style={styles.title}>Escolha seu Perfil</Text>
        <Text style={styles.subtitle}>Selecione um perfil para continuar</Text>
      </View>

      <ScrollView style={styles.profilesContainer}>
        {profiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            style={styles.profileCard}
            onPress={() => handleSelectProfile(profile)}
          >
            <View style={styles.profileIcon}>
              <Ionicons name={profile.icon as any} size={40} color="#2C3E50" />
            </View>
            <Text style={styles.profileName}>{profile.name}</Text>
            {profile.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Padrão</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.addProfileCard}
          onPress={() => setShowCreateModal(true)}
        >
          <View style={styles.addIcon}>
            <Ionicons name="add" size={40} color="#7f8c8d" />
          </View>
          <Text style={styles.addText}>Criar Novo Perfil</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  profilesContainer: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  defaultBadge: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  addProfileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderStyle: 'dashed',
  },
  addIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
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
