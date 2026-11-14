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
  areDependenciesComplete,
  createTask,
  deleteTask,
  getRecurringTaskData,
  getTaskById,
  moveTask,
  updateTask,
} from "./tasks.js";
import { renderArchive, renderBoard, renderCalendar, showNotification } from "./ui.js";
import { setLanguage, t, translateDocument } from "./i18n.js";
import {
  addColumn,
  getDefaultColumns,
  normalizeColumns,
  removeColumn,
  renameColumn,
} from "./workflow.js";

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
const languageSelect = document.querySelector("#language-select");
const boardSelect = document.querySelector("#board-select");
const boardTitle = document.querySelector("#active-board-name");
const importInput = document.querySelector("#workspace-import");
const undoButton = document.querySelector('[data-action="undo"]');
const checklistEditor = document.querySelector("#checklist-editor-items");
const checklistEditorTemplate = document.querySelector(
  "#checklist-editor-item-template",
);
const productivityDialog = document.querySelector("#productivity-dialog");
const calendarView = document.querySelector("[data-calendar-view]");
const calendarMonth = document.querySelector("#calendar-month");
const workflowEditor = document.querySelector("[data-workflow-editor]");
const memberList = document.querySelector("[data-member-list]");
const activityList = document.querySelector("[data-activity-list]");
const focusClock = document.querySelector("[data-focus-clock]");
const focusTaskSelect = document.querySelector("#focus-task");
const templateSelect = document.querySelector("#task-template");
const assigneeSelect = document.querySelector("#task-assignee");
const dependencySelect = document.querySelector("#task-dependencies");
const syncPackage = document.querySelector("#sync-package");
const installButton = document.querySelector('[data-action="install-app"]');

let activeBoardId = "default";
let sortMode = "manual";
let history = [];
let columns = getDefaultColumns();
let templates = [];
let members = [];
let activity = [];
let accessibility = { highContrast: false, reduceMotion: false, fontScale: 100 };
let currentView = "board";
let focusSeconds = 25 * 60;
let focusTimer = null;
let deferredInstallPrompt = null;

function getBoardTasks({ archived = false } = {}) {
  return getTasks().filter(
    (task) => task.boardId === activeBoardId && task.archived === archived,
  );
}

function syncBoardSelect() {
  const boards = getBoards();
  boardSelect.replaceChildren();
  boards.forEach((item) => {
    const name = item.id === "default" && item.name === "Основная доска"
      ? t("board.default")
      : item.name;
    boardSelect.add(new Option(name, item.id));
  });

  if (!getBoardById(activeBoardId)) {
    activeBoardId = boards[0].id;
  }

  boardSelect.value = activeBoardId;
  const activeBoard = getBoardById(activeBoardId);
  boardTitle.textContent = activeBoard?.id === "default" && activeBoard.name === "Основная доска"
    ? t("board.default")
    : activeBoard?.name ?? t("workspace.board");
}

function syncTagFilter(tasks) {
  const selectedTag = tagSelect.value;
  const tags = [...new Set(tasks.flatMap((task) => task.tags ?? []))].sort(
    (first, second) => first.localeCompare(second),
  );

  tagSelect.replaceChildren(new Option(t("filter.allTags"), "all"));
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
  renderBoard(getVisibleTasks(tasks), tasks, columns);
  renderArchive(getBoardTasks({ archived: true }));
  renderCalendar(tasks, calendarMonth.value, openEditDialog);
  renderProductivityHub();
}

function persistWorkspace() {
  return [
    saveTasks(getTasks()),
    saveBoards(getBoards()),
    saveSetting("activeBoard", activeBoardId),
    saveSetting("sort", sortMode),
    saveSetting("columns", columns),
    saveSetting("templates", templates),
    saveSetting("members", members),
    saveSetting("activity", activity),
    saveSetting("accessibility", accessibility),
  ].every(Boolean);
}

function updateUndoButton() {
  undoButton.disabled = history.length === 0;
  undoButton.title = history.length > 0
    ? `${t("app.undo")}: ${t(history.at(-1).label)}`
    : t("app.undo");
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
  const actionKey = history.at(-1)?.label;
  if (actionKey) {
    activity = [{
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      action: t(actionKey),
      createdAt: new Date().toISOString(),
    }, ...activity].slice(0, 50);
  }
  const saved = persistWorkspace();
  refreshBoard();
  showNotification(
    saved ? message : t("notice.saveError"),
    saved ? "success" : "error",
  );
}

function todayMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function syncTaskFormOptions(taskId = "") {
  const selectedStatus = form.elements.status.value;
  form.elements.status.replaceChildren(...columns.map((column) => new Option(column.name, column.id)));
  form.elements.status.value = columns.some((column) => column.id === selectedStatus)
    ? selectedStatus
    : columns[0].id;

  assigneeSelect.replaceChildren(new Option(t("extra.unassigned"), ""));
  members.forEach((member) => assigneeSelect.add(new Option(member, member)));

  dependencySelect.replaceChildren();
  getBoardTasks()
    .filter((task) => task.id !== taskId && !task.archived)
    .forEach((task) => dependencySelect.add(new Option(task.title, task.id)));

  templateSelect.replaceChildren(new Option(t("extra.noTemplate"), ""));
  templates.forEach((template) => templateSelect.add(new Option(template.name, template.id)));
}

function applyAccessibility() {
  document.documentElement.dataset.highContrast = String(Boolean(accessibility.highContrast));
  document.documentElement.dataset.reduceMotion = String(Boolean(accessibility.reduceMotion));
  document.documentElement.style.fontSize = `${Number(accessibility.fontScale) || 100}%`;
  document.querySelectorAll("[data-setting]").forEach((input) => {
    const key = input.dataset.setting;
    if (input.type === "checkbox") input.checked = Boolean(accessibility[key]);
    else input.value = accessibility[key] ?? 100;
  });
}

function formatFocusTime() {
  const minutes = Math.floor(focusSeconds / 60);
  const seconds = focusSeconds % 60;
  focusClock.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderProductivityHub() {
  if (!workflowEditor) return;
  workflowEditor.replaceChildren();
  columns.forEach((column) => {
    const row = document.createElement("div");
    row.className = "workflow-row";
    const marker = document.createElement("span");
    marker.className = "workflow-row__color";
    marker.style.setProperty("--column-color", `var(--color-${column.color})`);
    const name = document.createElement("span");
    name.textContent = column.name;
    const actions = document.createElement("div");
    const rename = document.createElement("button");
    rename.className = "mini-button";
    rename.type = "button";
    rename.dataset.action = "rename-column";
    rename.dataset.columnId = column.id;
    rename.textContent = "✎";
    actions.append(rename);
    if (!["todo", "done"].includes(column.id)) {
      const remove = document.createElement("button");
      remove.className = "mini-button";
      remove.type = "button";
      remove.dataset.action = "remove-column";
      remove.dataset.columnId = column.id;
      remove.textContent = "×";
      actions.append(remove);
    }
    row.append(marker, name, actions);
    workflowEditor.append(row);
  });

  memberList.replaceChildren();
  if (members.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Добавьте участников, чтобы назначать задачи.";
    memberList.append(empty);
  }
  members.forEach((member) => {
    const row = document.createElement("div");
    row.className = "member-row";
    row.textContent = member;
    const remove = document.createElement("button");
    remove.className = "mini-button";
    remove.type = "button";
    remove.dataset.action = "remove-member";
    remove.dataset.member = member;
    remove.textContent = "×";
    row.append(remove);
    memberList.append(row);
  });

  focusTaskSelect.replaceChildren(new Option("Выберите задачу", ""));
  getBoardTasks().filter((task) => task.status !== "done").forEach((task) => {
    focusTaskSelect.add(new Option(task.title, task.id));
  });
  formatFocusTime();

  const tasks = getBoardTasks();
  const completed = tasks.filter((task) => task.completedAt);
  const durations = completed.map((task) =>
    Math.max(0, (new Date(task.completedAt) - new Date(task.createdAt)) / 86400000),
  );
  const average = durations.length
    ? `${(durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1)} дн.`
    : "—";
  const weekAgo = Date.now() - 7 * 86400000;
  const velocity = completed.filter((task) => new Date(task.completedAt).getTime() >= weekAgo).length;
  const blocked = tasks.filter((task) => !areDependenciesComplete(task, tasks)).length;
  document.querySelector('[data-insight="average"]').textContent = average;
  document.querySelector('[data-insight="velocity"]').textContent = String(velocity);
  document.querySelector('[data-insight="blocked"]').textContent = String(blocked);
  document.querySelector('[data-insight="activity"]').textContent = String(activity.length);

  const flowBars = document.querySelector("[data-flow-bars]");
  flowBars.replaceChildren();
  const max = Math.max(1, ...columns.map((column) => tasks.filter((task) => task.status === column.id).length));
  columns.forEach((column) => {
    const count = tasks.filter((task) => task.status === column.id).length;
    const row = document.createElement("div");
    row.className = "flow-bar";
    row.innerHTML = `<span></span><i></i><strong>${count}</strong>`;
    row.querySelector("span").textContent = column.name;
    row.querySelector("i").style.setProperty("--flow-width", `${Math.max(4, (count / max) * 100)}%`);
    flowBars.append(row);
  });

  activityList.replaceChildren();
  activity.slice(0, 12).forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = `${entry.action} · ${new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}`;
    activityList.append(item);
  });
  applyAccessibility();
}

function setView(view) {
  currentView = view === "calendar" ? "calendar" : "board";
  board.hidden = currentView !== "board";
  calendarView.hidden = currentView !== "calendar";
  document.querySelector('[data-action="show-board"]').classList.toggle("is-active", currentView === "board");
  document.querySelector('[data-action="show-calendar"]').classList.toggle("is-active", currentView === "calendar");
  if (currentView === "calendar") {
    renderCalendar(getBoardTasks(), calendarMonth.value, openEditDialog);
  }
}

function toggleFocusTimer(button) {
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
    button.textContent = t("hub.start");
    return;
  }
  if (!focusTaskSelect.value) {
    showNotification("Выберите задачу для фокуса", "error");
    return;
  }
  button.textContent = "Пауза";
  focusTimer = window.setInterval(() => {
    focusSeconds = Math.max(0, focusSeconds - 1);
    formatFocusTime();
    if (focusSeconds === 0) {
      clearInterval(focusTimer);
      focusTimer = null;
      button.textContent = t("hub.start");
      showNotification("Фокус-сессия завершена");
      if (Notification.permission === "granted") {
        new Notification("Flowboard", { body: "Фокус-сессия завершена" });
      }
    }
  }, 1000);
}

function encodeSyncPayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeSyncPayload(value) {
  const binary = atob(String(value).trim());
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function createSyncPayload() {
  return {
    version: 3,
    boards: getBoards(),
    tasks: getTasks(),
    columns,
    templates,
    members,
    activity,
  };
}

function checkDeadlineReminders() {
  if (Notification.permission !== "granted") return;
  const today = new Date().toISOString().slice(0, 10);
  const due = getTasks().filter((task) => task.deadline === today && task.status !== "done" && !task.archived);
  if (due.length > 0) {
    new Notification("Flowboard", { body: `Сегодня срок у задач: ${due.map((task) => task.title).join(", ")}` });
  }
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
  showNotification(t("notice.undo", { action: t(snapshot.label) }));
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
  syncTaskFormOptions();
  renderChecklistEditor([]);
  document.querySelector("[data-comment-field]").hidden = true;
  taskDialogTitle.textContent = t("task.new");
  taskDialog.showModal();
  form.elements.title.focus();
}

function openEditDialog(taskId) {
  const task = getTaskById(taskId);

  if (!task) {
    showNotification(t("notice.taskNotFound"), "error");
    return;
  }

  form.elements.taskId.value = task.id;
  syncTaskFormOptions(task.id);
  form.elements.title.value = task.title;
  form.elements.description.value = task.description;
  form.elements.status.value = task.status;
  form.elements.priority.value = task.priority;
  form.elements.deadline.value = task.deadline;
  form.elements.recurrence.value = task.recurrence ?? "none";
  form.elements.tags.value = (task.tags ?? []).join(", ");
  form.elements.assignee.value = task.assignee ?? "";
  form.elements.color.value = task.color ?? "default";
  form.elements.cover.value = task.cover ?? "";
  [...form.elements.dependsOn.options].forEach((option) => {
    option.selected = task.dependsOn?.includes(option.value);
  });
  renderChecklistEditor(task.checklist ?? []);
  document.querySelector("[data-comment-field]").hidden = false;
  form.elements.comment.value = "";
  taskDialogTitle.textContent = t("task.edit");
  taskDialog.showModal();
  form.elements.title.focus();
}

function openDeleteDialog(taskId) {
  if (!getTaskById(taskId)) {
    showNotification(t("notice.taskNotFound"), "error");
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
  const name = window.prompt(t("prompt.newBoard"), t("prompt.newBoardDefault"));
  if (!name?.trim()) return;

  rememberState("action.createBoard");
  const newBoard = createBoard(name);
  activeBoardId = newBoard.id;
  commitChanges(t("notice.boardCreated"));
}

function renameActiveBoard() {
  const currentBoard = getBoardById(activeBoardId);
  const name = window.prompt(t("prompt.renameBoard"), currentBoard?.name ?? "");
  if (!name?.trim()) return;

  rememberState("action.renameBoard");
  if (renameBoard(activeBoardId, name)) {
    commitChanges(t("notice.boardRenamed"));
  } else {
    discardLastSnapshot();
  }
}

function removeActiveBoard() {
  if (getBoards().length === 1) {
    showNotification(t("notice.onlyBoard"), "error");
    return;
  }

  const currentBoard = getBoardById(activeBoardId);
  if (!window.confirm(t("prompt.deleteBoard", { name: currentBoard?.name }))) return;

  rememberState("action.deleteBoard");
  setTasks(getTasks().filter((task) => task.boardId !== activeBoardId));
  deleteBoard(activeBoardId);
  activeBoardId = getBoards()[0].id;
  commitChanges(t("notice.boardDeleted"));
}

function exportWorkspace() {
  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    activeBoardId,
    boards: getBoards(),
    tasks: getTasks(),
    columns,
    templates,
    members,
    activity,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `flowboard-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showNotification(t("notice.exported"));
}

async function importWorkspace(file) {
  try {
    const payload = JSON.parse(await file.text());
    if (!Array.isArray(payload.boards) || !Array.isArray(payload.tasks)) {
      throw new Error(t("notice.invalidFile"));
    }

    rememberState("action.import");
    setBoards(payload.boards);
    setTasks(payload.tasks);
    columns = normalizeColumns(payload.columns ?? columns);
    templates = Array.isArray(payload.templates) ? payload.templates : templates;
    members = Array.isArray(payload.members) ? payload.members : members;
    activity = Array.isArray(payload.activity) ? payload.activity : activity;
    activeBoardId = getBoardById(payload.activeBoardId)
      ? payload.activeBoardId
      : getBoards()[0].id;
    commitChanges(t("notice.imported"));
  } catch (error) {
    showNotification(error.message || t("notice.importError"), "error");
  } finally {
    importInput.value = "";
  }
}

function archiveCompletedTasks() {
  const completed = getBoardTasks().filter((task) => task.status === "done");
  if (completed.length === 0) {
    showNotification(t("notice.archiveEmpty"), "error");
    return;
  }

  rememberState("action.archive");
  const completedIds = new Set(completed.map((task) => task.id));
  setTasks(getTasks().map((task) =>
    completedIds.has(task.id) ? { ...task, archived: true } : task,
  ));
  commitChanges(t("notice.archived", { count: completed.length }));
}

function restoreArchivedTask(taskId) {
  const task = getTaskById(taskId);
  if (!task?.archived) return;

  rememberState("action.restore");
  updateTask(taskId, { archived: false });
  commitChanges(t("notice.restored"));
}

function moveCardWithKeyboard(card, key) {
  const task = getTaskById(card.dataset.taskId);
  if (!task) return;

  const statuses = columns.map((column) => column.id);
  const statusIndex = statuses.indexOf(task.status);

  if (key === "ArrowLeft" || key === "ArrowRight") {
    const targetStatus = statuses[statusIndex + (key === "ArrowLeft" ? -1 : 1)];
    if (!targetStatus) return;
    if (targetStatus === "done" && !areDependenciesComplete(task, getTasks())) {
      showNotification("Сначала завершите связанные задачи", "error");
      return;
    }

    rememberState("action.move");
    const previousTask = getTaskById(task.id);
    const movedTask = moveTask(task.id, targetStatus);
    createRecurringCopyIfNeeded(previousTask, movedTask);
    sortMode = "manual";
    sortSelect.value = sortMode;
    commitChanges(t("notice.taskMoved"));
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

  rememberState("action.order");
  const currentOrder = task.order;
  setTasks(getTasks().map((item) => {
    if (item.id === task.id) return { ...item, order: swapTask.order };
    if (item.id === swapTask.id) return { ...item, order: currentOrder };
    return item;
  }));
  sortMode = "manual";
  sortSelect.value = sortMode;
  commitChanges(t("notice.orderChanged"));
  document.querySelector(`[data-task-id="${task.id}"]`)?.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const taskData = Object.fromEntries(new FormData(form).entries());
  taskData.dependsOn = [...dependencySelect.selectedOptions].map((option) => option.value);
  taskData.checklist = collectChecklist();
  taskData.boardId = activeBoardId;
  const isEditing = Boolean(taskData.taskId);
  const currentTask = isEditing ? getTaskById(taskData.taskId) : null;
  const comment = String(taskData.comment ?? "").trim();
  taskData.comments = [...(currentTask?.comments ?? [])];
  if (comment) {
    taskData.comments.push({
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      author: loadSetting("profile", "User"),
      text: comment,
      createdAt: new Date().toISOString(),
    });
  }
  delete taskData.comment;

  if (taskData.status === "done" && !areDependenciesComplete(taskData, getTasks())) {
    showNotification("Сначала завершите связанные задачи", "error");
    return;
  }

  try {
    rememberState(isEditing ? "action.edit" : "action.create");
    if (isEditing) {
      updateTaskWithRecurrence(taskData.taskId, taskData);
    } else {
      taskData.order = nextOrder(taskData.status);
      createTask(taskData);
    }
    taskDialog.close();
    commitChanges(t(isEditing ? "notice.taskUpdated" : "notice.taskCreated"));
  } catch (error) {
    discardLastSnapshot();
    showNotification(error.message, "error");
  }
});

templateSelect.addEventListener("change", () => {
  const template = templates.find((item) => item.id === templateSelect.value);
  if (!template) return;
  const data = template.data;
  form.elements.description.value = data.description ?? "";
  form.elements.priority.value = data.priority ?? "medium";
  form.elements.recurrence.value = data.recurrence ?? "none";
  form.elements.tags.value = (data.tags ?? []).join(", ");
  form.elements.color.value = data.color ?? "default";
  form.elements.cover.value = data.cover ?? "";
  renderChecklistEditor(data.checklist ?? []);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const taskId = button.closest(".task-card, .archive-item")?.dataset.taskId;

  switch (button.dataset.action) {
    case "open-task-dialog": openCreateDialog(); break;
    case "open-productivity-hub":
      renderProductivityHub();
      productivityDialog.showModal();
      break;
    case "close-productivity-hub": productivityDialog.close(); break;
    case "show-board": setView("board"); break;
    case "show-calendar": setView("calendar"); break;
    case "close-task-dialog": taskDialog.close(); break;
    case "edit-task": openEditDialog(taskId); break;
    case "delete-task": openDeleteDialog(taskId); break;
    case "add-checklist-item":
      if (checklistEditor.querySelectorAll("[data-checklist-editor-item]").length < 8) {
        addChecklistEditorItem();
      } else {
        showNotification(t("notice.checklistLimit"), "error");
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
        rememberState("action.delete");
        deleteTask(deletingTaskId);
        closeDeleteDialog();
        commitChanges(t("notice.taskDeleted"));
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
    case "save-template": {
      const name = window.prompt("Название шаблона:", form.elements.title.value || "Новый шаблон");
      if (!name?.trim()) break;
      templates = [...templates, {
        id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
        name: name.trim().slice(0, 40),
        data: {
          description: form.elements.description.value,
          priority: form.elements.priority.value,
          recurrence: form.elements.recurrence.value,
          tags: form.elements.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
          color: form.elements.color.value,
          cover: form.elements.cover.value,
          checklist: collectChecklist(),
        },
      }].slice(-20);
      saveSetting("templates", templates);
      syncTaskFormOptions(form.elements.taskId.value);
      showNotification("Шаблон сохранён");
      break;
    }
    case "add-column": {
      const name = window.prompt("Название новой колонки:", "Проверка");
      if (!name?.trim()) break;
      columns = addColumn(columns, name);
      persistWorkspace();
      refreshBoard();
      break;
    }
    case "rename-column": {
      const column = columns.find((item) => item.id === button.dataset.columnId);
      const name = window.prompt("Новое название колонки:", column?.name ?? "");
      if (!name?.trim()) break;
      columns = renameColumn(columns, button.dataset.columnId, name);
      persistWorkspace();
      refreshBoard();
      break;
    }
    case "remove-column": {
      const columnId = button.dataset.columnId;
      setTasks(getTasks().map((task) => task.status === columnId ? { ...task, status: "todo" } : task));
      columns = removeColumn(columns, columnId);
      persistWorkspace();
      refreshBoard();
      break;
    }
    case "add-member": {
      const member = window.prompt("Имя участника:", "");
      if (!member?.trim()) break;
      members = [...new Set([...members, member.trim().slice(0, 50)])];
      persistWorkspace();
      refreshBoard();
      break;
    }
    case "remove-member":
      members = members.filter((member) => member !== button.dataset.member);
      persistWorkspace();
      refreshBoard();
      break;
    case "toggle-focus": toggleFocusTimer(button); break;
    case "reset-focus":
      clearInterval(focusTimer);
      focusTimer = null;
      focusSeconds = 25 * 60;
      formatFocusTime();
      productivityDialog.querySelector('[data-action="toggle-focus"]').textContent = t("hub.start");
      break;
    case "enable-reminders":
      if (!("Notification" in window)) {
        showNotification("Уведомления не поддерживаются браузером", "error");
      } else {
        Notification.requestPermission().then((permission) => {
          showNotification(permission === "granted" ? "Напоминания включены" : "Доступ к уведомлениям не предоставлен", permission === "granted" ? "success" : "error");
          checkDeadlineReminders();
        });
      }
      break;
    case "install-app":
      deferredInstallPrompt?.prompt();
      deferredInstallPrompt = null;
      installButton.hidden = true;
      break;
    case "create-sync-package":
      syncPackage.value = encodeSyncPayload(createSyncPayload());
      syncPackage.select();
      navigator.clipboard?.writeText(syncPackage.value).catch(() => {});
      showNotification("Код синхронизации создан");
      break;
    case "apply-sync-package":
      try {
        const payload = decodeSyncPayload(syncPackage.value);
        if (!Array.isArray(payload.boards) || !Array.isArray(payload.tasks)) throw new Error();
        rememberState("action.import");
        setBoards(payload.boards);
        setTasks(payload.tasks);
        columns = normalizeColumns(payload.columns);
        templates = Array.isArray(payload.templates) ? payload.templates : [];
        members = Array.isArray(payload.members) ? payload.members : [];
        activity = Array.isArray(payload.activity) ? payload.activity : [];
        activeBoardId = getBoards()[0].id;
        commitChanges("Пакет синхронизации применён");
      } catch {
        showNotification("Некорректный код синхронизации", "error");
      }
      break;
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

languageSelect.addEventListener("change", () => {
  setLanguage(languageSelect.value);
  saveSetting("language", languageSelect.value);
  translateDocument();
  updateUndoButton();
  refreshBoard();
});

importInput.addEventListener("change", () => {
  const [file] = importInput.files;
  if (file) importWorkspace(file);
});

calendarMonth.addEventListener("change", () => {
  renderCalendar(getBoardTasks(), calendarMonth.value, openEditDialog);
});

document.querySelectorAll("[data-setting]").forEach((input) => {
  input.addEventListener("input", () => {
    const key = input.dataset.setting;
    accessibility = {
      ...accessibility,
      [key]: input.type === "checkbox" ? input.checked : Number(input.value),
    };
    saveSetting("accessibility", accessibility);
    applyAccessibility();
  });
});

board.addEventListener("change", (event) => {
  const checkbox = event.target.closest('[data-action="toggle-checklist"]');
  if (!checkbox) return;

  const task = getTaskById(checkbox.closest(".task-card")?.dataset.taskId);
  if (!task) return;

  rememberState("action.checklist");
  const checklist = (task.checklist ?? []).map((item) =>
    item.id === checkbox.dataset.checklistId
      ? { ...item, done: checkbox.checked }
      : item,
  );
  updateTask(task.id, { checklist });
  commitChanges(t("notice.checklistUpdated"));
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

[taskDialog, deleteDialog, archiveDialog, productivityDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

initDragAndDrop(board, (taskId, newStatus, beforeTaskId) => {
  const previousTask = getTaskById(taskId);
  if (!previousTask) return;
  if (newStatus === "done" && !areDependenciesComplete(previousTask, getTasks())) {
    showNotification("Сначала завершите связанные задачи", "error");
    return;
  }

  rememberState("action.move");
  const movedTask = moveTask(taskId, newStatus, beforeTaskId);
  createRecurringCopyIfNeeded(previousTask, movedTask);
  sortMode = "manual";
  sortSelect.value = sortMode;
  commitChanges(t("notice.positionChanged"));
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

window.addEventListener("storage", (event) => {
  if (!event.key?.startsWith("flowboard-")) return;
  setBoards(loadBoards());
  setTasks(loadTasks());
  columns = normalizeColumns(loadSetting("columns", getDefaultColumns()));
  templates = loadSetting("templates", []);
  members = loadSetting("members", []);
  activity = loadSetting("activity", []);
  refreshBoard();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}

setBoards(loadBoards());
setTasks(loadTasks());
columns = normalizeColumns(loadSetting("columns", getDefaultColumns()));
templates = Array.isArray(loadSetting("templates", [])) ? loadSetting("templates", []) : [];
if (templates.length === 0) {
  templates = [
    { id: "template-release", name: "Релиз", data: { priority: "high", tags: ["релиз"], color: "purple", cover: "🚀", checklist: [{ text: "Проверить сборку" }, { text: "Обновить документацию" }] } },
    { id: "template-meeting", name: "Встреча", data: { priority: "medium", tags: ["встреча"], color: "yellow", cover: "💬", checklist: [{ text: "Подготовить повестку" }, { text: "Записать решения" }] } },
    { id: "template-bug", name: "Исправление ошибки", data: { priority: "high", tags: ["bug"], color: "pink", cover: "🐞", checklist: [{ text: "Воспроизвести" }, { text: "Добавить тест" }] } },
  ];
}
members = Array.isArray(loadSetting("members", [])) ? loadSetting("members", []) : [];
activity = Array.isArray(loadSetting("activity", [])) ? loadSetting("activity", []) : [];
accessibility = {
  ...accessibility,
  ...(loadSetting("accessibility", {}) || {}),
};
calendarMonth.value = todayMonth();
const language = loadSetting("language", "ru");
setLanguage(language);
languageSelect.value = language;
translateDocument();
activeBoardId = loadSetting("activeBoard", getBoards()[0].id);
sortMode = loadSetting("sort", "manual");
sortSelect.value = sortMode;
const theme = loadSetting("theme", "classic");
themeSelect.value = theme;
document.body.dataset.theme = theme;
applyAccessibility();
updateUndoButton();
refreshBoard();
window.setInterval(checkDeadlineReminders, 60 * 60 * 1000);
