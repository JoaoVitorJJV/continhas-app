import React from 'react';
import { SQLiteProviderWrapper } from './src/contexts/SQLiteContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SQLiteProviderWrapper>
      <AppNavigator />
    </SQLiteProviderWrapper>
  );
}