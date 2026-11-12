import React, { useState } from 'react';
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
}

// Clean, disciplined color tokens for grades (no heavy frames/boxes)
const getGradeStyle = (grade: string): GradeTheme => {
  switch (grade) {
    case 'S+':
    case 'S':
      return {
        bar: 'from-cyan-500 to-teal-400',
        accentText: 'text-cyan-400',
      };
    case 'A+':
    case 'A':
      return {
        bar: 'from-emerald-500 to-teal-400',
        accentText: 'text-emerald-400',
      };
    case 'B':
      return {
        bar: 'from-amber-500 to-yellow-400',
        accentText: 'text-amber-400',
      };
    case 'C':
      return {
        bar: 'from-orange-500 to-amber-500',
        accentText: 'text-orange-400',
      };
    default:
      return {
        bar: 'from-rose-500 to-red-400',
        accentText: 'text-rose-400',
      };
  }
};

// Clean Stat Card: frameless grades, sleek track, no clunky boxes
const StatCard: React.FC<{ stat: EvaluatedStat; lang: 'ru' | 'en' }> = ({ stat, lang }) => {
  const gradeTheme = getGradeStyle(stat.grade);
  const isBuff = stat.positive;
  const formattedValue = `${isBuff ? '+' : '-'}${stat.normalized_value}${stat.unit}`;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#080c14] border border-white/[0.06] flex flex-col justify-between">
      <div>
        {/* Header: Stat name & formatted big value + frameless grade */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBuff ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <h3 className="font-comfortaa font-medium text-sm text-slate-300 tracking-wide">
                {lang === 'ru' ? stat.name_ru : stat.name_en}
              </h3>
            </div>
            <span className="font-jetbrains font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
              {formattedValue}
            </span>
          </div>

          {/* Clean frameless grade display */}
          <div className="flex flex-col items-end">
            <span className={`font-comfortaa font-black text-2xl sm:text-3xl leading-none ${gradeTheme.accentText}`}>
              {stat.grade}
            </span>
            <span className="font-jetbrains text-[11px] font-semibold text-slate-400 mt-1">
              {stat.effective_quality_pct}%
            </span>
          </div>
        </div>

        {/* Quality Progress Gauge */}
        <div className="mt-4 mb-4">
          <div className="flex justify-between items-center text-[11px] font-jetbrains text-slate-400 mb-1.5">
            <span>
              Min {stat.min_possible}
              {stat.unit}
            </span>
            <span className="text-slate-300 font-medium">
              Avg {stat.avg_possible}
              {stat.unit}
            </span>
            <span>
              Max {stat.max_possible}
              {stat.unit}
            </span>
          </div>

          {/* Track */}
          <div className="relative w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradeTheme.bar} transition-all duration-700 ease-out`}
              style={{ width: `${Math.max(3, Math.min(100, stat.raw_perfectness_pct))}%` }}
            />
            {/* Center midpoint marker (50% average baseline) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-white/30 pointer-events-none z-10" />
          </div>
        </div>
      </div>

      {/* Footer Analytics */}
      <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.06] text-xs font-onest text-slate-400">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'ru' ? 'Отклонение:' : 'Deviation:'}</span>
          <strong
            className={`font-jetbrains ${
              stat.deviation_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {stat.deviation_pct > 0 ? `+${stat.deviation_pct}%` : `${stat.deviation_pct}%`}
          </strong>
        </span>

        <span className="flex items-center gap-1.5">
          <span>{lang === 'ru' ? 'Сила ролла:' : 'Roll index:'}</span>
          <strong className="font-jetbrains text-slate-200">
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
          <p className="font-onest text-sm text-slate-400">
            {lang === 'ru'
              ? 'Точная оценка роллов AlecaFrame & Semlar • Единая синергия 4/5 (1.20) • Поддержка Вирус, Взрыв, Коррозия, Слабые места'
              : 'Precise AlecaFrame & Semlar roll grading • Unified 4/5 (1.20) Synergy • Supports Viral, Blast, Corrosive, Weakpoint stats'}
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-comfortaa">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="font-semibold text-slate-300">
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
          className="relative flex items-center rounded-xl bg-[#080c14] border border-white/[0.08] focus-within:border-cyan-500/50 transition-colors"
        >
          <div className="absolute left-4 pointer-events-none text-slate-400">
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
            className="w-full pl-11 pr-28 py-3 rounded-xl bg-transparent text-white font-onest text-sm outline-none placeholder:text-slate-500"
          />

          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                setErrorMsg(null);
              }}
              className="absolute right-24 p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-comfortaa font-bold text-xs tracking-wider transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5"
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

          {/* B. Overview Card (Frameless, clean typography) */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#080c14] border border-white/[0.06] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Left: Weapon and Mod Identification */}
            <div className="flex items-start gap-4 sm:gap-5">
              {evaluation.icon_url ? (
                <img
                  src={resolveAssetUrl(evaluation.icon_url)}
                  alt={evaluation.weapon_name_en}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl p-2 bg-white/[0.03] border border-white/[0.06] shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                  <Shield className="w-8 h-8 text-slate-400" />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h2 className="font-comfortaa font-bold text-xl sm:text-2xl text-white tracking-wide">
                    {lang === 'ru' ? evaluation.weapon_name_ru : evaluation.weapon_name_en}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    {evaluation.weapon_class}
                  </span>
                </div>

                {evaluation.mod_info && (
                  <div className="font-comfortaa font-bold text-base sm:text-lg text-amber-300 mb-2.5">
                    {evaluation.mod_info.name}
                  </div>
                )}

                {/* Mod badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-onest text-slate-400">
                  <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono text-[11px]">
                    {lang === 'ru' ? 'Ранг' : 'Rank'} {evaluation.effective_rank}/8
                  </span>
                  {evaluation.mod_info && (
                    <>
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono text-[11px]">
                        {evaluation.mod_info.rerolls} {lang === 'ru' ? 'роллов' : 'rolls'}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] font-mono text-[11px]">
                        MR {evaluation.mod_info.mastery_level}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] capitalize font-mono text-[11px]">
                        {evaluation.mod_info.polarity}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Clean Frameless Overall Grade (No boxes, no borders) */}
            <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-white/[0.06]">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-onest font-medium uppercase tracking-wider text-slate-400">
                  {lang === 'ru' ? 'Качество ролла' : 'Overall Quality'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-jetbrains font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                    {evaluation.overall_score_pct}
                  </span>
                  <span className="font-jetbrains text-sm font-semibold text-slate-400">%</span>
                </div>
              </div>

              <span className={`font-comfortaa font-black text-4xl sm:text-5xl leading-none ${overallGradeTheme.accentText}`}>
                {evaluation.overall_grade}
              </span>
            </div>
          </div>

          {/* C. Weapon Variants & Seller Information Bar */}
          <div className="p-4 rounded-2xl bg-[#080c14] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Weapon Variants Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-comfortaa font-semibold text-slate-400">
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
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 border border-white/[0.06]'
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
                    <PlatinumIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{evaluation.seller_info.price}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      evaluation.seller_info.status === 'ingame'
                        ? 'bg-emerald-400'
                        : evaluation.seller_info.status === 'online'
                        ? 'bg-cyan-400'
                        : 'bg-slate-500'
                    }`}
                  />
                  <span className="font-onest text-xs font-semibold text-slate-300">
                    {evaluation.seller_info.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWhisper}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-comfortaa font-semibold border border-white/[0.08] transition-all cursor-pointer active:scale-95"
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
