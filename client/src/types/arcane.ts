export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';

export interface ArcanePriceData {
  avgPrice: number;    // Средняя рыночная цена проданных
  minPrice: number;    // Минимальная цена сейчас (лучшая продажа)
  activeSellers: number;
  sold24h?: number;    // Число продаж за 24 часа для конкретного ранга
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
  
  // Rank 0 (Базовый мистификатор)
  rank0: ArcanePriceData;

  // Rank 5 (Максимальный ранг)
  rank5: ArcanePriceData;

  // Активность рынка
  trades24h: number;   // Количество закрытых сделок за сутки
  volume24h: number;   // Общее число проданных копий
}
