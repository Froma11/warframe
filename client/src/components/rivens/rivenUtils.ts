/**
 * Comprehensive Warframe Riven Attribute Translation & Localization Dictionary
 * Maps official Warframe Market url_name keys to precise in-game Russian and English stat names.
 */

export const RIVEN_STAT_TRANSLATIONS: Record<string, { ru: string; en: string }> = {
  // Core Offensive Stats
  'damage': { ru: 'Урон', en: 'Damage' },
  'base_damage_/_melee_damage': { ru: 'Урон', en: 'Damage' },
  'multishot': { ru: 'Мультивыстрел', en: 'Multishot' },
  'critical_chance': { ru: 'Шанс крит. попадания', en: 'Critical Chance' },
  'critical_damage': { ru: 'Критический урон', en: 'Critical Damage' },
  'status_chance': { ru: 'Шанс статуса', en: 'Status Chance' },
  'status_duration': { ru: 'Длительность статуса', en: 'Status Duration' },
  'fire_rate': { ru: 'Скорострельность', en: 'Fire Rate' },
  'attack_speed': { ru: 'Скорость атаки', en: 'Attack Speed' },
  'fire_rate_/_attack_speed': { ru: 'Скорострельность / Скор. атаки', en: 'Fire Rate / Attack Speed' },
  'punch_through': { ru: 'Пронзание навылет', en: 'Punch Through' },
  'recoil': { ru: 'Отдача', en: 'Weapon Recoil' },
  'weapon_recoil': { ru: 'Отдача', en: 'Weapon Recoil' },
  'zoom': { ru: 'Приближение (зум)', en: 'Zoom' },
  'magazine_capacity': { ru: 'Вместимость магазина', en: 'Magazine Capacity' },
  'ammo_maximum': { ru: 'Максимум патронов', en: 'Max Ammo' },
  'reload_speed': { ru: 'Скорость перезарядки', en: 'Reload Speed' },
  'projectile_speed': { ru: 'Скорость полета снаряда', en: 'Flight Speed' },
  'flight_speed': { ru: 'Скорость полета снаряда', en: 'Flight Speed' },

  // Elemental & Physical Types
  'heat_damage': { ru: 'Урон огнем', en: 'Heat Damage' },
  'cold_damage': { ru: 'Урон холодом', en: 'Cold Damage' },
  'electric_damage': { ru: 'Урон электричеством', en: 'Electricity Damage' },
  'electricity_damage': { ru: 'Урон электричеством', en: 'Electricity Damage' },
  'toxin_damage': { ru: 'Урон токсином', en: 'Toxin Damage' },
  'impact_damage': { ru: 'Ударный урон', en: 'Impact Damage' },
  'puncture_damage': { ru: 'Пронзающий урон', en: 'Puncture Damage' },
  'slash_damage': { ru: 'Урон разрезом', en: 'Slash Damage' },
  'blast_damage': { ru: 'Урон взрывом', en: 'Blast Damage' },
  'corrosive_damage': { ru: 'Урон коррозией', en: 'Corrosive Damage' },
  'gas_damage': { ru: 'Урон газом', en: 'Gas Damage' },
  'magnetic_damage': { ru: 'Урон магнитом', en: 'Magnetic Damage' },
  'radiation_damage': { ru: 'Урон радиацией', en: 'Radiation Damage' },
  'viral_damage': { ru: 'Урон вирусом', en: 'Viral Damage' },

  // Base Element names
  'heat': { ru: 'Огонь', en: 'Heat' },
  'cold': { ru: 'Холод', en: 'Cold' },
  'electric': { ru: 'Электричество', en: 'Electricity' },
  'electricity': { ru: 'Электричество', en: 'Electricity' },
  'toxin': { ru: 'Токсин', en: 'Toxin' },
  'impact': { ru: 'Удар', en: 'Impact' },
  'puncture': { ru: 'Пронзание', en: 'Puncture' },
  'slash': { ru: 'Разрез', en: 'Slash' },
  'blast': { ru: 'Урон взрывом', en: 'Blast' },
  'corrosive': { ru: 'Урон коррозией', en: 'Corrosive' },
  'gas': { ru: 'Урон газом', en: 'Gas' },
  'magnetic': { ru: 'Урон магнитом', en: 'Magnetic' },
  'radiation': { ru: 'Урон радиацией', en: 'Radiation' },
  'viral': { ru: 'Урон вирусом', en: 'Viral' },

  // Precision & Spliced Combat Stats
  'weak_point_critical_chance': { ru: 'К шансу крит. по слабым местам', en: 'Weak Point Crit Chance' },
  'weakpoint_critical_chance': { ru: 'К шансу крит. по слабым местам', en: 'Weak Point Crit Chance' },
  'weak_point_damage': { ru: 'К урону по уязвимым местам', en: 'Weak Point Damage' },
  'weakpoint_damage': { ru: 'К урону по уязвимым местам', en: 'Weak Point Damage' },
  'status_damage': { ru: 'К урону статусом', en: 'Status Damage' },
  'ammo_efficiency': { ru: 'К эффективности боеприпасов', en: 'Ammo Efficiency' },
  'magazine_reloaded_s_when_holstered': { ru: 'Перезарядка/с в кобуре', en: 'Reloaded/s Holstered' },

  // Faction Modifiers (Classic & Modern)
  'damage_to_grineer': { ru: 'Урон Гринир', en: 'Damage to Grineer' },
  'damage_vs_grineer': { ru: 'Урон Гринир', en: 'Damage to Grineer' },
  'damage_to_corpus': { ru: 'Урон Корпусу', en: 'Damage to Corpus' },
  'damage_vs_corpus': { ru: 'Урон Корпусу', en: 'Damage to Corpus' },
  'damage_to_infested': { ru: 'Урон Зараженным', en: 'Damage to Infested' },
  'damage_vs_infested': { ru: 'Урон Зараженным', en: 'Damage to Infested' },
  'damage_to_orokin': { ru: 'Урон Орокин', en: 'Damage to Orokin' },
  'damage_vs_orokin': { ru: 'Урон Орокин', en: 'Damage to Orokin' },
  'damage_to_scaldra': { ru: 'Урон Скальдре', en: 'Damage to Scaldra' },
  'damage_vs_scaldra': { ru: 'Урон Скальдре', en: 'Damage to Scaldra' },
  'damage_to_techrot': { ru: 'Урон Техроту', en: 'Damage to Techrot' },
  'damage_vs_techrot': { ru: 'Урон Техроту', en: 'Damage to Techrot' },

  // Melee & Combo
  'range': { ru: 'Дальность поражения', en: 'Range' },
  'melee_range': { ru: 'Дальность поражения', en: 'Range' },
  'range_/_melee_range': { ru: 'Дальность поражения', en: 'Range' },
  'combo_duration': { ru: 'Длительность комбо', en: 'Combo Duration' },
  'initial_combo': { ru: 'Начальное комбо', en: 'Initial Combo' },
  'channeling_damage': { ru: 'Начальное комбо', en: 'Initial Combo' },
  'combo_count_chance': { ru: 'Шанс доп. комбо', en: 'Combo Count Chance' },
  'chance_to_gain_extra_combo_count': { ru: 'Шанс доп. комбо', en: 'Combo Count Chance' },
  'chance_to_gain_combo_count': { ru: 'Шанс не получить комбо', en: 'Chance to Not Gain Combo' },
  'heavy_attack_efficiency': { ru: 'Эффект. тяжелой атаки', en: 'Heavy Attack Efficiency' },
  'channeling_efficiency': { ru: 'Эффект. тяжелой атаки', en: 'Heavy Attack Efficiency' },
  'finisher_damage': { ru: 'Урон добивания', en: 'Finisher Damage' },
  'heavy_attack_wind_up_speed': { ru: 'Скор. подг. тяжёлой атаки', en: 'Heavy Wind Up Speed' },
  'melee_damage_on_heavy_attack': { ru: 'Урон в ближ. бою при тяж. атаке', en: 'Heavy Attack Melee Damage' },
  'parry_angle': { ru: 'Угол парирования', en: 'Parry Angle' },
  'slam_attack_damage': { ru: 'Урон от удара по земле', en: 'Slam Attack Damage' },
  'critical_chance_on_slide_attack': { ru: 'Крит. шанс в подкате', en: 'Slide Attack Crit Chance' },
  'chance_to_not_use_combo_count': { ru: 'Шанс не тратить счетчик комбо', en: 'Combo Counter Efficiency' },
};

/**
 * Formats attribute name according to selected language
 */
export function formatRivenStatName(urlName: string, lang: 'ru' | 'en'): string {
  if (!urlName) return '';
  const key = urlName.toLowerCase().trim();
  const entry = RIVEN_STAT_TRANSLATIONS[key];
  if (entry) {
    return lang === 'ru' ? entry.ru : entry.en;
  }

  // Graceful fallback: replace underscores, clean up slashes, and capitalize
  const cleaned = urlName
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Calculates in-game Riven synergy dots (1 to 5) from disposition multiplier
 * Warframe Official Ranges:
 * 1 dot:  0.50 - 0.69
 * 2 dots: 0.70 - 0.89
 * 3 dots: 0.90 - 1.11
 * 4 dots: 1.12 - 1.30
 * 5 dots: 1.31 - 1.55+
 */
export function getDispositionDots(disposition?: number): number {
  if (disposition === undefined || disposition === null || disposition === 0) return 4;
  if (disposition <= 0.69) return 1;
  if (disposition <= 0.89) return 2;
  if (disposition <= 1.11) return 3;
  if (disposition <= 1.30) return 4;
  return 5;
}
