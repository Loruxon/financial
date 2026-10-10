export const messages = {
  common: {
    actions: {
      save: "Сохранить",
      cancel: "Отмена",
      create: "Создать",
      edit: "Редактировать",
      delete: "Удалить",
      confirm: "Подтвердить",
      back: "Назад",
      download: "Скачать",
      upload: "Загрузить",
      export: "Выгрузить в Excel",
      filters: "Фильтры",
      resetFilters: "Сбросить фильтры",
      search: "Поиск",
    },
    empty: {
      noResults: "Ничего не найдено",
      noResultsHint: "Попробуйте изменить фильтры",
    },
    errors: {
      generic: "Что-то пошло не так. Попробуйте ещё раз.",
      notFound: "Не найдено",
      forbidden: "Недостаточно прав",
      validation: "Проверьте правильность заполнения полей",
    },
    dateFormat: "дд.мм.гггг",
    theme: {
      light: "Светлая",
      dark: "Тёмная",
      system: "Системная",
    },
    goHome: "На главную",
    notFoundTitle: "Страница не найдена",
    notFoundDescription:
      "Такой страницы не существует или у вас нет к ней доступа",
    errorTitle: "Что-то пошло не так",
    errorDescription: "Попробуйте обновить страницу",
    retry: "Повторить",
  },

  nav: {
    client: {
      overview: "Обзор",
      paymentOrders: "Заявки",
      beneficiaries: "Контрагенты",
      statement: "Выписка",
      account: "Профиль",
    },
    manager: {
      overview: "Рабочая очередь",
      paymentOrders: "Заявки",
      incomingPayments: "Поступления",
      internalTransfers: "Переводы между счетами",
      outgoingPayments: "Исходящие платежи",
      balances: "Балансы",
      ledger: "Журнал проводок",
      settings: "Настройки",
      settingsOrganizations: "Организации",
      settingsPayers: "Плательщики",
      settingsExecutionSchemes: "Схемы исполнения",
      settingsInternalAccounts: "Внутренние счета",
      settingsSuppliers: "Поставщики",
      settingsUsers: "Пользователи",
      account: "Профиль",
    },
  },

  users: {
    title: "Пользователи",
    kind: {
      client: "Клиент",
      manager: "Менеджер",
    },
    fields: {
      username: "Логин",
      name: "Имя",
      kind: "Тип",
      organization: "Организация",
      hasFullManagerAccess: "Полный доступ",
      managerSections: "Доступные разделы",
      isActive: "Активен",
    },
  },

  organizations: {
    title: "Организации",
    fields: {
      name: "Название",
      clientFeePercent: "Процент клиента",
      clientSwiftFee: "SWIFT клиента",
      clientPricingMethod: "Способ расчёта",
    },
    pricingMethod: {
      add_on: "Прямой",
      gross_up: "Обратный",
    },
  },

  payers: {
    title: "Плательщики",
    fields: {
      name: "Плательщик в РФ",
      inn: "ИНН",
    },
  },

  beneficiaries: {
    title: "Контрагенты",
    titleOne: "Контрагент",
    fields: {
      name: "Контрагент",
      address: "Адрес",
    },
    banks: {
      title: "Банки",
      fields: {
        name: "Банк",
        address: "Адрес банка",
        swiftCode: "SWIFT / BIC",
        bankType: "Тип банка",
      },
      bankType: {
        single_currency: "Одновалютный",
        multi_currency: "Мультивалютный",
      },
    },
    accounts: {
      title: "Счета",
      fields: {
        accountNumber: "Номер счёта",
        currencies: "Валюты",
      },
    },
    empty: {
      noBeneficiaries: "Пока нет ни одного контрагента",
      createFirst: "Добавить первого контрагента",
    },
  },

  internalAccounts: {
    title: "Внутренние счета",
    fields: {
      name: "Счёт",
      isDefaultForOutgoing: "По умолчанию для исходящих",
    },
  },

  executionSchemes: {
    title: "Схемы исполнения",
    fields: {
      name: "Схема",
      calculator: "Калькулятор",
    },
    calculator: {
      mongols: "Монголы",
      ermak: "Ермак",
      alsafi: "Альсафи",
      stavropol: "Ставрополь",
    },
  },

  suppliers: {
    title: "Поставщики",
    fields: {
      name: "Поставщик",
    },
  },

  exchangeRates: {
    title: "Курсы валют",
    source: {
      cbr: "ЦБ РФ",
      nbk: "НБ РК",
    },
    fields: {
      source: "Источник",
      rateDate: "Дата",
      currency: "Валюта",
      rate: "Курс",
    },
  },

  paymentOrders: {
    title: "Заявки",
    titleOne: "Заявка",
    newTitle: "Новая заявка",
    status: {
      submitted: "Новая",
      in_review: "На проверке",
      sent_to_bank: "Отправлена в банк",
      awaiting_closing_documents: "Ожидание закрывающих документов",
      closing_documents_review: "Проверка закрывающих документов",
      closed: "Закрыта",
      needs_correction: "Требует исправления",
      correction_review: "Проверка исправлений",
    },
    fields: {
      invoiceNumber: "Номер счёта",
      amount: "Сумма",
      currency: "Валюта",
      paymentDetails: "Назначение платежа",
      beneficiary: "Контрагент",
      beneficiaryBank: "Банк контрагента",
      beneficiaryAccount: "Счёт контрагента",
      payer: "Плательщик",
      internalAccount: "Внутренний счёт",
      fundingAmountRub: "Сумма фондирования",
      fundingDate: "Дата фондирования",
      executionDate: "Дата исполнения",
      clientExchangeRate: "Курс",
      clientChargeRub: "Затраты",
      clientRemainderRub: "Остаток",
      assignee: "Исполнитель",
      executionScheme: "Схема исполнения",
      managerNote: "Заметка менеджера",
      costAmountRub: "Себестоимость",
      marginRub: "Маржа",
    },
    actions: {
      submit: "Подать заявку",
      startReview: "Взять на проверку",
      sendToBank: "Отправить в банк",
      confirmMoneyReceived: "Подтвердить поступление денег",
      submitClosingDocuments: "Отправить закрывающие документы",
      close: "Закрыть заявку",
      requestCorrection: "Вернуть на исправление",
      submitCorrection: "Отправить исправление",
    },
    empty: {
      noOrders: "Пока нет ни одной заявки",
      createFirst: "Подать первую заявку",
    },
    fileSection: {
      payment: "Платёж",
      closing: "Закрывающие документы",
      bank: "Банк",
    },
    fileType: {
      invoice: "Счёт",
      contract_request: "Заявка на контракт",
      customs_declaration: "Таможенная декларация",
      transport: "Транспортные документы",
      swift_confirmation: "Подтверждение SWIFT",
      order_form: "Бланк-заказ",
      other: "Другое",
    },
  },

  incomingPayments: {
    title: "Поступления",
    status: {
      pending: "Не подтверждено",
      confirmed: "Подтверждено",
    },
    fields: {
      paymentDate: "Дата поступления",
      amountRub: "Сумма",
      internalAccount: "Внутренний счёт",
      payer: "Плательщик",
      confirmedAt: "Подтверждено",
    },
    actions: {
      confirm: "Подтвердить поступление",
      unconfirm: "Снять подтверждение",
      importExcel: "Импортировать из Excel",
    },
    empty: {
      noPayments: "Пока нет ни одного поступления",
    },
  },

  internalTransfers: {
    title: "Переводы между счетами",
    titleOne: "Перевод",
    newTitle: "Новый перевод",
    status: {
      pending: "Новый",
      executed: "Исполнен",
    },
    fields: {
      fromAccount: "Со счёта",
      toAccount: "На счёт",
      amountRub: "Сумма",
      transferDate: "Дата",
      note: "Комментарий",
    },
    actions: {
      create: "Создать перевод",
      execute: "Исполнить перевод",
    },
    empty: {
      noTransfers: "Пока нет ни одного перевода",
      createFirst: "Создать первый перевод",
    },
  },

  outgoingPayments: {
    title: "Исходящие платежи",
    titleOne: "Исходящий платёж",
    newTitle: "Новый платёж",
    status: {
      new: "Новый",
      in_progress: "В работе",
      in_execution: "На исполнении",
      executed: "Исполнен",
    },
    fields: {
      invoiceNumber: "Номер счёта",
      amountRub: "Сумма",
      supplier: "Поставщик",
      internalAccount: "Внутренний счёт",
      executedAt: "Дата исполнения",
    },
    actions: {
      create: "Создать платёж",
      execute: "Исполнить платёж",
    },
    empty: {
      noPayments: "Пока нет ни одного исходящего платежа",
      createFirst: "Создать первый платёж",
    },
  },

  balances: {
    title: "Балансы",
    available: "Свободный остаток",
    held: "Заморожено",
    internalAccountBalance: "На счёте",
    executionClearing: "К оплате исполнителям",
  },

  ledger: {
    title: "Журнал проводок",
    fields: {
      occurredAt: "Дата",
      transactionType: "Тип операции",
      account: "Счёт",
      amountRub: "Сумма",
      comment: "Комментарий",
    },
    transactionType: {
      opening_balance: "Входящий остаток",
      incoming_payment_confirmed: "Подтверждение поступления",
      payment_order_hold: "Заморозка по заявке",
      payment_order_hold_adjusted: "Корректировка заморозки",
      payment_order_closed: "Закрытие заявки",
      internal_transfer_executed: "Исполнение перевода",
      outgoing_payment_executed: "Исполнение исходящего платежа",
      reversal: "Сторно",
    },
  },

  fileUpload: {
    dropHint: "Перетащите файлы сюда или выберите на компьютере",
  },

  auth: {
    login: "Вход",
    loginDescription: "Введите логин и пароль, чтобы войти в систему",
    usernameField: "Логин",
    passwordField: "Пароль",
    signIn: "Войти",
    signOut: "Выйти",
    chooseUser: "Выберите тестового пользователя",
    prototypeMode: "Режим прототипа",
  },

  account: {
    title: "Профиль",
    password: {
      title: "Пароль",
      description: "Смена пароля появится на этапе 2",
    },
    twoFactor: {
      title: "Двухфакторная аутентификация",
      description: "Настройка TOTP появится на этапе 2",
    },
  },
} as const;

export type Messages = typeof messages;
