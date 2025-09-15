import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useState } from 'react';
import { useSQLite } from '../contexts/SQLiteContext';
import { Profile } from '../models/Profile';
import AddCardScreen from '../screens/AddCardScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import FixedBillsScreen from '../screens/FixedBillsScreen';
import HomeScreen from '../screens/HomeScreen';
import LoadingScreen from '../screens/LoadingScreen';
import MyExpensesScreen from '../screens/MyExpensesScreen';
import MyShoppingScreen from '../screens/MyShoppingScreen';
import NewShoppingScreen from '../screens/NewShoppingScreen';
import ProfileManagementScreen from '../screens/ProfileManagementScreen';
import ProfileSelectionScreen from '../screens/ProfileSelectionScreen';
import SavingsScreen from '../screens/SavingsScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import ShoppingSettingsScreen from '../screens/ShoppingSettingsScreen';
import TransactionsManagementScreen from '../screens/TransactionsManagementScreen';
import { ProfileService } from '../services/ProfileService';

export type RootStackParamList = {
  Loading: undefined;
  Home: undefined;
  AddTransaction: undefined;
  AddCard: undefined;
  MyExpenses: undefined;
  FixedBills: undefined;
  Savings: undefined;
  CategoryManagement: undefined;
  TransactionsManagement: undefined;
  ProfileManagement: undefined;
  ProfileSelection: undefined;
  
  Shopping: undefined;
  ShoppingList: undefined;
  NewShopping: undefined;
  MyShopping: undefined;
  ShoppingSettings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { database: db } = useSQLite();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newCardId, setNewCardId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  const loadCurrentProfile = async () => {
    if (!db) return;
    
    try {
      const profile = await ProfileService.getDefaultProfile(db);
      if (!profile) {
        // Se não há perfil padrão, criar um
        const newProfile = await ProfileService.initializeDefaultProfile(db);
        setCurrentProfile(newProfile);
      } else {
        setCurrentProfile(profile);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      // Criar perfil padrão em caso de erro
      try {
        const newProfile = await ProfileService.initializeDefaultProfile(db);
        setCurrentProfile(newProfile);
      } catch (createError) {
        console.error('Erro ao criar perfil padrão:', createError);
      }
    }
  };

  const handleLoadingComplete = async () => {
    await loadCurrentProfile();
    setIsLoading(false);
  };

  const handleTransactionAdded = () => {
    // Forçar atualização da HomeScreen
    setRefreshKey(prev => prev + 1);
    console.log('Transação adicionada - dados atualizados');
  };

  const handleCardAdded = (cardId?: string) => {
    // Forçar atualização da AddTransactionScreen
    setRefreshKey(prev => prev + 1);
    setNewCardId(cardId || null);
    console.log('Cartão adicionado - dados atualizados');
  };

  const handleProfileChanged = async () => {
    await loadCurrentProfile();
    setRefreshKey(prev => prev + 1);
  };


  if (isLoading || !currentProfile) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home">
          {(props) => (
            <HomeScreen
              {...props}
              key={refreshKey}
              currentProfile={currentProfile}
              onAddTransaction={() => props.navigation.navigate('AddTransaction')}
              onViewDetails={() => {
                // Implementar navegação para detalhes
                console.log('Ver detalhes');
              }}
              onMyExpenses={() => props.navigation.navigate('MyExpenses')}
              onSavings={() => props.navigation.navigate('Savings')}
              onShopping={() => props.navigation.navigate('Shopping')}
              onProfileManagement={() => props.navigation.navigate('ProfileManagement')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="AddTransaction">
          {(props) => (
            <AddTransactionScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onTransactionAdded={handleTransactionAdded}
              onAddCard={() => props.navigation.navigate('AddCard')}
              onViewFixedBills={() => props.navigation.navigate('FixedBills')}
              onCategoryManagement={() => props.navigation.navigate('CategoryManagement')}
              onTransactionsManagement={() => props.navigation.navigate('TransactionsManagement')}
              newCardId={newCardId}
              onCardSelected={() => setNewCardId(null)}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="AddCard">
          {(props) => (
            <AddCardScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onCardAdded={(cardId) => handleCardAdded(cardId)}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="MyExpenses">
          {(props) => (
            <MyExpensesScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onViewFixedBills={() => props.navigation.navigate('FixedBills')}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="FixedBills">
          {(props) => (
            <FixedBillsScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Savings">
          {(props) => (
            <SavingsScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Shopping">
          {(props) => (
            <ShoppingScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onNewShopping={() => props.navigation.navigate('NewShopping')}
              onShoppingList={() => props.navigation.navigate('ShoppingList')}
              onMyShopping={() => props.navigation.navigate('MyShopping')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ShoppingSettings">
          {(props) => (
            <ShoppingSettingsScreen
              {...props}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="NewShopping">
          {(props) => (
            <NewShoppingScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onNewShopping={() => {}}
              onShoppingList={() => props.navigation.navigate('ShoppingList')}
              onSettings={() => props.navigation.navigate('ShoppingSettings')}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ShoppingList">
          {(props) => (
            <ShoppingListScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="MyShopping">
          {(props) => (
            <MyShoppingScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="CategoryManagement">
          {(props) => (
            <CategoryManagementScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="TransactionsManagement">
          {(props) => (
            <TransactionsManagementScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ProfileManagement">
          {(props) => (
            <ProfileManagementScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onProfileChanged={(profile) => {
                setCurrentProfile(profile);
                handleProfileChanged();
              }}
              currentProfile={currentProfile}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ProfileSelection">
          {(props) => (
            <ProfileSelectionScreen
              {...props}
              onProfileSelected={(profile) => {
                setCurrentProfile(profile);
                handleProfileChanged();
                props.navigation.goBack();
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
