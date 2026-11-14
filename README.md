# Flowboard — канбан-доска

Учебное веб-приложение для управления задачами. Проект предназначен для демонстрации работы с DOM нативными средствами JavaScript без библиотек и фреймворков.


## Возможности

- создание, редактирование и удаление задач;
- распределение задач по трём статусам;
- изменение статуса с помощью Drag and Drop;
- поиск и фильтрация по приоритету;
- сохранение данных в `localStorage`.

Данные сохраняются локально в браузере, поэтому задачи остаются на доске после перезагрузки страницы.

## Технологии

- HTML5;
- CSS3;
- JavaScript и ES-модули;
- нативный DOM API;
- Drag and Drop API;
- Web Storage API.

## Локальный запуск

Запустите проект через локальный сервер, например:

```bash
python3 -m http.server 8000
```

Затем откройте `http://localhost:8000`.

## Автотесты

Проект использует встроенный тестовый раннер Node.js, поэтому установка зависимостей не требуется.

```bash
npm test
```

Дополнительные режимы:

```bash
npm run test:watch
npm run test:coverage
```

Тесты проверяют CRUD-операции, нормализацию данных, фильтры, состояние,
работу с `localStorage` и расчёт статистики.

## Структура проекта

```text
├── assets/
│   └── images/
├── dist/              # Готовая версия для публикации
├── css/
│   ├── base.css
│   ├── components.css
│   ├── overlays.css
│   ├── style.css
│   └── variables.css
├── js/
│   ├── drag-drop.js
│   ├── filters.js
│   ├── main.js
│   ├── state.js
│   ├── statistics.js
│   ├── storage.js
│   ├── tasks.js
│   └── ui.js
├── tests/
│   ├── filters.test.js
│   ├── state.test.js
│   ├── statistics.test.js
│   ├── storage.test.js
│   └── tasks.test.js
├── index.html
├── package.json
└── README.md
```
