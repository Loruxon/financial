# Шаг 01. Новый проект: Next.js, shadcn, правила

## Контекст

Мы с нуля переписываем финансовую платформу. Старая версия (Django + React/Vite, репозиторий `Loruxon/financial-systems`) служит только справочником по функциональности. Код из неё не копируем. Проект ещё не запущен: данных и пользователей нет.

Платформа обрабатывает заявки клиентов (организаций) на международные платежи. Клиент подаёт заявку на оплату иностранному контрагенту и фондирует её рублями. Менеджеры подтверждают поступления, ведут заявку по статусам, считают курс, себестоимость и маржу, делают переводы между внутренними счетами и исходящие платежи.

Целевая архитектура описана в файле `financial-systems-target-design.md` (приложен к заданию). Положи его в `docs/target-design.md`.

## Задача

Создать пустой, но правильно настроенный проект, в котором дальше будут делаться все шаги.

### 1. Проект

- Next.js, актуальная стабильная версия, App Router, TypeScript, `src/`-директория, Tailwind CSS 4, ESLint. Менеджер пакетов pnpm.
- `tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`, алиас `@/*` → `src/*`.
- Prettier с `prettier-plugin-tailwindcss`. Скрипты `lint`, `typecheck`, `format`, `check` (lint + typecheck + check:ui).
- Шрифты: Geist Sans и Geist Mono через `next/font` (стандарт create-next-app).
- Язык страницы `lang="ru"`.

### 2. shadcn/ui

- `npx shadcn@latest init`: стиль по умолчанию, базовый цвет **neutral**, CSS-переменные включены. После init **никаких правок** темы и `globals.css`, кроме того, что сгенерировал shadcn.
- Добавить компоненты одной командой `shadcn add`:
  `alert alert-dialog avatar badge breadcrumb button calendar card checkbox collapsible command dialog dropdown-menu empty field input input-group label pagination popover progress radio-group scroll-area select separator sheet sidebar skeleton sonner spinner switch table tabs textarea tooltip`.
  Если какого-то нет в текущем реестре shadcn, пропусти его и напиши об этом в отчёте.
- Тёмная тема: `next-themes` по инструкции shadcn. Переключатель появится в шаге 03.

### 3. Неизменность `src/components/ui`

Правило проекта: файлы в `src/components/ui` — стандартный shadcn, руками их не меняем никогда. Всё своё лежит в `src/components/custom`.

Сделай скрипт `scripts/check-ui-pristine.mjs` (запуск: `pnpm check:ui`), который:

1. берёт список файлов из `src/components/ui`;
2. во временной папке создаёт минимальный проект с тем же `components.json` и выполняет `shadcn add <те же компоненты> --yes --overwrite`;
3. сравнивает результат с `src/components/ui` и падает с понятным сообщением, если есть различия.

Сам список компонентов храни в `scripts/ui-components.json`. Этот же список используй при добавлении новых компонентов.

### 4. Структура папок

Создай пустые папки с `README.md` в одну строку о назначении каждой:

```
src/
  app/                      маршруты Next.js
  components/
    ui/                     стандартный shadcn, не редактируется
    custom/                 свои компоненты (только из ui + Tailwind для раскладки)
  modules/                  предметная область по модулям: payment-orders, incoming-payments, ...
  lib/                      утилиты без предметной логики (format, cn, ...)
  messages/                 русские тексты интерфейса
  mocks/                    тестовые данные этапа прототипа
docs/
scripts/
```

### 5. `CLAUDE.md` в корне

Это постоянные правила для Claude Code в этом репозитории. Перенеси в него кратко (до ~150 строк) разделы 3, 7 и 8 из `docs/target-design.md`, а также правила ниже:

- Язык кода и БД английский, тексты интерфейса русские и только из `src/messages/ru.ts`.
- Имена по глоссарию (раздел 4 дизайн-документа). Никакого транслита (`sebes`, `prf` и т. п.).
- Деньги: тип `string` в данных, расчёты через `decimal.js`, в коде никогда `number`. Вывод суммы только через компонент `Money`.
- `src/components/ui` не редактировать. Новый shadcn-компонент добавлять через `pnpm dlx shadcn@latest add` и дописывать в `scripts/ui-components.json`.
- `custom`-компоненты не переопределяют цвета, скругления и тени ui-компонентов через `className`, используют только их `variant` и `size`. `className` допустим для раскладки (flex, grid, gap, ширина, отступы снаружи).
- Три шаблона страниц: список, карточка, форма (раздел 8.2). Новых раскладок не придумывать.
- Роли: `client` и `manager`. Разделы `/client/*` и `/manager/*`. Слова `admin` и `staff` в коде не используются.
- Перед завершением любой задачи прогонять `pnpm check`.

### 6. Главная страница

Пока `app/page.tsx` показывает одну строку «Financial Systems» по центру. Реальные маршруты появятся в шаге 03.

## Не делать

- Не подключать базу, ORM, авторизацию, S3. Это этап 2.
- Не менять тему shadcn и не добавлять свои цвета.

## Как проверить

- `pnpm dev` запускается, на `/` видна надпись.
- `pnpm check` проходит.
- Внесите любую правку в `src/components/ui/button.tsx`: `pnpm check:ui` должен упасть. После отката снова проходит.
- В корне есть `CLAUDE.md`, в `docs/` лежит `target-design.md`.
