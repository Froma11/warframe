# ТЕХНИЧЕСКИЙ АУДИТ ПРОЕКТА (FULL-STACK AUDIT REPORT)
**Проект:** Warframe Market Intelligence & Riven Terminal (`zero.nofuture.me`)  
**Дата проведения:** 11 ноября 2026 г.  
**Инфраструктура:** Contabo VPS (`75.119.157.81`), Ubuntu 24.04 LTS, Node.js v20+, SQLite 3 (WAL mode), Nginx Reverse Proxy, Systemd (`zero-app.service`).  
**Целевая нагрузка:** 50–100+ активных пользователей с временем отклика API < 15 мс и event loop lag < 20 мс.

---

## 1. Блокировки Event Loop и узкие места CPU на бэкенде

### 1.1. Анализ синхронных операций в основном потоке Node.js
Node.js работает в однопоточном цикле событий (Event Loop). Все пользовательские HTTP-запросы и фоновые задачи выполняются в общем потоке:
1. **Тяжелые синхронные SQL-запросы на каждый HTTP GET-запрос:**
   - `GET /api/arcanes`: При истечении короткого 15-секундного TTL выполняется тяжелый запрос на выборку каталога с 4 `LEFT JOIN` к подзапросам по таблицам `price_history_hourly` (с вычислением агрегатов `SUM`, `ROUND`, `GROUP BY`) и `price_history`. После этого синхронный `.map()` перебирает массив из сотен элементов, форматируя DTO.
   - `GET /api/rivens/lots/:slug`: Запрашивает из SQLite все лоты оружия (`SELECT * FROM riven_lots WHERE weapon_slug = ?`). Затем в цикле `rows.map()` для каждого лота вызывается синхронный `JSON.parse(r.attributes || '[]')`. При выдаче 200 лотов на пушку это 200 вызовов парсера JSON в теле обработчика запроса. При одновременном обращении 3–5 пользователей это приводит к микрофризам Event Loop на 25–60 мс.
   - `GET /api/rivens/weapons`: Делает `SELECT * FROM riven_weapons`, после чего выполняет синхронную фильтрацию `allRows.filter(...)` в памяти JavaScript с многократными вызовами `toLowerCase()` и `includes()`.
   - `GET /api/status`: При каждом вызове выполняет три последовательных `COUNT(*)` к таблицам `items`, `market_snapshots` (189 000+ строк) и `riven_lots` (73 000+ строк). Сканирование индексов для подсчета сотен тысяч строк при каждом запросе статуса нагружает диск и CPU.

2. **Последовательные вставки внутри транзакций в фоновых воркерах:**
   - В `rivenService.ts` (`syncWeaponLots`):
     ```ts
     await db.transaction(async () => {
       await db.run('DELETE FROM riven_lots WHERE weapon_slug = ?', [weaponSlug]);
       for (const lot of validLots) {
         await db.run(insertStmt, [...]); // До 200 отдельных асинхронных вызовов db.run
       }
     });
     ```
     В цикле до 200 раз вызывается `await db.run()`. Хотя транзакция открыта, каждый отдельный вызов `db.run` в библиотеке `sqlite3` проходит через очередь libuv и IPC к C++ аддону. В это время транзакционный мьютекс удерживает блокировку базы данных SQLite.
   - В `wsMarketClient.ts` (`flushSnapshots`):
     Каждые 2 секунды цикл `startDebounceLoop` сбрасывает грязные снепшоты в БД. Внутри транзакции для каждого предмета последовательно вызываются `await db.run(insertSnapshotSql)` и `await db.run(upsertLatestSql)`. При 20–50 измененных предметах это до 100 запросов `db.run` каждые 2 секунды, конкурирующих за мьютекс транзакций с пользовательскими запросами.

---

## 2. Аудит базы данных SQLite и индексов

### 2.1. Анализ планов выполнения запросов (`EXPLAIN QUERY PLAN`)
Диагностика реальной боевой базы `warframe_market.db` (104 МБ + 16 МБ WAL) выявила критические пропуски индексов:
1. **FULL TABLE SCAN при очистке архивов:**
   - `DELETE FROM market_snapshots WHERE timestamp < datetime('now', '-24 hours');`
     - **План:** `SCAN market_snapshots` — полный перебор 189 366 строк!
     - **Причина:** индекс `idx_snapshots_slug_time` построен по `(item_slug, timestamp)`, где `timestamp` стоит вторым полем. Запрос без фильтрации по `item_slug` не может использовать этот индекс.
   - `DELETE FROM price_history WHERE date < date('now', '-95 days');`
     - **План:** `SCAN price_history` — полный перебор всей истории!
     - **Причина:** индекс `idx_history_slug_date` построен по `(item_slug, date)`. Поле `date` не является ведущим.

2. **Временные B-деревья сортировки (`USE TEMP B-TREE FOR ORDER BY`):**
   - Запросы к `riven_lots`:
     - `SELECT * FROM riven_lots WHERE weapon_slug = 'torid' AND (seller_status = 'online' OR seller_status = 'ingame') ORDER BY COALESCE(buyout_price, starting_price, 999999) ASC;`
     - **План:** `SEARCH riven_lots USING INDEX idx_riven_lots_weapon_eff (weapon_slug=?)`, затем `USE TEMP B-TREE FOR ORDER BY`.
     - При фильтрации по статусу продавца и сортировке по цене SQLite вынужден создавать временное B-дерево в памяти для каждого запроса.
   - Запрос каталога оружия МР:
     - `SELECT * FROM riven_weapons WHERE group_type = 'primary' ORDER BY name_ru ASC;`
     - **План:** `SEARCH riven_weapons USING INDEX idx_riven_weapons_group (group_type=?)`, затем `USE TEMP B-TREE FOR ORDER BY`. Отсутствует индекс `(group_type, name_ru)`.

### 2.2. Анализ настроек PRAGMA в production
Текущие боевые настройки SQLite на сервере:
- `PRAGMA journal_mode`: `WAL` (корректно).
- `PRAGMA synchronous`: `2 (FULL)` — по умолчанию для новых подключений, что требует сброса буферов на диск при операциях записи. Требуется `NORMAL (1)`.
- `PRAGMA mmap_size`: `0` — отображение файлов в память отключено! Требуется `268435456` (256 МБ) для прямого чтения страниц из памяти ядра без системных вызовов `read()`.
- `PRAGMA cache_size`: `-2000` (всего 2 МБ кэша страниц!). Требуется `-64000` (64 МБ RAM) для удержания горячих страниц дерева в памяти.
- `PRAGMA temp_store`: `0 (FILE)` — временные таблицы и B-деревья сортировки пишутся во временные файлы на диск! Требуется `MEMORY (2)`.
- `PRAGMA busy_timeout`: `5000` мс.

### 2.3. Запросы без LIMIT и пагинации
- `SELECT * FROM riven_lots WHERE weapon_slug = ?`: не имеет серверного `LIMIT` и `OFFSET`. При расширении парсинга до сотен лотов на оружие весь объем данных выгружается и передается по сети целиком.
- В `server/src/index.ts` отсутствует серверная пагинация для списка лотов МР.

---

## 3. Аудит утечек памяти и ресурсов (Memory Leaks)

1. **Неограниченная очередь в `proxyPool.ts`:**
   - В `proxyPool.ts` массив `private queue: QueuedRequest[] = []` не имеет верхнего лимита (Max Queue Size). При всплеске запросов от пользователей или временном уходе всех 99 нод в кулдаун задачи продолжают накапливаться в массиве, удерживая в памяти замыкания `resolve` / `reject` и объекты запросов.
2. **WebSocket-подписки и переподключения в `wsMarketClient.ts`:**
   - При разрыве соединения метод `connect()` создает новый экземпляр `new WebSocket()`. При ошибках рукопожатия предыдущий сокет не всегда закрывается через `terminate()`, что может оставлять висящие файловые дескрипторы и обработчики событий.
   - Map `orderBooks` хранит все активные ордера в памяти. Отсутствует регулярная очистка устаревших ордеров (older than 24h), если событие удаления ордера было пропущено со стороны WFM.
3. **Кэш-мапы в Express:**
   - `arcaneDetailCache` и `rivenLotsCache` очищаются только при превышении размера 200 записей через итерацию в цикле `for...of`. Необходим LRU-алгоритм или автоматическая очистка по таймеру TTL.

---

## 4. Аудит фронтенда (React / UI / Network)

1. **Отсутствие мемоизации компонентов списков:**
   - В `RivensEndoView.tsx` карточки лотов (до 24 на страницу и до 200 в DOM при переключении страницы) рендерятся как анонимные JSX-блоки внутри `.map()`, не обернутые в `React.memo`.
   - В `SednaView.tsx` компонент `ArcaneCard` экспортируется без `React.memo`. При вводе каждого символа в поле поиска или при тихом фоновом обновлении данных все 24 карточки на экране полностью перерисовываются.
2. **Поисковые фильтры без дебаунса:**
   - Поля поиска в `RivensEndoView.tsx` (`searchQuery`) и `SednaView.tsx` (`searchQuery`) напрямую привязаны к `onChange={(e) => setSearchQuery(e.target.value)}`. При быстром наборе текста фильтрация сотен элементов запускается на каждое нажатие клавиши.
3. **Бесконечный фоновый поллинг без проверки видимости вкладки:**
   - В `RivensEndoView.tsx` таймер `setInterval(silentPoll, 8000)` опрашивает `/api/rivens/lots/:slug` каждые 8 секунд. Он продолжает слать HTTP-запросы даже тогда, когда вкладка свернута или не активна (`document.visibilityState === 'hidden'`).
   - Отсутствует `AbortController`: при быстром переключении между оружием в каталоге отправляется серия параллельных запросов, ответы на которые могут прийти в произвольном порядке (Race Condition) и перезаписать актуальные данные.
4. **Тяжелые графические CSS-свойства (GPU Overload):**
   - На карточках лотов МР в `RivensEndoView.tsx` задано:
     `backdrop-blur-xl border border-slate-200/90 dark:border-white/[0.08] hover:shadow-[0_12px_32px_rgba(0,229,255,0.18)]`
     Наличие `backdrop-blur-xl` на десятках карточек внутри скроллящегося контейнера заставляет браузер выполнять ресурсоемкий композитинг каждого кадра на GPU.
   - В `ArcaneCard.tsx` обработчик `onMouseMove={handleMouseMove}` на каждой карточке динамически обновляет переменные `--mouse-x` и `--mouse-y` для радиального градиента spotlight-эффекта, вызывая частый перерасчет стилей.

---

## 5. Аудит безопасности и надежности (Security & Code Smells)

1. **Хардкод секретов по умолчанию:**
   - В `server/src/index.ts`:
     - `process.env.ACCESS_KEY || 'tenno2026'`
     - `process.env.JWT_SECRET || 'orokin_void_key_secret_2026_warframe'`
   - В `server/src/auth/index.ts`:
     - `process.env.ADMIN_PASSWORD || 'tenno2026'`
2. **Открытые служебные POST-эндпоинты без авторизации:**
   - `/api/market/sync-catalog` (запуск синхронизации всего каталога WFM) — общедоступен без токена!
   - `/api/market/preload-images` (массовая загрузка картинок через прокси) — общедоступен без токена!
   - `/api/market/prewarm-sets` (прогрев всех 155 сетов и компонентов) — общедоступен без токена!
   - `/api/rivens/sync` (принудительный парсинг аукционов WFM) — общедоступен без токена! Любой пользователь интернета может отправить скриптом 100 запросов и перегрузить сервер и прокси-пул.
3. **Отсутствие Rate Limiting:**
   - На публичных роутах отсутствует лимитер запросов по IP. При DDOS или агрессивном скрапинге сервер будет тратить ресурсы на обработку входящего флуда.
4. **Отсутствие HTTP-компрессии на уровне Express:**
   - В `server` не подключен middleware `compression`. Если запрос идет мимо Nginx (или при локальной разработке/тестах), JSON передается в несжатом виде.

---

## 6. План внедрения архитектурных исправлений

| № | Компонент | Мероприятие | Ожидаемый эффект |
| :--- | :--- | :--- | :--- |
| **1** | `memoryCache.ts` | Создание централизованного in-memory кэша для `/api/arcanes`, `/api/rivens/weapons`, `/api/rivens/lots/*`, `/api/status` | Время ответа GET-запросов **0.2–1 мс**, 0 обращений к SQLite при повторных запросах |
| **2** | `db/index.ts` | Установка PRAGMA (`WAL`, `synchronous=NORMAL`, `mmap_size=256MB`, `cache_size=64MB`, `temp_store=MEMORY`) и создание недостающих индексов | Ликвидация FULL TABLE SCAN, ускорение выборок в 10–50 раз |
| **3** | `rivenService.ts` / `scraper.ts` | Пакетная вставка транзакций (`chunked/batch insert`) и разгрузка Event Loop через `setImmediate()` | Устранение блокировок Event Loop во время парсинга |
| **4** | `index.ts` | Закрытие внутренних роутов проверкой мастер-токена, внедрение rate-limiter, компрессии `compression` и сбор метрик Event Loop lag | Защита от флуда и телеметрия задержек в `/api/status` |
| **5** | Фронтенд (React) | Мемоизация карточек (`React.memo`), дебаунс поиска (250 мс), отключение поллинга при `hidden`, удаление тяжелых `backdrop-blur` | Плавные 60 fps при скролле и нулевая нагрузка на процессор клиента |
