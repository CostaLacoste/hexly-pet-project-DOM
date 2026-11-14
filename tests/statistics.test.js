import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { calculateStatistics, isTaskOverdue } from "../js/statistics.js";

const now = new Date(2026, 10, 14, 12, 0, 0);

describe("статистика", () => {
  test("определяет просроченную незавершённую задачу", () => {
    assert.equal(isTaskOverdue({ deadline: "2026-11-13", status: "todo" }, now), true);
    assert.equal(isTaskOverdue({ deadline: "2026-11-14", status: "todo" }, now), false);
    assert.equal(isTaskOverdue({ deadline: "2026-11-13", status: "done" }, now), false);
    assert.equal(isTaskOverdue({ deadline: "", status: "todo" }, now), false);
  });

  test("считает прогресс, просрочки и пункты чек-листов", () => {
    const stats = calculateStatistics([
      {
        status: "done",
        deadline: "2026-11-10",
        checklist: [{ done: true }, { done: false }],
      },
      {
        status: "progress",
        deadline: "2026-11-12",
        checklist: [{ done: true }],
      },
      { status: "todo", deadline: "2026-11-20" },
    ], now);

    assert.equal(stats.done, 1);
    assert.equal(stats.overdue, 1);
    assert.equal(stats.progress, 33);
    assert.equal(stats.checklistDone, 2);
    assert.equal(stats.checklistTotal, 3);
    assert.deepEqual(stats.priority, { high: 0, medium: 0, low: 0 });
    assert.equal(stats.completionDays.length, 7);
  });

  test("возвращает нулевую статистику для пустого списка", () => {
    const stats = calculateStatistics([], now);
    assert.equal(stats.done, 0);
    assert.equal(stats.overdue, 0);
    assert.equal(stats.progress, 0);
    assert.equal(stats.checklistDone, 0);
    assert.equal(stats.checklistTotal, 0);
    assert.deepEqual(stats.priority, { high: 0, medium: 0, low: 0 });
    assert.equal(stats.completionDays.length, 7);
  });
});
