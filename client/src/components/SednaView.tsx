import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArcaneItem } from '../types/arcane';
import { ArcaneCard } from './ArcaneCard';
import { PlatinumIcon } from './PlatinumIcon';
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
} from 'lucide-react';

interface SednaViewProps {
  arcanes: ArcaneItem[];
  onOpenDetails: (arcane: ArcaneItem) => void;
  lang: 'ru' | 'en';
}

type SortOption = 'volume24h' | 'priceR5Asc' | 'priceR5Desc' | 'priceR0Asc' | 'snipeDiscount' | 'name';

export const SednaView: React.FC<SednaViewProps> = ({
  arcanes,
  onOpenDetails,
  lang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('volume24h');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination State (Optimized: default 24 items per page = 6 clean 4-col rows)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset to page 1 whenever search, sort, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, pageSize]);

  const sortOptions: { id: SortOption; labelRu: string; labelEn: string }[] = [
    { id: 'volume24h', labelRu: 'Сделки 24ч (наибольший объем)', labelEn: '24h Trades volume' },
    { id: 'priceR5Desc', labelRu: 'Цена Max (сначала дорогие)', labelEn: 'Price Max (high to low)' },
    { id: 'priceR5Asc', labelRu: 'Цена Max (сначала дешевые)', labelEn: 'Price Max (low to high)' },
    { id: 'priceR0Asc', labelRu: 'Цена Ранг 0 (сначала дешевые)', labelEn: 'Price Rank 0 (low to high)' },
    { id: 'snipeDiscount', labelRu: 'Снайпинг выгода (% от медианы)', labelEn: 'Snipe deviation (%)' },
    { id: 'name', labelRu: 'По названию (А-Я)', labelEn: 'Name (A-Z)' },
  ];

  const currentSortLabel = sortOptions.find((o) => o.id === sortBy);

  // Filter and Sort logic
  const filteredArcanes = useMemo(() => {
    return arcanes
      .filter((item) => {
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const matchEn = item.name.toLowerCase().includes(query);
          const matchRu = (item.nameRu || '').toLowerCase().includes(query);
          const matchSlug = item.urlName.toLowerCase().includes(query);
          return matchEn || matchRu || matchSlug;
        }
        return true;
      })
      .sort((a, b) => {
        const medA = a.rank5.avgPrice || a.rank5.minPrice || 1;
        const medB = b.rank5.avgPrice || b.rank5.minPrice || 1;
        const devA = ((a.rank5.minPrice - medA) / medA) * 100;
        const devB = ((b.rank5.minPrice - medB) / medB) * 100;

        switch (sortBy) {
          case 'volume24h':
            return (b.volume24h || b.trades24h || 0) - (a.volume24h || a.trades24h || 0);
          case 'priceR5Asc':
            return a.rank5.minPrice - b.rank5.minPrice;
          case 'priceR5Desc':
            return b.rank5.minPrice - a.rank5.minPrice;
          case 'priceR0Asc':
            return a.rank0.minPrice - b.rank0.minPrice;
          case 'snipeDiscount':
            return devA - devB;
          case 'name':
            const nameA = lang === 'ru' && a.nameRu ? a.nameRu : a.name;
            const nameB = lang === 'ru' && b.nameRu ? b.nameRu : b.name;
            return nameA.localeCompare(nameB);
          default:
            return 0;
        }
      });
  }, [arcanes, searchQuery, sortBy, lang]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredArcanes.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedArcanes = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredArcanes.slice(startIdx, startIdx + pageSize);
  }, [filteredArcanes, safeCurrentPage, pageSize]);

  const startItem = filteredArcanes.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, filteredArcanes.length);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) return;
    setCurrentPage(page);
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safeCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-6 sm:px-10 py-8 space-y-6 select-none font-mono">
      
      {/* Scroll anchor for smooth page transitions */}
      <div ref={catalogTopRef} className="scroll-mt-4" />

      {/* Modern Filter & Controls Toolbar */}
      <div className="bg-[#141518] border border-white/[0.08] p-5 rounded-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl">
        
        {/* Left: Search Box & МИСТИФИКАТОРЫ Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[280px] sm:min-w-[360px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a3a29d]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ru' ? 'Поиск мистификатора (RU / EN)...' : 'Search arcane (RU / EN)...'}
              className="w-full pl-10 pr-9 py-2.5 bg-[#0e0f11] border border-white/[0.1] focus:border-[#00e5ff] rounded-xl text-sm font-mono text-white placeholder-[#6b6a66] outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#a3a29d] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Single Clean МИСТИФИКАТОРЫ Badge */}
          <div className="flex items-center">
            <span className="px-4 py-2 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 text-[#34d399] text-xs font-mono font-semibold uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              {lang === 'ru' ? 'МИСТИФИКАТОРЫ' : 'ARCANES'}
            </span>
          </div>
        </div>

        {/* Right: Matches counter & Page, Custom Sort Dropdown, Layout Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
          
          {/* Matches & Page Count */}
          <div className="text-xs font-mono text-[#a3a29d] px-3.5 py-2 rounded-xl bg-[#0e0f11] border border-white/[0.08] flex items-center gap-2">
            <span>
              {lang === 'ru' ? 'НАЙДЕНО:' : 'MATCHES:'}{' '}
              <strong className="text-[#00e5ff] font-semibold">{filteredArcanes.length}</strong>
            </span>
            {totalPages > 1 && (
              <>
                <span className="text-[#52525b]">|</span>
                <span className="text-white font-medium">{lang === 'ru' ? 'СТР.' : 'PAGE'} {safeCurrentPage}/{totalPages}</span>
              </>
            )}
          </div>

          {/* Modern Custom Sort Dropdown Modal */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0e0f11] hover:bg-[#1a2332] border border-white/[0.1] hover:border-[#00e5ff]/50 text-xs font-mono text-white transition-all shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="hidden sm:inline text-[#a3a29d]">
                {lang === 'ru' ? 'Сортировка:' : 'Sort:'}
              </span>
              <span className="font-medium text-white max-w-[160px] truncate">
                {lang === 'ru' ? currentSortLabel?.labelRu : currentSortLabel?.labelEn}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#a3a29d] transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Dropdown Modal / Popover */}
            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0e1014] border border-white/[0.15] rounded-xl shadow-2xl p-2 z-40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-[#a3a29d] border-b border-white/[0.06] mb-1">
                  {lang === 'ru' ? 'Сортировать по:' : 'Sort items by:'}
                </div>

                <div className="space-y-1">
                  {sortOptions.map((opt) => {
                    const isSelected = opt.id === sortBy;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSortBy(opt.id);
                          setIsSortOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-colors text-left ${
                          isSelected
                            ? 'bg-[#00e5ff]/15 text-[#00e5ff] font-semibold'
                            : 'text-[#cbd5e1] hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <span>{lang === 'ru' ? opt.labelRu : opt.labelEn}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#00e5ff] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center border border-white/[0.08] rounded-xl bg-[#0e0f11] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#141518] text-[#00e5ff] shadow-sm'
                  : 'text-[#a3a29d] hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#141518] text-[#00e5ff] shadow-sm'
                  : 'text-[#a3a29d] hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Content: Paginated Grid or Table (Lightning-Fast Rendering) */}
      {filteredArcanes.length === 0 ? (
        <div className="bg-[#141518] border border-white/[0.08] rounded-2xl p-16 text-center">
          <p className="text-base font-mono text-[#a3a29d]">
            {lang === 'ru' ? 'Мистификаторы не найдены. Измените параметры поиска.' : 'No arcanes found matching your query.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {paginatedArcanes.map((arcane) => (
            <ArcaneCard
              key={arcane.urlName || arcane.id}
              arcane={arcane}
              onOpenDetails={onOpenDetails}
              lang={lang}
            />
          ))}
        </div>
      ) : (
        <div className="w-full bg-[#141518] border border-white/[0.08] rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left border-collapse text-sm font-mono">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0e0f11] text-xs text-[#a3a29d] uppercase select-none">
                <th className="py-4 px-5">{lang === 'ru' ? 'МИСТИФИКАТОР' : 'ARCANE'}</th>
                <th className="py-4 px-5 text-right">{lang === 'ru' ? 'РАНГ 0 (МИН / СРЕД)' : 'RANK 0 (MIN / AVG)'}</th>
                <th className="py-4 px-5 text-right">{lang === 'ru' ? 'РАНГ MAX (МИН / СРЕД)' : 'MAX RANK (MIN / AVG)'}</th>
                <th className="py-4 px-5 text-right">{lang === 'ru' ? 'КРАФТ N×R0' : 'CRAFT N×R0'}</th>
                <th className="py-4 px-5 text-right">{lang === 'ru' ? 'ОТКЛ. МЕД.' : 'DEV.'}</th>
                <th className="py-4 px-5 text-right">{lang === 'ru' ? 'СДЕЛОК 24Ч' : '24H TRADES'}</th>
                <th className="py-4 px-5 text-center">{lang === 'ru' ? 'ДЕЙСТВИЯ' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedArcanes.map((arcane) => {
                const maxRank = (arcane as any).maxRank || 5;
                const copiesNeeded = ((maxRank + 1) * (maxRank + 2)) / 2;
                const craftCost = copiesNeeded * arcane.rank0.minPrice;
                const craftDiff = arcane.rank5.minPrice - craftCost;
                const median5 = arcane.rank5.avgPrice || arcane.rank5.minPrice;
                const snipeDev = median5 > 0 ? Math.round(((arcane.rank5.minPrice - median5) / median5) * 100) : 0;
                const displayName = lang === 'ru' && arcane.nameRu ? arcane.nameRu : arcane.name;

                return (
                  <tr
                    key={arcane.urlName || arcane.id}
                    onClick={() => onOpenDetails(arcane)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={arcane.icon}
                          alt={displayName}
                          className="w-10 h-10 object-contain shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0">
                          <span className="font-raleway text-base font-semibold text-white group-hover:text-[#00e5ff] transition-colors block truncate">
                            {displayName}
                          </span>
                          <span className="text-xs text-[#10b981] block truncate">
                            MAX R{maxRank}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="text-white font-semibold text-base">
                        {arcane.rank0.minPrice} <PlatinumIcon size={12} className="text-[#00e5ff] inline" />
                      </div>
                      <div className="text-xs text-[#a3a29d]">
                        ср: {arcane.rank0.avgPrice}
                      </div>
                    </td>

                    <td className="py-3 px-5 text-right">
                      <div className="text-[#00e5ff] font-bold text-base">
                        {arcane.rank5.minPrice} <PlatinumIcon size={12} className="text-[#00e5ff] inline" />
                      </div>
                      <div className="text-xs text-[#a3a29d]">
                        ср: {arcane.rank5.avgPrice}
                      </div>
                    </td>

                    <td className="py-3 px-5 text-right text-xs">
                      <div className="text-white">{copiesNeeded}× = {craftCost}п</div>
                      <div className={craftDiff > 0 ? 'text-[#34d399] font-medium' : 'text-[#00e5ff]'}>
                        {craftDiff > 0 ? `+${craftDiff}п выгода` : `готовый дешевле`}
                      </div>
                    </td>

                    <td className="py-3 px-5 text-right font-semibold">
                      <span className={snipeDev <= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}>
                        {snipeDev > 0 ? `+${snipeDev}%` : `${snipeDev}%`}
                      </span>
                    </td>

                    <td className="py-3 px-5 text-right text-sm text-[#e2e8f0]">
                      {arcane.trades24h || arcane.volume24h || 0}
                    </td>

                    <td className="py-3 px-5 text-center">
                      <a
                        href={`https://warframe.market/items/${arcane.urlName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-lg bg-[#0e0f11] hover:bg-[#10b981]/20 border border-[#10b981]/40 hover:border-[#10b981] text-xs font-mono text-[#34d399] transition-all inline-flex items-center gap-1"
                        title="Открыть на warframe.market"
                      >
                        <span>WFM</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* High-Performance Pagination Bar */}
      {filteredArcanes.length > 0 && totalPages > 1 && (
        <div className="bg-[#141518] border border-white/[0.08] p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl select-none font-mono mt-8">
          
          {/* Left: Range and Item counter */}
          <div className="text-xs text-[#a3a29d] flex items-center gap-2">
            <span>
              {lang === 'ru' ? 'Показано' : 'Showing'}{' '}
              <strong className="text-white font-semibold">{startItem}–{endItem}</strong>{' '}
              {lang === 'ru' ? 'из' : 'of'}{' '}
              <strong className="text-[#00e5ff] font-semibold">{filteredArcanes.length}</strong>
            </span>
          </div>

          {/* Center: Numeric Page Buttons with Prev / Next */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* First Page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl bg-[#0e0f11] border border-white/[0.08] text-[#a3a29d] hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title={lang === 'ru' ? 'Первая страница' : 'First page'}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="p-2 rounded-xl bg-[#0e0f11] border border-white/[0.08] text-[#a3a29d] hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title={lang === 'ru' ? 'Предыдущая страница' : 'Previous page'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-[#64748b]">
                    ...
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`min-w-[38px] h-9 px-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#00e5ff] text-[#070a0e] shadow-[0_0_15px_rgba(0,229,255,0.45)] font-bold scale-105'
                      : 'bg-[#0e0f11] text-[#a3a29d] hover:text-white hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next Page */}
            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl bg-[#0e0f11] border border-white/[0.08] text-[#a3a29d] hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title={lang === 'ru' ? 'Следующая страница' : 'Next page'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-2 rounded-xl bg-[#0e0f11] border border-white/[0.08] text-[#a3a29d] hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title={lang === 'ru' ? 'Последняя страница' : 'Last page'}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Items per page selector */}
          <div className="flex items-center gap-2 text-xs text-[#a3a29d]">
            <span>{lang === 'ru' ? 'На странице:' : 'Per page:'}</span>
            <div className="flex items-center gap-1 bg-[#0e0f11] p-1 rounded-xl border border-white/[0.08]">
              {[24, 48, 96].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    pageSize === size
                      ? 'bg-[#00e5ff]/20 text-[#00e5ff] font-bold border border-[#00e5ff]/40'
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
