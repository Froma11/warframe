import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArcaneItem, ItemCategory } from '../types/arcane';
import { ArcaneCard } from './ArcaneCard';
import { PlatinumIcon } from './PlatinumIcon';
import { resolveAssetUrl } from '../utils/assets';
import { prefetchArcaneDetails } from './ArcaneDrawer';
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
  Layers,
  Gem,
  Shield,
  Swords,
} from 'lucide-react';

interface SednaViewProps {
  arcanes: ArcaneItem[];
  onOpenDetails: (arcane: ArcaneItem) => void;
  lang: 'ru' | 'en';
  lastUpdatedMinutes?: number;
}

type MarketCategory = 'all' | 'arcanes' | 'warframes' | 'weapons';
type SortOption = 'volume24h' | 'priceR5Asc' | 'priceR5Desc' | 'priceR0Asc' | 'snipeDiscount' | 'name';

export const SednaView: React.FC<SednaViewProps> = ({
  arcanes,
  onOpenDetails,
  lang,
  lastUpdatedMinutes = 3,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MarketCategory>('arcanes');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('volume24h');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Debounce search query (250ms) to eliminate per-keystroke filter freezes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  // Reset to page 1 whenever search, sort, category or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, sortBy, pageSize, selectedCategory]);

  const sortOptions: { id: SortOption; labelRu: string; labelEn: string }[] = [
    { id: 'volume24h', labelRu: 'Сделки 24ч (наибольший объем)', labelEn: '24h Trades volume' },
    { id: 'priceR5Desc', labelRu: 'Цена (сначала дорогие)', labelEn: 'Price (high to low)' },
    { id: 'priceR5Asc', labelRu: 'Цена (сначала дешевые)', labelEn: 'Price (low to high)' },
    { id: 'name', labelRu: 'По названию (А-Я)', labelEn: 'Name (A-Z)' },
  ];

  const currentSortLabel = sortOptions.find((o) => o.id === sortBy);

  // Filter and Sort logic
  const filteredArcanes = useMemo(() => {
    return arcanes
      .filter((item) => {
        // Category filtering
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'arcanes') {
            if (item.category && item.category !== 'arcane') return false;
            if (item.isSet) return false;
          } else if (selectedCategory === 'warframes') {
            if (item.category !== 'warframe') return false;
          } else if (selectedCategory === 'weapons') {
            if (item.category !== 'weapon') return false;
          }
        }

        // Search filter (RU / EN / Slug) using debounced query
        if (debouncedSearchQuery.trim()) {
          const query = debouncedSearchQuery.toLowerCase().trim();
          const matchEn = item.name.toLowerCase().includes(query);
          const matchRu = (item.nameRu || '').toLowerCase().includes(query);
          const matchSlug = item.urlName.toLowerCase().includes(query);
          return matchEn || matchRu || matchSlug;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = a.isSet ? (a.avgPrice || a.minPrice || 0) : (a.rank5.avgPrice || a.rank5.minPrice || 0);
        const priceB = b.isSet ? (b.avgPrice || b.minPrice || 0) : (b.rank5.avgPrice || b.rank5.minPrice || 0);
        const minA = a.isSet ? (a.minPrice || a.avgPrice || 0) : (a.rank5.minPrice || a.rank5.avgPrice || 0);
        const minB = b.isSet ? (b.minPrice || b.avgPrice || 0) : (b.rank5.minPrice || b.rank5.avgPrice || 0);

        switch (sortBy) {
          case 'volume24h':
            return (b.volume24h || b.trades24h || 0) - (a.volume24h || a.trades24h || 0);
          case 'priceR5Asc':
            return minA - minB;
          case 'priceR5Desc':
            return minB - minA;
          case 'priceR0Asc':
            return (a.rank0?.minPrice || minA) - (b.rank0?.minPrice || minB);
          case 'name':
            const nameA = lang === 'ru' && a.nameRu ? a.nameRu : a.name;
            const nameB = lang === 'ru' && b.nameRu ? b.nameRu : b.name;
            return nameA.localeCompare(nameB);
          default:
            return 0;
        }
      });
  }, [arcanes, searchQuery, sortBy, selectedCategory, lang]);

  // Counts for category badges
  const categoryCounts = useMemo(() => {
    let arcanesCnt = 0;
    let warframesCnt = 0;
    let weaponsCnt = 0;
    for (const item of arcanes) {
      if (item.category === 'warframe') warframesCnt++;
      else if (item.category === 'weapon') weaponsCnt++;
      else arcanesCnt++;
    }
    return { arcanes: arcanesCnt, warframes: warframesCnt, weapons: weaponsCnt };
  }, [arcanes]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredArcanes.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedArcanes = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredArcanes.slice(startIdx, startIdx + pageSize);
  }, [filteredArcanes, safeCurrentPage, pageSize]);

  // Proactive background prefetching for visible cards on current page
  // Guarantees 0ms instant drawer opening on any card click
  useEffect(() => {
    if (!paginatedArcanes || paginatedArcanes.length === 0) return;
    const idleTimer = setTimeout(() => {
      paginatedArcanes.forEach((item) => {
        const slug = item.urlName || (item as any).slug || (item as any).id;
        if (slug) prefetchArcaneDetails(slug);
      });
    }, 120);
    return () => clearTimeout(idleTimer);
  }, [paginatedArcanes]);

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

  const searchPlaceholder = useMemo(() => {
    if (selectedCategory === 'warframes') {
      return lang === 'ru' ? 'Поиск Прайм варфрейма (RU / EN)...' : 'Search Prime Warframe (RU / EN)...';
    }
    if (selectedCategory === 'weapons') {
      return lang === 'ru' ? 'Поиск Прайм оружия (RU / EN)...' : 'Search Prime Weapon (RU / EN)...';
    }
    return lang === 'ru' ? 'Поиск мистификатора (RU / EN)...' : 'Search arcane (RU / EN)...';
  }, [selectedCategory, lang]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-6 select-none font-sans">
      
      {/* Scroll anchor for smooth page transitions */}
      <div ref={catalogTopRef} className="scroll-mt-4" />

      {/* Category Pills Navigation */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        {[
          { id: 'arcanes', labelRu: 'Мистификаторы', labelEn: 'Arcanes', icon: Gem, count: categoryCounts.arcanes },
          { id: 'warframes', labelRu: 'Варфреймы (Прайм)', labelEn: 'Warframes (Prime)', icon: Shield, count: categoryCounts.warframes },
          { id: 'weapons', labelRu: 'Оружие (Прайм)', labelEn: 'Weapons (Prime)', icon: Swords, count: categoryCounts.weapons },
        ].map((tab) => {
          const isActive = selectedCategory === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as MarketCategory)}
              className={`px-4 sm:px-5 py-2.5 rounded-2xl font-comfortaa font-bold text-xs sm:text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#00e5ff]/20 to-emerald-500/20 text-[#0284c7] dark:text-[#00e5ff] border border-[#00e5ff]/60 shadow-[0_0_20px_rgba(0,229,255,0.25)]'
                  : 'bg-white/80 dark:bg-[#070b12]/80 hover:bg-slate-100 dark:hover:bg-[#0e1624] text-slate-600 dark:text-[#a3a29d] border border-slate-200 dark:border-white/[0.08]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#00e5ff]' : 'text-slate-400 dark:text-[#71717a]'}`} />
              <span>{lang === 'ru' ? tab.labelRu : tab.labelEn}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${isActive ? 'bg-[#00e5ff]/20 text-[#0284c7] dark:text-[#00e5ff]' : 'bg-slate-200 dark:bg-white/[0.06] text-slate-500 dark:text-[#71717a]'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Modern Redesigned Filter & Controls Toolbar */}
      <div className="relative z-30 bg-white/95 dark:bg-[#0b1019]/90 border border-slate-200 dark:border-white/[0.1] p-4 sm:p-5 rounded-3xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl backdrop-blur-md transition-colors">
        
        {/* Left: Search Box, Online Counter & Sync Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[260px] sm:min-w-[320px] flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#71717a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-11 pr-10 h-11 sm:h-12 bg-slate-50 dark:bg-[#060a12]/90 border border-slate-200 dark:border-white/[0.12] focus:border-[#00e5ff] rounded-2xl text-sm font-sans text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#71717a] outline-none transition-all shadow-inner focus:ring-1 focus:ring-[#00e5ff]/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-900 dark:text-[#a3a29d] dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* Realtime Market Count */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#00e5ff]/10 dark:bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-xs font-comfortaa font-bold text-[#0284c7] dark:text-[#00e5ff]">
            <Layers className="w-4 h-4 text-[#00e5ff]" />
            <span>
              {filteredArcanes.length}{' '}
              {selectedCategory === 'warframes'
                ? (lang === 'ru' ? 'варфреймов онлайн' : 'warframes online')
                : selectedCategory === 'weapons'
                ? (lang === 'ru' ? 'оружия онлайн' : 'weapons online')
                : (lang === 'ru' ? 'мистификаторов онлайн' : 'arcanes online')}
            </span>
          </div>

          {/* Market Live Sync Telemetry Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#060a12]/90 border border-slate-200 dark:border-white/[0.1] text-xs font-sans text-slate-600 dark:text-[#a3a29d]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">
              {lang === 'ru'
                ? `Синхронизировано: ${lastUpdatedMinutes} мин назад`
                : `Synced: ${lastUpdatedMinutes}m ago`}
            </span>
          </div>
        </div>

        {/* Right: Matches counter, Custom Sort Dropdown, and View Mode Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-white/[0.06] flex-wrap">
          
          {/* Matches & Page Count Pill */}
          <div className="text-xs text-slate-600 dark:text-[#a3a29d] px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#060a12]/90 border border-slate-200 dark:border-white/[0.1] flex items-center gap-2">
            <span>
              {lang === 'ru' ? 'Найдено:' : 'Matches:'}{' '}
              <strong className="text-[#0284c7] dark:text-[#00e5ff] font-semibold">{filteredArcanes.length}</strong>
            </span>
            {totalPages > 1 && (
              <>
                <span className="text-slate-300 dark:text-[#52525b]">|</span>
                <span className="text-slate-900 dark:text-white font-medium">{lang === 'ru' ? 'Стр.' : 'Page'} {safeCurrentPage}/{totalPages}</span>
              </>
            )}
          </div>

          {/* Modern Custom Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="h-11 sm:h-12 px-4 rounded-2xl bg-slate-50 dark:bg-[#060a12]/90 hover:bg-slate-100 dark:hover:bg-[#101726] border border-slate-200 dark:border-white/[0.12] hover:border-[#00e5ff]/50 text-xs font-sans text-slate-900 dark:text-white transition-all shadow-sm flex items-center gap-2.5 cursor-pointer"
            >
              <ArrowUpDown className="w-4 h-4 text-[#00e5ff]" />
              <span className="hidden sm:inline text-slate-500 dark:text-[#a3a29d]">
                {lang === 'ru' ? 'Сортировка:' : 'Sort:'}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white max-w-[170px] truncate">
                {lang === 'ru' ? currentSortLabel?.labelRu : currentSortLabel?.labelEn}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-[#a3a29d] transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Dropdown Modal / Popover */}
            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-[#00e5ff]/35 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-2 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 text-[11px] font-comfortaa font-bold uppercase tracking-wider text-slate-400 dark:text-[#a3a29d] border-b border-slate-100 dark:border-white/[0.06] mb-1">
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
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#00e5ff]/15 text-[#0284c7] dark:text-[#00e5ff] font-semibold'
                            : 'text-slate-700 dark:text-[#cbd5e1] hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white'
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
          <div className="flex items-center border border-slate-200 dark:border-white/[0.12] rounded-2xl bg-slate-100 dark:bg-[#060a12]/90 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#00e5ff]/20 text-[#0284c7] dark:text-[#00e5ff] shadow-sm border border-slate-200 dark:border-[#00e5ff]/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#a3a29d] dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#00e5ff]/20 text-[#0284c7] dark:text-[#00e5ff] shadow-sm border border-slate-200 dark:border-[#00e5ff]/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-[#a3a29d] dark:hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Content: Paginated Grid or Cleaned Table */}
      {filteredArcanes.length === 0 ? (
        <div className="bg-white dark:bg-[#0b1019]/80 border border-slate-200 dark:border-white/[0.08] rounded-3xl p-16 text-center">
          <p className="text-base text-slate-500 dark:text-[#a3a29d]">
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
        <div className="w-full bg-white dark:bg-[#0b1019] border border-slate-200 dark:border-white/[0.1] rounded-3xl overflow-x-auto shadow-2xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#060a12]/90 text-xs text-slate-500 dark:text-[#a3a29d] uppercase select-none font-comfortaa">
                <th className="py-4 px-6">{lang === 'ru' ? 'Мистификатор' : 'Arcane'}</th>
                <th className="py-4 px-6 text-right">{lang === 'ru' ? 'Ранг 0 (Мин / Сред)' : 'Rank 0 (Min / Avg)'}</th>
                <th className="py-4 px-6 text-right">{lang === 'ru' ? 'Ранг Max (Мин / Сред)' : 'Max Rank (Min / Avg)'}</th>
                <th className="py-4 px-6 text-right">{lang === 'ru' ? 'Сделок 24ч' : '24h Trades'}</th>
                <th className="py-4 px-6 text-center">{lang === 'ru' ? 'Действия' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
              {paginatedArcanes.map((arcane) => {
                const maxRank = (arcane as any).maxRank || 5;
                const displayName = lang === 'ru' && arcane.nameRu ? arcane.nameRu : arcane.name;

                return (
                  <tr
                    key={arcane.urlName || arcane.id}
                    onClick={() => onOpenDetails(arcane)}
                    onMouseEnter={() => prefetchArcaneDetails(arcane.urlName || (arcane as any).slug || (arcane as any).id)}
                    className="hover:bg-slate-50 dark:hover:bg-[#00e5ff]/[0.04] cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={resolveAssetUrl(arcane.icon)}
                          alt={displayName}
                          className="w-11 h-11 object-contain shrink-0 group-hover:scale-105 transition-transform"
                          loading="lazy"
                          onError={(e) => {
                            if (arcane.icon && !e.currentTarget.dataset.retried) {
                              e.currentTarget.dataset.retried = 'true';
                              const raw = arcane.icon.replace(/^\/api\/assets\//, '');
                              e.currentTarget.src = raw.startsWith('http') ? raw : `https://warframe.market/static/assets/${raw}`;
                            }
                          }}
                        />
                        <div className="min-w-0">
                          <span className="font-comfortaa text-base font-bold text-slate-900 dark:text-white group-hover:text-[#0284c7] dark:group-hover:text-[#00e5ff] transition-colors block truncate">
                            {displayName}
                          </span>
                          <span className="text-xs text-emerald-600 dark:text-[#10b981] font-sans font-medium block truncate">
                            Max R{maxRank}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="font-bold text-base font-sans flex items-center justify-end gap-1">
                        <span className="text-slate-900 dark:text-white font-bold">{arcane.rank0.minPrice}</span>
                        <PlatinumIcon size={13} className="text-[#00e5ff] inline ml-0.5" />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#a3a29d] font-sans">
                        {lang === 'ru' ? 'ср' : 'avg'}: {arcane.rank0.avgPrice}
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="font-bold text-base font-sans flex items-center justify-end gap-1">
                        <span className="text-[#0284c7] dark:text-[#00e5ff] font-bold drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">{arcane.rank5.minPrice}</span>
                        <PlatinumIcon size={13} className="text-[#00e5ff] inline ml-0.5" />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#a3a29d] font-sans">
                        {lang === 'ru' ? 'ср' : 'avg'}: {arcane.rank5.avgPrice}
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-right text-sm text-slate-800 dark:text-[#e2e8f0] font-sans font-medium">
                      {arcane.trades24h || arcane.volume24h || 0}
                    </td>

                    <td className="py-3.5 px-6 text-center">
                      <a
                        href={`https://warframe.market/items/${arcane.urlName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-[#060a12] dark:hover:bg-[#10b981]/20 border border-slate-200 dark:border-[#10b981]/40 hover:border-emerald-500 text-xs font-comfortaa font-bold text-emerald-600 dark:text-[#34d399] transition-all inline-flex items-center gap-1.5"
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
        <div className="bg-white dark:bg-[#0b1019]/90 border border-slate-200 dark:border-white/[0.1] p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl select-none font-sans mt-8 transition-colors">
          
          {/* Left: Range and Item counter */}
          <div className="text-xs text-slate-600 dark:text-[#a3a29d] flex items-center gap-2">
            <span>
              {lang === 'ru' ? 'Показано' : 'Showing'}{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">{startItem}–{endItem}</strong>{' '}
              {lang === 'ru' ? 'из' : 'of'}{' '}
              <strong className="text-[#0284c7] dark:text-[#00e5ff] font-semibold">{filteredArcanes.length}</strong>
            </span>
          </div>

          {/* Center: Numeric Page Buttons with Prev / Next */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* First Page */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={safeCurrentPage === 1}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title={lang === 'ru' ? 'Первая страница' : 'First page'}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title={lang === 'ru' ? 'Предыдущая страница' : 'Previous page'}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-slate-400 dark:text-[#64748b]">
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
                  className={`min-w-[40px] h-10 px-3 rounded-xl text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00e5ff] text-[#070a0e] shadow-[0_0_15px_rgba(0,229,255,0.45)] scale-105'
                      : 'bg-slate-100 dark:bg-[#060a12] text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08]'
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
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title={lang === 'ru' ? 'Следующая страница' : 'Next page'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#060a12] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-[#a3a29d] hover:text-slate-900 dark:hover:text-white hover:border-[#00e5ff]/40 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
              title={lang === 'ru' ? 'Последняя страница' : 'Last page'}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Items per page selector */}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#a3a29d]">
            <span>{lang === 'ru' ? 'На странице:' : 'Per page:'}</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#060a12] p-1 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
              {[24, 48, 96].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                    pageSize === size
                      ? 'bg-[#00e5ff]/20 text-[#0284c7] dark:text-[#00e5ff] font-bold border border-[#00e5ff]/40'
                      : 'text-slate-500 dark:text-[#71717a] hover:text-slate-900 dark:hover:text-white'
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
