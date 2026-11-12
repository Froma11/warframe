import React, { useState } from 'react';
import {
  Search,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Shield,
  RefreshCw,
  X,
} from 'lucide-react';
import { PlatinumIcon } from '../PlatinumIcon';
import { resolveAssetUrl } from '../../utils/assets';
import {
  evaluateRiven,
  EvaluationResult,
  EvaluatedStat,
} from '../../services/rivenEvaluation';

interface ModAppraisalViewProps {
  lang: 'ru' | 'en';
}

interface GradeTheme {
  badge: string;
  bar: string;
  glow: string;
  cardBorder: string;
  pill: string;
  accentText: string;
  dot: string;
  spotlightBorder: string;
  spotlightGlow: string;
}

// Harmonious luxury dark palette tokens
const getGradeStyle = (grade: string): GradeTheme => {
  switch (grade) {
    case 'S+':
      return {
        badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]',
        bar: 'from-cyan-500 via-sky-400 to-teal-300',
        glow: 'shadow-[0_0_28px_rgba(6,182,212,0.25)]',
        cardBorder: 'border-cyan-500/35',
        pill: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.35)]',
        accentText: 'text-cyan-400',
        dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
        spotlightBorder: 'rgba(6, 182, 212, 0.5)',
        spotlightGlow: 'rgba(6, 182, 212, 0.08)',
      };
    case 'S':
      return {
        badge: 'bg-teal-500/15 text-teal-300 border-teal-400/40 shadow-[0_0_12px_rgba(20,184,166,0.3)]',
        bar: 'from-teal-500 via-emerald-400 to-cyan-300',
        glow: 'shadow-[0_0_28px_rgba(20,184,166,0.25)]',
        cardBorder: 'border-teal-500/35',
        pill: 'bg-teal-500/20 text-teal-300 border-teal-400/50 shadow-[0_0_20px_rgba(20,184,166,0.35)]',
        accentText: 'text-teal-400',
        dot: 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]',
        spotlightBorder: 'rgba(20, 184, 166, 0.5)',
        spotlightGlow: 'rgba(20, 184, 166, 0.08)',
      };
    case 'A+':
      return {
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
        bar: 'from-emerald-500 via-teal-400 to-green-300',
        glow: 'shadow-[0_0_28px_rgba(16,185,129,0.2)]',
        cardBorder: 'border-emerald-500/35',
        pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
        accentText: 'text-emerald-400',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        spotlightBorder: 'rgba(16, 185, 129, 0.45)',
        spotlightGlow: 'rgba(16, 185, 129, 0.08)',
      };
    case 'A':
      return {
        badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        bar: 'from-emerald-600 via-emerald-500 to-teal-400',
        glow: 'shadow-[0_0_24px_rgba(16,185,129,0.18)]',
        cardBorder: 'border-emerald-500/25',
        pill: 'bg-emerald-600/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_16px_rgba(16,185,129,0.25)]',
        accentText: 'text-emerald-400',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
        spotlightBorder: 'rgba(16, 185, 129, 0.35)',
        spotlightGlow: 'rgba(16, 185, 129, 0.06)',
      };
    case 'B':
      return {
        badge: 'bg-amber-500/15 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
        bar: 'from-amber-500 via-amber-400 to-yellow-300',
        glow: 'shadow-[0_0_28px_rgba(245,158,11,0.2)]',
        cardBorder: 'border-amber-500/35',
        pill: 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.35)]',
        accentText: 'text-amber-400',
        dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
        spotlightBorder: 'rgba(245, 158, 11, 0.45)',
        spotlightGlow: 'rgba(245, 158, 11, 0.08)',
      };
    case 'C':
      return {
        badge: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
        bar: 'from-orange-600 via-orange-500 to-amber-500',
        glow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
        cardBorder: 'border-orange-500/20',
        pill: 'bg-orange-600/15 text-orange-300 border-orange-500/35 shadow-[0_0_14px_rgba(249,115,22,0.25)]',
        accentText: 'text-orange-400',
        dot: 'bg-orange-400 shadow-[0_0_6px_#fb923c]',
        spotlightBorder: 'rgba(249, 115, 22, 0.35)',
        spotlightGlow: 'rgba(249, 115, 22, 0.06)',
      };
    default:
      return {
        badge: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
        bar: 'from-rose-600 via-rose-500 to-red-400',
        glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
        cardBorder: 'border-rose-500/20',
        pill: 'bg-rose-600/15 text-rose-300 border-rose-500/35 shadow-[0_0_14px_rgba(244,63,94,0.25)]',
        accentText: 'text-rose-400',
        dot: 'bg-rose-400 shadow-[0_0_6px_#f43f5e]',
        spotlightBorder: 'rgba(244, 63, 94, 0.35)',
        spotlightGlow: 'rgba(244, 63, 94, 0.06)',
      };
  }
};

// Stat Card component with interactive cursor spotlight and smooth gauge
const StatCard: React.FC<{ stat: EvaluatedStat; lang: 'ru' | 'en' }> = ({ stat, lang }) => {
  const gradeTheme = getGradeStyle(stat.grade);
  const isBuff = stat.positive;
  const formattedValue = `${isBuff ? '+' : '-'}${stat.normalized_value}${stat.unit}`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="group relative p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#070b14]/90 backdrop-blur-xl border border-slate-200 dark:border-white/[0.07] hover:border-transparent transition-all duration-300 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:shadow-xl dark:hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* 1. Interactive Spotlight border beam */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(280px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${gradeTheme.spotlightBorder}, transparent 80%)`,
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1.5px',
        }}
      />

      {/* 2. Interactive Spotlight surface ambient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(220px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${gradeTheme.spotlightGlow}, transparent 80%)`,
        }}
      />

      {/* Subtle top edge grade glow on hover */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] opacity-40 group-hover:opacity-100 bg-gradient-to-r ${gradeTheme.bar} transition-opacity duration-300`}
      />

      <div className="relative z-10">
        {/* Header: Stat name & formatted big value */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBuff ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400 shadow-[0_0_8px_#f43f5e]'
                }`}
              />
              <h3 className="font-comfortaa font-bold text-sm sm:text-base text-slate-800 dark:text-slate-200 tracking-wide">
                {lang === 'ru' ? stat.name_ru : stat.name_en}
              </h3>
            </div>
            <span className="font-jetbrains font-extrabold text-2xl sm:text-3xl tracking-tight text-slate-900 dark:text-white">
              {formattedValue}
            </span>
          </div>

          {/* Grade pill badge */}
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`px-3 py-1 rounded-xl font-comfortaa font-extrabold text-sm sm:text-base border backdrop-blur-md ${gradeTheme.badge}`}
            >
              {stat.grade}
            </span>
            <span className="font-jetbrains text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {stat.effective_quality_pct}%
            </span>
          </div>
        </div>

        {/* Quality Progress Gauge */}
        <div className="mt-4 mb-4">
          <div className="flex justify-between items-center text-[11px] font-jetbrains text-slate-400 dark:text-slate-500 mb-2">
            <span>
              Min {stat.min_possible}
              {stat.unit}
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/[0.05]">
              Avg {stat.avg_possible}
              {stat.unit}
            </span>
            <span>
              Max {stat.max_possible}
              {stat.unit}
            </span>
          </div>

          {/* Track */}
          <div className="relative w-full h-2 rounded-full bg-slate-100 dark:bg-[#03060c] border border-slate-200/50 dark:border-white/[0.05] overflow-hidden">
            {/* Gauge fill with smooth spring easing */}
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradeTheme.bar} transition-all duration-700 ease-out`}
              style={{ width: `${Math.max(4, Math.min(100, stat.raw_perfectness_pct))}%` }}
            />
            {/* Center midpoint marker (50% average baseline) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/40 pointer-events-none z-10" />
          </div>
        </div>
      </div>

      {/* Footer Analytics */}
      <div className="relative z-10 flex items-center justify-between pt-3.5 border-t border-slate-100 dark:border-white/[0.06] text-xs font-onest text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'ru' ? 'Отклонение:' : 'Deviation:'}</span>
          <strong
            className={`font-jetbrains px-2 py-0.5 rounded-md text-[11px] ${
              stat.deviation_pct >= 0
                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
            }`}
          >
            {stat.deviation_pct > 0 ? `+${stat.deviation_pct}%` : `${stat.deviation_pct}%`}
          </strong>
        </span>

        <span className="flex items-center gap-1.5">
          <span>{lang === 'ru' ? 'Сила ролла:' : 'Roll index:'}</span>
          <strong className="font-jetbrains text-slate-800 dark:text-slate-200 font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04]">
            {stat.raw_perfectness_pct}%
          </strong>
        </span>
      </div>
    </div>
  );
};

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

  // Hardware-accelerated cursor position tracking for Overview Card
  const handleOverviewMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const overallGradeTheme = evaluation ? getGradeStyle(evaluation.overall_grade) : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* 1. Header Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <h1 className="font-comfortaa font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-wide">
              {lang === 'ru' ? 'Оценка модов разлома' : 'Riven Mod Appraisal'}
            </h1>
          </div>
          <p className="font-onest text-sm text-slate-600 dark:text-slate-400">
            {lang === 'ru'
              ? 'Точная оценка роллов AlecaFrame & Semlar • Единая синергия 4/5 (1.20) • Поддержка Вирус, Взрыв, Коррозия, Слабые места'
              : 'Precise AlecaFrame & Semlar roll grading • Unified 4/5 (1.20) Synergy • Supports Viral, Blast, Corrosive, Weakpoint stats'}
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300 dark:border-white/[0.08] text-xs font-comfortaa">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="font-bold text-slate-700 dark:text-slate-300">
            {lang === 'ru' ? 'Синергия 4/5 (1.20) • Новые характеристики' : 'Synergy 4/5 (1.20) • New Attributes'}
          </span>
        </div>
      </div>

      {/* 2. Main Search & Input Bar */}
      <div className="mb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEvaluate();
          }}
          className="group relative flex items-center rounded-2xl bg-white dark:bg-[#070b14]/90 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] hover:border-cyan-500/40 focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-500/15 shadow-sm dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-300"
        >
          <div className="absolute left-4 pointer-events-none text-slate-400 dark:text-cyan-400/80">
            <Search className="w-5 h-5" />
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
            className="w-full pl-12 pr-32 sm:pr-40 py-3.5 sm:py-4 rounded-2xl bg-transparent text-slate-900 dark:text-white font-onest text-sm sm:text-base outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                setErrorMsg(null);
              }}
              className="absolute right-28 sm:right-36 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 sm:right-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-comfortaa font-bold text-xs sm:text-sm tracking-wider shadow-[0_0_18px_rgba(6,182,212,0.35)] hover:shadow-[0_0_26px_rgba(6,182,212,0.55)] active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
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
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-onest text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 3. Evaluation Result Container */}
      {evaluation && overallGradeTheme && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* A. Rank Mismatch Alert */}
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
          <div
            onMouseMove={handleOverviewMouseMove}
            className="group relative p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#070b14]/90 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] hover:border-transparent transition-all duration-300 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden select-none"
          >
            {/* Interactive Spotlight border beam */}
            <div
              className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(350px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${overallGradeTheme.spotlightBorder}, transparent 80%)`,
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMaskComposite: 'xor',
                padding: '1.5px',
              }}
            />

            {/* Ambient Background Radial Glow */}
            <div
              className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 bg-gradient-to-bl ${overallGradeTheme.bar}`}
            />

            {/* Left: Weapon and Mod Identification */}
            <div className="flex items-start gap-4 sm:gap-5 z-10">
              {evaluation.icon_url ? (
                <img
                  src={resolveAssetUrl(evaluation.icon_url)}
                  alt={evaluation.weapon_name_en}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl p-2 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] shadow-inner shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Shield className="w-8 h-8 text-cyan-400" />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h2 className="font-comfortaa font-bold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-wide">
                    {lang === 'ru' ? evaluation.weapon_name_ru : evaluation.weapon_name_en}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {evaluation.weapon_class}
                  </span>
                </div>

                {evaluation.mod_info && (
                  <div className="font-comfortaa font-bold text-base sm:text-lg text-amber-500 dark:text-amber-300/90 mb-2.5">
                    {evaluation.mod_info.name}
                  </div>
                )}

                {/* Mod badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-onest text-slate-600 dark:text-slate-400">
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] font-mono text-[11px]">
                    {lang === 'ru' ? 'Ранг' : 'Rank'} {evaluation.effective_rank}/8
                  </span>
                  {evaluation.mod_info && (
                    <>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] font-mono text-[11px]">
                        {evaluation.mod_info.rerolls} {lang === 'ru' ? 'роллов' : 'rolls'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] font-mono text-[11px]">
                        MR {evaluation.mod_info.mastery_level}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] capitalize font-mono text-[11px]">
                        {evaluation.mod_info.polarity}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Sleek Overall Grade & Quality HUD */}
            <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-white/[0.06] z-10">
              <div
                className={`px-5 py-3.5 rounded-2xl border backdrop-blur-md flex items-center gap-4.5 bg-slate-100/80 dark:bg-black/40 ${overallGradeTheme.cardBorder} ${overallGradeTheme.glow}`}
              >
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-onest font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {lang === 'ru' ? 'Качество ролла' : 'Overall Quality'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-jetbrains font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
                      {evaluation.overall_score_pct}
                    </span>
                    <span className="font-jetbrains text-sm font-semibold text-slate-500 dark:text-slate-400">%</span>
                  </div>
                </div>

                <div className="h-10 w-[1px] bg-slate-300 dark:bg-white/10" />

                {/* Grade Letter Emblem */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center font-comfortaa font-extrabold text-3xl sm:text-4xl select-none ${overallGradeTheme.pill}`}
                >
                  {evaluation.overall_grade}
                </div>
              </div>
            </div>
          </div>

          {/* C. Weapon Variants & Seller Information Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#070b14]/90 backdrop-blur-xl border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Weapon Variants Selector */}
            <div className="flex flex-wrap items-center gap-2.5">
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-comfortaa font-semibold transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_14px_rgba(6,182,212,0.25)] scale-[1.02]'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-white/[0.06]'
                      }`}
                    >
                      {v.name} <span className="opacity-75 font-jetbrains font-normal text-[11px]">({v.disposition})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seller & Whisper info */}
            {evaluation.seller_info && (
              <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-white/[0.06]">
                {evaluation.seller_info.price !== null && (
                  <div className="flex items-center gap-1.5 font-jetbrains font-bold text-base text-slate-900 dark:text-white px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                    <PlatinumIcon className="w-4 h-4 text-cyan-400" />
                    <span>{evaluation.seller_info.price}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      evaluation.seller_info.status === 'ingame'
                        ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : evaluation.seller_info.status === 'online'
                        ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span className="font-onest text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {evaluation.seller_info.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWhisper}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] text-slate-800 dark:text-slate-200 text-xs font-comfortaa font-semibold border border-slate-200 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95"
                >
                  {isCopiedWhisper ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
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

          {/* D. Individual Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {evaluation.stats.map((stat) => (
              <StatCard key={stat.url_name} stat={stat} lang={lang} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
