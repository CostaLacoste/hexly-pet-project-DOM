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

    assert.deepEqual(stats, {
      done: 1,
      overdue: 1,
      progress: 33,
      checklistDone: 2,
      checklistTotal: 3,
    });
  });

  test("возвращает нулевую статистику для пустого списка", () => {
    assert.deepEqual(calculateStatistics([], now), {
      done: 0,
      overdue: 0,
      progress: 0,
      checklistDone: 0,
      checklistTotal: 0,
    });
  });
});
