import { CardBrand } from '../types/Payment';

export interface Card {
  id: string;
  brand: CardBrand;
  lastFourDigits: string;
  nickname: string;
  created_at: string;
}
