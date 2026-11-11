import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Crosshair,
  Database,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { PlatinumIcon } from '../PlatinumIcon';
import { EndoIcon } from '../EndoIcon';
import { formatRivenStatName, getDispositionDots } from './rivenUtils';
import { resolveAssetUrl } from '../../utils/assets';

interface RivenWeapon {
  id: string;
  slug: string;
  name_en: string;
  name_ru: string;
  group_type: string;
  riven_type: string;
  disposition: number;
  req_mr: number;
  icon_url: string;
  thumb_url: string;
}

interface RivenAttribute {
  value: number;
  positive: boolean;
  url_name: string;
}

interface RivenLot {
  id: string;
  weapon_slug: string;
  seller_name: string;
  seller_status: 'online' | 'ingame' | 'offline';
  seller_reputation: number;
  is_direct_sell: boolean;
  buyout_price: number | null;
  starting_price: number | null;
  top_bid: number | null;
  mod_name: string;
  mod_rank: number;
  re_rolls: number;
  mastery_level: number;
  polarity: string;
  attributes: RivenAttribute[];
  endo_value: number;
  efficiency: number;
  lot_created_at: string;
  lot_updated_at: string;
}

interface RivensEndoViewProps {
  lang: 'ru' | 'en';
}

// In-memory cache for riven lots to eliminate 0-lot flashes and loading spinners on weapon switch
const rivenLotsClientCache = new Map<string, RivenLot[]>();

// Memoized Riven Lot Card: eliminates re-rendering 24+ cards on search/timer ticks
const RivenLotCard = React.memo<{
  lot: RivenLot;
  weaponTitle: string;
  lang: 'ru' | 'en';
  onOpenMarket: (lot: RivenLot) => void;
  onCopyWhisper: (e: React.MouseEvent, lot: RivenLot) => void;
  isCopied: boolean;
}>(({ lot, weaponTitle, lang, onOpenMarket, onCopyWhisper, isCopied }) => {
  const isDirect = lot.is_direct_sell;
  const price = isDirect ? lot.buyout_price || 0 : lot.top_bid || lot.starting_price || 0;
  const isUnrolled = lot.re_rolls === 0;

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return lang === 'ru' ? 'только что' : 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} ${lang === 'ru' ? 'мин. назад' : 'm ago'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${lang === 'ru' ? 'ч. назад' : 'h ago'}`;
    return `${Math.floor(diff / 86400)} ${lang === 'ru' ? 'дн. назад' : 'd ago'}`;
  };

  return (
    <div
      onClick={() => onOpenMarket(lot)}
      title={lang === 'ru' ? 'ЛКМ — Открыть контракт на Warframe Market (ПК) ↗' : 'Click to open contract on Warframe Market (PC) ↗'}
      className="group relative rounded-2xl p-4 bg-white/95 dark:bg-[#070c14]/95 border border-slate-200 dark:border-white/[0.08] hover:border-[#00e5ff]/70 hover:shadow-[0_12px_32px_rgba(0,229,255,0.18)] dark:hover:shadow-[0_12px_32px_rgba(0,229,255,0.22)] transition-all duration-200 flex flex-col justify-between cursor-pointer overflow-hidden active:scale-[0.995]"
    >
      {/* Top: Header Info */}
      <div className="relative z-10 flex flex-col gap-2.5">
        {/* Title & Trade Type + External Link */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <span className="font-comfortaa font-bold text-base text-slate-900 dark:text-white group-hover:text-[#00e5ff] transition-colors truncate">
              {weaponTitle}
            </span>
            <span className="font-comfortaa font-semibold text-sm text-[#00e5ff] dark:text-[#38bdf8] tracking-wide">
              {lot.mod_name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-comfortaa font-bold uppercase tracking-wider ${
                isDirect
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#a855f7]/15 text-[#c084fc] border border-[#a855f7]/30'
              }`}
            >
              {isDirect ? (lang === 'ru' ? 'Фикс Ᵽ' : 'Buyout') : (lang === 'ru' ? 'Аукцион' : 'Auction')}
            </span>
            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/[0.06] group-hover:bg-[#00e5ff] group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Crisp Meta Row: MR, Mod Rank, Rerolls & Seller Status */}
        <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-100 dark:border-white/[0.05] text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-md font-comfortaa font-bold bg-slate-100 dark:bg-[#121c2c] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200">
              MR {lot.mastery_level}
            </span>

            <span
              className={`px-2 py-0.5 rounded-md font-comfortaa ${
                lot.mod_rank === 8
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-bold'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              {lang === 'ru' ? `Ранг ${lot.mod_rank}/8` : `Rank ${lot.mod_rank}/8`}
            </span>

            <span
              className={`px-2 py-0.5 rounded-md font-comfortaa font-bold flex items-center gap-1 ${
                isUnrolled
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30'
              }`}
            >
              {isUnrolled ? (
                <span>{lang === 'ru' ? '✨ 0 роллов' : '✨ 0 Rolls'}</span>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>
                    {lot.re_rolls} {lang === 'ru' ? 'роллов' : 'rolls'}
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 shrink-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                lot.seller_status === 'ingame'
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : lot.seller_status === 'online'
                  ? 'bg-[#00e5ff]'
                  : 'bg-slate-400'
              }`}
            />
            <span className="font-onest font-medium text-xs text-slate-700 dark:text-slate-300 truncate max-w-[95px]">
              {lot.seller_name}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Stat Attribute Lines */}
      <div className="relative z-10 my-3 space-y-1.5">
        {lot.attributes.map((attr, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-colors ${
              attr.positive
                ? 'bg-emerald-500/[0.06] border-emerald-500/20 text-slate-800 dark:text-slate-100'
                : 'bg-rose-500/[0.06] border-rose-500/20 text-slate-800 dark:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate mr-2">
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center font-mono text-[11px] font-black shrink-0 ${
                  attr.positive
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                {attr.positive ? '+' : '−'}
              </span>
              <span className="font-onest text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                {formatRivenStatName(attr.url_name, lang)}
              </span>
            </div>
            <span
              className={`font-mono text-xs font-bold shrink-0 ${
                attr.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {attr.positive ? `+${attr.value}%` : `${attr.value}%`}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom: Hero Financial Metrics (Endo & Price) */}
      <div className="relative z-10 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-comfortaa font-bold uppercase tracking-wider text-slate-400">
              {lang === 'ru' ? 'Выход Эндо' : 'Endo Scrap'}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <EndoIcon size={20} />
              <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {lot.endo_value.toLocaleString()}
              </span>
            </div>
            {lot.efficiency > 0 && (
              <span className="text-[10px] font-onest font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                ⚡ {lot.efficiency} {lang === 'ru' ? 'эндо / 1Ᵽ' : 'e / 1Ᵽ'}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-comfortaa font-bold uppercase tracking-wider text-slate-400">
              {isDirect ? (lang === 'ru' ? 'Цена' : 'Price') : (lang === 'ru' ? 'Ставка' : 'Bid')}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-mono text-2xl font-black text-slate-900 dark:text-white group-hover:text-[#00e5ff] transition-colors">
                {price}
              </span>
              <PlatinumIcon className="w-5 h-5 text-[#00e5ff]" />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-onest text-slate-400 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatTimeAgo(lot.lot_created_at)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={(e) => onCopyWhisper(e, lot)}
          title={lang === 'ru' ? `Скопировать шепот (/w ${lot.seller_name})` : `Copy whisper (/w ${lot.seller_name})`}
          className={`w-full mt-3 flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl border text-xs font-comfortaa font-bold transition-all active:scale-[0.98] cursor-pointer shadow-sm ${
            isCopied
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-300'
              : 'bg-slate-100 hover:bg-[#00e5ff]/15 dark:bg-white/[0.04] dark:hover:bg-[#00e5ff]/20 text-slate-700 hover:text-[#0284c7] dark:text-slate-300 dark:hover:text-[#00e5ff] border-slate-200/60 dark:border-white/[0.06] hover:border-[#00e5ff]/40'
          }`}
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>{lang === 'ru' ? 'Шепот скопирован в буфер!' : 'Whisper copied to clipboard!'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00e5ff]" />
              <span className="font-onest font-medium truncate">/w {lot.seller_name}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
});
RivenLotCard.displayName = 'RivenLotCard';

export const RivensEndoView: React.FC<RivensEndoViewProps> = ({ lang }) => {
  // State: Weapons list with instant cache initialization (0ms load time!)
  const [weapons, setWeapons] = useState<RivenWeapon[]>(() => {
    try {
      const cached = localStorage.getItem('tenno_cached_riven_weapons');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [isLoadingWeapons, setIsLoadingWeapons] = useState(() => weapons.length === 0);
  const [selectedWeapon, setSelectedWeapon] = useState<RivenWeapon | null>(() => {
    try {
      const cached = localStorage.getItem('tenno_cached_riven_weapons');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return (
            parsed.find((w: RivenWeapon) => ((w as any).active_lots_count ?? 0) > 0) ||
            parsed.find((w: RivenWeapon) => w.slug === 'akarius') ||
            parsed[0]
          );
        }
      }
    } catch {}
    return null;
  });

  // Search & Categories with 250ms debounce
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Lots state
  const [lots, setLots] = useState<RivenLot[]>([]);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedWhisperId, setCopiedWhisperId] = useState<string | null>(null);

  // Pagination state (smooth browsing, no 1000 items scroll lag)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const lotsTopRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'auction'>('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'price_asc' | 'price_desc' | 'endo_desc' | 'efficiency_desc'>('date_desc');

  // Custom Dropdown Open States
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWeapon, filterType, onlineOnly, sortBy, pageSize]);

  // Load weapons list on mount or when category changes
  useEffect(() => {
    const fetchWeapons = async () => {
      if (weapons.length === 0) {
        setIsLoadingWeapons(true);
      }
      try {
        const url = `/api/rivens/weapons?group=${activeGroup}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setWeapons(json.data);
            if (activeGroup === 'all') {
              try {
                localStorage.setItem('tenno_cached_riven_weapons', JSON.stringify(json.data));
              } catch {}
            }
            if (!selectedWeapon && json.data.length > 0) {
              const defaultWeapon =
                json.data.find((w: RivenWeapon) => ((w as any).active_lots_count ?? 0) > 0) ||
                json.data.find((w: RivenWeapon) => w.slug === 'akarius') ||
                json.data[0];
              setSelectedWeapon(defaultWeapon);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch riven weapons:', err);
      } finally {
        setIsLoadingWeapons(false);
      }
    };

    fetchWeapons();
  }, [activeGroup]);

  // Load lots for the selected weapon (fetches on weapon switch with AbortController and instant cache hydration)
  useEffect(() => {
    if (!selectedWeapon) return;

    const controller = new AbortController();
    const slug = selectedWeapon.slug;
    const cached = rivenLotsClientCache.get(slug);

    if (cached && cached.length > 0) {
      setLots(cached);
      setIsLoadingLots(false);
    } else {
      setIsLoadingLots(true);
    }

    const fetchLots = async () => {
      try {
        const res = await fetch(`/api/rivens/lots/${slug}`, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            rivenLotsClientCache.set(slug, json.data);
            setLots(json.data);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch lots:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingLots(false);
        }
      }
    };

    fetchLots();
    return () => {
      controller.abort();
    };
  }, [selectedWeapon?.slug]);

  // Real-time automatic background polling (paused when browser tab is hidden to eliminate network/CPU waste)
  useEffect(() => {
    if (!selectedWeapon) return;

    let intervalId: any = null;
    let pollController: AbortController | null = null;

    const silentPoll = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        pollController?.abort();
        pollController = new AbortController();
        const res = await fetch(`/api/rivens/lots/${selectedWeapon.slug}`, { signal: pollController.signal });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            rivenLotsClientCache.set(selectedWeapon.slug, json.data);
            setLots(json.data);
          }
        }
      } catch {}
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentPoll();
        if (!intervalId) {
          intervalId = setInterval(silentPoll, 8000);
        }
      } else {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    };

    intervalId = setInterval(silentPoll, 8000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalId) clearInterval(intervalId);
      pollController?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedWeapon?.slug]);

  // Filter weapons by debounced search query
  const filteredWeapons = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim();
    if (!q) return weapons;
    return weapons.filter((w) => {
      const ru = (w.name_ru || '').toLowerCase();
      const en = (w.name_en || '').toLowerCase();
      const slug = (w.slug || '').toLowerCase();
      return ru.includes(q) || en.includes(q) || slug.includes(q);
    });
  }, [weapons, debouncedSearchQuery]);

  // Instant zero-lag in-memory filtering & sorting
  const filteredLots = useMemo(() => {
    let list = [...lots];

    // 1. Trade type filter
    if (filterType === 'direct') {
      list = list.filter((lot) => lot.is_direct_sell);
    } else if (filterType === 'auction') {
      list = list.filter((lot) => !lot.is_direct_sell);
    }

    // 2. Online only filter
    if (onlineOnly) {
      list = list.filter((lot) => lot.seller_status === 'online' || lot.seller_status === 'ingame');
    }

    // 3. Sorting
    list.sort((a, b) => {
      const priceA = a.is_direct_sell ? a.buyout_price || 0 : a.top_bid || a.starting_price || 0;
      const priceB = b.is_direct_sell ? b.buyout_price || 0 : b.top_bid || b.starting_price || 0;

      switch (sortBy) {
        case 'price_asc':
          return (priceA || 999999) - (priceB || 999999);
        case 'price_desc':
          return (priceB || 0) - (priceA || 0);
        case 'endo_desc':
          return (b.endo_value || 0) - (a.endo_value || 0);
        case 'efficiency_desc':
          return (b.efficiency || 0) - (a.efficiency || 0);
        case 'date_desc':
        default: {
          const timeA = new Date(a.lot_created_at || 0).getTime();
          const timeB = new Date(b.lot_created_at || 0).getTime();
          return timeB - timeA;
        }
      }
    });

    return list;
  }, [lots, filterType, onlineOnly, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLots.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLots = useMemo(() => {
    if (pageSize >= 9999) return filteredLots;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredLots.slice(start, start + pageSize);
  }, [filteredLots, safeCurrentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    lotsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Manual fast sync for recent market auctions
  const handleForceSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const slug = selectedWeapon?.slug || '';
      await fetch(`/api/rivens/sync?weapon=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weapon: slug }),
      });
      // Re-fetch lots for the selected weapon immediately
      if (selectedWeapon) {
        const res = await fetch(`/api/rivens/lots/${selectedWeapon.slug}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setLots(json.data);
          }
        }
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Warframe Market with the exact contract or canonical search (memoized)
  const handleOpenMarket = useCallback((lot: RivenLot) => {
    const isRealLiveId = lot.id && /^[0-9a-fA-F]{24}$/.test(lot.id);
    
    // If it's a real live ID, open the individual contract page
    if (isRealLiveId) {
      window.open(`https://warframe.market/auction/${lot.id}`, '_blank', 'noopener,noreferrer');
      return;
    }

    // Canonical PC auction search URL (never pass positive_stats query param that causes 400 Bad Request)
    const weaponSlug = selectedWeapon?.slug || lot.weapon_slug;
    window.open(`https://warframe.market/auctions/search?type=riven&weapon_url_name=${weaponSlug}&sort_by=price_asc`, '_blank', 'noopener,noreferrer');
  }, [selectedWeapon?.slug]);

  // In-game whisper copy (memoized)
  const handleCopyWhisper = useCallback((e: React.MouseEvent, lot: RivenLot) => {
    e.stopPropagation();
    const weaponName = selectedWeapon ? (lang === 'ru' ? selectedWeapon.name_ru : selectedWeapon.name_en) : '';
    const price = lot.is_direct_sell ? lot.buyout_price || 0 : lot.top_bid || lot.starting_price || 0;
    const whisper = `/w ${lot.seller_name} Hi! I want to buy your [${weaponName} ${lot.mod_name}] for ${price} platinum (warframe.market)`;
    navigator.clipboard.writeText(whisper);
    setCopiedWhisperId(lot.id);
    setTimeout(() => setCopiedWhisperId(null), 2000);
  }, [selectedWeapon, lang]);

  const categories = [
    { id: 'all', labelRu: 'Все', labelEn: 'All' },
    { id: 'primary', labelRu: 'Основное', labelEn: 'Primary' },
    { id: 'secondary', labelRu: 'Вторичное', labelEn: 'Secondary' },
    { id: 'melee', labelRu: 'Ближний бой', labelEn: 'Melee' },
    { id: 'companion', labelRu: 'Компаньоны', labelEn: 'Companion' },
    { id: 'archwing', labelRu: 'Арчвинг', labelEn: 'Archwing' },
  ];

  const typeOptions = [
    { id: 'all', labelRu: 'Все типы сделок', labelEn: 'All trade types' },
    { id: 'direct', labelRu: 'Только фикс. цена', labelEn: 'Buyout only' },
    { id: 'auction', labelRu: 'Только аукционы', labelEn: 'Auctions only' },
  ];

  const sortOptions = [
    { id: 'date_desc', labelRu: 'Свежие (по дате)', labelEn: 'Most recent' },
    { id: 'price_asc', labelRu: 'Сначала дешевые', labelEn: 'Price: Low to High' },
    { id: 'price_desc', labelRu: 'Сначала дорогие', labelEn: 'Price: High to Low' },
    { id: 'endo_desc', labelRu: 'Максимум Эндо', labelEn: 'Max Endo yield' },
    { id: 'efficiency_desc', labelRu: 'Выгода (Эндо / 1 Ᵽ)', labelEn: 'Best Endo / Plat' },
  ];

  const currentTypeLabel = typeOptions.find((t) => t.id === filterType);
  const currentSortLabel = sortOptions.find((s) => s.id === sortBy);

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return lang === 'ru' ? 'только что' : 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} ${lang === 'ru' ? 'мин. назад' : 'm ago'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${lang === 'ru' ? 'ч. назад' : 'h ago'}`;
    return `${Math.floor(diff / 86400)} ${lang === 'ru' ? 'дн. назад' : 'd ago'}`;
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-6 select-none font-sans">
      
      {/* 1. Header Toolbar: Title, Quick Stats, & Live Sync */}
      <div className="relative z-20 bg-white/95 dark:bg-[#0b1019]/90 border border-slate-200 dark:border-white/[0.1] p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl backdrop-blur-md transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00e5ff]/20 to-[#10b981]/20 border border-[#00e5ff]/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.25)]">
            <EndoIcon size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-comfortaa font-bold text-xl sm:text-2xl text-slate-900 dark:text-white tracking-wide">
                {lang === 'ru' ? 'МР в эндо' : 'Rivens-endo'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">
                {lang === 'ru' ? 'Терминал разбора' : 'Dissolve Terminal'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a29d] mt-0.5 font-onest">
              {lang === 'ru'
                ? 'Аукционы Warframe Market, точный расчет выхода Эндо и поиск выгодных модов'
                : 'Warframe Market Riven contracts, exact Endo scrap value calculator and sniper deals'}
            </p>
          </div>
        </div>

        {/* Right telemetry & fast sync */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Real-time status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-comfortaa font-bold text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE • {lang === 'ru' ? 'Реальное время' : 'Real-time'}</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-[#0c121c] border border-slate-200 dark:border-white/[0.08] text-xs font-comfortaa font-bold">
            <Layers className="w-3.5 h-3.5 text-[#00e5ff]" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong className="text-[#00e5ff] font-bold">{weapons.length}</strong>{' '}
              {lang === 'ru' ? 'оружий' : 'weapons'}
            </span>
          </div>

          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="group relative flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0c1624] dark:hover:bg-[#102034] border border-[#00e5ff]/40 hover:border-[#00e5ff] text-slate-900 dark:text-white font-comfortaa font-bold text-xs transition-all shadow-[0_0_14px_rgba(0,229,255,0.15)] hover:shadow-[0_0_22px_rgba(0,229,255,0.35)] active:scale-95 cursor-pointer disabled:opacity-50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00e5ff]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            <RefreshCw className={`w-3.5 h-3.5 text-[#00e5ff] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? (lang === 'ru' ? 'Синхронизация...' : 'Syncing...') : (lang === 'ru' ? 'Обновить лоты' : 'Sync Live Lots')}</span>
          </button>
        </div>
      </div>

      {/* 2. ERGONOMIC 2-COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: WEAPONS EXPLORER & CATEGORIES (Compact, Fixed Width, ~3 cols) */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 p-5 rounded-3xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-white/[0.06]">
            <span className="font-comfortaa font-bold text-sm text-slate-900 dark:text-white">
              {lang === 'ru' ? 'Выбор оружия' : 'Select Weapon'}
            </span>
            <span className="text-[11px] font-onest text-slate-400">
              {filteredWeapons.length} {lang === 'ru' ? 'в списке' : 'listed'}
            </span>
          </div>

          {/* Search Bar with Instant Autocomplete */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-[#00e5ff]/70 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'ru'
                  ? 'Поиск оружия (Рубико, Торид...)'
                  : 'Search weapon (Rubico, Torid...)'
              }
              className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c121c] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white placeholder-slate-400 text-xs font-onest focus:outline-none focus:border-[#00e5ff] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer px-1 py-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {categories.map((cat) => {
              const isActive = activeGroup === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveGroup(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-comfortaa font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00e5ff] text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.35)]'
                      : 'bg-slate-100 dark:bg-[#0c121c] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#121c2a]'
                  }`}
                >
                  {lang === 'ru' ? cat.labelRu : cat.labelEn}
                </button>
              );
            })}
          </div>

          {/* Scrollable Weapons List with 5 In-game Synergy Dots & High Contrast MR */}
          <div className="flex flex-col gap-1.5 max-h-[620px] overflow-y-auto pr-1 scrollbar-thin">
            {isLoadingWeapons && filteredWeapons.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-400 font-onest">
                <RefreshCw className="w-4 h-4 animate-spin text-[#00e5ff]" />
                <span>{lang === 'ru' ? 'Загрузка списка...' : 'Loading weapons...'}</span>
              </div>
            ) : filteredWeapons.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 font-onest">
                {lang === 'ru' ? 'Оружие не найдено' : 'No weapon matches search'}
              </div>
            ) : (
              filteredWeapons.map((w) => {
                const isSelected = selectedWeapon?.slug === w.slug;
                const dispDots = getDispositionDots(w.disposition);

                return (
                  <div
                    key={w.id}
                    onClick={() => setSelectedWeapon(w)}
                    className={`group/item flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-[#00e5ff]/10 dark:bg-[#00e5ff]/15 border-[#00e5ff] shadow-[0_0_16px_rgba(0,229,255,0.2)]'
                        : 'bg-slate-50 dark:bg-[#0b1018] border-slate-200/80 dark:border-white/[0.04] hover:border-[#00e5ff]/40 hover:bg-slate-100 dark:hover:bg-[#101724]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {w.thumb_url ? (
                        <img
                          src={resolveAssetUrl(w.thumb_url)}
                          alt={w.name_ru}
                          loading="lazy"
                          decoding="async"
                          className="w-7 h-7 object-contain shrink-0 drop-shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                          <Crosshair className="w-3.5 h-3.5 text-[#00e5ff]" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className={`font-comfortaa font-bold text-xs truncate transition-colors ${
                          isSelected ? 'text-[#00e5ff]' : 'text-slate-900 dark:text-white group-hover/item:text-[#00e5ff]'
                        }`}>
                          {lang === 'ru' ? w.name_ru : w.name_en}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate font-onest">
                          {lang === 'ru' ? w.name_en : w.name_ru}
                        </div>
                      </div>
                    </div>

                    {/* Right side: High-contrast MR badge & In-game 5-circle Synergy */}
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] font-comfortaa font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-[#131d2e] border border-slate-300 dark:border-white/[0.12] text-slate-800 dark:text-white shadow-sm">
                        MR {w.req_mr}
                      </span>
                      
                      {/* 5 In-game Disposition Circles */}
                      <div
                        className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-slate-100 dark:bg-[#050b14] border border-slate-200 dark:border-white/[0.08]"
                        title={lang === 'ru' ? `Синергия: ${dispDots}/5 (${w.disposition})` : `Disposition: ${dispDots}/5 (${w.disposition})`}
                      >
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <span
                            key={dot}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              dot <= dispDots
                                ? 'bg-[#00e5ff] shadow-[0_0_5px_#00e5ff]'
                                : 'bg-slate-300 dark:bg-slate-700/60'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: SELECTED WEAPON LOTS & WORKSPACE (~9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4" ref={lotsTopRef}>
          
          {selectedWeapon ? (
            <>
              {/* Selected Weapon Hero Header Card */}
              <div className="p-5 rounded-3xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {selectedWeapon.thumb_url ? (
                    <img
                      src={resolveAssetUrl(selectedWeapon.thumb_url)}
                      alt={selectedWeapon.name_ru}
                      className="w-14 h-14 object-contain drop-shadow-[0_0_16px_rgba(0,229,255,0.3)]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#00e5ff]/10 flex items-center justify-center text-[#00e5ff]">
                      <Crosshair className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-comfortaa font-bold text-slate-900 dark:text-white">
                        {lang === 'ru' ? selectedWeapon.name_ru : selectedWeapon.name_en}
                      </h2>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 uppercase font-comfortaa font-bold">
                        {selectedWeapon.group_type}
                      </span>
                    </div>

                    {/* Metadata with In-game 5-dot synergy */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-comfortaa flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{lang === 'ru' ? 'Мин. Ранг:' : 'Req MR:'}</span>
                        <span className="px-2 py-0.5 rounded-md font-comfortaa font-bold text-xs bg-slate-200 dark:bg-[#131d2e] border border-slate-300 dark:border-white/[0.12] text-slate-900 dark:text-white shadow-sm">
                          MR {selectedWeapon.req_mr}
                        </span>
                      </div>
                      <span>•</span>
                      
                      {/* In-game Synergy Dots */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{lang === 'ru' ? 'Синергия:' : 'Disposition:'}</span>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#050b14] border border-slate-200 dark:border-white/[0.08]">
                          {[1, 2, 3, 4, 5].map((dot) => (
                            <span
                              key={dot}
                              className={`w-2 h-2 rounded-full transition-all ${
                                dot <= getDispositionDots(selectedWeapon.disposition)
                                  ? 'bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]'
                                  : 'bg-slate-300 dark:bg-slate-700/60'
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-[11px] font-comfortaa font-bold text-[#00e5ff]">
                            {getDispositionDots(selectedWeapon.disposition)}/5
                          </span>
                        </div>
                      </div>
                      <span>•</span>

                      {/* Real-time Live updated lots badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-comfortaa font-bold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>LIVE: {lots.length} {lang === 'ru' ? 'лотов' : 'lots'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct PC Market Link for this weapon */}
                <div className="flex items-center shrink-0">
                  <a
                    href={`https://warframe.market/auctions/search?type=riven&weapon_url_name=${selectedWeapon.slug}&sort_by=price_asc`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 border border-[#00e5ff]/40 hover:border-[#00e5ff] text-slate-900 dark:text-white font-comfortaa font-bold text-xs transition-all shadow-[0_0_16px_rgba(0,229,255,0.15)] active:scale-95 cursor-pointer"
                  >
                    <span>{lang === 'ru' ? 'Все контракты на Маркете (ПК)' : 'All Contracts on Market (PC)'}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#00e5ff]" />
                  </a>
                </div>
              </div>

              {/* Modern Filters & Controls Toolbar */}
              <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-white/[0.08] shadow-sm">
                
                {/* Left controls: Trade Type Dropdown & Online Only Toggle */}
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Custom Trade Type Dropdown Modal */}
                  <div className="relative" ref={typeDropdownRef}>
                    <button
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className="h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0c1420] hover:bg-slate-100 dark:hover:bg-[#101b2a] border border-slate-200 dark:border-white/[0.12] hover:border-[#00e5ff]/50 text-xs font-comfortaa text-slate-900 dark:text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Filter className="w-3.5 h-3.5 text-[#00e5ff]" />
                      <span className="text-slate-500 dark:text-[#a3a29d]">{lang === 'ru' ? 'Тип:' : 'Type:'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {lang === 'ru' ? currentTypeLabel?.labelRu : currentTypeLabel?.labelEn}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Popover Menu */}
                    {isTypeDropdownOpen && (
                      <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-[#00e5ff]/35 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1.5 text-[10px] font-comfortaa font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/[0.06] mb-1">
                          {lang === 'ru' ? 'Тип сделки' : 'Trade Type'}
                        </div>
                        <div className="space-y-1">
                          {typeOptions.map((opt) => {
                            const isSelected = opt.id === filterType;
                            return (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  setFilterType(opt.id as any);
                                  setIsTypeDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-comfortaa transition-colors text-left cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#00e5ff]/15 text-[#0284c7] dark:text-[#00e5ff] font-bold'
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

                  {/* Online Only Pill Toggle */}
                  <button
                    onClick={() => setOnlineOnly(!onlineOnly)}
                    className={`h-10 px-3.5 rounded-xl border transition-all text-xs font-comfortaa font-bold flex items-center gap-2 cursor-pointer shadow-sm ${
                      onlineOnly
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-50 dark:bg-[#0c1420] border-slate-200 dark:border-white/[0.12] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${onlineOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    <span>{lang === 'ru' ? 'Только в сети' : 'Online only'}</span>
                  </button>
                </div>

                {/* Right controls: Custom Sort Dropdown Modal */}
                <div className="relative" ref={sortDropdownRef}>
                  <button
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#0c1420] hover:bg-slate-100 dark:hover:bg-[#101b2a] border border-slate-200 dark:border-white/[0.12] hover:border-[#00e5ff]/50 text-xs font-comfortaa text-slate-900 dark:text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#00e5ff]" />
                    <span className="text-slate-500 dark:text-[#a3a29d]">{lang === 'ru' ? 'Сортировка:' : 'Sort:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {lang === 'ru' ? currentSortLabel?.labelRu : currentSortLabel?.labelEn}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Popover Menu */}
                  {isSortDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0c121d] border border-slate-200 dark:border-[#00e5ff]/35 rounded-2xl shadow-2xl p-1.5 z-50 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-comfortaa font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/[0.06] mb-1">
                        {lang === 'ru' ? 'Сортировать по' : 'Sort items by'}
                      </div>
                      <div className="space-y-1">
                        {sortOptions.map((opt) => {
                          const isSelected = opt.id === sortBy;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setSortBy(opt.id as any);
                                setIsSortDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-comfortaa transition-colors text-left cursor-pointer ${
                                isSelected
                                  ? 'bg-[#00e5ff]/15 text-[#0284c7] dark:text-[#00e5ff] font-bold'
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

              </div>

              {/* Riven Cards Grid (Proper 3-column responsive cards with EndoIcon & Pagination) */}
              {isLoadingLots ? (
                <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-white/[0.08]">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#00e5ff] mb-3" />
                  <p className="text-sm font-comfortaa text-slate-500">
                    {lang === 'ru' ? 'Загрузка лотов из БД...' : 'Loading lots from database...'}
                  </p>
                </div>
              ) : filteredLots.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-white/[0.08]">
                  <EndoIcon size={48} className="mb-3 opacity-60" />
                  <h3 className="font-comfortaa font-bold text-base text-slate-900 dark:text-white">
                    {lang === 'ru' ? 'Нет лотов по выбранным фильтрам' : 'No lots match the selected filters'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                    {lang === 'ru'
                      ? 'Попробуйте изменить тип сделки или отключить фильтр "Только в сети".'
                      : 'Try changing the trade type or toggle off "Online only".'}
                  </p>
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setOnlineOnly(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#00e5ff] text-slate-950 font-bold font-comfortaa text-xs hover:bg-[#00c8e0] cursor-pointer"
                  >
                    {lang === 'ru' ? 'Сбросить фильтры' : 'Reset filters'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {paginatedLots.map((lot) => (
                      <RivenLotCard
                        key={lot.id}
                        lot={lot}
                        weaponTitle={selectedWeapon ? (lang === 'ru' ? selectedWeapon.name_ru : selectedWeapon.name_en) : ''}
                        lang={lang}
                        isCopied={copiedWhisperId === lot.id}
                        onOpenMarket={handleOpenMarket}
                        onCopyWhisper={handleCopyWhisper}
                      />
                    ))}
                  </div>

                  {/* 3. PAGINATION CONTROLS BAR (Clean & Ergonomic) */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-white/[0.08] shadow-sm">
                      
                      {/* Counter & Page Size */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-onest">
                        <span>
                          {lang === 'ru' ? 'Показано' : 'Showing'}{' '}
                          <strong className="text-slate-900 dark:text-white font-mono font-bold">
                            {(safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, filteredLots.length)}
                          </strong>{' '}
                          {lang === 'ru' ? 'из' : 'of'}{' '}
                          <strong className="text-[#00e5ff] font-mono font-bold">{filteredLots.length}</strong>{' '}
                          {lang === 'ru' ? 'лотов' : 'lots'}
                        </span>

                        <span className="hidden sm:inline">•</span>

                        <div className="hidden sm:flex items-center gap-1 font-comfortaa">
                          <span className="text-slate-400">{lang === 'ru' ? 'По:' : 'Per page:'}</span>
                          {[12, 24, 48, 96, 9999].map((size) => (
                            <button
                              key={size}
                              onClick={() => setPageSize(size)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-comfortaa font-bold transition-colors cursor-pointer ${
                                pageSize === size
                                  ? 'bg-[#00e5ff] text-slate-950 font-bold'
                                  : 'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {size === 9999 ? (lang === 'ru' ? 'Все' : 'All') : size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Page Buttons */}
                      <div className="flex items-center gap-1.5 font-comfortaa">
                        <button
                          onClick={() => handlePageChange(safeCurrentPage - 1)}
                          disabled={safeCurrentPage <= 1}
                          className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0b1018] hover:bg-slate-100 dark:hover:bg-[#121c2a] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => {
                            // Show first, last, and window around current
                            return p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1;
                          })
                          .map((p, index, array) => {
                            const prev = array[index - 1];
                            const showEllipsis = prev && p - prev > 1;

                            return (
                              <React.Fragment key={p}>
                                {showEllipsis && (
                                  <span className="px-1 text-slate-400 font-mono text-xs">...</span>
                                )}
                                <button
                                  onClick={() => handlePageChange(p)}
                                  className={`w-8 h-8 rounded-xl font-comfortaa text-xs font-bold transition-all cursor-pointer ${
                                    safeCurrentPage === p
                                      ? 'bg-[#00e5ff] text-slate-950 shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                                      : 'bg-slate-50 dark:bg-[#0b1018] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#121c2a]'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            );
                          })}

                        <button
                          onClick={() => handlePageChange(safeCurrentPage + 1)}
                          disabled={safeCurrentPage >= totalPages}
                          className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0b1018] hover:bg-slate-100 dark:hover:bg-[#121c2a] text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 rounded-3xl bg-white dark:bg-[#070c14] border border-slate-200 dark:border-white/[0.08] text-center">
              <Crosshair className="w-12 h-12 text-[#00e5ff]/50 mb-3" />
              <h3 className="font-comfortaa font-bold text-lg text-slate-900 dark:text-white">
                {lang === 'ru' ? 'Выберите оружие из списка слева' : 'Select a weapon from the list on the left'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {lang === 'ru'
                  ? 'Используйте поиск или фильтры по категориям для быстрого выбора.'
                  : 'Use search or category filters for fast selection.'}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
