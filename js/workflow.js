const DEFAULT_COLUMNS = [
  { id: "todo", name: "Нужно сделать", color: "pink", complete: false },
  { id: "progress", name: "В работе", color: "lime", complete: false },
  { id: "done", name: "Готово", color: "purple", complete: true },
];

function createId() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
}

export function getDefaultColumns() {
  return DEFAULT_COLUMNS.map((column) => ({ ...column }));
}

export function normalizeColumns(value) {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  const columns = source
    .map((column, index) => {
      const fallback = DEFAULT_COLUMNS[index];
      const id = String(column?.id || fallback?.id || `column-${createId()}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .slice(0, 30);
      if (!id || seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        name: String(column?.name || fallback?.name || "Колонка").trim().slice(0, 32),
        color: ["pink", "lime", "purple", "yellow", "blue"].includes(column?.color)
          ? column.color
          : "yellow",
        complete: id === "done" || Boolean(column?.complete),
      };
    })
    .filter(Boolean)
    .slice(0, 7);

  return columns.length >= 2 ? columns : getDefaultColumns();
}

export function addColumn(columns, name) {
  const normalized = normalizeColumns(columns);
  if (normalized.length >= 7) return normalized;
  const cleanName = String(name ?? "").trim().slice(0, 32);
  if (!cleanName) return normalized;
  return [
    ...normalized.slice(0, -1),
    { id: `column-${createId()}`, name: cleanName, color: "yellow", complete: false },
    normalized.at(-1),
  ];
}

export function renameColumn(columns, id, name) {
  const cleanName = String(name ?? "").trim().slice(0, 32);
  if (!cleanName) return normalizeColumns(columns);
  return normalizeColumns(columns).map((column) =>
    column.id === id ? { ...column, name: cleanName } : column,
  );
}

export function removeColumn(columns, id) {
  const normalized = normalizeColumns(columns);
  if (normalized.length <= 2 || ["todo", "done"].includes(id)) return normalized;
  return normalized.filter((column) => column.id !== id);
}
