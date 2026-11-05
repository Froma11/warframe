# 🛡️ Інструкція для нового агента: Розробка та Деплой на `zero.nofuture.me`

> **Призначення:** Цей документ створено спеціально для передачі новому ШІ-асистенту (Antigravity, Cursor, Claude Code тощо) у новий чат нового проєкту. Він описує конфігурацію сервера, правила безпеки та регламент деплою, щоб не пошкодити вже працюючі на сервері сервіси.

---

## ⛔ СУВОРІ ПРАВИЛА БЕЗПЕКИ (DO NOT TOUCH!)

На цьому сервері (Contabo VPS) **вже працює бойовий університетський портал UniHub** (`nofuture.me`).  
Новий агент зобов'язаний дотримуватися повної ізоляції:

1. **ЗАБОРОНЕНО торкатися `/var/www/html/`** — це директорія фронтенду UniHub.
2. **ЗАБОРОНЕНО торкатися `/etc/nginx/sites-available/default`** — це конфіг основного домену `nofuture.me`.
3. **ЗАБОРОНЕНО чіпати або зупиняти сервіси:**
   - `unihub-api.service` (бекенд UniHub)
   - `zoom_checker` (фоновий демон моніторингу)
4. **ЗАБОРОНЕНО чіпати базу даних:**
   - `/var/www/data/unihub.db`
5. **ЗАЙНЯТІ ПОРТИ НА СЕРВЕРІ:**
   - `80`, `443` — Nginx (глобальний реверс-проксі)
   - `5000` — UniHub API Backend
   - `3005` — Zoom Sniper Daemon
   - 👉 **Для нового проєкту використовувати ТІЛЬКИ вільні порти:** наприклад `3000`, `4000`, `5001`, `8000`, `8080`.

---

## 🖥️ Параметри сервера

* **Хостинг:** Contabo Cloud VPS (Ubuntu 24.04 LTS)
* **IP-адреса:** `75.119.157.81`
* **Користувач:** `ubuntu` (має повні sudo-права без пароля)
* **Домен нового проєкту:** `zero.nofuture.me`
* **Шлях до SSH-ключа на ПК розробника (Windows):**
  `C:\Users\black\Downloads\ssh-key-2026-09-15.key`
* **Команда для підключення з PowerShell:**
  ```powershell
  ssh -i "C:\Users\black\Downloads\ssh-key-2026-09-15.key" -o StrictHostKeyChecking=no ubuntu@75.119.157.81
  ```

---

## 📁 Робоча директорія нового проєкту на VPS

* Для проєкту `zero` виділяється окрема директорія:
  `/var/www/zero/`
* Команда створення директорії та видачі прав:
  ```bash
  sudo mkdir -p /var/www/zero
  sudo chown -R ubuntu:www-data /var/www/zero
  sudo chmod -R 775 /var/www/zero
  ```

---

## 🌐 Налаштування Nginx для `zero.nofuture.me`

Конфігурація повинна жити в **окремому файлі**:
`/etc/nginx/sites-available/zero.nofuture.me`

### Сценарій А: Якщо проєкт — статичний фронтенд (React / Vite / Vue / HTML)
Створіть файл `/etc/nginx/sites-available/zero.nofuture.me`:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name zero.nofuture.me;

    root /var/www/zero; # або /var/www/zero/dist
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

### Сценарій Б: Якщо проєкт — бекенд або SSR (Node.js / Next.js / Python на порту, наприклад, 4000)
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name zero.nofuture.me;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Активація конфігурації:
```bash
sudo ln -sf /etc/nginx/sites-available/zero.nofuture.me /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Випуск безкоштовного SSL-сертифіката (HTTPS)

Після того, як A-запис `zero` направили на IP `75.119.157.81` і Nginx налаштовано:
```bash
sudo certbot --nginx -d zero.nofuture.me
```
*Certbot автоматично оновить конфіг `/etc/nginx/sites-available/zero.nofuture.me`, пропише SSL і налаштує авто-подовження.*

---

## 🚀 Як виконувати деплой (Процес релізу)

### Варіант 1: Швидкий деплой білда (SPA / React / Vite) з локального ПК
1. Зібрати проєкт локально:
   ```powershell
   npm run build
   ```
2. Запакувати теку `dist`:
   ```powershell
   tar -czf zero-dist.tar.gz -C dist .
   ```
3. Відправити архів на сервер:
   ```powershell
   scp -i "C:\Users\black\Downloads\ssh-key-2026-09-15.key" -o StrictHostKeyChecking=no zero-dist.tar.gz ubuntu@75.119.157.81:/tmp/
   ```
4. Розпакувати на сервері в папку проєкту:
   ```powershell
   ssh -i "C:\Users\black\Downloads\ssh-key-2026-09-15.key" -o StrictHostKeyChecking=no ubuntu@75.119.157.81 "sudo tar -xzf /tmp/zero-dist.tar.gz -C /var/www/zero/ && sudo chown -R www-data:ubuntu /var/www/zero && sudo systemctl reload nginx && rm -f /tmp/zero-dist.tar.gz"
   ```
5. Видалити локальний архів:
   ```powershell
   Remove-Item zero-dist.tar.gz
   ```

### Варіант 2: Якщо у нового проєкту є бекенд (Node.js / Python)
1. Створити окремий systemd-сервіс для автозапуску:
   Файл: `/etc/systemd/system/zero-app.service`
   ```ini
   [Unit]
   Description=Zero Project Backend Service
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/var/www/zero
   ExecStart=/usr/bin/node /var/www/zero/server.js
   Restart=always
   RestartSec=5
   Environment=NODE_ENV=production PORT=4000

   [Install]
   WantedBy=multi-user.target
   ```
2. Увімкнути та запустити:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now zero-app.service
   ```
3. При деплоях нових версій:
   ```bash
   sudo systemctl restart zero-app.service
   ```

---

## 📋 Чеклист перед кожним деплоєм
- [ ] Перевірено, що цільова папка — `/var/www/zero/` (а НЕ `/var/www/html/`).
- [ ] Порт бекенду НЕ перетинається з `5000` або `3005`.
- [ ] Nginx перевірено командою `sudo nginx -t` перед перезавантаженням.
- [ ] Домен `zero.nofuture.me` повертає статус 200/HTTPS.
