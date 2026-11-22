# «Є Світло» — графіки відключень світла у Львові та Львівській області

Мобільний додаток та бекенд для відстеження погодинних відключень електроенергії (ГПВ) ПрАТ «Львівобленерго» з точністю до **30 хвилин** (48 півгодинних слотів на добу).

## Основні можливості

- **Пошук по м. Львів та всій Львівській області** (понад 2 000 населених пунктів) з автоматичним визначенням черги/підгрупи (`1.1`–`6.2`) та однорядковим введенням `вулиця + будинок` (`вел 50`, `городоцька 12/2`).
- **Графічна сітка 4×6** на «Сьогодні» та «Завтра» з підтримкою півгодинних відключень (візуальне розділення комірки 50/50), підсвіткою поточної години та деталями по тапу.
- **Зворотний відлік** до наступного відключення або увімкнення та **офлайн-кеш** (Zustand + AsyncStorage).
- **Сповіщення для основної локації:**
  - **Remote Push (FCM v1 / Expo Push Service)** у фоні при зміні графіка або публікації графіка на завтра.
  - **Локальні нагадування** за `30`, `25`, `20`, `15`, `10` або `5` хвилин до відключення (працюють навіть без інтернету).
- **5 сучасних тем оформлення** («Світла», «Нічна», «Графіт», «Океан», «Кремова») та напівпрозора нижня панель у стилі Liquid Glass.

---

## Архітектура монорепо

Проєкт побудований на базі **pnpm workspaces**:

- `apps/mobile` — Expo (SDK 58, Managed Workflow), React Native, TypeScript, Expo Router, NativeWind, Zustand, `expo-notifications`, `expo-blur` (архітектура **Feature-Sliced Design**).
- `apps/server` — Node.js, Express 5, TypeScript, Drizzle ORM, PostgreSQL (Neon), Zod, `expo-server-sdk`. Зовнішні API Львівобленерго ізольовані за адаптерами `AddressSourceAdapter` та `ScheduleSourceAdapter`.
- `packages/shared` — спільні TypeScript-типи, Zod-схеми та утиліти роботи з 48 слотами й часовою зоною `Europe/Kyiv`.

---

## Локальне налаштування

### 1. Встановлення залежностей

```bash
pnpm install
```

### 2. Змінні оточення

Скопіюйте приклади та заповніть реальними значеннями (`.env` ігноруються в Git):

- **Бекенд:** `apps/server/.env.example` → `apps/server/.env`
  - `PORT=3000`
  - `DATABASE_URL` — рядок підключення PostgreSQL (Neon)
  - `CRON_SECRET` — випадковий секретний ключ для захисту `/api/cron/sync` та `/api/debug/test-push`
- **Мобільний додаток:** `apps/mobile/.env.example` → `apps/mobile/.env`
  - `EXPO_PUBLIC_API_URL` — URL бекенду (`https://is-light-api.onrender.com` або `http://<IP_ПК>:3000` для локального тесту)

### 3. Ініціалізація БД (Neon + Drizzle)

```bash
pnpm db:push
```

---

## Основні команди обслуговування

| Команда | Призначення |
| --- | --- |
| `pnpm dev:server` | Запуск локального бекенду з автоперезавантаженням (`tsx watch`) |
| `pnpm dev:mobile` | Запуск Expo Metro для тестування на телефоні (Expo Go / Dev Client) |
| `pnpm --filter @is-light/mobile exec expo start -c` | Запуск Expo з очисткою кешу Metro |
| `pnpm build:server` | Збірка `@is-light/shared` та `@is-light/server` для продакшену |
| `pnpm typecheck` | Перевірка типів TypeScript (`tsc --noEmit`) по всьому монорепо |
| `pnpm check` | Перевірка форматування та лінтингу через **Biome** |
| `pnpm check:fix` | Автовиправлення форматування та сортування імпортів через **Biome** |
| `pnpm test:server` | Запуск юніт-тестів парсера графіків та пошуку адрес |
| `pnpm db:generate` | Генерація SQL-міграцій Drizzle |
| `pnpm db:push` | Застосування схеми Drizzle до БД Neon |

---

## API ендпоінти бекенду

- `GET /health` — перевірка стану сервера та підключення до Neon DB.
- `GET /api/cities/search?q=<запит>` — пошук населеного пункту Львівської області.
- `GET /api/addresses/search?q=<вулиця+будинок>&cityId=<id>` — пошук адреси й черги ГПВ (за замовчуванням `cityId=693` — м. Львів).
- `GET /api/schedules/:groupId` — графік на сьогодні та завтра (`?refresh=1` — примусове оновлення з cooldown 30 с).
- `POST /api/subscriptions` — реєстрація/оновлення `expoPushToken` для групи (`{ expoPushToken, groupId, platform }`).
- `DELETE /api/subscriptions` — видалення push-підписки.
- `POST /api/cron/sync` — синхронізація всіх 12 груп та розсилка push-сповіщень лише підписникам змінених груп (заголовок `x-cron-secret`).
- `POST /api/debug/test-push` — тестова відправка push на `expoPushToken` або `groupId` (заголовок `x-cron-secret`).

### Перевірка бойового сервера та ручний тест push

```bash
# Стан сервера та БД
curl https://is-light-api.onrender.com/health

# Примусова синхронізація графіків
curl -X POST https://is-light-api.onrender.com/api/cron/sync \
  -H "x-cron-secret: <CRON_SECRET>"

# Тестове push-сповіщення для групи 4.1
curl -X POST https://is-light-api.onrender.com/api/debug/test-push \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: <CRON_SECRET>" \
  -d '{"groupId":"4.1","title":"Тест «Є Світло»","body":"Push-сповіщення працюють!"}'
```

---

## Деплой бекенду (Render + `cron-job.org`)

1. **Render:** підключіть репозиторій як Blueprint (використовується `render.yaml`) і задайте в панелі Render змінні `DATABASE_URL` та `CRON_SECRET`.
2. **`cron-job.org` (анти-сон та оновлення графіків):**
   - **URL:** `https://is-light-api.onrender.com/api/cron/sync`
   - **Метод:** `POST`
   - **Розклад:** кожні `5` або `10` хвилин
   - **Заголовок:** `x-cron-secret: <CRON_SECRET>`
   - **HTTP-автентифікація:** вимкнена

---

## Збірка Android `.apk` (EAS Build + Firebase FCM v1)

Усі команди виконуються з папки `apps/mobile`:

```bash
cd apps/mobile

# Авторизація та перевірка прив'язки проєкту
eas login

# Оновлення google-services.json у хмарних секретах EAS (не комітити файл у Git)
eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json \
  --environment development --environment preview --environment production --visibility secret

# Завантаження або оновлення Firebase Service Account Key (FCM v1)
eas credentials --platform android

# Збірка автономного .apk для щоденного використання (без Metro)
eas build --platform android --profile preview --no-wait

# Збірка Development Build (для дебагу з Metro)
eas build --platform android --profile development --no-wait
```

> **Безпека:** ніколи не комітьте `.env`, `google-services.json` та приватний JSON-ключ Firebase Service Account у Git — усі відповідні патерни вже додані в `.gitignore`.
