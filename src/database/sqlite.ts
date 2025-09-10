import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    // Abrir banco de dados com a nova API assíncrona
    db = await SQLite.openDatabaseAsync('continhas.db');
    
    // Executar todas as operações de inicialização
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        date DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_method TEXT,
        card_id TEXT,
        installments INTEGER,
        parent_transaction_id TEXT,
        bank_loan_id TEXT,
        total_amount REAL,
        principal_amount REAL,
        interest_amount REAL
      );
      
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        brand TEXT NOT NULL,
        last_four_digits TEXT NOT NULL,
        nickname TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shopping_months (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        voucher_limit REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month)
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shopping_items (
        id TEXT PRIMARY KEY,
        shopping_month_id TEXT NOT NULL,
        product_id TEXT,
        name TEXT,
        amount REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        category TEXT,
        from_list_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shopping_month_id) REFERENCES shopping_months (id),
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (from_list_id) REFERENCES shopping_list_items (id)
      );
      
      CREATE TABLE IF NOT EXISTS saved_shopping_lists (
        id TEXT PRIMARY KEY,
        shopping_month_id TEXT NOT NULL,
        name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        item_count INTEGER NOT NULL,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shopping_month_id) REFERENCES shopping_months (id)
      );
      
      CREATE TABLE IF NOT EXISTS saved_shopping_items (
        id TEXT PRIMARY KEY,
        saved_list_id TEXT NOT NULL,
        product_id TEXT,
        name TEXT,
        amount REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        category TEXT,
        FOREIGN KEY (saved_list_id) REFERENCES saved_shopping_lists (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      );
      
      CREATE TABLE IF NOT EXISTS shopping_lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        product_id TEXT,
        name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        duration_days INTEGER,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      );
      
      CREATE TABLE IF NOT EXISTS bank_loans (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        total_amount REAL NOT NULL,
        principal_amount REAL NOT NULL,
        interest_amount REAL NOT NULL,
        installment_amount REAL NOT NULL,
        installments INTEGER NOT NULL,
        category TEXT NOT NULL,
        start_date DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
      );
      
      CREATE TABLE IF NOT EXISTS fixed_bills (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        frequency TEXT NOT NULL,
        selected_months TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      INSERT OR IGNORE INTO categories (id, name, icon, color, type) VALUES 
        ('cat_1', 'Alimentação', 'restaurant', '#FF6B6B', 'expense'),
        ('cat_2', 'Transporte', 'car', '#4ECDC4', 'expense'),
        ('cat_3', 'Lazer', 'game-controller', '#45B7D1', 'expense'),
        ('cat_4', 'Saúde', 'medical', '#96CEB4', 'expense'),
        ('cat_5', 'Salário', 'briefcase', '#FFEAA7', 'income'),
        ('cat_6', 'Freelance', 'laptop', '#DDA0DD', 'income'),
        ('cat_7', 'Conta Energia', 'flash', '#FFA500', 'expense'),
        ('cat_8', 'Gás', 'flame', '#FF4500', 'expense'),
        ('cat_9', 'Conta Internet', 'wifi', '#4169E1', 'expense'),
        ('cat_10', 'Manutenção Veículos', 'construct', '#8B4513', 'expense'),
        ('cat_11', 'Aluguel', 'home', '#8B0000', 'fixed_bill'),
        ('cat_12', 'IPTU', 'business', '#2F4F4F', 'fixed_bill'),
        ('cat_13', 'IPVA', 'car', '#4682B4', 'fixed_bill'),
        ('cat_14', 'Financiamento', 'card', '#800080', 'fixed_bill'),
        ('cat_15', 'Consórcios', 'people', '#DAA520', 'fixed_bill'),
        ('cat_16', 'Contas da Casa', 'home-outline', '#8B4513', 'fixed_bill'),
        ('cat_17', 'Mesada, Rendimentos e Outros', 'cash', '#32CD32', 'income');
      
      INSERT OR IGNORE INTO settings (key, value) VALUES 
        ('voucher_limit', '0');
    `);
    
    // Executar migrações se necessário
    await runMigrations();
    
    console.log('Banco de dados inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

const runMigrations = async (): Promise<void> => {
  if (!db) return;
  
  try {
    // Verificar se as novas colunas existem na tabela transactions
    const tableInfo = await db.getAllAsync("PRAGMA table_info(transactions)");
    const columnNames = tableInfo.map((col: any) => col.name);
    
    // Adicionar colunas que não existem
    if (!columnNames.includes('payment_method')) {
      console.log('Adicionando coluna payment_method...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN payment_method TEXT');
    }
    
    if (!columnNames.includes('card_id')) {
      console.log('Adicionando coluna card_id...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN card_id TEXT');
    }
    
    if (!columnNames.includes('installments')) {
      console.log('Adicionando coluna installments...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN installments INTEGER');
    }
    
    if (!columnNames.includes('parent_transaction_id')) {
      console.log('Adicionando coluna parent_transaction_id...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN parent_transaction_id TEXT');
    }
    
    if (!columnNames.includes('total_amount')) {
      console.log('Adicionando coluna total_amount...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN total_amount REAL');
    }
    
    if (!columnNames.includes('principal_amount')) {
      console.log('Adicionando coluna principal_amount...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN principal_amount REAL');
    }
    
    if (!columnNames.includes('interest_amount')) {
      console.log('Adicionando coluna interest_amount...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN interest_amount REAL');
    }

    // Verificar se a coluna bank_loan_id existe na tabela transactions
    if (!columnNames.includes('bank_loan_id')) {
      console.log('Adicionando coluna bank_loan_id...');
      await db.execAsync('ALTER TABLE transactions ADD COLUMN bank_loan_id TEXT');
    }

    // Verificar se a coluna quantity existe na tabela shopping_items
    const shoppingItemsInfo = await db.getAllAsync("PRAGMA table_info(shopping_items)");
    const shoppingItemsColumns = shoppingItemsInfo.map((col: any) => col.name);
    
    if (!shoppingItemsColumns.includes('quantity')) {
      console.log('Adicionando coluna quantity na tabela shopping_items...');
      await db.execAsync('ALTER TABLE shopping_items ADD COLUMN quantity INTEGER DEFAULT 1');
    }

    // Verificar se a coluna quantity existe na tabela saved_shopping_items
    const savedItemsInfo = await db.getAllAsync("PRAGMA table_info(saved_shopping_items)");
    const savedItemsColumns = savedItemsInfo.map((col: any) => col.name);
    
    if (!savedItemsColumns.includes('quantity')) {
      console.log('Adicionando coluna quantity na tabela saved_shopping_items...');
      await db.execAsync('ALTER TABLE saved_shopping_items ADD COLUMN quantity INTEGER DEFAULT 1');
    }

    // Verificar se a coluna from_list_id existe na tabela shopping_items
    if (!shoppingItemsColumns.includes('from_list_id')) {
      console.log('Adicionando coluna from_list_id na tabela shopping_items...');
      await db.execAsync('ALTER TABLE shopping_items ADD COLUMN from_list_id TEXT');
    }

    // Verificar se a coluna category existe na tabela products
    const productsInfo = await db.getAllAsync("PRAGMA table_info(products)");
    const productsColumns = productsInfo.map((col: any) => col.name);
    
    if (!productsColumns.includes('category')) {
      console.log('Adicionando coluna category na tabela products...');
      await db.execAsync('ALTER TABLE products ADD COLUMN category TEXT');
    }

    // Verificar se a coluna category existe na tabela shopping_items
    if (!shoppingItemsColumns.includes('category')) {
      console.log('Adicionando coluna category na tabela shopping_items...');
      await db.execAsync('ALTER TABLE shopping_items ADD COLUMN category TEXT');
    }

    // Verificar se a coluna category existe na tabela shopping_list_items
    const shoppingListItemsInfo = await db.getAllAsync("PRAGMA table_info(shopping_list_items)");
    const shoppingListItemsColumns = shoppingListItemsInfo.map((col: any) => col.name);
    
    if (!shoppingListItemsColumns.includes('category')) {
      console.log('Adicionando coluna category na tabela shopping_list_items...');
      await db.execAsync('ALTER TABLE shopping_list_items ADD COLUMN category TEXT');
    }

    // Verificar se a coluna category existe na tabela saved_shopping_items
    const savedShoppingItemsInfo = await db.getAllAsync("PRAGMA table_info(saved_shopping_items)");
    const savedShoppingItemsColumns = savedShoppingItemsInfo.map((col: any) => col.name);
    
    if (!savedShoppingItemsColumns.includes('category')) {
      console.log('Adicionando coluna category na tabela saved_shopping_items...');
      await db.execAsync('ALTER TABLE saved_shopping_items ADD COLUMN category TEXT');
    }
    
    console.log('Migrações executadas com sucesso');
  } catch (error) {
    console.error('Erro ao executar migrações:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};
