# Flowboard — канбан-доска

Учебное веб-приложение для управления задачами. Проект предназначен для демонстрации работы с DOM нативными средствами JavaScript без библиотек и фреймворков.

## Рабочая версия

[Открыть Flowboard](https://flowboard-kanban-20261113.costalacoste.chatgpt.site)

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
│   ├── storage.js
│   ├── tasks.js
│   └── ui.js
├── index.html
└── README.md
```

## Публикация

Приложение опубликовано с помощью Sites:

<https://flowboard-kanban-20261113.costalacoste.chatgpt.site>
