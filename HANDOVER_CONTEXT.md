# 🌌 Warframe Market Intelligence & Trading Terminal — Handover Guide

> **Назначение документа**: Этот файл содержит полное и исчерпывающее описание архитектуры, функционала, базы данных SQLite, API, правил разработки, регламента боевого деплоя и истории изменений проекта **Warframe Market Analytics**.  
> Он предназначен для передачи контекста любому новому ИИ-ассистенту (Antigravity, Cursor, Claude Code и др.) для мгновенного продолжения работы в новом чате без потери деталей.

---

## 📌 1. Обзор проекта и концепция

Проект представляет собой высокоскоростной торговый терминал и аналитический хаб для игры **Warframe**, разработанный в аутентичной эстетике интерфейса Tenno (Star Chart, Void Energy, Glassmorphism, Orokin accents) с максимальной эргономикой для торговли и арбитража на **warframe.market**.

### 🌟 Ключевые функциональные модули:

1. **Звездная карта (Star Chart / Orrery) — Главное меню**:
   - Интерактивная трехмерная звездная карта на базе Three.js с орбитами, солнцем, планетами и эффектами «живого космоса» (мерцающие звезды, падающие метеоры, космические туманности).
   - Узлы навигации ведут в четыре основных функциональных раздела:
     - 🪐 **Маркет (бывш. Седна)** — Терминал мистификаторов.
     - 🌍 **Профиль (бывш. Земля)** — Личный кабинет, приватные заметки, памятка рангов.
     - 🌕 **МР в Эндо (бывш. Венера)** — Аналитика и арбитраж модов разлома.
     - 🔴 **Оценка модов (Марс)** — Модуль оценки и аналитики модов.

2. **Каталог Мистификаторов (Маркет / Седна)**:
   - Полный каталог по 170 мистификаторам с реальными ценами Warframe Market.
   - Поиск на двух языках (RU и EN), официальная русская локализация из игры.
   - Фильтры по тирам редкости (Common, Uncommon, Rare, Legendary) и категориям.
   - Сортировки по профиту, популярности, спредам, снайпинг-скидкам.
   - Быстрые спарклайны цен в карточках с динамическим градиентом.

3. **Детальная аналитика мистификатора (Arcane Drawer)**:
   - Интерактивный кинематический график цен с неоновым свечением «лазерной нити Бездны» (Void Energy Beam) и скраббингом при наведении курсора.
   - Переключение рангов (Ранг 0 vs Макс Ранг R5/R3).
   - Таймфреймы:
     - **24H** — отображает **реальные часы** сделок за последние сутки (`14:00`, `18:00`, `22:00` и т.д.) с количеством завершенных сделок в этот час.
     - **7D, 30D, 90D** — суточная история цен с автоматической агрегацией текущего дня.
   - Метрики: Скорость сбыта (сделок в час), Дисконт стакана, Диапазон цен, прямая ссылка на warframe.market.

4. **МР в Эндо / Арбитраж Модов Разлома (Венера)**:
   - Анализ 420+ видов оружия (Винтовки, Дробовики, Пистолеты, Ближний бой, Комплекты, Арчвинг).
   - Официальный каталог оружия из API Warframe Market с синергией (disposition) и требованиями ранга мастерства.
   - Расчет растворения в Эндо по официальной формуле DE с учетом ранга и количества роллов (рероллов):
     $$\text{Endo} = (\text{MR} - 8) \times 100 + \text{Rank} \times 22.5 + \text{Rerolls} \times 200$$
   - Расчет эффективности растворения: **Эндо / 1 Платина** ($\text{Endo} / \text{Price}$).
   - Мгновенная клиентская фильтрация (`useMemo`):
     - Тип лота: «Все», «Прямая покупка» (`is_direct_sell`), «Аукционы».
     - Статус продавца: «Только онлайн / в игре» или «Все».
     - Сортировка: «Макс Эндо/Платина», «Мин цена», «Макс Эндо».
   - Пагинация по 15 лотов с динамической навигацией страниц.
   - Детальная модалка лота с подсветкой положительных/отрицательных характеристик и кнопкой копирования текста шепота `/w [seller] Hi! ...`.

5. **Личный кабинет оператора (Профиль / Земля)**:
   - Авторизация оператора (JWT + bcrypt в SQLite).
   - **Заметки**: максимально упрощенный и эргономичный блок без лишних полей (заголовок и категории удалены). Простое быстрое поле ввода текста, сохранение по кнопке или `Ctrl + Enter`.
   - Кнопка копирования заметки копирует **исключительно текст заметки** без каких-либо служебных префиксов или заголовков.
   - Памятка прокачки мистификаторов (таблица 21 копии для R5 + переключатель на оригинальный PNG с возможностью скачивания).

6. **Двухтемный интерфейс (Dark / Light)**:
   - Глубокая космическая темная тема по умолчанию + светлая тема для карточек и таблиц.
   - ⚠️ **Звездная карта ВСЕГДА остается в космической темноте**.

---

## 🛠 2. Стек технологий и архитектура

### Frontend:
- **React 19** + **TypeScript** + **Vite 8**
- **Tailwind CSS 3.4** с плагином поддержки селекторов `:root.light` и `@layer base`
- **Шрифты**:
  - `Comfortaa` (`@fontsource/comfortaa`) — стилизованные заголовки, кнопки меню, бейджи
  - `Onest` (`@fontsource/onest`) — основной интерфейсный текст, таблицы, списки
  - `JetBrains Mono` / `Raleway` — моноширинные числовые показатели, таймкоды, технические данные
- **Three.js** — интерактивное 3D Оррери звездной карты Warframe
- **Lucide React** — векторная графика и иконки
- **Аутентичные ассеты**: Векторная иконка платины (`PlatinumIcon.tsx`), аутентичный значок Эндо (`endo_icon.png` / `EndoIcon.tsx`).

### Backend:
- **Node.js** + **Express** + **TypeScript**
- **База данных**: **SQLite** (режим WAL — Write-Ahead Logging) через `sqlite3` / `sqlite` промисы
- **Безопасность**: `bcryptjs` для хеширования паролей, `jsonwebtoken` для JWT-токенов, `cookie-parser` с `httpOnly` куками
- **Фоновые сервисы**:
  - `scraper.ts` — регулярная синхронизация (каждые 15 минут) цен, стаканов, суточных объемов, истории 90 дней и почасовой истории 48 часов для 170 мистификаторов.
  - `rivenService.ts` — фоновый парсинг лотов модов разлома (каждые 30 секунд цикл ротации по активному оружию), пакетные транзакции (`BEGIN TRANSACTION` / `COMMIT`) для мгновенной записи тысяч лотов за 15 мс.

---

## 🌐 3. Боевой сервер, хостинг и регламент деплоя

### Параметры VPS:
- **Хостинг**: Contabo Cloud VPS (Ubuntu 24.04 LTS)
- **IP-адрес**: `75.119.157.81`
- **Пользователь**: `ubuntu` (sudo без пароля)
- **Боевой домен**: **https://zero.nofuture.me**
- **SSH-ключ на компьютере разработчика (Windows)**:
  `C:\Users\black\Downloads\ssh-key-2026-09-15.key`
- **Рабочая директория проекта на сервере**: `/var/www/zero/`
- **Служба systemd**: `zero-app.service`
- **Скрипт автоматического деплоя**: `/var/www/zero/deploy.sh`

### ⛔ СТРОЖАЙШИЙ РЕГЛАМЕНТ БЕЗОПАСНОСТИ (UniHub Isolation):
На этом же сервере работает боевой портал университета **UniHub** (`nofuture.me`).
**КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО**:
1. Трогать директорию `/var/www/html/` (фронтенд UniHub).
2. Редактировать `/etc/nginx/sites-available/default` (конфиг `nofuture.me`).
3. Трогать сервисы `unihub-api.service` и `zoom_checker`.
4. Занимать порты `5000` (UniHub API) и `3005` (Zoom Sniper).
5. Наш проект `zero` изолирован:
   - Слушает локальный порт `4000` (`http://localhost:4000`).
   - Nginx проксирует поддомен `zero.nofuture.me` на порт `4000` через отдельный конфиг `/etc/nginx/sites-available/zero.nofuture.me`.

---

## 🚀 4. Инструкция по обновлению и деплою (Deploy Flow)

Любые доработки выполняются локально в репозитории `D:\rezerv\warframecomeback`, коммитятся, пушатся на GitHub и раскатываются одной командой на VPS:

### Шаг 1: Проверка и коммит локально (PowerShell):
```powershell
# Проверить статус
git status

# Добавить изменения
git add .

# Сделать коммит
git commit -m "feat(module): описание изменений"

# Запушить в GitHub
git push origin main
```

### Шаг 2: Запуск автоматического деплоя на боевом сервере:
```powershell
ssh -i "C:\Users\black\Downloads\ssh-key-2026-09-15.key" -o StrictHostKeyChecking=no ubuntu@75.119.157.81 "bash /var/www/zero/deploy.sh"
```

### Что делает скрипт `/var/www/zero/deploy.sh`:
1. `git pull origin main` — затягивает свежие коммиты.
2. `npm --prefix client run build` — компилирует React-бандл в `client/dist`.
3. `npm --prefix server run build` — компилирует TypeScript бэкенда в `server/dist`.
4. `sudo systemctl restart zero-app.service` — перезапускает сервис с нулевым простоем.
5. Выводит статус `zero-app.service`.

### Полезные команды диагностики VPS:
```powershell
# Проверить логи бэкенда в реальном времени:
ssh -i "C:\Users\black\Downloads\ssh-key-2026-09-15.key" -o StrictHostKeyChecking=no ubuntu@75.119.157.81 "journalctl -u zero-app.service --no-pager -n 30"

# Проверить статус службы:
ssh -i "C:\Users\black\Downloads\ssh-key-2026-09-15.key" -o StrictHostKeyChecking=no ubuntu@75.119.157.81 "sudo systemctl status zero-app.service --no-pager"

# Проверить доступность сайта по HTTPS:
curl.exe -s -I https://zero.nofuture.me
```

---

## 🗄 5. База данных SQLite (`warframe_market.db`)

Путь к базе данных:
- Локально: `server/data/warframe_market.db`
- На VPS: `/var/www/zero/server/data/warframe_market.db`

Включен режим `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`.

### Структура таблиц:

1. **`users`**:
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `username` (TEXT UNIQUE NOT NULL)
   - `password_hash` (TEXT NOT NULL)
   - `theme` (TEXT DEFAULT 'dark')
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

2. **`notes`**:
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE)
   - `title` (TEXT DEFAULT '')
   - `content` (TEXT NOT NULL) — основной текст заметки
   - `tag` (TEXT DEFAULT '')
   - `created_at`, `updated_at` (DATETIME)

3. **`items` (Каталог мистификаторов)**:
   - `id` (TEXT PRIMARY KEY)
   - `slug` (TEXT UNIQUE NOT NULL) — идентификатор Warframe Market (например, `arcane_energize`)
   - `name_en` (TEXT NOT NULL), `name_ru` (TEXT NOT NULL)
   - `rarity` (TEXT), `max_rank` (INTEGER DEFAULT 5)
   - `icon_url`, `thumb_url`, `effect`, `tags`, `trading_tax`
   - `updated_at` (DATETIME)

4. **`market_snapshots`**:
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `item_slug` (TEXT NOT NULL)
   - `rank` (INTEGER NOT NULL)
   - `min_sell`, `max_buy`, `spread`, `spread_pct`, `median_price`
   - `sellers_count`, `buyers_count`
   - `timestamp` (DATETIME DEFAULT CURRENT_TIMESTAMP)

5. **`price_history` (Суточная история торгов)**:
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `item_slug` (TEXT NOT NULL), `rank` (INTEGER NOT NULL), `date` (TEXT NOT NULL, `YYYY-MM-DD`)
   - `median_price` (REAL NOT NULL), `volume` (INTEGER DEFAULT 0), `min_price`, `max_price`
   - `UNIQUE(item_slug, rank, date)`
   - *Примечание*: Текущий незавершенный день автоматически агрегируется из почасовых данных `price_history_hourly`.

6. **`price_history_hourly` (Почасовая история за 48 часов)**:
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `item_slug` (TEXT NOT NULL), `rank` (INTEGER NOT NULL), `datetime` (TEXT NOT NULL, ISO)
   - `median_price` (REAL NOT NULL), `volume` (INTEGER DEFAULT 0), `min_price`, `max_price`
   - `UNIQUE(item_slug, rank, datetime)`

7. **`riven_weapons` (Каталог оружия модов разлома)**:
   - `id` (TEXT PRIMARY KEY), `slug` (TEXT UNIQUE NOT NULL)
   - `name_en` (TEXT NOT NULL), `name_ru` (TEXT NOT NULL)
   - `group_type` (TEXT: `rifle`, `shotgun`, `pistol`, `melee`, `kitgun`, `zaw`, `archwing`)
   - `riven_type` (TEXT)
   - `disposition` (REAL DEFAULT 1.0) — синергия от 0.5 до 1.55 (1–5 точек)
   - `req_mr` (INTEGER DEFAULT 0)
   - `icon_url`, `thumb_url`

8. **`riven_lots` (Лоты аукционов и прямых продаж МР)**:
   - `id` (TEXT PRIMARY KEY) — ID аукциона Warframe Market
   - `weapon_slug` (TEXT NOT NULL)
   - `seller_name` (TEXT NOT NULL), `seller_status` (`ingame` | `online` | `offline`), `seller_reputation` (INTEGER)
   - `is_direct_sell` (BOOLEAN) — прямая покупка или аукцион со ставками
   - `buyout_price` (INTEGER) — цена выкупа в платине
   - `starting_price`, `top_bid` (INTEGER)
   - `mod_name` (TEXT), `mod_rank` (INTEGER), `re_rolls` (INTEGER), `mastery_level` (INTEGER), `polarity` (TEXT)
   - `attributes` (TEXT JSON) — статы мода
   - `endo_value` (INTEGER) — рассчитанное количество эндо при растворении
   - `efficiency` (REAL) — показатель Эндо / 1 Платина
   - `lot_created_at`, `lot_updated_at`, `fetched_at` (DATETIME)

---

## 🔌 6. Спецификация REST API

Все эндпоинты работают с префиксом `/api`:

### Аутентификация:
- `GET /api/auth/check` — Проверка сессии гейткипера и оператора.
- `POST /api/auth/gate` — Ввод мастер-пароля терминала (`tenno2026`).
- `POST /api/auth/register` — Регистрация `{ username, password }`.
- `POST /api/auth/login` — Вход `{ username, password }`.
- `POST /api/auth/logout` — Выход из сессии.
- `GET /api/auth/me` — Данные текущего пользователя.
- `PUT /api/auth/theme` — Переключение темы `{ theme: 'dark' | 'light' }`.

### Заметки оператора:
- `GET /api/notes` — Получение заметок пользователя.
- `POST /api/notes` — Создание `{ content }`.
- `PUT /api/notes/:id` — Редактирование `{ content }`.
- `DELETE /api/notes/:id` — Удаление заметки.

### Каталог мистификаторов:
- `GET /api/arcanes` — Список 170 предметов со сводными метриками.
- `GET /api/arcanes/:slug` — Детальная карточка с суточной (`history`) и почасовой (`hourly`) телеметрией.
- `GET /api/status` — Системный статус фонового скрапера.

### Моды Разлома (МР в Эндо):
- `GET /api/rivens/weapons?search=&group=` — Каталог 420+ видов оружия с поиском и категориями.
- `GET /api/rivens/lots?weapon=&sortBy=&order=&isDirectSell=&onlineOnly=&page=&limit=` — Получение лотов по выбранному оружию с расчетом эндо и эффективности.
- `POST /api/rivens/sync/:weaponSlug` — Ручной запуск парсинга свежих лотов с warframe.market.

---

## 🎨 7. Важнейшие правила UI/UX и договоренности с пользователем

1. **Поведение всех модальных окон (Strict Modal UX Rule)**:
   - **ВСЕ БЕЗ ИСКЛЮЧЕНИЯ** модалки и панели в проекте (`NoteModal`, `NoteDetailModal`, `AuthModal`, `ArcaneDrawer`, `ArcaneDetailModal`, `RivenDetailModal`):
     - **Закрываются по нажатию Escape**: перехватчик событий настроен на фазе `capture: true` (`window.addEventListener('keydown', handleKeyDown, true)`), поэтому Escape закрывает окно даже если курсор находится в поле ввода (`textarea` или `input`).
     - **Закрываются по клику в пустоту / бэкдроп**: проверка `e.target === e.currentTarget` для `onClick` и `onMouseDown`, а на внутреннем теле модалки установлен `e.stopPropagation()`.
2. **Шапка сайта (Fixed Header)**:
   - Зафиксирована на экране (`fixed top-0 left-0 right-0 h-[57px] backdrop-blur-xl z-50`).
   - На страницах контента добавлен верхний отступ `pt-[57px]`, чтобы шапка не перекрывала элементы.
   - Кнопка **«В главное меню»** всегда доступна при скролле.
   - Логотип «Warframe» выполнен контрастным белым цветом со свечением и неоновым акцентом `#00e5ff`.
3. **Отсутствие полос прокрутки (No Scrollbar Slop)**:
   - Полоса прокрутки имеет прозрачный трек (`background: transparent !important`) и аккуратный полупрозрачный ползунок.
   - На экране Звездной карты скролл на `body` и контейнере заблокирован (`overflow: hidden`), паразитные серые полосы отсутствуют.
4. **Мгновенная фильтрация в МР в Эндо**:
   - Переключение фильтров (прямая продажа/аукцион, онлайн/все, сортировки) выполняется мгновенно в памяти клиента (`useMemo`) без лишних спиннеров и сетевых задержек.
5. **Заметки (Clean Notes)**:
   - Никаких полей «Заголовок» и «Категория». Только чистое поле ввода заметки.
   - Кнопка копирования копирует **исключительно полезный текст заметки**.
6. **Названия на Звездной карте**:
   - Никаких названий планет! Только названия функциональных модулей: **«Маркет»**, **«Профиль»**, **«МР в Эндо»**.
7. **Абсолютная изоляция темы космоса**:
   - Экран Звездной карты (`StarChartView`) всегда остается в глубокой космической темноте (`#020509`), независимо от выбранной темы в разделах.
8. **Официальные значки**:
   - Использовать только официальные или аутентичные векторные значки (Платина, Эндо), никаких неподходящих эмодзи или машинных иконок.

---

## 🪐 8. Регламент: Как добавить новую планету-вкладку на Звездную карту

В кодовой базе реализована модульная система добавления новых разделов через интерактивное 3D Оррери. Для подключения нового экрана необходимо выполнить 3 простых шага:

### Шаг 1: Добавить текстуру планеты
1. Поместить круглое изображение планеты без фона (PNG с прозрачностью, 1:1 соотношение сторон) в директорию `client/public/` (например, `client/public/mars_clean.png`).

### Шаг 2: Зарегистрировать вкладку в навигации (`client/src/App.tsx`)
1. Расширить тип `activeTab`:
   ```typescript
   const [activeTab, setActiveTab] = useState<'starchart' | 'sedna' | 'earth' | 'venus' | 'new_tab'>('starchart');
   ```
2. Создать и импортировать компонент экрана (например, `import { NewTabView } from './components/newtab/NewTabView';`).
3. Добавить его в условный рендеринг:
   ```tsx
   {activeTab === 'sedna' ? (
     <SednaView ... />
   ) : activeTab === 'venus' ? (
     <RivensEndoView lang={lang} />
   ) : activeTab === 'earth' ? (
     <ProfileView lang={lang} />
   ) : (
     <NewTabView lang={lang} />
   )}
   ```

### Шаг 3: Разместить планету в `client/src/components/StarChartView.tsx`
В файле `StarChartView.tsx` уже размечены готовые резервные орбитальные слоты (`RESERVED ORBITAL SLOTS`):
- **Слот 1 (Нижний-правый, Орбита 2)**: `left: calc(50% + 220px)`, `top: calc(50% + 95px)`
- **Слот 2 (Верхний-центр, Орбита 4)**: `left: calc(50% + 50px)`, `top: calc(50% - 220px)`
- **Слот 3 (Дальний-левый, Орбита 4)**: `left: calc(50% - 460px)`, `top: calc(50% + 10px)`

**Что нужно сделать в коде**:
1. Обновить типы в `StarChartViewProps` и стейте `selectedPlanet`, добавив `'new_tab'`.
2. Заменить маркер резервного слота на полноценную интерактивную планету по единому стандарту Warframe:
   ```tsx
   <div
     onClick={() => handlePlanetClick('new_tab')}
     className={`group absolute cursor-pointer flex flex-col items-center transition-all duration-500 ease-out z-20 ${
       isTransitioning && selectedPlanet !== 'new_tab' ? 'opacity-0 pointer-events-none' : 'opacity-100'
     }`}
     style={{
       left: 'calc(50% + 220px)',
       top: 'calc(50% + 95px)',
       // Вектор сближения: обратный смещению точки для центрирования на экране
       transform: selectedPlanet === 'new_tab'
         ? 'translate(-220px, -95px) scale(2.4)'
         : 'translate(-50%, -50%) scale(1)',
       transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
     }}
   >
     {/* Сфера со светотенью и вращением */}
     <div className="relative w-36 h-36 rounded-full aspect-square shrink-0 overflow-hidden shadow-[0_0_35px_rgba(0,229,255,0.45),inset_-18px_-18px_36px_rgba(0,0,0,0.95)] group-hover:scale-105 group-hover:shadow-[0_0_55px_rgba(0,229,255,0.75)] transition-all duration-300">
       <img
         src="/new_planet_clean.png"
         alt="New Section"
         className="w-full h-full object-cover select-none pointer-events-none animate-sedna-spin aspect-square"
         style={{ animationDuration: '100s' }}
       />
       {/* Светотеневой блик от центрального Солнца */}
       <div
         className="absolute inset-0 rounded-full pointer-events-none aspect-square"
         style={{
           background: 'radial-gradient(circle at 28% 28%, rgba(255, 210, 150, 0.35) 0%, transparent 60%)',
           boxShadow: 'inset 0 0 20px rgba(0, 229, 255, 0.55)',
         }}
       />
     </div>

     {/* Голографический бейдж: СТРОГО функциональное название, без планетных имен */}
     <div className={`flex flex-col items-center mt-3.5 transition-all duration-200 ${
       selectedPlanet === 'new_tab' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
     }`}>
       <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#040e18]/90 border border-[#00e5ff]/60 shadow-[0_0_16px_rgba(0,229,255,0.4)] group-hover:border-[#00e5ff] group-hover:bg-[#061524] group-hover:shadow-[0_0_24px_rgba(0,229,255,0.7)] group-hover:scale-105 transition-all">
         <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
         <span className="text-xs sm:text-sm font-comfortaa font-bold text-white tracking-wider uppercase">
           {lang === 'ru' ? 'Название раздела' : 'Section Name'}
         </span>
       </div>
     </div>
   </div>
   ```

---

## 🚫 9. Критические ограничения для ИИ

1. **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО ДЕЛАТЬ АВТОМАТИЧЕСКИЕ СКРИНШОТЫ**:
   - Пользователь дал прямое указание: не делать скриншоты после каждого ответа.
   - Не запускать утилиты скриншотов или Playwright, если пользователь прямо об этом не попросил.
2. **СТРОГО СОБЛЮДАТЬ ИЗОЛЯЦИЮ СЕРВЕРА**:
   - Не трогать UniHub (`/var/www/html/`, `/etc/nginx/sites-available/default`, порты `5000` и `3005`).
3. **POWERSHELL СИНТАКСИС НА WINDOWS**:
   - Локальная ОС пользователя — Windows (PowerShell). Символ `&&` не работает в стандартном PowerShell 5.1; использовать `;` или отдельные строки.
4. **ФОНОВЫЕ ПРОЦЕССЫ**:
   - Не оставлять висеть ненужные процессы в фоне. Все вспомогательные задачи после выполнения должны завершаться.

---

## 📂 10. Архитектура директорий проекта

```
warframecomeback/
├── client/                                  # React Frontend (Vite 8, Tailwind)
│   ├── public/
│   │   ├── arcane_upgrade_guide.png         # Памятка прокачки мистификаторов
│   │   ├── earth_clean.png                  # Текстура Земли (Профиль)
│   │   ├── endo_icon.png                    # Аутентичный значок Эндо
│   │   ├── mars_clean.png                   # Текстура Марса (Оценка модов)
│   │   ├── sedna_clean.png                  # Текстура Седны (Маркет)
│   │   └── venus_clean.png                  # Текстура Венеры (МР в Эндо)
│   ├── src/
│   │   ├── assets/                          # Шрифты Raleway, JetBrains Mono
│   │   ├── components/
│   │   │   ├── mod-appraisal/               # Модуль Оценки модов (Марс)
│   │   │   │   └── ModAppraisalView.tsx
│   │   │   ├── profile/                     # Блок профиля и заметок
│   │   │   │   ├── ArcaneUpgradeGuide.tsx
│   │   │   │   ├── AuthModal.tsx            # Модалка логина/регистрации
│   │   │   │   ├── NoteDetailModal.tsx      # Детальный просмотр и копирование
│   │   │   │   ├── NoteModal.tsx            # Создание/редактирование заметки
│   │   │   │   ├── NotesGrid.tsx            # Сетка заметок
│   │   │   │   ├── ProfileView.tsx
│   │   │   │   └── UserHeaderCard.tsx
│   │   │   ├── rivens/                      # Модуль МР в Эндо (Венера)
│   │   │   │   ├── EndoIcon.tsx             # Векторный значок Эндо
│   │   │   │   ├── RivenDetailModal.tsx     # Модалка детального лота МР
│   │   │   │   ├── RivenLotCard.tsx         # Карточка лота с эффективностью
│   │   │   │   └── RivensEndoView.tsx       # Экран каталога оружия и лотов
│   │   │   ├── ArcaneCard.tsx               # Карточка мистификатора
│   │   │   ├── ArcaneDrawer.tsx             # График цен и аналитика мистика
│   │   │   ├── GatekeeperScreen.tsx         # Экран мастер-пароля tenno2026
│   │   │   ├── Header.tsx                   # Фиксированная верхняя навигация
│   │   │   ├── PlatinumIcon.tsx             # Векторная иконка платины
│   │   │   ├── SednaView.tsx                # Каталог Маркета
│   │   │   └── StarChartView.tsx            # 3D Оррери звездной карты
│   │   ├── context/
│   │   │   └── ThemeContext.tsx             # Управление темной/светлой темой
│   │   ├── types/
│   │   │   ├── arcane.ts
│   │   │   └── riven.ts
│   │   ├── App.tsx                          # Роутер состояний экранов
│   │   ├── index.css                        # Стили, переменные, скроллбар
│   │   └── main.tsx
│   └── package.json
├── server/                                  # Express Backend
│   ├── data/
│   │   └── warframe_market.db               # SQLite база данных (WAL)
│   ├── src/
│   │   ├── db/
│   │   │   └── index.ts                     # Инициализация всех таблиц и миграций
│   │   ├── services/
│   │   │   ├── scraper.ts                   # Скрапер мистификаторов и истории
│   │   │   └── rivenService.ts              # Каталог 420 видов оружия и лоты МР
│   │   ├── auth.ts                          # JWT и куки авторизации
│   │   └── index.ts                         # REST API роуты
│   └── package.json
├── HANDOVER_CONTEXT.md                      # Данный документ передачи контекста
├── ZERO_SUBDOMAIN_AGENT_GUIDE.md            # Инструкция изоляции боевого VPS
└── package.json
```

---

## 🏆 11. Последние коммиты и текущий статус

- `1cab404`: fix(ui): brand logo contrast, remove scrollbar strip, instant client-side riven filtering, and fixed sticky header
- `b93d3ab`: feat(profile): streamline notes UI, remove redundant title & categories, fix copy to text-only
- `d121cf6`: fix(modal): ensure all modals close reliably on Escape and backdrop click
- `c37ca01`: fix(arcanes): capture hourly trades (48h), aggregate current-day stats into price history, and display accurate 24h timeline
- **Текущее состояние**: Сайт полностью собран, протестирован, задеплоен на `https://zero.nofuture.me`, база данных на VPS активно наполняется лотами и почасовой статистикой. Фоновые процессы на локальной машине очищены.
