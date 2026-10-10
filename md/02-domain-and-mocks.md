# Шаг 02. Типы предметной области, тексты, тестовые данные

## Контекст

Прочитай `CLAUDE.md` и разделы 4, 5, 5.2 и 6 в `docs/target-design.md`. Мы на этапе прототипа: базы нет, данные живут в памяти сервера. Но экраны должны обращаться к данным **так же, как потом будут обращаться к настоящей базе**, чтобы на этапе 2 заменить только реализацию, не трогая экраны.

## Задача

### 1. Типы (`src/modules/<module>/types.ts`)

Типы TypeScript повторяют схему из раздела 5 дизайн-документа, имена в `camelCase`. Модули и основные типы:

| Модуль               | Типы                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`              | `User` (`id`, `username`, `name`, `kind: 'client' \| 'manager'`, `hasFullManagerAccess`, `managerSections: ManagerSection[]`, `organizationId \| null`, `isActive`) |
| `organizations`      | `Organization` (`clientFeePercent`, `clientSwiftFee`, `clientPricingMethod: 'add_on' \| 'gross_up'`), `Payer` (`name`, `inn`)                                       |
| `beneficiaries`      | `Beneficiary`, `BeneficiaryBank` (`swiftCode`, `bankType`, `archivedAt`), `BeneficiaryAccount` (`accountNumber`, `currencies`)                                      |
| `payment-orders`     | `PaymentOrder` (все поля из таблицы `payment_orders`), `PaymentOrderStatus`, `PaymentOrderStatusChange`, `PaymentOrderFile`                                         |
| `incoming-payments`  | `IncomingPayment` (`paymentDate`, `amountRub`, `internalAccountId`, `payerId`, `status: 'pending' \| 'confirmed'`, `confirmedAt`, связанные заявки)                 |
| `internal-accounts`  | `InternalAccount`                                                                                                                                                   |
| `internal-transfers` | `InternalTransfer`                                                                                                                                                  |
| `outgoing-payments`  | `OutgoingPayment`, `Supplier`                                                                                                                                       |
| `execution-schemes`  | `ExecutionScheme` (`calculator`, `parameters: unknown`)                                                                                                             |
| `exchange-rates`     | `ExchangeRate` (`source: 'cbr' \| 'nbk'`, `rateDate`, `currency`, `rate`)                                                                                           |
| `ledger`             | `LedgerAccount`, `LedgerTransaction`, `LedgerEntry`                                                                                                                 |

Общие типы в `src/modules/shared/types.ts`:

- `Money = string` — десятичная строка, например `"1234567.89"`;
- `CurrencyCode = 'RUB' | 'USD' | 'EUR' | 'CNY' | 'KZT'`;
- `IsoDate = string` (`YYYY-MM-DD`), `IsoDateTime = string`.

Для клиента отдельный тип `ClientPaymentOrder`: это `PaymentOrder` **без** полей себестоимости и маржи (`cost*`, `marginRub`, `isMinFeeApplied`, `costCalculation`, `managerNote`, `assigneeUserId`). Его возвращают все клиентские запросы.

### 2. Тексты (`src/messages/ru.ts`)

Один объект со всеми подписями:

- статусы каждой сущности;
- названия разделов меню и страниц;
- подписи полей;
- тексты кнопок (глаголом: «Подать заявку», «Подтвердить поступление»);
- пустые состояния.

Строки в компонентах не пишутся, только `messages.paymentOrders.status.in_review` и т. п. Термины по глоссарию: заявка, контрагент, плательщик, поступление, перевод, исходящий платёж, счёт, схема исполнения.

### 3. Утилиты (`src/lib/format.ts`)

- `formatMoney(value: Money, currency?: CurrencyCode)` → `1 234 567,89 ₽` / `12 500,00 USD`, через `Intl.NumberFormat('ru-RU')` и `decimal.js`;
- `formatDate(iso)` → `09.10.2026`, `formatDateTime(iso)` → `09.10.2026 14:05`;
- `formatInn`, `formatAccountNumber` (группы по 4 цифры для читаемости).

Покрой их юнит-тестами (Vitest, добавь его в проект и в `pnpm check`).

### 4. Тестовые данные (`src/mocks/`)

Реалистичные данные на русском:

- 3 организации-клиента, у каждой 2–3 плательщика (ИНН корректного формата);
- 4–6 контрагентов с банками и счетами (EUR, USD, CNY, мультивалютный);
- внутренние счета `ATL`, `CIC` (по умолчанию для исходящих), `KZ-1`;
- 4 схемы исполнения: Монголы, Ермак, Альсафи, Ставрополь (параметры произвольные, но правдоподобные);
- около 30 заявок, **во всех статусах**, у части есть клиентский расчёт и себестоимость, у части файлы и история статусов;
- около 25 поступлений (подтверждённые и нет, привязанные к заявкам и нет);
- 5 переводов между счетами, 8 исходящих платежей, 5 поставщиков;
- курсы ЦБ за последние 30 дней (USD, EUR, CNY) и НБ РК (EUR, CNY);
- пользователи:
  - `client.alfa` и `client.beta` — клиенты двух разных организаций;
  - `manager.full` — полный доступ;
  - `manager.payments` — доступ только к поступлениям и переводам.

Данные генерируются детерминированно (фиксированный seed), чтобы картинка не менялась от перезапуска.

### 5. Книга проводок на моках

Поступления, закрытые заявки, исходящие платежи и переводы должны быть отражены проводками по правилам из раздела 5.2 дизайн-документа. Реализуй функции `post…` в `src/modules/ledger/` поверх in-memory хранилища и создай моки **через эти функции**, а не готовыми числами. Балансы на экранах считаются только из проводок.

### 6. Слой доступа к данным

Для каждого модуля:

- `src/modules/<module>/queries.ts` — асинхронные функции чтения: `listPaymentOrders(filter)`, `getPaymentOrder(id)`, `getOrganizationBalance(orgId)` и т. д.;
- `src/modules/<module>/actions.ts` — Server Actions для изменений: `submitPaymentOrder`, `changePaymentOrderStatus`, `confirmIncomingPayment` и т. д. Каждое действие валидирует вход zod-схемой и возвращает `{ ok: true, data } | { ok: false, error }`.

Правила:

- Текущий пользователь берётся из `src/modules/auth/session.ts` → `getCurrentUser()`. На этапе прототипа функция читает cookie `mock_user_id`, а экран выбора пользователя появится в шаге 03. На этапе 2 её реализация заменится на Better Auth без изменения вызовов. Каждая функция проверяет права: клиент видит только свою организацию и получает `ClientPaymentOrder`; менеджер — только разрешённые разделы.
- Смена статуса заявки проходит через одну таблицу переходов `src/modules/payment-orders/status-transitions.ts` (раздел 6 дизайн-документа) и пишет запись в историю.
- Реализация на этом этапе работает с in-memory хранилищем из `src/mocks/store.ts` (изменения живут до перезапуска сервера). Экраны **никогда** не импортируют `src/mocks` напрямую, только `queries` и `actions`.
- Добавь искусственную задержку 200–400 мс в queries (флаг `MOCK_LATENCY`), чтобы были видны состояния загрузки.

## Не делать

- Не делать экраны. Только данные, типы, тексты, утилиты, тесты.
- Не подключать базу.

## Как проверить

- `pnpm check` и `pnpm test` проходят.
- Есть тест, который проверяет, что сумма записей каждой проводки равна нулю, и что баланс организации из книги совпадает с ожидаемым на простом сценарии: поступление 1 000 000 → заявка с удержанием 600 000 → закрытие с расчётом 590 000.
- Есть тест прав: `client.alfa` не может получить заявку организации `beta`, клиентский тип не содержит полей себестоимости, `manager.payments` не может читать заявки.
