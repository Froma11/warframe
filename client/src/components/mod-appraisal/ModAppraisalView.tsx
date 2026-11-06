import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingUp,
  Shield,
  Layers,
  ChevronDown,
  Info,
  RefreshCw,
  X,
} from 'lucide-react';
import { PlatinumIcon } from '../PlatinumIcon';
import {
  evaluateRiven,
  extractAuctionId,
  resolveWeaponClass,
  EvaluationResult,
  EvaluatedStat,
  WeaponVariant,
} from '../../services/rivenEvaluation';

interface ModAppraisalViewProps {
  lang: 'ru' | 'en';
}

// Sample test auctions for quick 1-click verification
const SAMPLE_AUCTIONS = [
  {
    labelRu: 'Torid (Фейк ранг 0)',
    labelEn: 'Torid (Fake 0 Rank)',
    slug: 'torid',
    nameEn: 'Torid',
    nameRu: 'Торид',
    rank: 0,
    disposition: 1.3,
    weaponClass: 'Rifle' as const,
    variants: [{ name: 'Torid', disposition: 1.3 }],
    attrs: [
      { url_name: 'critical_chance', positive: true, value: 182.8 },
      { url_name: 'multishot', positive: true, value: 109.7 },
      { url_name: 'heat_damage', positive: true, value: 109.7 },
      { url_name: 'recoil', positive: false, value: 87.7 },
    ],
    seller: { name: 'TennoSniper', status: 'ingame', reputation: 48, price: 1200 },
    modName: 'Torid Crita-ignican',
  },
  {
    labelRu: 'Latron (Prime / Wraith)',
    labelEn: 'Latron (Prime / Wraith)',
    slug: 'latron',
    nameEn: 'Latron',
    nameRu: 'Латрон',
    rank: 8,
    disposition: 1.3,
    weaponClass: 'Rifle' as const,
    variants: [
      { name: 'Latron', disposition: 1.3 },
      { name: 'Latron Prime', disposition: 1.15 },
      { name: 'Latron Wraith', disposition: 1.25 },
    ],
    attrs: [
      { url_name: 'critical_chance', positive: true, value: 168.5 },
      { url_name: 'critical_damage', positive: true, value: 134.8 },
      { url_name: 'damage_vs_grineer', positive: false, value: 0.65 },
    ],
    seller: { name: 'OrokinMerchant', status: 'online', reputation: 124, price: 850 },
    modName: 'Latron Critatis',
  },
  {
    labelRu: 'Glaive (Ближний бой)',
    labelEn: 'Glaive (Melee)',
    slug: 'glaive',
    nameEn: 'Glaive',
    nameRu: 'Глефа',
    rank: 8,
    disposition: 0.7,
    weaponClass: 'Melee' as const,
    variants: [
      { name: 'Glaive', disposition: 0.7 },
      { name: 'Glaive Prime', disposition: 0.7 },
    ],
    attrs: [
      { url_name: 'range', positive: true, value: 1.35 },
      { url_name: 'critical_damage', positive: true, value: 62.8 },
      { url_name: 'impact_damage', positive: false, value: -83.5 },
    ],
    seller: { name: 'VoidTrader', status: 'ingame', reputation: 92, price: 1600 },
    modName: 'Glaive Locti-acritox',
  },
];

export const ModAppraisalView: React.FC<ModAppraisalViewProps> = ({ lang }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [isCopiedWhisper, setIsCopiedWhisper] = useState(false);

  // Evaluate URL or Auction ID via backend
  const handleEvaluate = async (inputToEvaluate?: string) => {
    const rawInput = (inputToEvaluate || inputValue).trim();
    if (!rawInput) {
      setErrorMsg(
        lang === 'ru'
          ? 'Пожалуйста, вставьте ссылку на аукцион warframe.market или ID лота'
          : 'Please enter a warframe.market auction link or ID'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/rivens/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: rawInput }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(
          json.error ||
            (lang === 'ru'
              ? 'Ошибка при получении данных аукциона с warframe.market'
              : 'Failed to retrieve auction from warframe.market')
        );
      }

      setEvaluation(json.data);
      setSelectedVariant(json.data.selected_variant || '');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch weapon variant locally with zero delay
  const handleVariantChange = (variantName: string) => {
    if (!evaluation) return;
    setSelectedVariant(variantName);

    // Re-evaluate client-side instantly using the raw attributes
    const rawAttrs = evaluation.stats.map((s) => ({
      url_name: s.url_name,
      positive: s.positive,
      value: s.raw_input,
    }));

    const updated = evaluateRiven(
      evaluation.weapon_class,
      evaluation.disposition,
      evaluation.declared_rank,
      rawAttrs,
      evaluation.weapon_slug,
      variantName,
      evaluation.available_variants,
      evaluation.weapon_name_en,
      evaluation.weapon_name_ru,
      evaluation.icon_url
    );

    setEvaluation({
      ...evaluation,
      ...updated,
      selected_variant: variantName,
    });
  };

  // Load a sample test auction
  const handleLoadSample = (sample: (typeof SAMPLE_AUCTIONS)[0]) => {
    setErrorMsg(null);
    setInputValue(`https://warframe.market/auctions/${sample.slug}_demo_sample`);
    const evalRes = evaluateRiven(
      sample.weaponClass,
      sample.disposition,
      sample.rank,
      sample.attrs,
      sample.slug,
      undefined,
      sample.variants,
      sample.nameEn,
      sample.nameRu
    );

    setEvaluation({
      ...evalRes,
      auction_id: 'demo_sample',
      seller_info: {
        name: sample.seller.name,
        status: sample.seller.status,
        reputation: sample.seller.reputation,
        price: sample.seller.price,
      },
      mod_info: {
        name: sample.modName,
        rerolls: 7,
        mastery_level: 16,
        polarity: 'madurai',
      },
    });
    setSelectedVariant(evalRes.selected_variant);
  };

  // Copy whisper command
  const handleCopyWhisper = () => {
    if (!evaluation || !evaluation.seller_info) return;
    const seller = evaluation.seller_info.name;
    const price = evaluation.seller_info.price ? `${evaluation.seller_info.price} platinum` : '';
    const mod = evaluation.mod_info?.name || 'Riven';
    const text = `/w ${seller} Hi! I want to buy your "${mod}" for ${price}. (warframe.market)`;

    navigator.clipboard.writeText(text);
    setIsCopiedWhisper(true);
    setTimeout(() => setIsCopiedWhisper(false), 2000);
  };

  // Grade color theme resolver
  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case 'S+':
        return {
          bg: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
          badge: 'from-purple-500 to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]',
          bar: 'from-purple-500 to-indigo-400',
        };
      case 'S':
        return {
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
          badge: 'from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]',
          bar: 'from-emerald-500 to-teal-400',
        };
      case 'A+':
        return {
          bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
          badge: 'from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(0,229,255,0.5)]',
          bar: 'from-cyan-500 to-blue-400',
        };
      case 'A':
        return {
          bg: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
          badge: 'from-blue-500 to-sky-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]',
          bar: 'from-blue-500 to-sky-400',
        };
      case 'B':
        return {
          bg: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
          badge: 'from-amber-500 to-yellow-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]',
          bar: 'from-amber-500 to-yellow-400',
        };
      case 'C':
        return {
          bg: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
          badge: 'from-orange-500 to-red-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]',
          bar: 'from-orange-500 to-red-400',
        };
      default:
        return {
          bg: 'bg-rose-500/20 text-rose-400 border-rose-500/50',
          badge: 'from-rose-500 to-red-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]',
          bar: 'from-rose-600 to-rose-400',
        };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* 1. Header Hero (Styled strictly in line with Market / Sedna aesthetic) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Sparkles className="w-5 h-5 text-orange-500" />
            </div>
            <h1 className="font-comfortaa font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-wide">
              {lang === 'ru' ? 'Оценка модов разлома' : 'Riven Mod Appraisal'}
            </h1>
          </div>
          <p className="font-onest text-sm text-slate-600 dark:text-slate-400">
            {lang === 'ru'
              ? 'Математическая оценка качества роллов, точность AlecaFrame и автокоррекция рангов по ссылкам Warframe Market'
              : 'Mathematical roll quality grading, AlecaFrame accuracy, and rank auto-correction via Warframe Market'}
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300 dark:border-white/[0.08] text-xs font-comfortaa">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-bold text-slate-700 dark:text-slate-300">AlecaFrame / Semlar Engine</span>
        </div>
      </div>

      {/* 2. Main Search & Input Bar */}
      <div className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEvaluate();
          }}
          className="relative flex items-center"
        >
          <div className="absolute left-4 pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-5 h-5 text-orange-500" />
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              lang === 'ru'
                ? 'Вставьте ссылку на аукцион warframe.market/auction/... или 24-значный ID лота'
                : 'Paste warframe.market/auction/... auction link or 24-char lot ID'
            }
            className="w-full pl-12 pr-32 sm:pr-40 py-3.5 sm:py-4 rounded-2xl bg-white dark:bg-[#070b12] border border-slate-200 dark:border-white/[0.1] focus:border-orange-500 dark:focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-slate-900 dark:text-white font-onest text-sm sm:text-base outline-none shadow-sm transition-all"
          />

          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                setErrorMsg(null);
              }}
              className="absolute right-28 sm:right-36 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 sm:right-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-comfortaa font-bold text-xs sm:text-sm tracking-wider shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">{lang === 'ru' ? 'Парсинг...' : 'Parsing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'ru' ? 'Оценить' : 'Appraise'}</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Presets */}
        <div className="flex flex-wrap items-center gap-2 mt-3 px-1 text-xs font-onest text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {lang === 'ru' ? 'Быстрые примеры:' : 'Quick samples:'}
          </span>
          {SAMPLE_AUCTIONS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadSample(sample)}
              className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800/70 hover:bg-orange-500/15 hover:text-orange-500 dark:hover:bg-orange-500/20 dark:hover:text-orange-400 border border-slate-300/50 dark:border-white/[0.06] transition-colors cursor-pointer"
            >
              {lang === 'ru' ? sample.labelRu : sample.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-onest text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 3. Evaluation Result Container */}
      {evaluation && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          
          {/* A. Rank Mismatch Alert (Strict Rule: AlecaFrame §5.1) */}
          {evaluation.rank_mismatch_detected && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 flex items-start sm:items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
              <div className="font-onest text-sm leading-relaxed">
                <span className="font-bold font-comfortaa">
                  {lang === 'ru' ? 'Автокоррекция ранга: ' : 'Rank Auto-Correction: '}
                </span>
                {lang === 'ru'
                  ? `В лоте продавцом указан ранг ${evaluation.declared_rank}, однако числовые характеристики соответствуют рангу ${evaluation.effective_rank}. Оценка рассчитана для ранга ${evaluation.effective_rank}.`
                  : `Seller declared rank ${evaluation.declared_rank}, but stat values correspond to rank ${evaluation.effective_rank}. Appraisal calculated for rank ${evaluation.effective_rank}.`}
              </div>
            </div>
          )}

          {/* B. Overview Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#070b12] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />

            {/* Left: Weapon and Mod Identification */}
            <div className="flex items-start gap-4 z-10">
              {evaluation.icon_url ? (
                <img
                  src={`https://warframe.market/static/assets/${evaluation.icon_url}`}
                  alt={evaluation.weapon_name_en}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl p-1.5 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                  <Shield className="w-8 h-8 text-orange-500" />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h2 className="font-comfortaa font-bold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-wide">
                    {lang === 'ru' ? evaluation.weapon_name_ru : evaluation.weapon_name_en}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {evaluation.weapon_class}
                  </span>
                </div>

                {evaluation.mod_info && (
                  <div className="font-comfortaa font-semibold text-base sm:text-lg text-orange-500 dark:text-orange-400 mb-2">
                    {evaluation.mod_info.name}
                  </div>
                )}

                {/* Mod badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-onest text-slate-600 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                    {lang === 'ru' ? 'Ранг' : 'Rank'} {evaluation.effective_rank}/8
                  </span>
                  {evaluation.mod_info && (
                    <>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                        {evaluation.mod_info.rerolls} {lang === 'ru' ? 'роллов' : 'rolls'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                        MR {evaluation.mod_info.mastery_level}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] capitalize">
                        {evaluation.mod_info.polarity}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Overall Grade & Quality Gauge */}
            <div className="flex items-center gap-5 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-white/[0.06] z-10">
              <div className="flex flex-col items-end">
                <span className="text-xs font-onest text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {lang === 'ru' ? 'Качество ролла' : 'Overall Quality'}
                </span>
                <span className="font-jetbrains font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
                  {evaluation.overall_score_pct}%
                </span>
              </div>

              {/* Huge Letter Grade Emblem */}
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${
                  getGradeStyle(evaluation.overall_grade).badge
                } flex flex-col items-center justify-center font-comfortaa font-bold text-3xl sm:text-4xl select-none`}
              >
                {evaluation.overall_grade}
              </div>
            </div>
          </div>

          {/* C. Weapon Variants & Seller Information Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#070b12] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* Weapon Variants Selector (AlecaFrame §5.2) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-comfortaa font-semibold text-slate-600 dark:text-slate-400">
                {lang === 'ru' ? 'Вариант оружия:' : 'Weapon Variant:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evaluation.available_variants.map((v) => {
                  const isSelected = (selectedVariant || evaluation.selected_variant) === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => handleVariantChange(v.name)}
                      className={`px-3 py-1 rounded-xl text-xs font-comfortaa font-semibold transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)] scale-105'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06]'
                      }`}
                    >
                      {v.name} <span className="opacity-75 font-jetbrains font-normal">({v.disposition})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seller & Whisper info */}
            {evaluation.seller_info && (
              <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-white/[0.06]">
                {evaluation.seller_info.price !== null && (
                  <div className="flex items-center gap-1.5 font-jetbrains font-bold text-base text-slate-900 dark:text-white">
                    <PlatinumIcon className="w-4 h-4 text-cyan-400" />
                    <span>{evaluation.seller_info.price}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      evaluation.seller_info.status === 'ingame'
                        ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                        : evaluation.seller_info.status === 'online'
                        ? 'bg-cyan-500 shadow-[0_0_8px_#00e5ff]'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-onest text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {evaluation.seller_info.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWhisper}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-comfortaa font-semibold transition-all cursor-pointer"
                >
                  {isCopiedWhisper ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lang === 'ru' ? 'Шёпот' : 'Whisper'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* D. Individual Stat Cards (AlecaFrame Breakdown) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {evaluation.stats.map((stat) => {
              const gradeTheme = getGradeStyle(stat.grade);
              const isBuff = stat.positive;
              const formattedValue = `${isBuff ? '+' : '-'}${stat.normalized_value}${stat.unit}`;

              return (
                <div
                  key={stat.url_name}
                  className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#070b12] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col justify-between transition-all hover:border-orange-500/40"
                >
                  {/* Stat Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isBuff ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <h3 className="font-comfortaa font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {lang === 'ru' ? stat.name_ru : stat.name_en}
                          </h3>
                        </div>
                        <span className="font-jetbrains font-bold text-lg sm:text-xl text-slate-900 dark:text-white">
                          {formattedValue}
                        </span>
                      </div>

                      {/* Stat Grade Emblem */}
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-3 py-1 rounded-xl font-comfortaa font-bold text-base sm:text-lg border ${gradeTheme.bg}`}
                        >
                          {stat.grade}
                        </span>
                        <span className="font-jetbrains text-xs text-slate-500 dark:text-slate-400">
                          {stat.effective_quality_pct}%
                        </span>
                      </div>
                    </div>

                    {/* Quality Progress Gauge (AlecaFrame Style) */}
                    <div className="mt-4 mb-3">
                      <div className="flex justify-between items-center text-[11px] font-jetbrains text-slate-400 dark:text-slate-500 mb-1.5">
                        <span>Min {stat.min_possible}{stat.unit}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          Avg {stat.avg_possible}{stat.unit}
                        </span>
                        <span>Max {stat.max_possible}{stat.unit}</span>
                      </div>

                      {/* Track */}
                      <div className="relative w-full h-2.5 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                        {/* Gauge fill */}
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${gradeTheme.bar} transition-all duration-500`}
                          style={{ width: `${Math.max(4, Math.min(100, stat.raw_perfectness_pct))}%` }}
                        />
                        {/* Center midpoint marker (50% average) */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-white/40 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Stat Footer Analytics */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.06] text-xs font-onest text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                      {lang === 'ru' ? 'Отклонение:' : 'Deviation:'}{' '}
                      <strong
                        className={`font-jetbrains ${
                          stat.deviation_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {stat.deviation_pct > 0 ? `+${stat.deviation_pct}%` : `${stat.deviation_pct}%`}
                      </strong>
                    </span>

                    <span>
                      {lang === 'ru' ? 'Сила ролла:' : 'Roll index:'}{' '}
                      <strong className="font-jetbrains text-slate-700 dark:text-slate-300">
                        {stat.raw_perfectness_pct}%
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* E. WFM Link & Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-onest text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-orange-500 shrink-0" />
              <span>
                {lang === 'ru'
                  ? 'Формула расчета строго соответствует механике игры Warframe и градации AlecaFrame. Проценты качества рассчитаны для максимального ранга 8.'
                  : 'Calculation formula strictly adheres to Warframe game mechanics and AlecaFrame standards. Perfectness is evaluated at maximum rank 8.'}
              </span>
            </div>

            {evaluation.auction_id && evaluation.auction_id !== 'demo_sample' && (
              <a
                href={`https://warframe.market/auctions/${evaluation.auction_id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-orange-500 hover:text-orange-400 font-semibold font-comfortaa shrink-0 transition-colors"
              >
                <span>{lang === 'ru' ? 'Открыть на Warframe Market' : 'View on Warframe Market'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
