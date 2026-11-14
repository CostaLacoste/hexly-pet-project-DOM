import assert from "node:assert/strict";
import test from "node:test";

import { addColumn, getDefaultColumns, normalizeColumns, removeColumn, renameColumn } from "../js/workflow.js";

test("создаёт и переименовывает пользовательские колонки", () => {
  const added = addColumn(getDefaultColumns(), "Проверка");
  const custom = added.find((column) => column.name === "Проверка");

  assert.ok(custom);
  assert.equal(added.at(-1).id, "done");
  assert.equal(renameColumn(added, custom.id, "Ревью").find((column) => column.id === custom.id).name, "Ревью");
});

test("защищает обязательные колонки и нормализует повреждённые данные", () => {
  const defaults = getDefaultColumns();

  assert.deepEqual(removeColumn(defaults, "todo"), defaults);
  assert.deepEqual(normalizeColumns(null), defaults);
});
