# financial-systems: целевая архитектура без Logto, Django и Python

Продолжение [financial-systems-analysis.md](financial-systems-analysis.md). Документ отвечает на четыре цели:

1. уйти от Logto;
2. уйти от Django и Python;
3. сделать грамотную структуру БД;
4. дать нормальные имена в коде и в базе.

## 0. Исходная точка: чистый лист

Проект ещё не запущен: пользователей и данных нет. Поэтому **ничего не переносим**. Нет переноса пользователей и паролей из Logto, нет ETL, нет постепенного перехода и окна переключения.

Новая система пишется с нуля. Текущий код служит только **спецификацией**: что умеет система, какие экраны есть, по каким формулам считаются деньги. Срочные исправления безопасности в Django из первого отчёта тоже не нужны: их надо не чинить там, а не повторить в новом коде (раздел 6).

## 1. Целевой стек

| Слой           | Выбор                                                                   | Почему                                                                                                                                         |
| -------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Язык           | TypeScript везде                                                        | Цель 2; общие типы и схемы валидации между UI и сервером                                                                                       |
| Приложение     | **Next.js (App Router)**, fullstack                                     | UI и API в одном приложении; Server Actions для форм, Route Handlers для файлов и cron                                                         |
| ORM            | **Drizzle ORM** + drizzle-kit (миграции)                                | SQL-подобный, прозрачный, хорошо работает с `numeric`, enum и check-ограничениями Postgres; есть автоматический маппинг camelCase ↔ snake_case |
| БД             | PostgreSQL 17 (та же СУБД, новая база)                                  | Менять нет причин                                                                                                                              |
| Аутентификация | **Better Auth** без почты: логин и пароль, TOTP (подробнее в разделе 2) | Цель 1                                                                                                                                         |
| Валидация      | zod                                                                     | Схемы форм уже есть на фронте                                                                                                                  |
| Деньги         | `decimal.js`; в БД `numeric`; в коде **никогда** `number`               | Расчёты до копейки                                                                                                                             |
| Файлы          | AWS SDK v3 (S3 Timeweb или любой S3-совместимый)                        | Бакет можно взять новый и пустой                                                                                                               |
| Фоновые задачи | **pg-boss** (очередь в том же Postgres) или cron-маршрут                | Ежедневная загрузка курсов ЦБ и НБ РК вместо запросов к ним внутри HTTP                                                                        |
| UI             | React 19, Tailwind 4, shadcn/ui, TanStack Table и Query                 | UI-компоненты и вёрстку можно взять из текущего кода почти как есть                                                                            |
| Тесты          | Vitest (денежная логика, права доступа), Playwright (сценарии)          | Сейчас тестов нет                                                                                                                              |
| Деплой         | Docker Compose: `next` (standalone) + `postgres` + nginx                | Минус два контейнера (django и logto)                                                                                                          |

**Решено: Next.js.**

## 2. Замена Logto

### Варианты

| Вариант                                         | Где живут пользователи              | Плюсы                                                                                                                                                                                                                                                                  | Минусы                                                                                             |
| ----------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Better Auth** (рекомендую)                    | В вашей базе, в таблицах приложения | TS-библиотека внутри Next.js, без отдельного сервиса. Сессии в БД, хэширование паролей, rate limit, плагины `username` (вход по логину без почты), `admin` (создание пользователей, смена пароля, блокировка, завершение сессий) и `twoFactor` (TOTP и резервные коды) | Библиотека моложе Auth.js                                                                          |
| Auth.js (NextAuth)                              | В вашей базе                        | Популярная                                                                                                                                                                                                                                                             | Вход по паролю поддерживается слабо и «не рекомендован»; организации и 2FA придётся писать самим   |
| Своя реализация (argon2 + сессии в БД + otplib) | В вашей базе                        | Полный контроль; без почты кода немного (несколько сотен строк)                                                                                                                                                                                                        | Rate limit, ротацию сессий, TOTP и защиту от перебора придётся писать и проверять самим            |
| Keycloak / Zitadel                              | Отдельный сервис                    | Enterprise SSO                                                                                                                                                                                                                                                         | Та же проблема, что с Logto: ещё один сервис и вторая база                                         |
| Clerk / WorkOS / Auth0                          | Чужое облако                        | Ничего не нужно поддерживать                                                                                                                                                                                                                                           | Персональные данные клиентов за рубежом; для финансового сервиса в РФ это юридический риск; платно |

### Модель доступа после Logto

Сейчас роль вычисляется из токена Logto: организация-админ или роль `admin`, плюс отдельная таблица `admin_users` с разделами. В новой схеме всё хранится в одной базе и читается явно:

- `users`: все люди, и сотрудники клиентов, и ваши сотрудники.
- `users.kind`: `client` | `manager`.
- `organization_members (organization_id, user_id, role)`: к какой организации-клиенту относится пользователь. Роли `owner` / `member` пригодятся, если клиентам позже дадут самим заводить учётки коллег.
- `manager_permissions (user_id, section)`: доступные разделы админки. Полный доступ хранится флагом `users.has_full_manager_access`.
- Права проверяются **на сервере** в одном месте: `requireClient()`, `requireManager(section)`. Никаких «ролей из токена».

### Как устроен доступ без почты

Почта в проекте не используется вообще, поэтому все сценарии, которые обычно идут через письма, выполняет сотрудник:

| Сценарий                                  | Как работает                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Идентификатор входа                       | **Логин** (`username`), а не email. Email, если нужен, хранится как обычное контактное поле без подтверждения                                                                                                                              |
| Первый сотрудник                          | Создаётся командой `pnpm seed:admin --username … ` при развёртывании; пароль вводится в консоли и нигде не сохраняется в открытом виде                                                                                                     |
| Новый пользователь (сотрудник или клиент) | Сотрудник с разделом «Пользователи» создаёт учётную запись: логин, имя, организация или права. Система генерирует **временный пароль**, показывает его один раз, и сотрудник передаёт его человеку своим каналом. Открытой регистрации нет |
| Первый вход                               | Обязательная смена временного пароля (`users.must_change_password`), затем для сотрудника обязательная настройка TOTP                                                                                                                      |
| Забыл пароль                              | Самостоятельного сброса нет. Сотрудник сбрасывает пароль: выдаётся новый временный, все сессии пользователя завершаются                                                                                                                    |
| Потерял телефон с TOTP                    | Вход по одному из резервных кодов (выдаются при настройке) или сброс 2FA сотрудником с правами на «Пользователи». Сброс пишется в журнал                                                                                                   |
| Блокировка                                | Флаг `users.is_active = false`, сессии завершаются сразу                                                                                                                                                                                   |
| Журнал                                    | Входы, неудачные попытки, сбросы паролей и 2FA, изменения прав пишутся в `auth_audit_events`                                                                                                                                               |

2FA (TOTP) **обязательна для сотрудников** и по желанию для клиентов. Без почты это единственный второй фактор, и для доступа к деньгам он нужен.

## 3. Правила именования

### Общие

- **Только английский** в коде и в БД. Русский только в текстах интерфейса, собранных в один словарь (`messages/ru.ts`), чтобы статусы и подписи не дублировались по компонентам.
- **Никакого транслита и внутренних сокращений:** `sebes`, `prf`, `calc_1`, `swift_client` уходят. Допустимы общепринятые идентификаторы: `inn`, `swift_code` (BIC), `iban`.
- **Одно понятие — одно слово** во всём проекте (раздел 4). Если в UI «Поступление», то в коде везде `IncomingPayment`, а не где-то `Receipt`, а где-то `payment`.
- Имя отвечает на вопрос «что это», а не «откуда взялось»: `client_charge_rub`, а не `execution_costs`.

### База данных (PostgreSQL)

| Что                   | Правило                                                                          | Пример                                                              |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Таблицы               | `snake_case`, множественное число                                                | `payment_orders`, `internal_accounts`                               |
| Таблицы-связки        | `<a>_<b>`, обе части во множественном числе по смыслу                            | `payment_order_incoming_payments`                                   |
| Первичный ключ        | `id bigint generated always as identity`                                         |                                                                     |
| Внешний ключ          | `<сущность в ед. числе>_id`                                                      | `organization_id`, `assignee_user_id` (уточнение роли перед именем) |
| Булевы                | `is_` / `has_` / `can_`                                                          | `is_active`, `can_client_edit_payment`                              |
| Момент времени        | `*_at`, тип `timestamptz`                                                        | `confirmed_at`, `created_at`                                        |
| Календарная дата      | `*_date`, тип `date`                                                             | `execution_date`, `payment_date`                                    |
| Деньги                | `numeric(18,2)` + рядом `currency` либо суффикс валюты, если она всегда одна     | `amount` + `currency`, `funding_amount_rub`                         |
| Курсы                 | `numeric(18,6)`, суффикс `_rate`                                                 | `client_exchange_rate`                                              |
| Проценты              | `numeric(7,4)`, суффикс `_percent`, значение в процентах (0.2 = 0,2%)            | `fee_percent`                                                       |
| Статусы и типы        | Postgres `enum` с именем `<сущность>_status` / `_type`                           | `payment_order_status`                                              |
| Ограничения и индексы | `pk_`, `fk_`, `uq_`, `ck_`, `ix_` + таблица + поля                               | `uq_organization_members__organization_user`                        |
| Служебные поля        | В каждой таблице `created_at`, `updated_at`; где важно, ещё `created_by_user_id` |                                                                     |
| Удаление              | Справочники не удаляются физически: `archived_at timestamptz null`               | Банки, поставщики                                                   |

### TypeScript

- Переменные и функции в `camelCase`, типы и компоненты в `PascalCase`, константы в `SCREAMING_SNAKE_CASE`, файлы в `kebab-case.ts`.
- Drizzle: `casing: 'snake_case'`. В коде `paymentOrder.fundingAmountRub`, в БД `funding_amount_rub`, без ручных маппингов.
- Функции называются глаголом: `calculateClientCharge()`, `confirmIncomingPayment()`.
- Булевы так же, как в БД: `isConfirmed`, `canClientEditPayment`.
- Структура по доменам, а не по слоям: `src/modules/payment-orders/{schema,queries,actions,pricing,ui}`.

## 4. Глоссарий: старое имя → новое имя

| Сейчас (код / таблица)                                                                                        | В интерфейсе                                         | Новое имя                                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Organization` / `organizations`                                                                              | Организация (клиент)                                 | `Organization` / `organizations`                                                                                     |
| `Counterparty` / `counterparties`                                                                             | Контрагент (иностранный получатель денег клиента)    | `Beneficiary` / `beneficiaries`                                                                                      |
| `Bank` / `banks`                                                                                              | Банк контрагента                                     | `BeneficiaryBank` / `beneficiary_banks`                                                                              |
| `BankAccount` / `bank_accounts`                                                                               | Счёт в банке контрагента                             | `BeneficiaryAccount` / `beneficiary_accounts`                                                                        |
| `Payer` / `payers`                                                                                            | Плательщик в РФ (юрлицо клиента)                     | `Payer` / `payers` (без изменений)                                                                                   |
| `Recipient` / `recipients`                                                                                    | Получатель / счёт (ATL, CIC, …), ваш внутренний счёт | `InternalAccount` / `internal_accounts`                                                                              |
| `Receipt` / `receipts`                                                                                        | Поступление                                          | `IncomingPayment` / `incoming_payments`                                                                              |
| `BankTransfer` / `bank_transfers`                                                                             | Перевод между счетами                                | `InternalTransfer` / `internal_transfers`                                                                            |
| `OutgoingPayment` / `outgoing_payments`                                                                       | Исходящий платёж                                     | без изменений                                                                                                        |
| `Supplier` / `suppliers`                                                                                      | Поставщик                                            | без изменений                                                                                                        |
| `Request` / `requests`                                                                                        | Заявка                                               | `PaymentOrder` / `payment_orders`                                                                                    |
| `Document`, `TransferDocument`, `OutgoingPaymentDocument`, `Request.swift_document`, `Request.paper_document` | Документы                                            | `files` + `payment_order_files`, `internal_transfer_files`, `outgoing_payment_files`                                 |
| `WorkScheme` / `work_schemes`                                                                                 | Схема работы                                         | `ExecutionScheme` / `execution_schemes`                                                                              |
| `SchemeCurrency` / `scheme_currencies`, `WorkScheme.calculator`                                               | Валюта схемы (процент, SWIFT), калькулятор           | `execution_schemes.calculator` + `execution_schemes.parameters`                                                      |
| `ExchangeRate` / `exchange_rates` (колонки usd, eur, cny)                                                     | Курсы                                                | `exchange_rates` (строка = источник + дата + валюта)                                                                 |
| `AdminUser` / `admin_users`                                                                                   | Администратор (менеджер)                             | `users` (`kind = 'manager'`) + `manager_permissions`                                                                 |
| `percent_client`, `swift_client`                                                                              | Процент и SWIFT клиента                              | `client_fee_percent`, `client_swift_fee`                                                                             |
| `calculator = calc_1 / calc_2`                                                                                | Прямой / Обратный                                    | `client_pricing_method = 'add_on' / 'gross_up'`                                                                      |
| `prf_organization`, `prf_inn`, `prf_recipient`                                                                | Плательщик в РФ                                      | `payer_name`, `payer_inn`, `internal_account_name` (снимок)                                                          |
| `prf_amount`, `prf_date`                                                                                      | Сумма в руб., дата                                   | `funding_amount_rub`, `funding_date`                                                                                 |
| `execution_date`, `execution_rate`                                                                            | Дата и курс исполнения                               | `execution_date`, `client_exchange_rate`                                                                             |
| `execution_costs`                                                                                             | Затраты (клиента)                                    | `client_charge_rub`                                                                                                  |
| `execution_balance`                                                                                           | Остаток                                              | `client_remainder_rub`                                                                                               |
| `execution_*_sebes`                                                                                           | Себестоимость                                        | `cost_execution_date`, `cost_exchange_rate`, `cost_amount_rub`                                                       |
| `execution_profit_sebes`                                                                                      | Прибыль                                              | `margin_rub`                                                                                                         |
| `sebes_markup_percent`                                                                                        | Надбавка себестоимости                               | `cost_markup_percent`                                                                                                |
| `sebes_min_fee_applied`                                                                                       | Применён минимум комиссии                            | `is_min_fee_applied`                                                                                                 |
| `show_swift_download`, `show_paper_download`, `show_execution_block`                                          | Видимость для клиента                                | `is_swift_visible_to_client`, `is_order_form_visible_to_client`, `is_execution_visible_to_client`                    |
| `edit_payment`, `edit_prf`, `edit_documents`, `edit_closing_docs`                                             | Что можно исправлять                                 | `can_client_edit_payment`, `can_client_edit_payer`, `can_client_edit_documents`, `can_client_edit_closing_documents` |
| `money_received`, `money_received_at`                                                                         | Деньги пришли                                        | убрать, выводить из истории статусов (`payment_order_status_changes`)                                                |
| `assigned_admin`                                                                                              | Исполнитель                                          | `assignee_user_id`                                                                                                   |
| `admin_note`                                                                                                  | Заметка администратора                               | `manager_note`                                                                                                       |
| `net_amount` (сумма × 0,998)                                                                                  | Сумма −0,2%                                          | **Удалено.** Поступление учитывается полной суммой, удержания 0,2% нет нигде                                         |
| статус `new` у заявки                                                                                         | Новая                                                | `submitted`                                                                                                          |
| `correction`, `correction_review`                                                                             | Исправление, проверка исправлений                    | `needs_correction`, `correction_review`                                                                              |
| `awaiting_closing_docs`, `closing_docs_review`                                                                | Закрывающие документы                                | `awaiting_closing_documents`, `closing_documents_review`                                                             |

## 5. Новая схема БД

### Что исправляем структурно

1. **Таблица `requests` на 60 колонок** делится по смыслу. Сама заявка, снимок реквизитов, расчёт для клиента и себестоимость остаются в одной таблице (связь 1:1, разносить по таблицам смысла нет), но колонки сгруппированы и названы по правилам. Флаги видимости и исправлений получают понятные имена. Добавляется **история статусов**.
2. **Четыре способа хранить файлы** (три таблицы документов и два FileField) сводятся к одной таблице `files` и типизированным таблицам-связкам.
3. **Калькуляторы себестоимости: формулы в коде, параметры в данных.** Подробное обоснование в разделе 5.1. Код калькулятора (`mongols`, `ermak`, `alsafi`, `stavropol`) — типизированная функция с описанием своих параметров. В схеме хранится ключ калькулятора и его параметры (проценты, SWIFT, пороги, минимумы) в `jsonb`, проверенные схемой этого калькулятора. Цифры меняются в бэк-офисе без деплоя, новая логика требует программиста.
4. **Курсы:** вместо колонок `usd/eur/cny` одна строка на пару источник + валюта: `(source, rate_date, currency, rate)`. Курсы НБ РК тоже сохраняются (сейчас они не сохраняются и каждый раз запрашиваются заново).
5. **Статусы** становятся enum в БД, а не свободным текстом. Допустимые переходы задаются в коде одной таблицей переходов с ролью, которой переход разрешён (раздел 6).
6. **Балансы ведутся книгой проводок (ledger).** Каждое движение денег — проводка из двух и более записей с нулевой суммой. Баланс любого счёта равен сумме его записей. Проводки не изменяются и не удаляются: ошибки исправляются сторнирующей проводкой. Подробно в разделе 5.2.
7. **Аудит:** `created_at`, `updated_at`, `created_by_user_id`, история статусов заявок.

### Схема (PostgreSQL DDL, набросок)

```sql
-- ===== Перечисления =====
create type user_kind                  as enum ('client', 'manager');
create type organization_member_role   as enum ('owner', 'member');
create type manager_section            as enum ('payment_orders', 'incoming_payment_confirmations', 'internal_transfers',
                                                'incoming_payments', 'outgoing_payments', 'organization_balances',
                                                'internal_account_balances', 'ledger', 'reference_data', 'users');
create type currency_code              as enum ('RUB', 'USD', 'EUR', 'CNY', 'KZT');
create type client_pricing_method      as enum ('add_on', 'gross_up');
create type beneficiary_bank_type      as enum ('single_currency', 'multi_currency');
create type payment_order_status       as enum ('submitted', 'in_review', 'sent_to_bank',
                                                'awaiting_closing_documents', 'closing_documents_review',
                                                'closed', 'needs_correction', 'correction_review');
create type payment_order_file_section as enum ('payment', 'closing', 'bank');
create type payment_order_file_type    as enum ('invoice', 'contract_request', 'customs_declaration', 'transport',
                                                'swift_confirmation', 'order_form', 'other');
create type incoming_payment_status    as enum ('pending', 'confirmed');
create type internal_transfer_status   as enum ('pending', 'executed');
create type outgoing_payment_status    as enum ('new', 'in_progress', 'in_execution', 'executed');
create type exchange_rate_source       as enum ('cbr', 'nbk');
create type cost_calculator            as enum ('mongols', 'ermak', 'alsafi', 'stavropol');  -- ключи функций в modules/pricing
create type ledger_account_type        as enum ('internal_account', 'organization_available', 'organization_held',
                                                'execution_clearing', 'margin_revenue', 'opening_equity');
create type ledger_transaction_type    as enum ('opening_balance', 'incoming_payment_confirmed', 'payment_order_hold',
                                                'payment_order_hold_adjusted', 'payment_order_closed', 'internal_transfer_executed',
                                                'outgoing_payment_executed', 'reversal');

-- ===== Пользователи и доступ (таблицы sessions/accounts/verifications создаёт Better Auth) =====
create table users (
  id                     bigint generated always as identity primary key,
  username               text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  contact_email          text,                       -- просто контакт, без подтверждения и рассылок
  must_change_password   boolean not null default true,
  name                   text not null default '',
  kind                   user_kind not null,
  has_full_manager_access boolean not null default false,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table auth_audit_events (
  id              bigint generated always as identity primary key,
  user_id         bigint references users(id),
  actor_user_id   bigint references users(id),     -- кто сделал (для сбросов администратором)
  event_type      text not null,                   -- 'sign_in', 'sign_in_failed', 'password_reset', 'two_factor_reset', ...
  ip_address      inet,
  occurred_at     timestamptz not null default now()
);

create table manager_permissions (
  user_id  bigint not null references users(id) on delete cascade,
  section  manager_section not null,
  primary key (user_id, section)
);

-- ===== Клиенты =====
create table organizations (
  id                     bigint generated always as identity primary key,
  name                   text not null,
  client_fee_percent     numeric(7,4) not null default 3,
  client_swift_fee       numeric(18,2) not null default 100,   -- в валюте сделки; для CNY в USD (см. pricing)
  client_pricing_method  client_pricing_method not null default 'add_on',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table organization_members (
  organization_id  bigint not null references organizations(id) on delete cascade,
  user_id          bigint not null references users(id) on delete cascade,
  role             organization_member_role not null default 'member',
  primary key (organization_id, user_id)
);

create table payers (                      -- плательщики в РФ (юрлица клиента)
  id               bigint generated always as identity primary key,
  organization_id  bigint not null references organizations(id),
  name             text not null,
  inn              varchar(12) not null check (inn ~ '^\d{10}(\d{2})?$'),
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, inn)
);

create table beneficiaries (               -- бывшие counterparties
  id               bigint generated always as identity primary key,
  organization_id  bigint not null references organizations(id),
  name             text not null,
  address          text not null,
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table beneficiary_banks (
  id              bigint generated always as identity primary key,
  beneficiary_id  bigint not null references beneficiaries(id),
  name            text not null,
  address         text not null,
  swift_code      varchar(11) not null check (swift_code ~ '^[A-Z0-9]{8}([A-Z0-9]{3})?$'),
  bank_type       beneficiary_bank_type not null default 'single_currency',
  archived_at     timestamptz,                  -- вместо active = false
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table beneficiary_accounts (
  id                   bigint generated always as identity primary key,
  beneficiary_bank_id  bigint not null references beneficiary_banks(id),
  account_number       varchar(50) not null,
  currencies           currency_code[] not null check (cardinality(currencies) > 0),
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ===== Внутренние счета и движение денег =====
create table internal_accounts (           -- бывшие recipients (ATL, CIC, ...)
  id                    bigint generated always as identity primary key,
  name                  text not null unique,
  is_default_for_outgoing boolean not null default false,    -- бывшее DEFAULT_ACCOUNT_NAME = 'CIC'
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index uq_internal_accounts__default_outgoing on internal_accounts (is_default_for_outgoing) where is_default_for_outgoing;

create table incoming_payments (           -- бывшие receipts
  id                   bigint generated always as identity primary key,
  payment_date         date not null,
  amount_rub           numeric(18,2) not null check (amount_rub > 0),
  internal_account_id  bigint references internal_accounts(id),
  payer_id             bigint references payers(id),
  status               incoming_payment_status not null default 'pending',
  confirmed_at         timestamptz,
  confirmed_by_user_id bigint references users(id),
  created_by_user_id   bigint references users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check ((status = 'confirmed') = (confirmed_at is not null))
);

create table internal_transfers (          -- бывшие bank_transfers
  id                        bigint generated always as identity primary key,
  from_internal_account_id  bigint not null references internal_accounts(id),
  to_internal_account_id    bigint not null references internal_accounts(id),
  amount_rub                numeric(18,2) not null check (amount_rub > 0),
  transfer_date             date not null,
  status                    internal_transfer_status not null default 'pending',
  payer_id                  bigint references payers(id),
  note                      text not null default '',
  created_by_user_id        bigint references users(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (from_internal_account_id <> to_internal_account_id)
);

create table internal_transfer_incoming_payments (
  internal_transfer_id  bigint not null references internal_transfers(id) on delete cascade,
  incoming_payment_id   bigint not null unique references incoming_payments(id),  -- одно поступление только в одном переводе
  primary key (internal_transfer_id, incoming_payment_id)
);

create table suppliers (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

create table outgoing_payments (
  id                   bigint generated always as identity primary key,
  invoice_number       text not null default '',
  status               outgoing_payment_status not null default 'new',
  amount_rub           numeric(18,2),
  supplier_id          bigint references suppliers(id),
  supplier_name        text not null default '',          -- снимок имени на момент платежа
  internal_account_id  bigint references internal_accounts(id),
  executed_at          timestamptz,
  created_by_user_id   bigint references users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ===== Схемы исполнения и себестоимость =====
create table execution_schemes (           -- бывшие work_schemes
  id          bigint generated always as identity primary key,
  name        text not null unique,
  calculator  cost_calculator not null,
  parameters  jsonb not null,             -- проверяется zod-схемой выбранного калькулятора при сохранении
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Пример parameters для «Ставрополь»:
-- { "currencies": {
--     "EUR": { "tiers": [ { "upTo": "50000", "feePercent": "2.5", "swiftFee": "100" },
--                         { "upTo": null,    "feePercent": "1.5", "swiftFee": "0" } ] },
--     "USD": { "tiers": [ { "upTo": "50000", "feePercent": "1.2", "swiftFee": "100" },
--                         { "upTo": null,    "feePercent": "1.2", "swiftFee": "0" } ] },
--     "CNY": { "feePercent": "…", "swiftFee": "…" } } }
-- Числа хранятся строками, чтобы не терять точность в JSON.

-- ===== Заявки =====
create table payment_orders (              -- бывшие requests
  id                      bigint generated always as identity primary key,
  organization_id         bigint not null references organizations(id),
  status                  payment_order_status not null default 'submitted',
  assignee_user_id        bigint references users(id),
  execution_scheme_id     bigint references execution_schemes(id),

  -- платёж
  invoice_number          text not null default '',
  amount                  numeric(18,2),
  currency                currency_code,
  payment_details         text not null default '',

  -- получатель: ссылка + снимок на момент подачи
  beneficiary_id          bigint references beneficiaries(id) on delete set null,
  beneficiary_bank_id     bigint references beneficiary_banks(id) on delete set null,
  beneficiary_name        text not null default '',
  beneficiary_address     text not null default '',
  beneficiary_bank_name   text not null default '',
  beneficiary_bank_address text not null default '',
  beneficiary_swift_code  varchar(11) not null default '',
  beneficiary_account_number varchar(50) not null default '',
  beneficiary_account_currencies currency_code[] not null default '{}',

  -- фондирование (бывший блок «Плательщик в РФ»)
  payer_name              text not null default '',
  payer_inn               varchar(12) not null default '',
  internal_account_name   text not null default '',
  funding_amount_rub      numeric(18,2),
  funding_date            date,

  -- расчёт для клиента
  execution_date          date,
  client_exchange_rate    numeric(18,6),
  client_charge_rub       numeric(18,2),
  client_remainder_rub    numeric(18,2),

  -- себестоимость (только для менеджеров, клиенту не отдаётся никогда)
  cost_execution_date     date,
  cost_exchange_rate      numeric(18,6),
  cost_markup_percent     numeric(7,4),           -- null = значение по умолчанию из app_settings
  cost_amount_rub         numeric(18,2),
  margin_rub              numeric(18,2),
  is_min_fee_applied      boolean,
  cost_calculation        jsonb,                  -- снимок расчёта: калькулятор, параметры схемы, курсы, результат

  -- управление видимостью и исправлениями
  is_swift_visible_to_client       boolean not null default false,
  is_order_form_visible_to_client  boolean not null default false,
  is_execution_visible_to_client   boolean not null default false,
  can_client_edit_payment          boolean not null default false,
  can_client_edit_payer            boolean not null default false,
  can_client_edit_documents        boolean not null default false,
  can_client_edit_closing_documents boolean not null default false,
  manager_note            text not null default '',

  submitted_at            timestamptz,
  closed_at               timestamptz,
  created_by_user_id      bigint references users(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- черновиков нет: заявка создаётся сразу заполненной
  check (amount is not null and currency is not null and invoice_number <> '')
);
create index ix_payment_orders__organization_status on payment_orders (organization_id, status);

create table payment_order_status_changes (  -- история; заменяет money_received / money_received_at
  id                bigint generated always as identity primary key,
  payment_order_id  bigint not null references payment_orders(id) on delete cascade,
  from_status       payment_order_status,
  to_status         payment_order_status not null,
  changed_by_user_id bigint references users(id),
  comment           text not null default '',
  changed_at        timestamptz not null default now()
);

create table payment_order_incoming_payments (   -- бывшее receipts.requests (m2m)
  payment_order_id     bigint not null references payment_orders(id) on delete cascade,
  incoming_payment_id  bigint not null references incoming_payments(id),
  primary key (payment_order_id, incoming_payment_id)
);

create table outgoing_payment_payment_orders (
  outgoing_payment_id  bigint not null references outgoing_payments(id) on delete cascade,
  payment_order_id     bigint not null references payment_orders(id),
  primary key (outgoing_payment_id, payment_order_id)
);

-- ===== Файлы =====
create table files (
  id                   bigint generated always as identity primary key,
  storage_key          text not null unique,        -- ключ объекта в S3, например payment-orders/123/<uuid>.pdf
  original_name        text not null,
  size_bytes           bigint not null check (size_bytes >= 0),
  content_type         text not null default '',
  uploaded_by_user_id  bigint references users(id),
  uploaded_at          timestamptz not null default now()
);

-- Файлы загружаются до создания заявки (черновиков нет), поэтому сначала файл
-- живёт в files без привязки, а при создании заявки привязывается в той же транзакции.
-- Фоновая задача удаляет непривязанные файлы старше суток.
create table payment_order_files (
  file_id           bigint primary key references files(id) on delete cascade,
  payment_order_id  bigint not null references payment_orders(id) on delete cascade,
  section           payment_order_file_section not null,
  file_type         payment_order_file_type not null default 'other',
  is_uploaded_by_manager boolean not null default false
);

create table internal_transfer_files (
  file_id               bigint primary key references files(id) on delete cascade,
  internal_transfer_id  bigint not null references internal_transfers(id) on delete cascade
);

create table outgoing_payment_files (
  file_id              bigint primary key references files(id) on delete cascade,
  outgoing_payment_id  bigint not null references outgoing_payments(id) on delete cascade
);

-- ===== Курсы и настройки =====
create table exchange_rates (
  source     exchange_rate_source not null,
  rate_date  date not null,
  currency   currency_code not null,
  rate       numeric(18,6) not null check (rate > 0),   -- рублей (cbr) или тенге (nbk) за 1 единицу
  fetched_at timestamptz not null default now(),
  primary key (source, rate_date, currency)
);

create table app_settings (                -- значения, которые сейчас захардкожены
  key        text primary key,             -- 'default_cost_markup_percent' = '0.2'
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
```

### 5.1. Калькуляторы: код или данные — решение

**Решение: формулы пишутся кодом, все числа хранятся данными.**

Почему не чистые данные (`scheme_fee_tiers`, как я предлагал раньше). Четыре текущих калькулятора отличаются не только цифрами, но и логикой. «Монголы» пересчитывают SWIFT для CNY через курс USD ЦБ. «Альсафи» берёт минимальную комиссию в тенге по курсу НБ РК. «Ставрополь» применяет ступени по сумме. Универсальная таблица покрывает эти четыре случая, но первый же новый партнёр со своей особенностью (комиссия от суммы в рублях, плавающий SWIFT, скидка за объём) потребует новых колонок. Таблица превратится в плохой язык программирования без тестов и типов.

Почему не чистый код с захардкоженными цифрами, как сейчас. Тогда изменение процента партнёра требует релиза. Цифры меняются часто, а логика редко.

**Как устроено:**

- `modules/pricing/cost-calculators/<name>.ts`: на каждый калькулятор одна чистая функция `calculate(input, parameters, rates) → result` и zod-схема `parametersSchema`.
- Реестр `costCalculators = { mongols, ermak, alsafi, stavropol }`. Ключ хранится в `execution_schemes.calculator`, параметры в `execution_schemes.parameters`.
- Бэк-офис строит форму параметров по zod-схеме выбранного калькулятора. Сохранение без валидации невозможно.
- Калькулятор сам объявляет, какие курсы ему нужны (`requiredRates: ['cbr:USD']`, `['nbk:EUR']`). Сервис расчёта подгружает их из `exchange_rates` до вызова, а сама функция не ходит ни в БД, ни в сеть.
- Результат расчёта сохраняется в заявке вместе со снимком входов (`payment_orders.cost_calculation`): калькулятор, параметры на момент расчёта, курсы. Если параметры схемы потом поменяются, всегда видно, по каким цифрам считалась старая заявка.
- Каждый калькулятор покрыт тестами на контрольных примерах, посчитанных текущим Python-кодом.
- Клиентские методы (`add_on`, `gross_up`) устроены так же: формула в коде, процент и SWIFT в `organizations`.

Новый партнёр с новой логикой — это новый файл калькулятора и значение enum. Партнёр с той же логикой — это новая строка схемы в бэк-офисе.

### 5.2. Книга проводок (ledger)

Все балансы рублёвые. Каждая проводка (`ledger_transactions`) состоит из записей (`ledger_entries`), сумма записей в проводке равна нулю. Знак: плюс — дебет, минус — кредит.

**Счета книги (`ledger_accounts`):**

| Тип                      | На кого                                 | Смысл                                                                                        |
| ------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `internal_account`       | на каждый внутренний счёт (ATL, CIC, …) | Деньги на наших счетах (актив)                                                               |
| `organization_available` | на каждую организацию                   | Свободный остаток клиента (наш долг перед клиентом)                                          |
| `organization_held`      | на каждую организацию                   | Заморожено под заявки в работе                                                               |
| `execution_clearing`     | один                                    | Начислено к оплате исполнителям по закрытым заявкам, но ещё не оплачено исходящими платежами |
| `margin_revenue`         | один                                    | Наша маржа (клиентская сумма минус себестоимость)                                            |
| `opening_equity`         | один                                    | Встречный счёт для входящих остатков                                                         |

**Правила проводок** (повторяют текущую логику балансов, сверить на контрольных сценариях):

| Событие                             | Дебет                                                                                           | Кредит                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Входящий остаток счёта (seed)       | `internal_account`                                                                              | `opening_equity`                                                            |
| Поступление подтверждено            | `internal_account`                                                                              | `organization_available` (полная сумма, без удержаний)                      |
| Подтверждение снято                 | сторно предыдущей проводки                                                                      |                                                                             |
| Заявка подана с суммой фондирования | `organization_available`                                                                        | `organization_held` на `funding_amount_rub`                                 |
| Сделан клиентский расчёт            | корректировка удержания до `client_charge_rub`: разница возвращается в `organization_available` |                                                                             |
| Заявка закрыта                      | `organization_held` на `client_charge_rub`                                                      | `execution_clearing` на `cost_amount_rub`; `margin_revenue` на `margin_rub` |
| Исходящий платёж исполнен           | `execution_clearing`                                                                            | `internal_account`                                                          |
| Перевод между счетами исполнен      | `internal_account` (куда)                                                                       | `internal_account` (откуда)                                                 |

Балансы для экранов: свободный остаток клиента = −сумма по `organization_available`; заморожено = −сумма по `organization_held`; деньги на счёте = сумма по `internal_account`. Остаток на `execution_clearing` показывает, сколько ещё должны оплатить исполнителям. Это новый полезный отчёт, которого сейчас нет.

```sql
create table ledger_accounts (
  id                   bigint generated always as identity primary key,
  account_type         ledger_account_type not null,
  organization_id      bigint references organizations(id),
  internal_account_id  bigint references internal_accounts(id),
  currency             currency_code not null default 'RUB' check (currency = 'RUB'),
  created_at           timestamptz not null default now(),
  check ((account_type in ('organization_available', 'organization_held')) = (organization_id is not null)),
  check ((account_type = 'internal_account') = (internal_account_id is not null))
);
create unique index uq_ledger_accounts__type_organization_internal
  on ledger_accounts (account_type, coalesce(organization_id, 0), coalesce(internal_account_id, 0));

create table ledger_transactions (
  id                        bigint generated always as identity primary key,
  transaction_type          ledger_transaction_type not null,
  occurred_at               timestamptz not null default now(),
  payment_order_id          bigint references payment_orders(id),
  incoming_payment_id       bigint references incoming_payments(id),
  internal_transfer_id      bigint references internal_transfers(id),
  outgoing_payment_id       bigint references outgoing_payments(id),
  reverses_transaction_id   bigint unique references ledger_transactions(id),  -- для сторно
  idempotency_key           text not null unique,     -- защищает от двойной проводки при повторном запросе
  created_by_user_id        bigint references users(id),
  comment                   text not null default ''
);

create table ledger_entries (
  id                     bigint generated always as identity primary key,
  ledger_transaction_id  bigint not null references ledger_transactions(id),
  ledger_account_id      bigint not null references ledger_accounts(id),
  amount_rub             numeric(18,2) not null check (amount_rub <> 0)   -- + дебет, − кредит
);
create index ix_ledger_entries__account on ledger_entries (ledger_account_id);

-- Гарантии на уровне БД:
-- 1) deferred constraint trigger: sum(amount_rub) по каждой ledger_transaction = 0 на момент commit;
-- 2) триггер, запрещающий UPDATE и DELETE в ledger_transactions и ledger_entries
--    (исправления только сторно-проводкой).

create view ledger_account_balances as
select a.*, coalesce(sum(e.amount_rub), 0) as balance_rub
from ledger_accounts a left join ledger_entries e on e.ledger_account_id = a.id
group by a.id;
```

Проводки создаются только в сервисном слое (`modules/ledger/post.ts`) в той же транзакции, что и смена статуса. Отдельный «пересчёт балансов» не нужен и невозможен. Если данных станет много, добавляется таблица периодических остатков, но для текущего масштаба это не нужно.

**Открытый вопрос** про переводы между счетами в статусе «Новая»: в таблице выше проводка делается при исполнении, это моя рекомендация. Если решите, что «Новая» тоже должна уменьшать баланс счёта-источника, добавится промежуточный счёт «деньги в пути»: при создании перевода деньги уходят с источника туда, при исполнении приходят с него на получателя.

## 6. Бизнес-правила, которые надо зафиксировать в коде (сейчас они размазаны или отсутствуют)

- **Черновиков нет.** Заявка создаётся одним действием, сразу полностью заполненной, в статусе `submitted`. Документы загружаются в форме до отправки и привязываются к заявке в момент создания. Если форму не отправили, непривязанные файлы удаляются фоновой задачей.
- **Переходы статусов заявки** задаются одной таблицей «из → в, кто может». Предварительная матрица, которую я предлагаю взять за основу (повторяет текущий UI):
  - `submitted → in_review` (менеджер);
  - `in_review → sent_to_bank | needs_correction` (менеджер);
  - `sent_to_bank → awaiting_closing_documents` (клиент подтверждает, что деньги дошли);
  - `awaiting_closing_documents → closing_documents_review` (клиент);
  - `closing_documents_review → closed | needs_correction` (менеджер);
  - `needs_correction → correction_review` (клиент);
  - `correction_review → in_review | needs_correction` (менеджер).

  Каждый переход пишется в `payment_order_status_changes` и, где затронуты деньги, создаёт проводку. Матрицу можно уточнить в любой момент: это одна константа в коде.

- **Что клиент может менять:** только блоки, разрешённые сотрудником в статусе `needs_correction`. Всё остальное меняет только менеджер.
- **Что клиент видит:** отдельный DTO без полей себестоимости и маржи. Это не флаг в общем сериализаторе, а отдельный тип.
- **Расчёты:** см. раздел 5.1.
- **Ошибки текущего кода, которые нельзя повторить:**
  - смена статуса клиентом в обход правил;
  - отдача себестоимости клиенту;
  - выбор счёта чужой организации;
  - права админа из роли в токене;
  - эндпоинты без проверки раздела;
  - внутренние счета, видимые клиентам.

  Для каждого пункта нужен тест на права доступа.

## 7. Структура URL: `/client` и `/manager`

Сейчас и клиент, и менеджер живут под `/`, а разделы различаются только guard'ами в React. В новой версии это два явных пространства с отдельными layout'ами и серверной проверкой доступа на входе. Слово «admin» не используется: роль называется **менеджер**, и в коде тоже `manager` (`users.kind = 'manager'`, `manager_permissions`).

```
/login                                   вход (логин + пароль, затем TOTP)
/account                                 профиль: смена пароля, 2FA (общее для всех)
/                                        редирект: клиент → /client, менеджер → /manager

/client                                  обзор: баланс, заявки, где нужно действие клиента
/client/payment-orders                   заявки
/client/payment-orders/new               новая заявка
/client/payment-orders/[id]              заявка
/client/beneficiaries                    контрагенты
/client/beneficiaries/[id]               контрагент, его банки и счета
/client/statement                        выписка

/manager                                 рабочая очередь: что требует действия менеджера
/manager/payment-orders                  заявки (фильтры в query: ?status=in_review&assignee=me)
/manager/payment-orders/[id]
/manager/incoming-payments               поступления (импорт Excel, подтверждение)
/manager/internal-transfers              переводы между счетами
/manager/internal-transfers/new
/manager/internal-transfers/[id]
/manager/outgoing-payments               исходящие платежи
/manager/outgoing-payments/new
/manager/outgoing-payments/[id]
/manager/balances                        балансы организаций и счетов
/manager/ledger                          журнал проводок
/manager/settings/organizations          справочники и настройки (бывший Django admin)
/manager/settings/payers
/manager/settings/execution-schemes
/manager/settings/internal-accounts
/manager/settings/suppliers
/manager/settings/users                  пользователи, права, сброс пароля и 2FA
```

**Правила:**

- Сегменты по-английски, `kebab-case`, во множественном числе, совпадают с именами сущностей в коде (`payment-orders` ↔ `paymentOrders` ↔ `payment_orders`).
- Создание — `/new`, карточка — `/[id]`. Редактирование идёт в карточке, отдельных `/edit` нет.
- Фильтры, сортировка и страница таблицы хранятся в query-параметрах, поэтому ссылку на отфильтрованный список можно отправить коллеге.
- В Next.js это `app/client/layout.tsx` и `app/manager/layout.tsx`. Каждый layout первым делом вызывает `requireClient()` или `requireManager()`, а страницы раздела ещё и `requireManager('incoming_payments')`. Middleware проверяет только наличие сессии.
- Менеджер, зашедший на `/client/...`, и клиент, зашедший на `/manager/...`, получают 404, а не редирект: так не раскрывается структура чужого раздела.
- Отдельный поддомен для менеджеров не нужен. Его можно добавить позже, если понадобится ограничить вход по IP на уровне nginx.

## 8. Интерфейс: компоненты и дизайн

### 8.1. Компоненты: стандартный shadcn без правок + папка `custom`

```
src/components/
  ui/        стандартные компоненты shadcn, добавляются только через `npx shadcn add`, руками не редактируются
  custom/    всё своё: композиции из ui-компонентов под задачи проекта
```

Правила:

- **`components/ui` не редактируется.** Файлы обновляются только командой shadcn. В CI стоит проверка: ui-файлы совпадают с реестром shadcn (`shadcn diff` либо сравнение с эталонной копией), любое ручное изменение роняет сборку.
- **Тема — стандартная shadcn (`neutral`)**, светлая и тёмная, без изменения CSS-переменных. Шрифт Geist (стандартный для Next.js), для чисел Geist Mono или `tabular-nums`.
- **`components/custom`** собирается только из ui-компонентов и утилит Tailwind для раскладки (`flex`, `grid`, `gap`, ширины). Цвета, скругления и тени ui-компонентов через `className` не переопределяются. Всё визуальное берётся из стандартных вариантов (`variant`, `size`).
- Готовые блоки shadcn (sidebar, login, data-table) копируются в `custom` как отправная точка и дальше считаются своим кодом.
- Один файл — один компонент, имя в `kebab-case`, экспорт в `PascalCase`.

Набор `custom`-компонентов, который понадобится:

| Компонент          | Из чего собран                                                  | Для чего                                                                         |
| ------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `app-shell`        | Sidebar, Breadcrumb, DropdownMenu                               | Каркас обоих разделов: меню слева, хлебные крошки и меню профиля сверху          |
| `page-header`      | Typography, Button                                              | Заголовок страницы, описание, одна основная кнопка справа                        |
| `data-table`       | Table + TanStack Table, Input, Select, Pagination, DropdownMenu | Все списки: сортировка, фильтры в URL, пагинация, выбор колонок, выгрузка в xlsx |
| `money`            | —                                                               | Вывод суммы: `1 234 567,89 ₽`, `tabular-nums`, выравнивание вправо               |
| `money-input`      | Input                                                           | Ввод суммы с разрядами, на выходе строка для decimal                             |
| `currency-select`  | Select                                                          | Выбор валюты из `currency_code`                                                  |
| `status-badge`     | Badge                                                           | Статус → стандартный вариант Badge + подпись из словаря (без своих цветов)       |
| `description-list` | Card                                                            | Карточка «поле — значение» для детальных страниц                                 |
| `file-upload`      | Input, Button, Progress                                         | Загрузка документов в S3 по presigned URL со списком файлов                      |
| `confirm-dialog`   | AlertDialog                                                     | Подтверждение необратимых действий                                               |
| `form-section`     | Field, Separator                                                | Группа полей формы с заголовком                                                  |
| `stat`             | Card                                                            | Число и подпись на обзорных страницах                                            |
| `status-timeline`  | —                                                               | История статусов заявки в боковой колонке                                        |
| `entity-combobox`  | Popover, Command                                                | Выбор контрагента, плательщика, поставщика с поиском                             |

### 8.2. Принципы дизайна

Цель — строгий рабочий инструмент: всё на своём месте, ничего лишнего, одинаковые вещи выглядят одинаково.

**Каркас.** На всех страницах один и тот же каркас: слева меню (shadcn Sidebar, сворачиваемое), сверху хлебные крошки и профиль, ниже контент. Шапка сейчас перегружена курсами, уведомлениями и полосой балансов. Это уходит:

- курсы переезжают на обзорную страницу;
- уведомления заменяются счётчиками в меню (`SidebarMenuBadge`): «Заявки · 3» означает, что три ждут вашего действия;
- балансы счетов переезжают на страницу «Балансы» и в обзор менеджера.

**Три шаблона страниц, и других нет:**

1. **Список:** `page-header` (заголовок + одна основная кнопка) → строка фильтров → `data-table`.
2. **Карточка:** заголовок с номером, статусом и кнопками действий для текущего статуса → две колонки. Слева блоки `description-list` и документы. Справа узкая колонка: суммы, расчёт, исполнитель, история статусов.
3. **Форма:** одна колонка шириной около 720 px, разделы `form-section`, подписи над полями, ошибки под полем, кнопки внизу справа.

**Правила:**

- **Одна основная кнопка на экране** (`variant="default"`), остальные `outline` или `ghost`. Опасные действия только через `confirm-dialog`.
- **Действия зависят от статуса.** В карточке показываются только допустимые переходы из матрицы статусов, остальные кнопки не рисуются вообще (сейчас многое показывается и блокируется).
- **Числа.** Суммы всегда через `money`: выравнивание вправо, моноширинные цифры, код валюты после суммы, два знака. Даты везде в одном формате `09.10.2026`, время только там, где важно.
- **Цвет несёт смысл, а не украшает.** Интерфейс монохромный, как тема `neutral`. Акцент только у основной кнопки, `destructive` только для ошибок и опасных действий. Статусы различаются подписью и вариантом Badge, без радуги.
- **Типографика из четырёх уровней:**
  - заголовок страницы `text-2xl font-semibold`;
  - заголовок блока `text-base font-semibold`;
  - основной текст `text-sm`;
  - вторичный текст `text-sm text-muted-foreground`.
- **Отступы по одной сетке:**
  - между блоками страницы `gap-6`;
  - внутри блока `gap-4`;
  - между полем и подписью `gap-2`.

  Карточки не вкладываются друг в друга.

- **Состояния.** Загрузка показывается через `Skeleton` по форме контента, пустой список через `Empty` с действием («Создать первую заявку»). Ошибка формы выводится у поля, ошибка страницы — через `Alert`, успех — через короткий toast.
- **Тексты.** Все подписи хранятся в одном словаре `messages/ru.ts`, одинаковые понятия называются одинаково (глоссарий из раздела 4). Кнопки называются глаголом: «Подать заявку», «Подтвердить поступление».
- **Плотность.** У менеджера плотные таблицы, рассчитанные на экран от 1280 px. У клиента просторнее, и его раздел работает на телефоне.
- **Доступность.** Всё управляется с клавиатуры (Radix это даёт). Контраст стандартной темы проходит проверку, пока её не трогаем.

**Как прийти к дизайну без хаоса.** Сначала собираются три шаблона страниц и `custom`-компоненты на тестовых данных, и вы их принимаете. Только после этого делаются все экраны. Готов сделать кликабельный макет этих трёх шаблонов до начала разработки.

## 9. Начальные данные (seed)

Переносить ничего не нужно. Есть только seed-скрипт `scripts/seed.ts`: он идемпотентный и запускается при развёртывании. Он создаёт:

1. первого сотрудника с полным доступом (отдельная команда `seed:admin`, пароль вводится в консоли);
2. внутренние счета (ATL, CIC, …), счёт по умолчанию для исходящих платежей, системные счета книги и проводки входящих остатков;
3. четыре текущие схемы исполнения с калькулятором и параметрами, перенесёнными из текущего кода;
4. `app_settings`, например `default_cost_markup_percent = 0.2`.

Для разработки и staging отдельно генерируются тестовые данные (`scripts/seed-dev.ts`): организации, бенефициары, заявки во всех статусах, поступления и соответствующие им проводки.

## 10. План работ

Оценки грубые, для одного разработчика, по объёму функциональности текущего кода.

| Этап | Содержание                                                                                                                                             | Оценка               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| 1    | Каркас Next.js, Drizzle-схема и миграции, Better Auth (логин, временные пароли, TOTP, сбросы менеджером, роли и разделы), `/client` и `/manager`, seed | 1–1,5 недели         |
| 1а   | `custom`-компоненты и три шаблона страниц на тестовых данных, ваше согласование дизайна                                                                | 0,5–1 неделя         |
| 2    | Модуль pricing (калькуляторы + схемы параметров), книга проводок с триггерами, машина статусов, тесты                                                  | 1,5 недели           |
| 3    | Клиентская часть: бенефициары, заявки, документы, выписка и баланс                                                                                     | 1,5–2 недели         |
| 4    | Админка: заявки, поступления (импорт Excel), переводы, исходящие платежи, балансы                                                                      | 2 недели             |
| 5    | Бэк-офис вместо Django admin: организации, схемы и параметры калькуляторов, счета, плательщики, пользователи и права, журнал проводок                  | 1 неделя             |
| 6    | Тесты прав доступа, e2e-сценарии, staging, деплой (Docker Compose + nginx, бэкапы БД)                                                                  | 0,5–1 неделя         |
|      | **Итого**                                                                                                                                              | **около 8–9 недель** |

Репозиторий: новый, чтобы история не смешивалась, либо новая ветка, где старые папки `django/` и `react/` удаляются, когда новый код покроет их функции.

## 11. Решения

| Вопрос                       | Решение                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Фреймворк                    | **Next.js** (решено)                                                                                                                                    |
| Аутентификация               | **Better Auth без почты**: логин, временные пароли от сотрудника, обязательный TOTP для сотрудников (раздел 2). Подтвердить, что такая схема устраивает |
| Балансы                      | **Книга проводок** (решено, раздел 5.2)                                                                                                                 |
| Калькуляторы                 | **Формулы кодом, параметры данными** (решение моё, обоснование в разделе 5.1)                                                                           |
| Черновики заявок             | **Убраны** (решено)                                                                                                                                     |
| Матрица статусов             | Берём предварительную матрицу из раздела 6, уточняется по ходу                                                                                          |
| Переводы в статусе «Новая»   | **Открыто.** Рекомендую проводить только исполненные; альтернатива — счёт «деньги в пути» (раздел 5.2)                                                  |
| Удержание 0,2% с поступлений | **Убрано полностью** (решено). Не путать с надбавкой себестоимости 0,2% в расчёте заявки (`cost_markup_percent`), это другой параметр, он остаётся      |
| URL                          | **`/client/...` и `/manager/...`**, роль в коде тоже `manager` (раздел 7)                                                                               |
| Компоненты                   | **Стандартный shadcn без правок** в `components/ui`, своё в `components/custom` (раздел 8.1)                                                            |
| Дизайн                       | Строгий монохромный, три шаблона страниц (раздел 8.2). Шаблоны согласуем до разработки всех экранов                                                     |
