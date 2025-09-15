import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    // Abrir banco de dados com a nova API assíncrona
    db = await SQLite.openDatabaseAsync('continhas.db');
    
    // Executar todas as operações de inicialização
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        type TEXT NOT NULL,
        profile_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        date DATETIME NOT NULL,
        profile_id TEXT NOT NULL,
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
        profile_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shopping_months (
        id TEXT PRIMARY KEY,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        voucher_limit REAL DEFAULT 0,
        profile_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(year, month, profile_id)
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        profile_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, profile_id)
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
        profile_id TEXT NOT NULL,
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
        profile_id TEXT NOT NULL,
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
        profile_id TEXT NOT NULL,
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
        profile_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
      );
      
      CREATE TABLE IF NOT EXISTS recurring_incomes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        frequency TEXT NOT NULL,
        selected_months TEXT,
        profile_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active'
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- As categorias padrão serão criadas pelo ProfileService quando um perfil for criado
      
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
    // Verificar se a tabela profiles existe
    const tables = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'");
    if (tables.length === 0) {
      console.log('Criando tabela profiles...');
      await db.execAsync(`
        CREATE TABLE profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Verificar se as colunas profile_id existem nas tabelas principais
    const addProfileIdColumn = async (tableName: string) => {
      if (!db) return;
      
      const tableInfo = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
      const columnNames = tableInfo.map((col: any) => col.name);
      
      if (!columnNames.includes('profile_id')) {
        console.log(`Adicionando coluna profile_id na tabela ${tableName}...`);
        await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN profile_id TEXT`);
      }
    };

    // Adicionar profile_id nas tabelas principais
    await addProfileIdColumn('categories');
    await addProfileIdColumn('transactions');
    await addProfileIdColumn('cards');
    await addProfileIdColumn('shopping_months');
    await addProfileIdColumn('products');
    await addProfileIdColumn('bank_loans');
    await addProfileIdColumn('fixed_bills');
    await addProfileIdColumn('recurring_incomes');
    await addProfileIdColumn('shopping_lists');
    await addProfileIdColumn('shopping_list_items');
    await addProfileIdColumn('saved_shopping_lists');
    
    // Limpar dados órfãos das tabelas saved_shopping_lists e saved_shopping_items
    try {
      console.log('Limpando dados órfãos das listas salvas...');
      
      /*
      // Remover listas salvas que referenciam shopping_months sem profile_id
      await db.runAsync(`
        DELETE FROM saved_shopping_lists 
        WHERE shopping_month_id IN (
          SELECT id FROM shopping_months WHERE profile_id IS NULL
        )
      `);
      
      // Remover itens salvos que referenciam listas órfãs
      await db.runAsync(`
        DELETE FROM saved_shopping_items 
        WHERE saved_list_id IN (
          SELECT ssl.id FROM saved_shopping_lists ssl
          LEFT JOIN shopping_months sm ON ssl.shopping_month_id = sm.id
          WHERE sm.id IS NULL OR sm.profile_id IS NULL
        )
      `);

      */
      
      console.log('Dados órfãos das listas salvas removidos');
    } catch (cleanupError) {
      console.error('Erro ao limpar dados órfãos das listas salvas:', cleanupError);
    }

    // Limpar dados antigos da tabela shopping_months que podem causar conflitos
    try {
      if (!db) return;
      
      console.log('Limpando dados antigos da tabela shopping_months...');
      
      // Verificar se a tabela existe
      const tableExists = await db.getFirstAsync(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='shopping_months'
      `);
      
      if (!tableExists) {
        console.log('Tabela shopping_months não existe, pulando limpeza...');
        return;
      }
      
      // Remover registros com profile_id NULL
      await db.runAsync('DELETE FROM shopping_months WHERE profile_id IS NULL');
      console.log('Registros com profile_id NULL removidos');
      
      // Verificar se há registros duplicados e manter apenas o mais recente
      const duplicates = await db.getAllAsync(`
        SELECT year, month, profile_id, COUNT(*) as count 
        FROM shopping_months 
        WHERE profile_id IS NOT NULL 
        GROUP BY year, month, profile_id 
        HAVING COUNT(*) > 1
      `);
      
      console.log(`Encontrados ${duplicates.length} grupos de registros duplicados`);
      
      for (const duplicate of duplicates as any[]) {
        console.log(`Removendo registros duplicados para ${duplicate.year}/${duplicate.month} do perfil ${duplicate.profile_id}`);
        
        // Buscar o ID do registro mais recente
        const latestRecord = await db.getFirstAsync(`
          SELECT id FROM shopping_months 
          WHERE year = ? AND month = ? AND profile_id = ? 
          ORDER BY created_at DESC LIMIT 1
        `, [duplicate.year, duplicate.month, duplicate.profile_id]);
        
        if (latestRecord) {
          // Remover todos os registros exceto o mais recente
          await db.runAsync(`
            DELETE FROM shopping_months 
            WHERE year = ? AND month = ? AND profile_id = ? 
            AND id != ?
          `, [duplicate.year, duplicate.month, duplicate.profile_id, (latestRecord as any).id]);
          
          console.log(`Mantido registro ${(latestRecord as any).id} para ${duplicate.year}/${duplicate.month}`);
        }
      }
      
      console.log('Limpeza da tabela shopping_months concluída');
    } catch (error) {
      console.error('Erro ao limpar dados antigos da tabela shopping_months:', error);
    }

    // Corrigir constraint da tabela products para permitir nomes duplicados entre perfis
    try {
      if (!db) return;
      
      console.log('Corrigindo constraint da tabela products...');
      
      // Debug: Verificar estado atual da tabela
      try {
        const tableInfo = await db.getAllAsync("PRAGMA table_info(products)");
        console.log('Colunas da tabela products:', tableInfo.map((col: any) => `${col.name} (${col.type})`));
        
        const indexes = await db.getAllAsync("PRAGMA index_list(products)");
        console.log('Índices da tabela products:', indexes.map((idx: any) => `${idx.name} (unique: ${idx.unique})`));
      } catch (debugError) {
        console.log('Erro ao verificar estado da tabela products:', debugError);
      }
      
      // Verificar se a migração já foi executada
      const migrationCheck = await db.getFirstAsync(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='products_migration_done'
      `);
      
      if (migrationCheck) {
        console.log('Migração da tabela products já foi executada, pulando...');
        return;
      }
      
      // Verificar se a tabela products existe
      const tableExists = await db.getFirstAsync(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='products'
      `);
      
      if (!tableExists) {
        console.log('Tabela products não existe, criando...');
        await db.runAsync(`
          CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            profile_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, profile_id)
          )
        `);
        console.log('Tabela products criada com sucesso');
        
        // Marcar migração como concluída
        await db.runAsync(`
          CREATE TABLE products_migration_done (
            id TEXT PRIMARY KEY,
            completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await db.runAsync(`
          INSERT INTO products_migration_done (id) VALUES ('migration_completed')
        `);
        return;
      }
      
      // Verificar se há produtos sem profile_id e atribuir um perfil padrão
      const productsWithoutProfile = await db.getAllAsync(`
        SELECT COUNT(*) as count FROM products WHERE profile_id IS NULL
      `);
      
      if ((productsWithoutProfile[0] as any)?.count > 0) {
        console.log('Atribuindo perfil padrão para produtos sem profile_id...');
        await db.runAsync(`
          UPDATE products 
          SET profile_id = 'default_profile' 
          WHERE profile_id IS NULL
        `);
      }
      
      // Verificar se a constraint já está correta
      const tableInfo = await db.getAllAsync("PRAGMA table_info(products)");
      const hasProfileIdColumn = tableInfo.some((col: any) => col.name === 'profile_id');
      
      if (!hasProfileIdColumn) {
        console.log('Adicionando coluna profile_id na tabela products...');
        await db.runAsync('ALTER TABLE products ADD COLUMN profile_id TEXT');
        await db.runAsync("UPDATE products SET profile_id = 'default_profile' WHERE profile_id IS NULL");
      }
      
      // Recriar a tabela com a nova constraint (abordagem mais robusta)
      console.log('Recriando tabela products com nova constraint...');
      
      // Limpar tabela temporária se existir de execução anterior
      try {
        await db.runAsync('DROP TABLE IF EXISTS products_temp');
        console.log('Tabela temporária anterior removida');
      } catch (cleanupError) {
        console.log('Erro ao limpar tabela temporária:', cleanupError);
      }
      
      // Criar tabela temporária
      await db.runAsync(`
        CREATE TABLE products_temp (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          profile_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name, profile_id)
        )
      `);
      
      // Copiar dados existentes
      await db.runAsync(`
        INSERT INTO products_temp (id, name, category, profile_id, created_at)
        SELECT id, name, category, 
               COALESCE(profile_id, 'default_profile') as profile_id,
               created_at
        FROM products
      `);
      
      // Remover tabela antiga
      await db.runAsync('DROP TABLE products');
      
      // Renomear tabela temporária
      await db.runAsync('ALTER TABLE products_temp RENAME TO products');
      
      console.log('Tabela products recriada com sucesso');
      
      // Marcar migração como concluída
      await db.runAsync(`
        CREATE TABLE products_migration_done (
          id TEXT PRIMARY KEY,
          completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.runAsync(`
        INSERT INTO products_migration_done (id) VALUES ('migration_completed')
      `);
      
      // Limpeza final da tabela temporária (caso ainda exista)
      try {
        await db.runAsync('DROP TABLE IF EXISTS products_temp');
        console.log('Limpeza final da tabela temporária concluída');
      } catch (finalCleanupError) {
        console.log('Erro na limpeza final:', finalCleanupError);
      }
      
    } catch (error) {
      console.error('Erro ao corrigir constraint da tabela products:', error);
      
      // Limpeza de emergência da tabela temporária em caso de erro
      try {
        await db.runAsync('DROP TABLE IF EXISTS products_temp');
        console.log('Limpeza de emergência da tabela temporária concluída');
      } catch (emergencyCleanupError) {
        console.log('Erro na limpeza de emergência:', emergencyCleanupError);
      }
      
      // Não falhar a inicialização por causa deste erro
    }

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
