import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import React, { createContext, useContext, useState } from 'react';
import { initDatabase } from '../database/sqlite';

interface SQLiteContextType {
  isInitialized: boolean;
  database: SQLiteDatabase | null;
}

const SQLiteContext = createContext<SQLiteContextType>({
  isInitialized: false,
  database: null,
});

export const useSQLite = () => {
  const context = useContext(SQLiteContext);
  if (!context) {
    throw new Error('useSQLite must be used within a SQLiteProvider');
  }
  return context;
};

interface SQLiteProviderWrapperProps {
  children: React.ReactNode;
}

export function SQLiteProviderWrapper({ children }: SQLiteProviderWrapperProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const migrateDbIfNeeded = async (db: SQLiteDatabase) => {
    try {
      await initDatabase();
      setIsInitialized(true);
    } catch (error) {
      console.error('Erro ao migrar banco de dados:', error);
      setIsInitialized(true); // Continua mesmo com erro
    }
  };

  return (
    <SQLiteProvider databaseName="continhas.db" onInit={migrateDbIfNeeded}>
      <SQLiteContextContent isInitialized={isInitialized}>
        {children}
      </SQLiteContextContent>
    </SQLiteProvider>
  );
}

interface SQLiteContextContentProps {
  children: React.ReactNode;
  isInitialized: boolean;
}

function SQLiteContextContent({ children, isInitialized }: SQLiteContextContentProps) {
  const db = useSQLiteContext();

  return (
    <SQLiteContext.Provider value={{ isInitialized, database: db }}>
      {children}
    </SQLiteContext.Provider>
  );
}
