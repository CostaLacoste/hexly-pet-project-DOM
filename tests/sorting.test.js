import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { sortTasks } from "../js/sorting.js";

const tasks = [
  { id: "a", order: 2, priority: "low", deadline: "", createdAt: "2026-01-01", checklist: [] },
  { id: "b", order: 0, priority: "high", deadline: "2026-12-01", createdAt: "2026-03-01", checklist: [{ done: true }] },
  { id: "c", order: 1, priority: "medium", deadline: "2026-11-01", createdAt: "2026-02-01", checklist: [{ done: false }, { done: true }] },
];

describe("сортировка", () => {
  test("сортирует по ручному порядку", () => {
    assert.deepEqual(sortTasks(tasks, "manual").map((task) => task.id), ["b", "c", "a"]);
  });

  test("сортирует по сроку, приоритету и дате создания", () => {
    assert.deepEqual(sortTasks(tasks, "deadline").map((task) => task.id), ["c", "b", "a"]);
    assert.deepEqual(sortTasks(tasks, "priority").map((task) => task.id), ["b", "c", "a"]);
    assert.deepEqual(sortTasks(tasks, "created").map((task) => task.id), ["b", "c", "a"]);
  });

  test("сортирует по прогрессу чек-листа", () => {
    assert.deepEqual(sortTasks(tasks, "checklist").map((task) => task.id), ["b", "c", "a"]);
  });
});
