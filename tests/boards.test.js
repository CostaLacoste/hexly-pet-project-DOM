import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import {
  createBoard,
  deleteBoard,
  getBoardById,
  getBoards,
  renameBoard,
  setBoards,
} from "../js/boards.js";

beforeEach(() => setBoards([]));

describe("доски", () => {
  test("создаёт основную доску для пустого состояния", () => {
    assert.equal(getBoards().length, 1);
    assert.equal(getBoards()[0].id, "default");
  });

  test("создаёт, переименовывает и удаляет дополнительную доску", () => {
    const board = createBoard(" Работа ");
    assert.equal(board.name, "Работа");
    assert.equal(renameBoard(board.id, "Команда")?.name, "Команда");
    assert.equal(getBoardById(board.id)?.name, "Команда");
    assert.equal(deleteBoard(board.id), true);
    assert.equal(getBoardById(board.id), undefined);
  });

  test("не удаляет единственную доску", () => {
    assert.equal(deleteBoard("default"), false);
  });
});
