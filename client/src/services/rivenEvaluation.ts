export type WeaponClass = 'Rifle' | 'Shotgun' | 'Pistol' | 'Melee' | 'Archgun';

export const UNIFIED_WARFRAME_DISPOSITION = 1.20; // Official Warframe Standard: 4 dots across all weapons

export interface WFMAttribute {
  url_name: string;
  positive: boolean;
  value: number;
}

export interface EvaluatedStat {
  url_name: string;
  name_en: string;
  name_ru: string;
  unit: string;
  positive: boolean;
  raw_input: number;
  normalized_value: number;
  min_possible: number;
  avg_possible: number;
  max_possible: number;
  roll_multiplier: number;
  deviation_pct: number;
  raw_perfectness_pct: number;
  effective_quality_pct: number;
  grade: 'S+' | 'S' | 'A+' | 'A' | 'B' | 'C' | 'F';
}

export interface WeaponVariant {
  name: string;
  disposition: number;
}

export interface EvaluationResult {
  auction_id?: string;
  weapon_slug: string;
  weapon_name_en: string;
  weapon_name_ru: string;
  weapon_class: WeaponClass;
  icon_url?: string;
  declared_rank: number;
  effective_rank: number;
  rank_mismatch_detected: boolean;
  disposition: number;
  selected_variant: string;
  available_variants: WeaponVariant[];
  overall_grade: 'S+' | 'S' | 'A+' | 'A' | 'B' | 'C' | 'F';
  overall_score_pct: number;
  stats: EvaluatedStat[];
  seller_info?: {
    name: string;
    status: string;
    reputation: number;
    price: number | null;
    is_direct_sell?: boolean;
  };
  mod_info?: {
    name: string;
    rerolls: number;
    mastery_level: number;
    polarity: string;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Standardizes attribute keys from varying API conventions into unified internal identifiers.
 */
export function canonicalizeAttributeSlug(slug: string): string {
  const s = (slug || '').toLowerCase().trim();
  switch (s) {
    case 'viral_damage':
      return 'viral';
    case 'blast_damage':
      return 'blast';
    case 'corrosive_damage':
      return 'corrosive';
    case 'gas_damage':
      return 'gas';
    case 'magnetic_damage':
      return 'magnetic';
    case 'radiation_damage':
      return 'radiation';
    case 'weakpoint_critical_chance':
      return 'weak_point_critical_chance';
    case 'weakpoint_damage':
      return 'weak_point_damage';
    case 'damage_to_corpus':
      return 'damage_vs_corpus';
    case 'damage_to_grineer':
      return 'damage_vs_grineer';
    case 'damage_to_infested':
      return 'damage_vs_infested';
    case 'damage_vs_orokin':
      return 'damage_to_orokin';
    case 'damage_vs_scaldra':
      return 'damage_to_scaldra';
    case 'damage_vs_techrot':
      return 'damage_to_techrot';
    case 'base_damage':
    case 'melee_damage':
      return 'base_damage_/_melee_damage';
    case 'fire_rate':
    case 'attack_speed':
      return 'fire_rate_/_attack_speed';
    case 'flight_speed':
      return 'projectile_speed';
    case 'weapon_recoil':
      return 'recoil';
    case 'melee_range':
    case 'range_/_melee_range':
      return 'range';
    case 'initial_combo':
      return 'channeling_damage';
    case 'heavy_attack_efficiency':
      return 'channeling_efficiency';
    default:
      return s;
  }
}

export const BaseStatsTable: Record<WeaponClass, Record<string, number>> = {
  Rifle: {
    'base_damage_/_melee_damage': 165.0,
    multishot: 90.0,
    critical_chance: 150.0,
    critical_damage: 120.0,
    cold_damage: 90.0,
    electric_damage: 90.0,
    heat_damage: 90.0,
    toxin_damage: 90.0,
    impact_damage: 119.97,
    puncture_damage: 119.97,
    slash_damage: 119.97,
    status_chance: 90.0,
    status_duration: 100.0,
    damage_vs_corpus: 45.0,
    damage_vs_grineer: 45.0,
    damage_vs_infested: 45.0,
    'fire_rate_/_attack_speed': 60.03,
    magazine_capacity: 50.0,
    ammo_maximum: 49.95,
    reload_speed: 50.0,
    projectile_speed: 90.0,
    recoil: 90.0,
    zoom: 59.99,
    punch_through: 2.7,
    // Modern Elements & Spliced Traits
    viral: 90.0,
    viral_damage: 90.0,
    blast: 90.0,
    blast_damage: 90.0,
    corrosive: 90.0,
    corrosive_damage: 90.0,
    gas: 90.0,
    gas_damage: 90.0,
    magnetic: 90.0,
    magnetic_damage: 90.0,
    radiation: 90.0,
    radiation_damage: 90.0,
    weak_point_critical_chance: 150.0,
    weakpoint_critical_chance: 150.0,
    weak_point_damage: 120.0,
    weakpoint_damage: 120.0,
    status_damage: 90.0,
    damage_to_orokin: 45.0,
    damage_vs_orokin: 45.0,
    damage_to_scaldra: 45.0,
    damage_vs_scaldra: 45.0,
    damage_to_techrot: 45.0,
    damage_vs_techrot: 45.0,
    ammo_efficiency: 50.0,
    magazine_reloaded_s_when_holstered: 50.0,
  },
  Shotgun: {
    'base_damage_/_melee_damage': 164.7,
    multishot: 119.7,
    critical_chance: 90.0,
    critical_damage: 90.0,
    cold_damage: 90.0,
    electric_damage: 90.0,
    heat_damage: 90.0,
    toxin_damage: 90.0,
    impact_damage: 119.97,
    puncture_damage: 119.97,
    slash_damage: 119.97,
    status_chance: 90.0,
    status_duration: 99.0,
    damage_vs_corpus: 45.0,
    damage_vs_grineer: 45.0,
    damage_vs_infested: 45.0,
    'fire_rate_/_attack_speed': 90.0,
    magazine_capacity: 50.0,
    ammo_maximum: 90.0,
    reload_speed: 49.45,
    projectile_speed: 89.1,
    recoil: 90.0,
    punch_through: 2.7,
    // Modern Elements & Spliced Traits
    viral: 90.0,
    viral_damage: 90.0,
    blast: 90.0,
    blast_damage: 90.0,
    corrosive: 90.0,
    corrosive_damage: 90.0,
    gas: 90.0,
    gas_damage: 90.0,
    magnetic: 90.0,
    magnetic_damage: 90.0,
    radiation: 90.0,
    radiation_damage: 90.0,
    weak_point_critical_chance: 90.0,
    weakpoint_critical_chance: 90.0,
    weak_point_damage: 90.0,
    weakpoint_damage: 90.0,
    status_damage: 90.0,
    damage_to_orokin: 45.0,
    damage_vs_orokin: 45.0,
    damage_to_scaldra: 45.0,
    damage_vs_scaldra: 45.0,
    damage_to_techrot: 45.0,
    damage_vs_techrot: 45.0,
    ammo_efficiency: 50.0,
    magazine_reloaded_s_when_holstered: 50.0,
  },
  Pistol: {
    'base_damage_/_melee_damage': 219.6,
    multishot: 119.7,
    critical_chance: 150.0,
    critical_damage: 90.0,
    cold_damage: 90.0,
    electric_damage: 90.0,
    heat_damage: 90.0,
    toxin_damage: 90.0,
    impact_damage: 119.97,
    puncture_damage: 119.97,
    slash_damage: 119.97,
    status_chance: 90.0,
    status_duration: 100.0,
    damage_vs_corpus: 45.0,
    damage_vs_grineer: 45.0,
    damage_vs_infested: 45.0,
    'fire_rate_/_attack_speed': 74.7,
    magazine_capacity: 50.0,
    ammo_maximum: 90.0,
    reload_speed: 50.0,
    projectile_speed: 90.0,
    recoil: 90.0,
    zoom: 80.1,
    punch_through: 2.7,
    // Modern Elements & Spliced Traits
    viral: 90.0,
    viral_damage: 90.0,
    blast: 90.0,
    blast_damage: 90.0,
    corrosive: 90.0,
    corrosive_damage: 90.0,
    gas: 90.0,
    gas_damage: 90.0,
    magnetic: 90.0,
    magnetic_damage: 90.0,
    radiation: 90.0,
    radiation_damage: 90.0,
    weak_point_critical_chance: 150.0,
    weakpoint_critical_chance: 150.0,
    weak_point_damage: 90.0,
    weakpoint_damage: 90.0,
    status_damage: 90.0,
    damage_to_orokin: 45.0,
    damage_vs_orokin: 45.0,
    damage_to_scaldra: 45.0,
    damage_vs_scaldra: 45.0,
    damage_to_techrot: 45.0,
    damage_vs_techrot: 45.0,
    ammo_efficiency: 50.0,
    magazine_reloaded_s_when_holstered: 50.0,
  },
  Melee: {
    'base_damage_/_melee_damage': 164.7,
    critical_chance: 180.0,
    critical_damage: 90.0,
    cold_damage: 90.0,
    electric_damage: 90.0,
    heat_damage: 90.0,
    toxin_damage: 90.0,
    impact_damage: 119.7,
    puncture_damage: 119.7,
    slash_damage: 119.7,
    status_chance: 90.0,
    status_duration: 99.0,
    damage_vs_corpus: 45.0,
    damage_vs_grineer: 45.0,
    damage_vs_infested: 45.0,
    'fire_rate_/_attack_speed': 54.9,
    range: 1.94,
    combo_duration: 8.1,
    critical_chance_on_slide_attack: 120.0,
    finisher_damage: 119.7,
    channeling_efficiency: 73.44, // Heavy Attack Efficiency
    channeling_damage: 24.3, // Initial Combo
    chance_to_gain_extra_combo_count: 58.77,
    chance_to_gain_combo_count: 99.9,
    // Modern Elements & Heavy Traits
    viral: 90.0,
    viral_damage: 90.0,
    blast: 90.0,
    blast_damage: 90.0,
    corrosive: 90.0,
    corrosive_damage: 90.0,
    gas: 90.0,
    gas_damage: 90.0,
    magnetic: 90.0,
    magnetic_damage: 90.0,
    radiation: 90.0,
    radiation_damage: 90.0,
    status_damage: 90.0,
    damage_to_orokin: 45.0,
    damage_vs_orokin: 45.0,
    damage_to_scaldra: 45.0,
    damage_vs_scaldra: 45.0,
    damage_to_techrot: 45.0,
    damage_vs_techrot: 45.0,
    heavy_attack_wind_up_speed: 54.9,
    melee_damage_on_heavy_attack: 164.7,
    parry_angle: 60.0,
    slam_attack_damage: 164.7,
  },
  Archgun: {
    'base_damage_/_melee_damage': 99.9,
    multishot: 60.3,
    critical_chance: 99.9,
    critical_damage: 80.1,
    cold_damage: 119.7,
    electric_damage: 119.7,
    heat_damage: 119.7,
    toxin_damage: 119.7,
    impact_damage: 90.0,
    puncture_damage: 90.0,
    slash_damage: 90.0,
    status_chance: 60.3,
    status_duration: 99.9,
    damage_vs_corpus: 45.0,
    damage_vs_grineer: 45.0,
    damage_vs_infested: 45.0,
    'fire_rate_/_attack_speed': 60.03,
    magazine_capacity: 60.3,
    ammo_maximum: 99.9,
    reload_speed: 99.9,
    recoil: 90.0,
    zoom: 59.99,
    punch_through: 2.7,
    // Modern Elements & Spliced Traits
    viral: 119.7,
    viral_damage: 119.7,
    blast: 119.7,
    blast_damage: 119.7,
    corrosive: 119.7,
    corrosive_damage: 119.7,
    gas: 119.7,
    gas_damage: 119.7,
    magnetic: 119.7,
    magnetic_damage: 119.7,
    radiation: 119.7,
    radiation_damage: 119.7,
    weak_point_critical_chance: 99.9,
    weakpoint_critical_chance: 99.9,
    weak_point_damage: 80.1,
    weakpoint_damage: 80.1,
    status_damage: 90.0,
    damage_to_orokin: 45.0,
    damage_vs_orokin: 45.0,
    damage_to_scaldra: 45.0,
    damage_vs_scaldra: 45.0,
    damage_to_techrot: 45.0,
    damage_vs_techrot: 45.0,
    ammo_efficiency: 50.0,
  },
};

export const StatMeta: Record<string, { en: string; ru: string; unit: string }> = {
  'base_damage_/_melee_damage': { en: 'Base Damage', ru: 'Урон', unit: '%' },
  multishot: { en: 'Multishot', ru: 'Мультивыстрел', unit: '%' },
  critical_chance: { en: 'Critical Chance', ru: 'Шанс крит. урона', unit: '%' },
  critical_damage: { en: 'Critical Damage', ru: 'Крит. урон', unit: '%' },
  cold_damage: { en: 'Cold Damage', ru: 'Урон холодом', unit: '%' },
  electric_damage: { en: 'Electricity Damage', ru: 'Урон электричеством', unit: '%' },
  heat_damage: { en: 'Heat Damage', ru: 'Урон огнём', unit: '%' },
  toxin_damage: { en: 'Toxin Damage', ru: 'Урон токсином', unit: '%' },
  impact_damage: { en: 'Impact Damage', ru: 'Ударный урон', unit: '%' },
  puncture_damage: { en: 'Puncture Damage', ru: 'Пронзающий урон', unit: '%' },
  slash_damage: { en: 'Slash Damage', ru: 'Режущий урон', unit: '%' },
  status_chance: { en: 'Status Chance', ru: 'Шанс статуса', unit: '%' },
  status_duration: { en: 'Status Duration', ru: 'Длительность статуса', unit: '%' },
  damage_vs_corpus: { en: 'Damage to Corpus', ru: 'Урон Корпусу', unit: '%' },
  damage_vs_grineer: { en: 'Damage to Grineer', ru: 'Урон Гринир', unit: '%' },
  damage_vs_infested: { en: 'Damage to Infested', ru: 'Урон Заражённым', unit: '%' },
  'fire_rate_/_attack_speed': { en: 'Fire Rate / Attack Speed', ru: 'Скорострельность / Скор. атаки', unit: '%' },
  magazine_capacity: { en: 'Magazine Capacity', ru: 'Вместимость магазина', unit: '%' },
  ammo_maximum: { en: 'Ammo Maximum', ru: 'Боезапас', unit: '%' },
  reload_speed: { en: 'Reload Speed', ru: 'Скорость перезарядки', unit: '%' },
  projectile_speed: { en: 'Projectile Speed', ru: 'Скорость полёта снаряда', unit: '%' },
  recoil: { en: 'Recoil', ru: 'Отдача', unit: '%' },
  zoom: { en: 'Zoom', ru: 'Приближение', unit: '%' },
  punch_through: { en: 'Punch Through', ru: 'Пронзание навылет', unit: 'm' },
  range: { en: 'Range', ru: 'Радиус удара', unit: 'm' },
  combo_duration: { en: 'Combo Duration', ru: 'Длительность комбо', unit: 's' },
  critical_chance_on_slide_attack: { en: 'Slide Attack Crit Chance', ru: 'Крит. шанс в подкате', unit: '%' },
  finisher_damage: { en: 'Finisher Damage', ru: 'Урон добивания', unit: '%' },
  channeling_efficiency: { en: 'Heavy Attack Efficiency', ru: 'Эфф. тяжёлой атаки', unit: '%' },
  channeling_damage: { en: 'Initial Combo', ru: 'Начальное комбо', unit: '' },
  chance_to_gain_extra_combo_count: { en: 'Additional Combo Count Chance', ru: 'Шанс доп. комбо', unit: '%' },
  chance_to_gain_combo_count: { en: 'Chance to Not Gain Combo', ru: 'Шанс не получить комбо', unit: '%' },
  // Modern Combat Stats
  viral: { en: 'Viral Damage', ru: 'Урон вирусом', unit: '%' },
  viral_damage: { en: 'Viral Damage', ru: 'Урон вирусом', unit: '%' },
  blast: { en: 'Blast Damage', ru: 'Урон взрывом', unit: '%' },
  blast_damage: { en: 'Blast Damage', ru: 'Урон взрывом', unit: '%' },
  corrosive: { en: 'Corrosive Damage', ru: 'Урон коррозией', unit: '%' },
  corrosive_damage: { en: 'Corrosive Damage', ru: 'Урон коррозией', unit: '%' },
  gas: { en: 'Gas Damage', ru: 'Урон газом', unit: '%' },
  gas_damage: { en: 'Gas Damage', ru: 'Урон газом', unit: '%' },
  magnetic: { en: 'Magnetic Damage', ru: 'Урон магнитом', unit: '%' },
  magnetic_damage: { en: 'Magnetic Damage', ru: 'Урон магнитом', unit: '%' },
  radiation: { en: 'Radiation Damage', ru: 'Урон радиацией', unit: '%' },
  radiation_damage: { en: 'Radiation Damage', ru: 'Урон радиацией', unit: '%' },
  weak_point_critical_chance: { en: 'Weak Point Crit Chance', ru: 'Крит. шанс по слабым местам', unit: '%' },
  weakpoint_critical_chance: { en: 'Weak Point Crit Chance', ru: 'Крит. шанс по слабым местам', unit: '%' },
  weak_point_damage: { en: 'Weak Point Damage', ru: 'Урон по уязвимым местам', unit: '%' },
  weakpoint_damage: { en: 'Weak Point Damage', ru: 'Урон по уязвимым местам', unit: '%' },
  status_damage: { en: 'Status Damage', ru: 'Урон статусом', unit: '%' },
  damage_to_orokin: { en: 'Damage to Orokin', ru: 'Урон Орокин', unit: '%' },
  damage_vs_orokin: { en: 'Damage to Orokin', ru: 'Урон Орокин', unit: '%' },
  damage_to_scaldra: { en: 'Damage to Scaldra', ru: 'Урон Скальдре', unit: '%' },
  damage_vs_scaldra: { en: 'Damage to Scaldra', ru: 'Урон Скальдре', unit: '%' },
  damage_to_techrot: { en: 'Damage to Techrot', ru: 'Урон Техроту', unit: '%' },
  damage_vs_techrot: { en: 'Damage to Techrot', ru: 'Урон Техроту', unit: '%' },
  ammo_efficiency: { en: 'Ammo Efficiency', ru: 'Эффективность боеприпасов', unit: '%' },
  magazine_reloaded_s_when_holstered: { en: 'Reloaded/s when Holstered', ru: 'Перезарядка/с в кобуре', unit: '%' },
  heavy_attack_wind_up_speed: { en: 'Heavy Attack Wind Up Speed', ru: 'Скор. подг. тяжёлой атаки', unit: '%' },
  melee_damage_on_heavy_attack: { en: 'Heavy Attack Melee Damage', ru: 'Урон в ближ. бою при тяж. атаке', unit: '%' },
  parry_angle: { en: 'Parry Angle', ru: 'Угол парирования', unit: '°' },
  slam_attack_damage: { en: 'Slam Attack Damage', ru: 'Урон от удара по земле', unit: '%' },
};

export const AUCTION_ID_REGEX = /(?:(?:auction|auctions)\/|^|[^a-f0-9])([a-f0-9]{24})(?:[^a-f0-9]|$)/i;

export function extractAuctionId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(AUCTION_ID_REGEX) || trimmed.match(/([a-f0-9]{24})/i);
  return match && match[1] ? match[1].toLowerCase() : null;
}

export function isFactionStat(urlName: string): boolean {
  const c = canonicalizeAttributeSlug(urlName);
  return (
    c === 'damage_vs_corpus' ||
    c === 'damage_vs_grineer' ||
    c === 'damage_vs_infested' ||
    c === 'damage_to_orokin' ||
    c === 'damage_to_scaldra' ||
    c === 'damage_to_techrot'
  );
}

export function normalizeStatValue(attr: WFMAttribute): number {
  const rawAbs = Math.abs(attr.value);
  if (!isFactionStat(attr.url_name)) {
    return rawAbs;
  }

  if (attr.positive) {
    if (rawAbs >= 1.0 && rawAbs <= 2.5) {
      return Number(((rawAbs - 1.0) * 100.0).toFixed(4));
    }
    if (rawAbs > 0.0 && rawAbs < 1.0) {
      return Number((rawAbs * 100.0).toFixed(4));
    }
    return rawAbs;
  } else {
    if (attr.value > 0 && rawAbs >= 0.4 && rawAbs < 0.99) {
      return Number(((1.0 - rawAbs) * 100.0).toFixed(4));
    }
    if (rawAbs > 0.0 && rawAbs < 0.4) {
      return Number((rawAbs * 100.0).toFixed(4));
    }
    return rawAbs;
  }
}

export function getConfigMultipliers(
  buffCount: number,
  hasCurse: boolean
): { buffMult: number; curseMult: number } {
  if (buffCount === 2 && !hasCurse) {
    return { buffMult: 0.99, curseMult: 0.0 };
  }
  if (buffCount === 2 && hasCurse) {
    return { buffMult: 1.2375, curseMult: 0.495 };
  }
  if (buffCount === 3 && !hasCurse) {
    return { buffMult: 0.75, curseMult: 0.0 };
  }
  if (buffCount === 3 && hasCurse) {
    return { buffMult: 0.9375, curseMult: 0.75 };
  }
  throw new Error(`Invalid riven configuration: buffs=${buffCount}, hasCurse=${hasCurse}`);
}

export function mapGrade(pct: number): 'S+' | 'S' | 'A+' | 'A' | 'B' | 'C' | 'F' {
  if (pct >= 95.0) return 'S+';
  if (pct >= 85.0) return 'S';
  if (pct >= 75.0) return 'A+';
  if (pct >= 65.0) return 'A';
  if (pct >= 40.0) return 'B';
  if (pct >= 20.0) return 'C';
  return 'F';
}

export function resolveWeaponClass(groupType: string, rivenType: string): WeaponClass {
  const g = (groupType || '').toLowerCase();
  const r = (rivenType || '').toLowerCase();

  if (g === 'shotgun' || r === 'shotgun') return 'Shotgun';
  if (g === 'secondary' || r === 'pistol' || g === 'kitgun') return 'Pistol';
  if (g === 'melee' || r === 'melee' || g === 'zaw') return 'Melee';
  if (g === 'archgun') return 'Archgun';
  return 'Rifle';
}

export function evaluateRiven(
  wClass: WeaponClass,
  disposition: number = UNIFIED_WARFRAME_DISPOSITION,
  declaredRank: number = 8,
  attrs: WFMAttribute[] = [],
  weaponSlug: string = '',
  selectedVariantName?: string,
  providedVariants?: WeaponVariant[],
  weaponNameEn?: string,
  weaponNameRu?: string,
  iconUrl?: string
): EvaluationResult {
  let buffCount = 0;
  let hasCurse = false;
  for (const a of attrs) {
    if (a.positive) {
      buffCount++;
    } else {
      hasCurse = true;
    }
  }

  const { buffMult, curseMult } = getConfigMultipliers(buffCount, hasCurse);

  // Weapon variants lookup (client uses providedVariants from API/sample to keep bundle tiny)
  // In modern Warframe, all weapons and variants share the standardized 4-dot disposition (1.20)
  const rawVariants: WeaponVariant[] =
    providedVariants && providedVariants.length > 0
      ? providedVariants
      : [{ name: weaponNameEn || weaponSlug || 'Standard', disposition: UNIFIED_WARFRAME_DISPOSITION }];
  const availableVariants: WeaponVariant[] = rawVariants.map((v) => ({
    name: v.name,
    disposition: UNIFIED_WARFRAME_DISPOSITION,
  }));

  let activeDisposition = UNIFIED_WARFRAME_DISPOSITION;
  let activeVariantName = availableVariants[0]?.name || 'Standard';

  if (selectedVariantName) {
    const matched = availableVariants.find(
      (v) => v.name.toLowerCase() === selectedVariantName.toLowerCase()
    );
    if (matched) {
      activeVariantName = matched.name;
    }
  }

  // 1. Calculate Rank Metrics & Auto-detect fake rank 0
  const calcRankMetrics = (rank: number) => {
    const rankFactor = (rank + 1) / 9.0;
    let mse = 0.0;
    let allValid = true;

    for (const a of attrs) {
      const canonName = canonicalizeAttributeSlug(a.url_name);
      const baseVal =
        BaseStatsTable[wClass][canonName] ||
        BaseStatsTable[wClass][a.url_name] ||
        90.0;

      const typeMult = a.positive ? buffMult : curseMult;
      const normVal = normalizeStatValue(a);
      const avg = baseVal * activeDisposition * typeMult * rankFactor;
      const roll = normVal / avg;
      const diff = roll - 1.0;
      mse += diff * diff;
      if (roll < 0.85 || roll > 1.15) {
        allValid = false;
      }
    }
    return { mse: attrs.length > 0 ? mse / attrs.length : 0, allValid };
  };

  let effectiveRank = Math.max(0, Math.min(8, Number(declaredRank) || 0));
  let rankMismatch = false;

  const declaredMetrics = calcRankMetrics(effectiveRank);
  if (!declaredMetrics.allValid) {
    let bestRank = effectiveRank;
    let bestMse = Infinity;

    // Check ranks 8 down to 0 (default priority to rank 8)
    for (const r of [8, 0, 1, 2, 3, 4, 5, 6, 7]) {
      try {
        const { mse } = calcRankMetrics(r);
        if (mse < bestMse) {
          bestMse = mse;
          bestRank = r;
        }
      } catch {
        // continue
      }
    }

    if (bestRank !== effectiveRank) {
      effectiveRank = bestRank;
      rankMismatch = true;
    }
  }

  // 2. Evaluate all stats using effectiveRank and activeDisposition
  const rankFactor = (effectiveRank + 1) / 9.0;
  const evaluatedStats: EvaluatedStat[] = [];
  let totalQuality = 0;

  for (const a of attrs) {
    const canonName = canonicalizeAttributeSlug(a.url_name);
    const baseVal =
      BaseStatsTable[wClass][canonName] ||
      BaseStatsTable[wClass][a.url_name] ||
      90.0;

    const typeMult = a.positive ? buffMult : curseMult;
    const normVal = normalizeStatValue(a);

    const avg = baseVal * activeDisposition * typeMult * rankFactor;
    const minPoss = avg * 0.9;
    const maxPoss = avg * 1.1;

    const rollMult = avg > 0 ? normVal / avg : 1.0;
    const devPct = (rollMult - 1.0) * 100.0;

    let rawPerf = ((rollMult - 0.9) / 0.2) * 100.0;
    rawPerf = Math.max(0.0, Math.min(100.0, rawPerf));

    const effQual = a.positive ? rawPerf : 100.0 - rawPerf;
    totalQuality += effQual;

    const meta = StatMeta[canonName] || StatMeta[a.url_name] || {
      en: a.url_name,
      ru: a.url_name,
      unit: '%',
    };

    evaluatedStats.push({
      url_name: a.url_name,
      name_en: meta.en,
      name_ru: meta.ru,
      unit: meta.unit,
      positive: a.positive,
      raw_input: a.value,
      normalized_value: normVal,
      min_possible: Number(minPoss.toFixed(2)),
      avg_possible: Number(avg.toFixed(2)),
      max_possible: Number(maxPoss.toFixed(2)),
      roll_multiplier: Number(rollMult.toFixed(4)),
      deviation_pct: Number(devPct.toFixed(2)),
      raw_perfectness_pct: Number(rawPerf.toFixed(1)),
      effective_quality_pct: Number(effQual.toFixed(1)),
      grade: mapGrade(effQual),
    });
  }

  const overallScorePct = evaluatedStats.length > 0 ? totalQuality / evaluatedStats.length : 0;

  return {
    weapon_slug: weaponSlug,
    weapon_name_en: weaponNameEn || weaponSlug || 'Unknown Weapon',
    weapon_name_ru: weaponNameRu || weaponNameEn || weaponSlug || 'Неизвестное оружие',
    weapon_class: wClass,
    icon_url: iconUrl || '',
    declared_rank: declaredRank,
    effective_rank: effectiveRank,
    rank_mismatch_detected: rankMismatch,
    disposition: activeDisposition,
    selected_variant: activeVariantName,
    available_variants: availableVariants,
    overall_grade: mapGrade(overallScorePct),
    overall_score_pct: Number(overallScorePct.toFixed(1)),
    stats: evaluatedStats,
  };
}
