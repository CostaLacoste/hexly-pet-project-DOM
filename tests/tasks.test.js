import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { getTasks, setTasks } from "../js/state.js";
import {
  createTask,
  deleteTask,
  getRecurringTaskData,
  getTaskById,
  moveTask,
  updateTask,
} from "../js/tasks.js";

beforeEach(() => {
  setTasks([]);
});

describe("задачи", () => {
  test("создаёт задачу и нормализует пользовательские данные", () => {
    const task = createTask({
      title: "  Подготовить релиз  ",
      description: "  Проверить сборку  ",
      status: "progress",
      priority: "high",
      deadline: "2026-12-01",
      tags: " Релиз, дизайн, релиз, важно, qa, команда, лишний ",
      checklist: [
        { text: "  Собрать проект  ", done: true },
        { text: "Проверить тесты", done: false },
        { text: "   ", done: true },
      ],
    });

    assert.equal(task.title, "Подготовить релиз");
    assert.equal(task.description, "Проверить сборку");
    assert.deepEqual(task.tags, ["релиз", "дизайн", "важно", "qa", "команда"]);
    assert.equal(task.checklist.length, 2);
    assert.equal(task.checklist[0].text, "Собрать проект");
    assert.equal(task.checklist[0].done, true);
    assert.ok(task.checklist.every((item) => item.id));
    assert.ok(task.id);
    assert.ok(task.createdAt);
    assert.equal(getTasks().length, 1);
  });

  test("подставляет безопасные значения для неизвестного статуса и приоритета", () => {
    const task = createTask({
      title: "Задача",
      status: "unknown",
      priority: "urgent",
    });

    assert.equal(task.status, "todo");
    assert.equal(task.priority, "low");
  });

  test("не создаёт задачу без названия", () => {
    assert.throws(
      () => createTask({ title: "   " }),
      /Название задачи не может быть пустым/,
    );
    assert.equal(getTasks().length, 0);
  });

  test("обновляет задачу, сохраняя идентификатор и дату создания", () => {
    const original = createTask({ title: "Черновик", tags: "идея" });
    const updated = updateTask(original.id, {
      title: "Готовый текст",
      checklist: [{ id: "step-1", text: "Вычитать", done: true }],
    });

    assert.equal(updated.id, original.id);
    assert.equal(updated.createdAt, original.createdAt);
    assert.equal(updated.title, "Готовый текст");
    assert.deepEqual(updated.tags, ["идея"]);
    assert.deepEqual(updated.checklist, [
      { id: "step-1", text: "Вычитать", done: true },
    ]);
  });

  test("возвращает null при обновлении отсутствующей задачи", () => {
    assert.equal(updateTask("missing", { title: "Нет" }), null);
  });

  test("находит и удаляет задачу", () => {
    const task = createTask({ title: "Удалить" });

    assert.equal(getTaskById(task.id)?.title, "Удалить");
    assert.equal(deleteTask(task.id), true);
    assert.equal(deleteTask(task.id), false);
    assert.equal(getTaskById(task.id), undefined);
  });

  test("создаёт данные следующей повторяющейся задачи", () => {
    const next = getRecurringTaskData({
      title: "Отчёт",
      recurrence: "weekly",
      deadline: "2026-11-14",
      checklist: [{ id: "1", text: "Собрать данные", done: true }],
    }, new Date(2026, 10, 14));

    assert.equal(next.status, "todo");
    assert.equal(next.deadline, "2026-11-21");
    assert.equal(next.checklist[0].done, false);
    assert.equal(next.checklist[0].id, "");
  });

  test("перемещает задачу и обновляет ручной порядок", () => {
    setTasks([
      { id: "a", title: "A", boardId: "default", status: "todo", priority: "low", order: 0 },
      { id: "b", title: "B", boardId: "default", status: "progress", priority: "low", order: 0 },
      { id: "c", title: "C", boardId: "default", status: "progress", priority: "low", order: 1 },
    ]);

    const moved = moveTask("a", "progress", "c");
    const progressTasks = getTasks()
      .filter((task) => task.status === "progress")
      .sort((first, second) => first.order - second.order);

    assert.equal(moved.status, "progress");
    assert.deepEqual(progressTasks.map((task) => task.id), ["b", "a", "c"]);
  });
});
