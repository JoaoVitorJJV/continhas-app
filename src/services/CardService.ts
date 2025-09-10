import { Card } from '../models/Card';
import { CardBrand } from '../types/Payment';

export class CardService {
  static async getAllCards(db: any): Promise<Card[]> {
    return await db.getAllAsync('SELECT * FROM cards ORDER BY nickname');
  }

  static async addCard(db: any, cardData: {
    brand: CardBrand;
    lastFourDigits: string;
    nickname: string;
  }): Promise<Card> {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    
    await db.runAsync(
      'INSERT INTO cards (id, brand, last_four_digits, nickname) VALUES (?, ?, ?, ?)',
      [id, cardData.brand, cardData.lastFourDigits, cardData.nickname]
    );

    const newCard: Card = {
      id,
      brand: cardData.brand,
      lastFourDigits: cardData.lastFourDigits,
      nickname: cardData.nickname,
      created_at: new Date().toISOString()
    };

    return newCard;
  }

  static async deleteCard(db: any, cardId: string): Promise<void> {
    await db.runAsync('DELETE FROM cards WHERE id = ?', [cardId]);
  }

  static getBrandDisplayName(brand: CardBrand): string {
    const brandNames = {
      [CardBrand.VISA]: 'Visa',
      [CardBrand.MASTERCARD]: 'Mastercard',
      [CardBrand.ELO]: 'Elo',
      [CardBrand.AMERICAN_EXPRESS]: 'American Express',
      [CardBrand.OTHER]: 'Outro'
    };
    return brandNames[brand];
  }

  static getBrandIcon(brand: CardBrand): string {
    const brandIcons = {
      [CardBrand.VISA]: 'card',
      [CardBrand.MASTERCARD]: 'card',
      [CardBrand.ELO]: 'card',
      [CardBrand.AMERICAN_EXPRESS]: 'card',
      [CardBrand.OTHER]: 'card'
    };
    return brandIcons[brand];
  }
}
