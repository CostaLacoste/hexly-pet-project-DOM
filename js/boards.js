const DEFAULT_BOARD_ID = "default";

let boards = [];

function createId() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeBoard(board, index = 0) {
  return {
    id: String(board?.id || (index === 0 ? DEFAULT_BOARD_ID : createId())),
    name: String(board?.name || "Без названия").trim().slice(0, 40) || "Без названия",
    createdAt: String(board?.createdAt || new Date().toISOString()),
  };
}

export function getDefaultBoard() {
  return {
    id: DEFAULT_BOARD_ID,
    name: "Основная доска",
    createdAt: new Date().toISOString(),
  };
}

export function getBoards() {
  return boards.map((board) => ({ ...board }));
}

export function setBoards(nextBoards) {
  const normalized = Array.isArray(nextBoards)
    ? nextBoards.map(normalizeBoard)
    : [];
  boards = normalized.length > 0 ? normalized : [getDefaultBoard()];
}

export function createBoard(name) {
  const board = normalizeBoard({ id: createId(), name }, boards.length);
  boards = [...boards, board];
  return { ...board };
}

export function renameBoard(id, name) {
  const normalizedName = String(name ?? "").trim().slice(0, 40);

  if (!normalizedName || !boards.some((board) => board.id === id)) {
    return null;
  }

  boards = boards.map((board) =>
    board.id === id ? { ...board, name: normalizedName } : board,
  );
  return boards.find((board) => board.id === id);
}

export function deleteBoard(id) {
  if (boards.length === 1 || !boards.some((board) => board.id === id)) {
    return false;
  }

  boards = boards.filter((board) => board.id !== id);
  return true;
}

export function getBoardById(id) {
  return boards.find((board) => board.id === id);
}
