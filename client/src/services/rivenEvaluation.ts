import weaponVariantsData from '../data/weaponVariants.json';

export type WeaponClass = 'Rifle' | 'Shotgun' | 'Pistol' | 'Melee' | 'Archgun';

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
  };
  mod_info?: {
    name: string;
    rerolls: number;
    mastery_level: number;
    polarity: string;
  };
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
    channeling_efficiency: 73.44,
    channeling_damage: 24.3,
    chance_to_gain_extra_combo_count: 58.77,
    chance_to_gain_combo_count: 99.9,
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
};

export const AUCTION_ID_REGEX = /(?:warframe\.market\/(?:[a-z]{2}\/)?auctions\/|^)([a-f0-9]{24})/i;

export function extractAuctionId(input: string): string | null {
  const match = input.trim().match(AUCTION_ID_REGEX);
  return match && match[1] ? match[1].toLowerCase() : null;
}

export function isFactionStat(urlName: string): boolean {
  return (
    urlName === 'damage_vs_corpus' ||
    urlName === 'damage_vs_grineer' ||
    urlName === 'damage_vs_infested'
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
  if (g === 'secondary' || r === 'pistol') return 'Pistol';
  if (g === 'melee' || r === 'melee' || g === 'zaw') return 'Melee';
  if (g === 'archgun') return 'Archgun';
  return 'Rifle';
}

export function evaluateRiven(
  wClass: WeaponClass,
  disposition: number,
  declaredRank: number,
  attrs: WFMAttribute[],
  weaponSlug: string = '',
  selectedVariantName?: string
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

  // Weapon variants lookup
  const weaponsDict = weaponVariantsData as Record<string, any>;
  const weaponMeta = weaponsDict[weaponSlug] || null;
  const availableVariants: WeaponVariant[] = weaponMeta?.variants || [
    { name: weaponMeta?.name_en || weaponSlug || 'Standard', disposition },
  ];

  let activeDisposition = disposition;
  let activeVariantName = availableVariants[0]?.name || 'Standard';

  if (selectedVariantName) {
    const matched = availableVariants.find(
      (v) => v.name.toLowerCase() === selectedVariantName.toLowerCase()
    );
    if (matched) {
      activeDisposition = matched.disposition;
      activeVariantName = matched.name;
    }
  } else if (availableVariants.length > 1) {
    let bestVar = availableVariants[0];
    let bestVarScore = Infinity;

    for (const v of availableVariants) {
      const rankFactor = (Math.max(0, Math.min(8, declaredRank)) + 1) / 9.0;
      let varMse = 0;
      let withinBounds = true;

      for (const a of attrs) {
        const baseVal = BaseStatsTable[wClass][a.url_name];
        if (!baseVal) continue;
        const typeMult = a.positive ? buffMult : curseMult;
        const normVal = normalizeStatValue(a);
        const avg = baseVal * v.disposition * typeMult * rankFactor;
        const roll = normVal / avg;
        varMse += (roll - 1.0) ** 2;
        if (roll < 0.895 || roll > 1.105) withinBounds = false;
      }

      const score = withinBounds ? varMse : varMse + 10.0;
      if (score < bestVarScore) {
        bestVarScore = score;
        bestVar = v;
      }
    }
    activeDisposition = bestVar.disposition;
    activeVariantName = bestVar.name;
  }

  // Rank detection
  const calcRankMetrics = (rank: number) => {
    const rankFactor = (rank + 1) / 9.0;
    let mse = 0.0;
    let allValid = true;

    for (const a of attrs) {
      const baseVal = BaseStatsTable[wClass][a.url_name];
      if (!baseVal) {
        throw new Error(`Unsupported attribute ${a.url_name} for class ${wClass}`);
      }
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
    return { mse: mse / attrs.length, allValid };
  };

  let effectiveRank = Math.max(0, Math.min(8, Number(declaredRank) || 0));
  let rankMismatch = false;

  const declaredMetrics = calcRankMetrics(effectiveRank);
  if (!declaredMetrics.allValid) {
    let bestRank = effectiveRank;
    let bestMse = Infinity;

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

  const rankFactor = (effectiveRank + 1) / 9.0;
  const evaluatedStats: EvaluatedStat[] = [];
  let totalQuality = 0;

  for (const a of attrs) {
    const baseVal = BaseStatsTable[wClass][a.url_name];
    const typeMult = a.positive ? buffMult : curseMult;
    const normVal = normalizeStatValue(a);

    const avg = baseVal * activeDisposition * typeMult * rankFactor;
    const minPoss = avg * 0.9;
    const maxPoss = avg * 1.1;

    const rollMult = normVal / avg;
    const devPct = (rollMult - 1.0) * 100.0;

    let rawPerf = ((rollMult - 0.9) / 0.2) * 100.0;
    rawPerf = Math.max(0.0, Math.min(100.0, rawPerf));

    const effQual = a.positive ? rawPerf : 100.0 - rawPerf;
    totalQuality += effQual;

    const meta = StatMeta[a.url_name] || {
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
    weapon_slug: weaponSlug || weaponMeta?.slug || '',
    weapon_name_en: weaponMeta?.name_en || weaponSlug || 'Unknown Weapon',
    weapon_name_ru: weaponMeta?.name_ru || weaponMeta?.name_en || weaponSlug || 'Неизвестное оружие',
    weapon_class: wClass,
    icon_url: weaponMeta?.icon_url || '',
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
