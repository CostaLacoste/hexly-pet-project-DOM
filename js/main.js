import {
  createBoard,
  deleteBoard,
  getBoardById,
  getBoards,
  renameBoard,
  setBoards,
} from "./boards.js";
import { initDragAndDrop } from "./drag-drop.js";
import { filterTasks } from "./filters.js";
import { sortTasks } from "./sorting.js";
import { getTasks, setTasks } from "./state.js";
import {
  loadBoards,
  loadSetting,
  loadTasks,
  saveBoards,
  saveSetting,
  saveTasks,
} from "./storage.js";
import {
  createTask,
  deleteTask,
  getRecurringTaskData,
  getTaskById,
  moveTask,
  updateTask,
} from "./tasks.js";
import { renderArchive, renderBoard, showNotification } from "./ui.js";

const board = document.querySelector(".kanban-board");
const form = document.querySelector("#task-form");
const taskDialog = document.querySelector("#task-dialog");
const deleteDialog = document.querySelector("#delete-dialog");
const archiveDialog = document.querySelector("#archive-dialog");
const taskDialogTitle = document.querySelector("#task-dialog-title");
const searchInput = document.querySelector("#task-search");
const prioritySelect = document.querySelector("#priority-filter");
const tagSelect = document.querySelector("#tag-filter");
const sortSelect = document.querySelector("#sort-select");
const themeSelect = document.querySelector("#theme-select");
const boardSelect = document.querySelector("#board-select");
const boardTitle = document.querySelector("#active-board-name");
const importInput = document.querySelector("#workspace-import");
const undoButton = document.querySelector('[data-action="undo"]');
const checklistEditor = document.querySelector("#checklist-editor-items");
const checklistEditorTemplate = document.querySelector(
  "#checklist-editor-item-template",
);

let activeBoardId = "default";
let sortMode = "manual";
let history = [];

function getBoardTasks({ archived = false } = {}) {
  return getTasks().filter(
    (task) => task.boardId === activeBoardId && task.archived === archived,
  );
}

function syncBoardSelect() {
  const boards = getBoards();
  boardSelect.replaceChildren();
  boards.forEach((item) => boardSelect.add(new Option(item.name, item.id)));

  if (!getBoardById(activeBoardId)) {
    activeBoardId = boards[0].id;
  }

  boardSelect.value = activeBoardId;
  boardTitle.textContent = getBoardById(activeBoardId)?.name ?? "Доска";
}

function syncTagFilter(tasks) {
  const selectedTag = tagSelect.value;
  const tags = [...new Set(tasks.flatMap((task) => task.tags ?? []))].sort(
    (first, second) => first.localeCompare(second, "ru"),
  );

  tagSelect.replaceChildren(new Option("Все теги", "all"));
  tags.forEach((tag) => tagSelect.add(new Option(`#${tag}`, tag)));
  tagSelect.value = tags.includes(selectedTag) ? selectedTag : "all";
}

function getVisibleTasks(tasks) {
  return sortTasks(
    filterTasks(
      tasks,
      searchInput.value,
      prioritySelect.value,
      tagSelect.value,
    ),
    sortMode,
  );
}

function refreshBoard() {
  syncBoardSelect();
  const tasks = getBoardTasks();
  syncTagFilter(tasks);
  renderBoard(getVisibleTasks(tasks), tasks);
  renderArchive(getBoardTasks({ archived: true }));
}

function persistWorkspace() {
  return [
    saveTasks(getTasks()),
    saveBoards(getBoards()),
    saveSetting("activeBoard", activeBoardId),
    saveSetting("sort", sortMode),
  ].every(Boolean);
}

function updateUndoButton() {
  undoButton.disabled = history.length === 0;
  undoButton.title = history.length > 0
    ? `Отменить: ${history.at(-1).label}`
    : "Нет действий для отмены";
}

function rememberState(label) {
  history.push({
    label,
    tasks: getTasks(),
    boards: getBoards(),
    activeBoardId,
  });
  history = history.slice(-20);
  updateUndoButton();
}

function discardLastSnapshot() {
  history.pop();
  updateUndoButton();
}

function commitChanges(message) {
  const saved = persistWorkspace();
  refreshBoard();
  showNotification(
    saved ? message : "Изменения внесены, но не удалось сохранить их в браузере",
    saved ? "success" : "error",
  );
}

function undoLastAction() {
  const snapshot = history.pop();

  if (!snapshot) return;

  setTasks(snapshot.tasks);
  setBoards(snapshot.boards);
  activeBoardId = snapshot.activeBoardId;
  persistWorkspace();
  refreshBoard();
  updateUndoButton();
  showNotification(`Отменено: ${snapshot.label}`);
}

function updateChecklistEditorEmptyState() {
  checklistEditor.querySelector("[data-checklist-editor-empty]").hidden =
    checklistEditor.querySelectorAll("[data-checklist-editor-item]").length > 0;
}

function addChecklistEditorItem(item = {}) {
  const row = checklistEditorTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.checklistId = item.id ?? "";
  row.querySelector(".checklist-editor__checkbox").checked = Boolean(item.done);
  row.querySelector(".checklist-editor__text").value = item.text ?? "";
  checklistEditor.append(row);
  updateChecklistEditorEmptyState();
  row.querySelector(".checklist-editor__text").focus();
}

function renderChecklistEditor(items = []) {
  checklistEditor
    .querySelectorAll("[data-checklist-editor-item]")
    .forEach((item) => item.remove());
  items.forEach(addChecklistEditorItem);
  updateChecklistEditorEmptyState();
}

function collectChecklist() {
  return [...checklistEditor.querySelectorAll("[data-checklist-editor-item]")]
    .map((row) => ({
      id: row.dataset.checklistId,
      text: row.querySelector(".checklist-editor__text").value,
      done: row.querySelector(".checklist-editor__checkbox").checked,
    }))
    .filter((item) => item.text.trim());
}

function nextOrder(status = "todo") {
  const orders = getBoardTasks()
    .filter((task) => task.status === status)
    .map((task) => Number(task.order) || 0);
  return Math.max(-1, ...orders) + 1;
}

function createRecurringCopyIfNeeded(previousTask, updatedTask) {
  if (previousTask?.status === "done" || updatedTask?.status !== "done") {
    return null;
  }

  const recurringData = getRecurringTaskData(updatedTask);
  if (!recurringData) return null;

  return createTask({
    ...recurringData,
    boardId: updatedTask.boardId,
    order: nextOrder("todo"),
  });
}

function updateTaskWithRecurrence(taskId, changes) {
  const previousTask = getTaskById(taskId);
  const updatedTask = updateTask(taskId, changes);
  createRecurringCopyIfNeeded(previousTask, updatedTask);
  return updatedTask;
}

function openCreateDialog() {
  form.reset();
  form.elements.taskId.value = "";
  renderChecklistEditor([]);
  taskDialogTitle.textContent = "Новая задача";
  taskDialog.showModal();
  form.elements.title.focus();
}

function openEditDialog(taskId) {
  const task = getTaskById(taskId);

  if (!task) {
    showNotification("Задача не найдена", "error");
    return;
  }

  form.elements.taskId.value = task.id;
  form.elements.title.value = task.title;
  form.elements.description.value = task.description;
  form.elements.status.value = task.status;
  form.elements.priority.value = task.priority;
  form.elements.deadline.value = task.deadline;
  form.elements.recurrence.value = task.recurrence ?? "none";
  form.elements.tags.value = (task.tags ?? []).join(", ");
  renderChecklistEditor(task.checklist ?? []);
  taskDialogTitle.textContent = "Редактирование задачи";
  taskDialog.showModal();
  form.elements.title.focus();
}

function openDeleteDialog(taskId) {
  if (!getTaskById(taskId)) {
    showNotification("Задача не найдена", "error");
    return;
  }

  deleteDialog.dataset.taskId = taskId;
  deleteDialog.showModal();
}

function closeDeleteDialog() {
  delete deleteDialog.dataset.taskId;
  deleteDialog.close();
}

function createNewBoard() {
  const name = window.prompt("Название новой доски:", "Новый проект");
  if (!name?.trim()) return;

  rememberState("создание доски");
  const newBoard = createBoard(name);
  activeBoardId = newBoard.id;
  commitChanges("Доска создана");
}

function renameActiveBoard() {
  const currentBoard = getBoardById(activeBoardId);
  const name = window.prompt("Новое название доски:", currentBoard?.name ?? "");
  if (!name?.trim()) return;

  rememberState("переименование доски");
  if (renameBoard(activeBoardId, name)) {
    commitChanges("Доска переименована");
  } else {
    discardLastSnapshot();
  }
}

function removeActiveBoard() {
  if (getBoards().length === 1) {
    showNotification("Нельзя удалить единственную доску", "error");
    return;
  }

  const currentBoard = getBoardById(activeBoardId);
  if (!window.confirm(`Удалить доску «${currentBoard?.name}» и все её задачи?`)) return;

  rememberState("удаление доски");
  setTasks(getTasks().filter((task) => task.boardId !== activeBoardId));
  deleteBoard(activeBoardId);
  activeBoardId = getBoards()[0].id;
  commitChanges("Доска удалена");
}

function exportWorkspace() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    activeBoardId,
    boards: getBoards(),
    tasks: getTasks(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `flowboard-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showNotification("Резервная копия экспортирована");
}

async function importWorkspace(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (!Array.isArray(payload.boards) || !Array.isArray(payload.tasks)) {
      throw new Error("Файл не содержит данные Flowboard");
    }

    rememberState("импорт данных");
    setBoards(payload.boards);
    setTasks(payload.tasks);
    activeBoardId = getBoardById(payload.activeBoardId)
      ? payload.activeBoardId
      : getBoards()[0].id;
    commitChanges("Данные импортированы");
  } catch (error) {
    showNotification(error.message || "Не удалось импортировать файл", "error");
  } finally {
    importInput.value = "";
  }
}

function archiveCompletedTasks() {
  const completed = getBoardTasks().filter((task) => task.status === "done");
  if (completed.length === 0) {
    showNotification("Нет выполненных задач для архива", "error");
    return;
  }

  rememberState("архивация задач");
  const completedIds = new Set(completed.map((task) => task.id));
  setTasks(getTasks().map((task) =>
    completedIds.has(task.id) ? { ...task, archived: true } : task,
  ));
  commitChanges(`В архиве: ${completed.length}`);
}

function restoreArchivedTask(taskId) {
  const task = getTaskById(taskId);
  if (!task?.archived) return;

  rememberState("восстановление задачи");
  updateTask(taskId, { archived: false });
  commitChanges("Задача восстановлена");
}

function moveCardWithKeyboard(card, key) {
  const task = getTaskById(card.dataset.taskId);
  if (!task) return;

  const statuses = ["todo", "progress", "done"];
  const statusIndex = statuses.indexOf(task.status);

  if (key === "ArrowLeft" || key === "ArrowRight") {
    const targetStatus = statuses[statusIndex + (key === "ArrowLeft" ? -1 : 1)];
    if (!targetStatus) return;

    rememberState("перемещение задачи");
    const previousTask = getTaskById(task.id);
    const movedTask = moveTask(task.id, targetStatus);
    createRecurringCopyIfNeeded(previousTask, movedTask);
    sortMode = "manual";
    sortSelect.value = sortMode;
    commitChanges("Задача перемещена");
    document.querySelector(`[data-task-id="${task.id}"]`)?.focus();
    return;
  }

  const peers = sortTasks(
    getBoardTasks().filter((item) => item.status === task.status),
    "manual",
  );
  const currentIndex = peers.findIndex((item) => item.id === task.id);
  const swapTask = peers[currentIndex + (key === "ArrowUp" ? -1 : 1)];
  if (!swapTask) return;

  rememberState("изменение порядка задач");
  const currentOrder = task.order;
  setTasks(getTasks().map((item) => {
    if (item.id === task.id) return { ...item, order: swapTask.order };
    if (item.id === swapTask.id) return { ...item, order: currentOrder };
    return item;
  }));
  sortMode = "manual";
  sortSelect.value = sortMode;
  commitChanges("Порядок задач изменён");
  document.querySelector(`[data-task-id="${task.id}"]`)?.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const taskData = Object.fromEntries(new FormData(form).entries());
  taskData.checklist = collectChecklist();
  taskData.boardId = activeBoardId;
  const isEditing = Boolean(taskData.taskId);

  try {
    rememberState(isEditing ? "редактирование задачи" : "создание задачи");
    if (isEditing) {
      updateTaskWithRecurrence(taskData.taskId, taskData);
    } else {
      taskData.order = nextOrder(taskData.status);
      createTask(taskData);
    }
    taskDialog.close();
    commitChanges(isEditing ? "Задача обновлена" : "Задача создана");
  } catch (error) {
    discardLastSnapshot();
    showNotification(error.message, "error");
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const taskId = button.closest(".task-card, .archive-item")?.dataset.taskId;

  switch (button.dataset.action) {
    case "open-task-dialog": openCreateDialog(); break;
    case "close-task-dialog": taskDialog.close(); break;
    case "edit-task": openEditDialog(taskId); break;
    case "delete-task": openDeleteDialog(taskId); break;
    case "add-checklist-item":
      if (checklistEditor.querySelectorAll("[data-checklist-editor-item]").length < 8) {
        addChecklistEditorItem();
      } else {
        showNotification("В чек-листе может быть не больше 8 пунктов", "error");
      }
      break;
    case "remove-checklist-item":
      button.closest("[data-checklist-editor-item]")?.remove();
      updateChecklistEditorEmptyState();
      break;
    case "cancel-delete": closeDeleteDialog(); break;
    case "confirm-delete": {
      const deletingTaskId = deleteDialog.dataset.taskId;
      if (deletingTaskId && getTaskById(deletingTaskId)) {
        rememberState("удаление задачи");
        deleteTask(deletingTaskId);
        closeDeleteDialog();
        commitChanges("Задача удалена");
      }
      break;
    }
    case "reset-filters":
      searchInput.value = "";
      prioritySelect.value = "all";
      tagSelect.value = "all";
      refreshBoard();
      break;
    case "undo": undoLastAction(); break;
    case "create-board": createNewBoard(); break;
    case "rename-board": renameActiveBoard(); break;
    case "delete-board": removeActiveBoard(); break;
    case "export-workspace": exportWorkspace(); break;
    case "import-workspace": importInput.click(); break;
    case "archive-done": archiveCompletedTasks(); break;
    case "open-archive": archiveDialog.showModal(); break;
    case "close-archive": archiveDialog.close(); break;
    case "restore-task": restoreArchivedTask(taskId); break;
  }
});

searchInput.addEventListener("input", refreshBoard);
prioritySelect.addEventListener("change", refreshBoard);
tagSelect.addEventListener("change", refreshBoard);

sortSelect.addEventListener("change", () => {
  sortMode = sortSelect.value;
  saveSetting("sort", sortMode);
  refreshBoard();
});

boardSelect.addEventListener("change", () => {
  activeBoardId = boardSelect.value;
  saveSetting("activeBoard", activeBoardId);
  refreshBoard();
});

themeSelect.addEventListener("change", () => {
  document.body.dataset.theme = themeSelect.value;
  saveSetting("theme", themeSelect.value);
});

importInput.addEventListener("change", () => {
  const [file] = importInput.files;
  if (file) importWorkspace(file);
});

board.addEventListener("change", (event) => {
  const checkbox = event.target.closest('[data-action="toggle-checklist"]');
  if (!checkbox) return;

  const task = getTaskById(checkbox.closest(".task-card")?.dataset.taskId);
  if (!task) return;

  rememberState("изменение чек-листа");
  const checklist = (task.checklist ?? []).map((item) =>
    item.id === checkbox.dataset.checklistId
      ? { ...item, done: checkbox.checked }
      : item,
  );
  updateTask(task.id, { checklist });
  commitChanges("Чек-лист обновлён");
});

document.addEventListener("keydown", (event) => {
  const isTyping = event.target.matches("input, textarea, select") || event.target.isContentEditable;

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undoLastAction();
    return;
  }

  const card = event.target.closest(".task-card");
  if (card && event.altKey && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    moveCardWithKeyboard(card, event.key);
    return;
  }

  if (isTyping) return;
  if (event.key.toLowerCase() === "n") {
    event.preventDefault();
    openCreateDialog();
  } else if (event.key === "/") {
    event.preventDefault();
    searchInput.focus();
  }
});

[taskDialog, deleteDialog, archiveDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

initDragAndDrop(board, (taskId, newStatus, beforeTaskId) => {
  const previousTask = getTaskById(taskId);
  if (!previousTask) return;

  rememberState("перемещение задачи");
  const movedTask = moveTask(taskId, newStatus, beforeTaskId);
  createRecurringCopyIfNeeded(previousTask, movedTask);
  sortMode = "manual";
  sortSelect.value = sortMode;
  commitChanges("Положение задачи изменено");
});

setBoards(loadBoards());
setTasks(loadTasks());
activeBoardId = loadSetting("activeBoard", getBoards()[0].id);
sortMode = loadSetting("sort", "manual");
sortSelect.value = sortMode;
const theme = loadSetting("theme", "classic");
themeSelect.value = theme;
document.body.dataset.theme = theme;
updateUndoButton();
refreshBoard();
