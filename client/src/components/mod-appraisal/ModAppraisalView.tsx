import React, { useState, useEffect } from 'react';
import {
  Search,
  Copy,
  Check,
  AlertTriangle,
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
  bar: string;
  accentText: string;
  badgeBg: string;
  badgeBorder: string;
  glow: string;
}

// Clean, disciplined color tokens for grades with glowing holographic badges
const getGradeStyle = (grade: string): GradeTheme => {
  switch (grade) {
    case 'S+':
    case 'S':
      return {
        bar: 'from-[#67E8F9] via-[#2DD4BF] to-[#34D399]',
        accentText: 'text-[#5EEAD4]',
        badgeBg: 'bg-[#2DD4BF]/15',
        badgeBorder: 'border-[#2DD4BF]/40',
        glow: 'shadow-[0_0_20px_rgba(45,212,191,0.3)]',
      };
    case 'A+':
    case 'A':
      return {
        bar: 'from-[#34D399] via-[#4ADE80] to-[#6EE7B7]',
        accentText: 'text-[#4ADE80]',
        badgeBg: 'bg-emerald-500/15',
        badgeBorder: 'border-emerald-400/35',
        glow: 'shadow-[0_0_18px_rgba(74,222,128,0.28)]',
      };
    case 'B':
      return {
        bar: 'from-amber-400 to-yellow-300',
        accentText: 'text-amber-300',
        badgeBg: 'bg-amber-500/15',
        badgeBorder: 'border-amber-400/35',
        glow: 'shadow-[0_0_16px_rgba(245,158,11,0.25)]',
      };
    case 'C':
      return {
        bar: 'from-orange-400 to-amber-400',
        accentText: 'text-orange-300',
        badgeBg: 'bg-orange-500/15',
        badgeBorder: 'border-orange-400/35',
        glow: 'shadow-[0_0_16px_rgba(249,115,22,0.25)]',
      };
    default:
      return {
        bar: 'from-rose-500 to-red-400',
        accentText: 'text-rose-400',
        badgeBg: 'bg-rose-500/15',
        badgeBorder: 'border-rose-400/35',
        glow: 'shadow-[0_0_16px_rgba(244,63,94,0.25)]',
      };
  }
};

// Animated Stat Card: glowing holographic badges, animated progress bar, refined card depth
const StatCard: React.FC<{ stat: EvaluatedStat; lang: 'ru' | 'en'; index?: number }> = ({
  stat,
  lang,
  index = 0,
}) => {
  const gradeTheme = getGradeStyle(stat.grade);
  const isBuff = stat.positive;
  const formattedValue = `${isBuff ? '+' : '-'}${stat.normalized_value}${stat.unit}`;
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPct(Math.max(4, Math.min(100, stat.raw_perfectness_pct)));
    }, 60 + index * 70);
    return () => clearTimeout(timer);
  }, [stat.raw_perfectness_pct, index]);

  return (
    <div
      style={{ animationDelay: `${index * 70}ms` }}
      className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#181A1E]/95 via-[#141519]/95 to-[#101215]/95 border border-white/[0.07] hover:border-[#2DD4BF]/40 flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_rgba(0,0,0,0.45)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(45,212,191,0.1)] transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2 duration-400 relative overflow-hidden"
    >
      {/* Subtle ambient tier glow */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 ${gradeTheme.badgeBg} blur-3xl pointer-events-none rounded-full -mr-10 -mt-10 opacity-35`}
      />

      <div className="relative z-10">
        {/* Header: Stat name & formatted big value + glowing tier badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isBuff
                    ? 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.7)]'
                    : 'bg-[#F87171] shadow-[0_0_8px_rgba(248,113,113,0.7)]'
                }`}
              />
              <h3 className="font-comfortaa font-medium text-sm text-zinc-300 tracking-wide">
                {lang === 'ru' ? stat.name_ru : stat.name_en}
              </h3>
            </div>
            <span className="font-jetbrains font-extrabold text-2xl sm:text-3xl tracking-tight text-white drop-shadow-sm">
              {formattedValue}
            </span>
          </div>

          {/* Glowing grade badge */}
          <div className="flex flex-col items-end">
            <div
              className={`px-3 py-1 rounded-2xl font-comfortaa font-black text-2xl sm:text-3xl leading-none flex items-center justify-center ${gradeTheme.badgeBg} ${gradeTheme.accentText} border ${gradeTheme.badgeBorder} ${gradeTheme.glow} transition-transform group-hover:scale-105 duration-200`}
            >
              {stat.grade}
            </div>
            <span className="font-jetbrains text-[11px] font-semibold text-zinc-400 mt-1.5">
              {stat.effective_quality_pct}%
            </span>
          </div>
        </div>

        {/* Quality Progress Gauge with Smooth Animated Bar */}
        <div className="mt-4 mb-4">
          <div className="flex justify-between items-center text-[11px] font-jetbrains text-zinc-400 mb-1.5">
            <span>
              Min {stat.min_possible}
              {stat.unit}
            </span>
            <span className="text-zinc-300 font-medium">
              Avg {stat.avg_possible}
              {stat.unit}
            </span>
            <span>
              Max {stat.max_possible}
              {stat.unit}
            </span>
          </div>

          {/* Track */}
          <div className="relative w-full h-2 rounded-full bg-white/[0.06] overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradeTheme.bar} transition-all duration-1000 ease-out relative`}
              style={{ width: `${animatedPct}%` }}
            >
              {/* Glowing leading edge */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/80 rounded-full shadow-[0_0_8px_#5EEAD4]" />
            </div>
            {/* Center midpoint marker (50% average baseline) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-white/30 pointer-events-none z-10" />
          </div>
        </div>
      </div>

      {/* Footer Analytics */}
      <div className="relative z-10 flex items-center justify-between pt-3.5 border-t border-white/[0.06] text-xs font-onest text-zinc-400">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>{lang === 'ru' ? 'Отклонение:' : 'Deviation:'}</span>
          <strong
            className={`font-jetbrains ${
              stat.deviation_pct >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'
            }`}
          >
            {stat.deviation_pct > 0 ? `+${stat.deviation_pct}%` : `${stat.deviation_pct}%`}
          </strong>
        </span>

        <span className="flex items-center gap-1.5">
          <span>{lang === 'ru' ? 'Сила ролла:' : 'Roll index:'}</span>
          <strong className="font-jetbrains text-zinc-200">
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

  const overallGradeTheme = evaluation ? getGradeStyle(evaluation.overall_grade) : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* 1. Clean Header (No tacky AI icon badge) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-comfortaa font-bold text-2xl sm:text-3xl text-white tracking-wide mb-1">
            {lang === 'ru' ? 'Оценка модов разлома' : 'Riven Mod Appraisal'}
          </h1>
          <p className="font-onest text-sm text-zinc-400">
            {lang === 'ru'
              ? 'Точная оценка роллов AlecaFrame & Semlar • Единая синергия 4/5 (1.20) • Поддержка Вирус, Взрыв, Коррозия, Слабые места'
              : 'Precise AlecaFrame & Semlar roll grading • Unified 4/5 (1.20) Synergy • Supports Viral, Blast, Corrosive, Weakpoint stats'}
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-full bg-[#141519] border border-white/[0.08] text-xs font-comfortaa">
          <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
          <span className="font-semibold text-zinc-300">
            {lang === 'ru' ? 'Синергия 4/5 (1.20) • Новые характеристики' : 'Synergy 4/5 (1.20) • New Attributes'}
          </span>
        </div>
      </div>

      {/* 2. Compact Search & Input Bar */}
      <div className="mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEvaluate();
          }}
          className="relative flex items-center rounded-2xl bg-[#141519] border border-white/[0.08] focus-within:border-[#2DD4BF]/50 shadow-lg transition-colors"
        >
          <div className="absolute left-4 pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
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
            className="w-full pl-11 pr-40 py-3.5 rounded-2xl bg-transparent text-white font-onest text-sm outline-none placeholder:text-zinc-500"
          />

          <div className="absolute right-2.5 flex items-center gap-2">
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  setErrorMsg(null);
                }}
                className="p-1.5 rounded-xl hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={lang === 'ru' ? 'Очистить' : 'Clear'}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5EEAD4] to-[#34D399] hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-comfortaa font-bold text-xs tracking-wider transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(45,212,191,0.3)] shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === 'ru' ? 'Парсинг...' : 'Parsing...'}</span>
                </>
              ) : (
                <span>{lang === 'ru' ? 'Оценить' : 'Appraise'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="font-onest text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* 3. Evaluation Result Container */}
      {evaluation && overallGradeTheme && (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
          {/* A. Rank Mismatch Alert */}
          {evaluation.rank_mismatch_detected && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
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

          {/* B. Overview Card (Frameless weapon presentation & glowing grade) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#181A1E]/95 via-[#141519]/95 to-[#101215]/95 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.55)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            {/* Ambient Mint Aura */}
            <div className="absolute top-0 left-0 w-80 h-80 bg-[#2DD4BF]/10 blur-3xl pointer-events-none rounded-full -ml-20 -mt-20" />

            {/* Left: Weapon and Mod Identification */}
            <div className="relative z-10 flex items-center gap-5 sm:gap-7 min-w-0">
              {evaluation.icon_url ? (
                <div className="relative shrink-0 flex items-center justify-center">
                  <div className="absolute -inset-3 bg-[#2DD4BF]/15 rounded-full blur-2xl opacity-60 pointer-events-none" />
                  <img
                    src={resolveAssetUrl(evaluation.icon_url)}
                    alt={evaluation.weapon_name_en}
                    className="relative w-28 sm:w-36 h-20 sm:h-24 object-contain shrink-0 drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)] filter hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2DD4BF]/15 to-transparent flex items-center justify-center shrink-0">
                  <Shield className="w-10 h-10 text-[#2DD4BF]" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h2 className="font-comfortaa font-bold text-xl sm:text-2xl text-white tracking-wide truncate">
                    {lang === 'ru' ? evaluation.weapon_name_ru : evaluation.weapon_name_en}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#2DD4BF]/12 text-[#5EEAD4] border border-[#2DD4BF]/30 text-[11px] font-semibold uppercase tracking-wider">
                    {evaluation.weapon_class}
                  </span>
                </div>

                {evaluation.mod_info && (
                  <div className="font-comfortaa font-bold text-base sm:text-lg text-amber-300 mb-2.5">
                    {evaluation.mod_info.name}
                  </div>
                )}

                {/* Mod badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-onest text-zinc-400">
                  <span className="px-2.5 py-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-[11px]">
                    {lang === 'ru' ? 'Ранг' : 'Rank'} {evaluation.effective_rank}/8
                  </span>
                  {evaluation.mod_info && (
                    <>
                      <span className="px-2.5 py-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-[11px]">
                        {evaluation.mod_info.rerolls} {lang === 'ru' ? 'роллов' : 'rolls'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] font-mono text-[11px]">
                        MR {evaluation.mod_info.mastery_level}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-xl bg-white/[0.04] border border-white/[0.08] capitalize font-mono text-[11px]">
                        {evaluation.mod_info.polarity}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Clean Glowing Overall Grade */}
            <div className="relative z-10 flex items-center gap-5 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/[0.08]">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-onest font-medium uppercase tracking-wider text-zinc-400">
                  {lang === 'ru' ? 'Качество ролла' : 'Overall Quality'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-jetbrains font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    {evaluation.overall_score_pct}
                  </span>
                  <span className="font-jetbrains text-sm font-semibold text-zinc-400">%</span>
                </div>
              </div>

              <div
                className={`px-4 py-2 rounded-2xl ${overallGradeTheme.badgeBg} border ${overallGradeTheme.badgeBorder} ${overallGradeTheme.glow} shadow-xl flex items-center justify-center`}
              >
                <span
                  className={`font-comfortaa font-black text-4xl sm:text-5xl leading-none ${overallGradeTheme.accentText}`}
                >
                  {evaluation.overall_grade}
                </span>
              </div>
            </div>
          </div>

          {/* C. Weapon Variants & Seller Information Bar */}
          <div className="p-4 rounded-2xl bg-[#141519] border border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Weapon Variants Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-comfortaa font-semibold text-zinc-400">
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
                          ? 'bg-[#24272D] text-[#5EEAD4] border border-[#2DD4BF]/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] text-zinc-400 border border-white/[0.06]'
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
              <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/[0.06]">
                {evaluation.seller_info.price !== null && (
                  <div className="flex items-center gap-1.5 font-jetbrains font-bold text-sm text-white px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                    <PlatinumIcon className="w-3.5 h-3.5 text-[#2DD4BF]" />
                    <span>{evaluation.seller_info.price}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      evaluation.seller_info.status === 'ingame'
                        ? 'bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]'
                        : evaluation.seller_info.status === 'online'
                        ? 'bg-[#2DD4BF] shadow-[0_0_8px_#2DD4BF]'
                        : 'bg-zinc-500'
                    }`}
                  />
                  <span className="font-onest text-xs font-semibold text-zinc-300">
                    {evaluation.seller_info.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWhisper}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-comfortaa font-semibold border border-white/[0.08] transition-all cursor-pointer active:scale-95"
                >
                  {isCopiedWhisper ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      <span className="text-[#4ADE80]">{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{lang === 'ru' ? 'Шёпот' : 'Whisper'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* D. Individual Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {evaluation.stats.map((stat, i) => (
              <StatCard key={stat.url_name} stat={stat} lang={lang} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
