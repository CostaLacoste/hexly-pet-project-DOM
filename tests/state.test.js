import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { getTasks, setTasks } from "../js/state.js";

beforeEach(() => {
  setTasks([]);
});

describe("состояние", () => {
  test("не позволяет изменить состояние через исходный массив", () => {
    const source = [{
      id: "1",
      title: "Задача",
      tags: ["важно"],
      checklist: [{ id: "step", text: "Шаг", done: false }],
    }];

    setTasks(source);
    source[0].tags.push("изменено");
    source[0].checklist[0].done = true;

    assert.deepEqual(getTasks()[0].tags, ["важно"]);
    assert.equal(getTasks()[0].checklist[0].done, false);
  });

  test("возвращает глубокую копию вложенных данных", () => {
    setTasks([{
      id: "1",
      title: "Задача",
      tags: ["важно"],
      checklist: [{ id: "step", text: "Шаг", done: false }],
    }]);

    const snapshot = getTasks();
    snapshot[0].tags[0] = "подмена";
    snapshot[0].checklist[0].done = true;

    assert.deepEqual(getTasks()[0].tags, ["важно"]);
    assert.equal(getTasks()[0].checklist[0].done, false);
  });

  test("преобразует некорректное значение состояния в пустой массив", () => {
    setTasks(null);
    assert.deepEqual(getTasks(), []);
  });
});
