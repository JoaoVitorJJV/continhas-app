import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useState } from 'react';
import AddCardScreen from '../screens/AddCardScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import FixedBillsScreen from '../screens/FixedBillsScreen';
import HomeScreen from '../screens/HomeScreen';
import LoadingScreen from '../screens/LoadingScreen';
import MyExpensesScreen from '../screens/MyExpensesScreen';
import MyShoppingScreen from '../screens/MyShoppingScreen';
import NewShoppingScreen from '../screens/NewShoppingScreen';
import SavingsScreen from '../screens/SavingsScreen';
import ShoppingListScreen from '../screens/ShoppingListScreen';
import ShoppingScreen from '../screens/ShoppingScreen';
import ShoppingSettingsScreen from '../screens/ShoppingSettingsScreen';

export type RootStackParamList = {
  Loading: undefined;
  Home: undefined;
  AddTransaction: undefined;
  AddCard: undefined;
  MyExpenses: undefined;
  FixedBills: undefined;
  Savings: undefined;
  
  Shopping: undefined;
  ShoppingList: undefined;
  NewShopping: undefined;
  MyShopping: undefined;
  ShoppingSettings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [newCardId, setNewCardId] = useState<string | null>(null);

  const handleLoadingComplete = () => {
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


  if (isLoading) {
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
              onAddTransaction={() => props.navigation.navigate('AddTransaction')}
              onViewDetails={() => {
                // Implementar navegação para detalhes
                console.log('Ver detalhes');
              }}
              onMyExpenses={() => props.navigation.navigate('MyExpenses')}
              onSavings={() => props.navigation.navigate('Savings')}
              onShopping={() => props.navigation.navigate('Shopping')}
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
              newCardId={newCardId}
              onCardSelected={() => setNewCardId(null)}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="AddCard">
          {(props) => (
            <AddCardScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onCardAdded={(cardId) => handleCardAdded(cardId)}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="MyExpenses">
          {(props) => (
            <MyExpensesScreen
              {...props}
              onBack={() => props.navigation.goBack()}
              onViewFixedBills={() => props.navigation.navigate('FixedBills')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="FixedBills">
          {(props) => (
            <FixedBillsScreen
              {...props}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Savings">
          {(props) => (
            <SavingsScreen
              {...props}
              onBack={() => props.navigation.goBack()}
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
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="ShoppingList">
          {(props) => (
            <ShoppingListScreen
              {...props}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="MyShopping">
          {(props) => (
            <MyShoppingScreen
              {...props}
              onBack={() => props.navigation.goBack()}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
