import assert from "node:assert/strict";
import { after, beforeEach, describe, test } from "node:test";

import {
  loadBoards,
  loadSetting,
  loadTasks,
  saveBoards,
  saveSetting,
  saveTasks,
} from "../js/storage.js";

const originalLocalStorage = globalThis.localStorage;

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

after(() => {
  if (originalLocalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalLocalStorage;
  }
});

describe("локальное хранилище", () => {
  test("сохраняет и загружает задачи", () => {
    const tasks = [{ id: "1", title: "Задача", tags: ["тест"] }];

    assert.equal(saveTasks(tasks), true);
    assert.deepEqual(loadTasks(), tasks);
  });

  test("возвращает пустой массив, когда данных нет", () => {
    assert.deepEqual(loadTasks(), []);
  });

  test("безопасно обрабатывает повреждённый JSON", (context) => {
    context.mock.method(console, "error", () => {});
    globalThis.localStorage.setItem("flowboard-tasks", "{broken");

    assert.deepEqual(loadTasks(), []);
    assert.equal(console.error.mock.callCount(), 1);
  });

  test("отклоняет сохранённое значение, если это не массив", () => {
    globalThis.localStorage.setItem("flowboard-tasks", JSON.stringify({ id: "1" }));
    assert.deepEqual(loadTasks(), []);
  });

  test("сообщает об ошибке записи", (context) => {
    context.mock.method(console, "error", () => {});
    globalThis.localStorage.setItem = () => {
      throw new Error("quota");
    };

    assert.equal(saveTasks([]), false);
    assert.equal(console.error.mock.callCount(), 1);
  });

  test("сохраняет доски и настройки", () => {
    const boards = [{ id: "default", name: "Основная" }];
    assert.equal(saveBoards(boards), true);
    assert.equal(saveSetting("theme", "dark"), true);
    assert.deepEqual(loadBoards(), boards);
    assert.equal(loadSetting("theme", "classic"), "dark");
    assert.equal(loadSetting("unknown", "fallback"), "fallback");
  });
});
