export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
export type ItemCategory = 'arcane' | 'warframe' | 'weapon';

export interface ArcanePriceData {
  avgPrice: number;    // Средняя рыночная цена проданных
  minPrice: number;    // Минимальная цена сейчас (лучшая продажа)
  activeSellers: number;
  sold24h?: number;    // Число продаж за 24 часа для конкретного ранга
}

export interface SetPart {
  id: string;
  slug: string;
  name: string;
  nameRu: string;
  icon: string;
  avgPrice: number;
  minPrice: number;
  trades24h: number;
  activeSellers: number;
  ducats?: number;
}

export interface ArcaneItem {
  id: string;
  name: string;
  nameRu: string;
  urlName: string;
  icon: string;
  rarity: Rarity;
  source: string;
  effect: string;
  
  // Categorization & Sets
  category?: ItemCategory;
  isSet?: boolean;
  ducats?: number;

  // Single price fields (for Prime Sets)
  avgPrice?: number;
  minPrice?: number;
  activeSellers?: number;
  parts?: SetPart[];
  
  // Rank 0 (Базовый мистификатор)
  rank0: ArcanePriceData;

  // Rank 5 (Максимальный ранг)
  rank5: ArcanePriceData;

  // Активность рынка
  trades24h: number;   // Количество закрытых сделок за сутки
  volume24h: number;   // Общее число проданных копий
}
