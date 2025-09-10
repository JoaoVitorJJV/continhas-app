import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface ShoppingScreenProps {
  onBack: () => void;
  onNewShopping: () => void;
  onShoppingList: () => void;
  onMyShopping: () => void;
}

export default function ShoppingScreen({ onBack, onNewShopping, onShoppingList, onMyShopping }: ShoppingScreenProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Compras</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Internal Menu */}
      <View style={styles.internalMenuSection}>
        <View style={styles.internalMenuGrid}>
          <TouchableOpacity 
            style={styles.internalMenuCard}
            onPress={onNewShopping}
          >
            <View style={styles.internalMenuIcon}>
              <Ionicons name="add-circle-outline" size={32} color="#000" />
            </View>
            <Text style={styles.internalMenuText}>Nova Compra</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.internalMenuCard}
            onPress={onShoppingList}
          >
            <View style={styles.internalMenuIcon}>
              <Ionicons name="list-outline" size={32} color="#000" />
            </View>
            <Text style={styles.internalMenuText}>Listinha</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.internalMenuCard}
            onPress={onMyShopping}
          >
            <View style={styles.internalMenuIcon}>
              <Ionicons name="receipt-outline" size={32} color="#000" />
            </View>
            <Text style={styles.internalMenuText}>Minhas Compras</Text>
          </TouchableOpacity>
        </View>
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
    marginTop: 40,
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
});