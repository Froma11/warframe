import { ArcaneItem } from '../types/arcane';

export interface Order {
  id: string;
  orderType: 'sell' | 'buy';
  platinum: number;
  user: {
    ingameName: string;
    status: 'ingame' | 'online' | 'offline';
    reputation: number;
  };
}

export interface HistoryPoint {
  date: string;
  medianPrice: number;
}

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord_1',
    user: { ingameName: 'VortexTenno', status: 'ingame', reputation: 184 },
    orderType: 'sell',
    platinum: 1400,
  },
  {
    id: 'ord_2',
    user: { ingameName: 'PrimeTrader_99', status: 'ingame', reputation: 56 },
    orderType: 'sell',
    platinum: 1420,
  },
  {
    id: 'ord_3',
    user: { ingameName: 'LotusShadow', status: 'online', reputation: 29 },
    orderType: 'sell',
    platinum: 1450,
  },
  {
    id: 'ord_4',
    user: { ingameName: 'OrokinBuyer', status: 'ingame', reputation: 310 },
    orderType: 'buy',
    platinum: 1220,
  },
];

export const MOCK_HISTORY_POINTS: HistoryPoint[] = [
  { date: '01 Ноя', medianPrice: 1350 },
  { date: '02 Ноя', medianPrice: 1380 },
  { date: '03 Ноя', medianPrice: 1410 },
  { date: '04 Ноя', medianPrice: 1450 },
];

export const INITIAL_ARCANES: ArcaneItem[] = [
  {
    id: 'arcane_energize',
    name: 'Arcane Energize',
    nameRu: 'Мистическая Зарядка',
    urlName: 'arcane_energize',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_energize.e5f85590ceb29db89c6753dfdf823485.128x128.png',
    rarity: 'Legendary',
    source: 'Гидролист Эйдолона / Лаборатории Альбрехта',
    effect: 'При подборе сферы энергии: 60% шанс восстановить 150 энергии себе и союзникам в радиусе 15м. +1 Воскрешение.',
    rank0: {
      avgPrice: 85,
      minPrice: 80,
      activeSellers: 54
    },
    rank5: {
      avgPrice: 1450,
      minPrice: 1400,
      activeSellers: 38
    },
    trades24h: 312,
    volume24h: 620
  },
  {
    id: 'arcane_grace',
    name: 'Arcane Grace',
    nameRu: 'Мистическая Благодать',
    urlName: 'arcane_grace',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_grace.7e5a03eeb0cbeee6836940a0c4f8ea0e.128x128.png',
    rarity: 'Legendary',
    source: 'Гидролист Эйдолона',
    effect: 'При получении урона здоровью: 9% шанс получить +6% регенерации здоровья/сек на 9 сек. +1 Воскрешение.',
    rank0: {
      avgPrice: 45,
      minPrice: 40,
      activeSellers: 42
    },
    rank5: {
      avgPrice: 820,
      minPrice: 790,
      activeSellers: 29
    },
    trades24h: 198,
    volume24h: 390
  },
  {
    id: 'arcane_reaper',
    name: 'Arcane Reaper',
    nameRu: 'Мистический Жнец',
    urlName: 'arcane_reaper',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_reaper.4da5bf7dfc1bfa7ff4ca9c323dbcb760.128x128.png',
    rarity: 'Rare',
    source: 'Цепь (Стальной Путь Дувири)',
    effect: 'При убийстве в ближнем бою: +660 брони и +24/с регенерации здоровья на 10 сек. +1 Воскрешение.',
    rank0: {
      avgPrice: 8,
      minPrice: 7,
      activeSellers: 78
    },
    rank5: {
      avgPrice: 160,
      minPrice: 150,
      activeSellers: 45
    },
    trades24h: 420,
    volume24h: 890
  },
  {
    id: 'arcane_avenger',
    name: 'Arcane Avenger',
    nameRu: 'Мистический Мститель',
    urlName: 'arcane_avenger',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_avenger.5244ad06a520268a719c8369ae577319.128x128.png',
    rarity: 'Rare',
    source: 'Гантулист Эйдолона',
    effect: 'При получении урона: 21% шанс получить +45% абсолютного шанса критического удара на 12 сек. +1 Воскрешение.',
    rank0: {
      avgPrice: 10,
      minPrice: 9,
      activeSellers: 65
    },
    rank5: {
      avgPrice: 180,
      minPrice: 170,
      activeSellers: 52
    },
    trades24h: 275,
    volume24h: 530
  },
  {
    id: 'arcane_aegis',
    name: 'Arcane Aegis',
    nameRu: 'Мистический Эгида',
    urlName: 'arcane_aegis',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_aegis.305267b2fc63ecfae15f8a0b0d3db7b0.128x128.png',
    rarity: 'Rare',
    source: 'Гантулист Эйдолона',
    effect: 'При получении урона по щитам: 3% шанс перезаряжать щиты со скоростью +30%/сек на 12 сек. +1 Воскрешение.',
    rank0: {
      avgPrice: 12,
      minPrice: 10,
      activeSellers: 38
    },
    rank5: {
      avgPrice: 220,
      minPrice: 205,
      activeSellers: 31
    },
    trades24h: 180,
    volume24h: 310
  },
  {
    id: 'arcane_steadfast',
    name: 'Arcane Steadfast',
    nameRu: 'Мистическая Стойкость',
    urlName: 'arcane_steadfast',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_steadfast.256241a87b5a1b32bb395f134588e364.128x128.png',
    rarity: 'Rare',
    source: 'Перевал Тианы (Зеркальная Оборона Марса)',
    effect: 'При применении способности: 60% шанс, что следующие 3 применения не потратят энергию. +1 Воскрешение.',
    rank0: {
      avgPrice: 10,
      minPrice: 9,
      activeSellers: 58
    },
    rank5: {
      avgPrice: 195,
      minPrice: 185,
      activeSellers: 44
    },
    trades24h: 310,
    volume24h: 640
  },
  {
    id: 'arcane_barrier',
    name: 'Arcane Barrier',
    nameRu: 'Мистический Барьер',
    urlName: 'arcane_barrier',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_barrier.bc4f63ca5ce27efc90278787c88bbf1b.128x128.png',
    rarity: 'Legendary',
    source: 'Гидролист Эйдолона',
    effect: 'При получении урона по щитам: 5% шанс мгновенно восстановить 100% щитов. +1 Воскрешение.',
    rank0: {
      avgPrice: 25,
      minPrice: 22,
      activeSellers: 30
    },
    rank5: {
      avgPrice: 420,
      minPrice: 395,
      activeSellers: 21
    },
    trades24h: 145,
    volume24h: 280
  },
  {
    id: 'arcane_velocity',
    name: 'Arcane Velocity',
    nameRu: 'Мистическая Скорость',
    urlName: 'arcane_velocity',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_velocity.8471c22bc13d53678071e549117cf6cb.128x128.png',
    rarity: 'Rare',
    source: 'Тералист Эйдолона',
    effect: 'При критическом попадании: 90% шанс получить +120% к скорострельности пистолетов на 9 сек. +1 Воскрешение.',
    rank0: {
      avgPrice: 7,
      minPrice: 6,
      activeSellers: 62
    },
    rank5: {
      avgPrice: 135,
      minPrice: 125,
      activeSellers: 39
    },
    trades24h: 260,
    volume24h: 490
  },
  {
    id: 'arcane_strike',
    name: 'Arcane Strike',
    nameRu: 'Мистический Удар',
    urlName: 'arcane_strike',
    icon: 'https://warframe.market/static/assets/items/images/en/thumbs/arcane_strike.fa6233a7e3a985f5e274b5b7fa43adad.128x128.png',
    rarity: 'Rare',
    source: 'Тералист Эйдолона',
    effect: 'При попадании: 20% шанс получить +60% к скорости атаки ближнего боя на 18 сек. +1 Воскрешение.',
    rank0: {
      avgPrice: 7,
      minPrice: 6,
      activeSellers: 74
    },
    rank5: {
      avgPrice: 130,
      minPrice: 120,
      activeSellers: 50
    },
    trades24h: 340,
    volume24h: 680
  }
];

export const MOCK_ARCANES = INITIAL_ARCANES;
