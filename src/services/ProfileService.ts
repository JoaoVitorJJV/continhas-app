import { Profile } from '../models/Profile';

export class ProfileService {
  static async createProfile(db: any, profileData: {
    name: string;
    icon: string;
    is_default?: boolean;
  }): Promise<Profile> {
    const id = 'profile_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    const sql = `INSERT INTO profiles (id, name, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?)`;
    
    const params = [
      id,
      profileData.name,
      profileData.icon,
      profileData.is_default ? 1 : 0,
      new Date().toISOString()
    ];
    
    await db.runAsync(sql, params);
    
    // Criar categorias padrão para o novo perfil
    await this.createDefaultCategories(db, id);
    
    const newProfile: Profile = {
      id,
      name: profileData.name,
      icon: profileData.icon,
      is_default: profileData.is_default || false,
      created_at: new Date().toISOString()
    };
    
    return newProfile;
  }

  static async createDefaultCategories(db: any, profileId: string): Promise<void> {
    const defaultCategories = [
      { id: `cat_${profileId}_1`, name: 'Alimentação', icon: 'restaurant', color: '#FF6B6B', type: 'expense' },
      { id: `cat_${profileId}_2`, name: 'Transporte', icon: 'car', color: '#4ECDC4', type: 'expense' },
      { id: `cat_${profileId}_3`, name: 'Lazer', icon: 'game-controller', color: '#45B7D1', type: 'expense' },
      { id: `cat_${profileId}_4`, name: 'Saúde', icon: 'medical', color: '#96CEB4', type: 'expense' },
      { id: `cat_${profileId}_5`, name: 'Salário', icon: 'briefcase', color: '#FFEAA7', type: 'income' },
      { id: `cat_${profileId}_6`, name: 'Freelance', icon: 'laptop', color: '#DDA0DD', type: 'income' },
      { id: `cat_${profileId}_7`, name: 'Conta Energia', icon: 'flash', color: '#FFA500', type: 'expense' },
      { id: `cat_${profileId}_8`, name: 'Gás', icon: 'flame', color: '#FF4500', type: 'expense' },
      { id: `cat_${profileId}_9`, name: 'Conta Internet', icon: 'wifi', color: '#4169E1', type: 'expense' },
      { id: `cat_${profileId}_10`, name: 'Manutenção Veículos', icon: 'construct', color: '#8B4513', type: 'expense' },
      { id: `cat_${profileId}_11`, name: 'Aluguel', icon: 'home', color: '#8B0000', type: 'fixed_bill' },
      { id: `cat_${profileId}_12`, name: 'IPTU', icon: 'business', color: '#2F4F4F', type: 'fixed_bill' },
      { id: `cat_${profileId}_13`, name: 'IPVA', icon: 'car', color: '#4682B4', type: 'fixed_bill' },
      { id: `cat_${profileId}_14`, name: 'Financiamento', icon: 'card', color: '#800080', type: 'fixed_bill' },
      { id: `cat_${profileId}_15`, name: 'Consórcios', icon: 'people', color: '#DAA520', type: 'fixed_bill' },
      { id: `cat_${profileId}_16`, name: 'Contas da Casa', icon: 'home-outline', color: '#8B4513', type: 'fixed_bill' },
      { id: `cat_${profileId}_17`, name: 'Mesada, Rendimentos e Outros', icon: 'cash', color: '#32CD32', type: 'income' }
    ];

    for (const category of defaultCategories) {
      const sql = `INSERT INTO categories (id, name, icon, color, type, profile_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      await db.runAsync(sql, [
        category.id,
        category.name,
        category.icon,
        category.color,
        category.type,
        profileId,
        new Date().toISOString()
      ]);
    }
  }

  static async getAllProfiles(db: any): Promise<Profile[]> {
    const sql = 'SELECT * FROM profiles ORDER BY created_at ASC';
    const profiles = await db.getAllAsync(sql);
    
    return profiles.map((profile: any) => ({
      ...profile,
      is_default: profile.is_default === 1
    }));
  }

  static async getProfileById(db: any, profileId: string): Promise<Profile | null> {
    const sql = 'SELECT * FROM profiles WHERE id = ?';
    const profile = await db.getFirstAsync(sql, [profileId]);
    
    if (!profile) return null;
    
    return {
      ...profile,
      is_default: profile.is_default === 1
    };
  }

  static async updateProfile(db: any, profileId: string, profileData: {
    name?: string;
    icon?: string;
    is_default?: boolean;
  }): Promise<void> {
    const fields = [];
    const params = [];
    
    if (profileData.name !== undefined) {
      fields.push('name = ?');
      params.push(profileData.name);
    }
    
    if (profileData.icon !== undefined) {
      fields.push('icon = ?');
      params.push(profileData.icon);
    }
    
    if (profileData.is_default !== undefined) {
      fields.push('is_default = ?');
      params.push(profileData.is_default ? 1 : 0);
    }
    
    if (fields.length === 0) return;
    
    params.push(profileId);
    const sql = `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`;
    
    await db.runAsync(sql, params);
  }

  static async deleteProfile(db: any, profileId: string): Promise<void> {
    // Primeiro, verificar se é o último perfil
    const profiles = await this.getAllProfiles(db);
    if (profiles.length <= 1) {
      throw new Error('Não é possível excluir o último perfil');
    }

    // Se for o perfil padrão, tornar outro perfil como padrão
    const profile = await this.getProfileById(db, profileId);
    if (profile?.is_default) {
      const otherProfiles = profiles.filter(p => p.id !== profileId);
      if (otherProfiles.length > 0) {
        await this.updateProfile(db, otherProfiles[0].id, { is_default: true });
      }
    }

    // Excluir o perfil
    const sql = 'DELETE FROM profiles WHERE id = ?';
    await db.runAsync(sql, [profileId]);
  }

  static async setDefaultProfile(db: any, profileId: string): Promise<void> {
    // Primeiro, remover o padrão de todos os perfis
    await db.runAsync('UPDATE profiles SET is_default = 0');
    
    // Depois, definir o perfil selecionado como padrão
    await this.updateProfile(db, profileId, { is_default: true });
  }

  static async getDefaultProfile(db: any): Promise<Profile | null> {
    const sql = 'SELECT * FROM profiles WHERE is_default = 1 LIMIT 1';
    const profile = await db.getFirstAsync(sql);
    
    if (!profile) {
      // Se não há perfil padrão, retornar o primeiro perfil
      const profiles = await this.getAllProfiles(db);
      return profiles.length > 0 ? profiles[0] : null;
    }
    
    return {
      ...profile,
      is_default: profile.is_default === 1
    };
  }

  static async initializeDefaultProfile(db: any): Promise<Profile> {
    // Verificar se já existe algum perfil
    const existingProfiles = await this.getAllProfiles(db);
    if (existingProfiles.length > 0) {
      return existingProfiles[0];
    }

    // Criar perfil padrão se não existir nenhum
    return await this.createProfile(db, {
      name: 'Perfil Principal',
      icon: 'person',
      is_default: true
    });
  }
}
