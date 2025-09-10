export class SettingsService {
  static async getVoucherLimit(db: any): Promise<number> {
    try {
      const result = await db.getFirstAsync(
        'SELECT value FROM settings WHERE key = ?',
        ['voucher_limit']
      );
      return result ? parseFloat(result.value) : 0;
    } catch (error) {
      console.error('Erro ao obter limite do vale:', error);
      return 0;
    }
  }

  static async setVoucherLimit(db: any, limit: number): Promise<void> {
    try {
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['voucher_limit', limit.toString()]
      );
    } catch (error) {
      console.error('Erro ao definir limite do vale:', error);
      throw error;
    }
  }

  static async getAllSettings(db: any): Promise<Record<string, string>> {
    try {
      const settings = await db.getAllAsync('SELECT key, value FROM settings');
      const settingsMap: Record<string, string> = {};
      settings.forEach((setting: any) => {
        settingsMap[setting.key] = setting.value;
      });
      return settingsMap;
    } catch (error) {
      console.error('Erro ao obter configurações:', error);
      return {};
    }
  }
}
