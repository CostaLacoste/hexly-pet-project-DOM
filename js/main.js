import { initDragAndDrop } from "./drag-drop.js";
import { filterTasks } from "./filters.js";
import { getTasks, setTasks } from "./state.js";
import { loadTasks, saveTasks } from "./storage.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  updateTask,
} from "./tasks.js";
import { renderBoard, showNotification } from "./ui.js";

const board = document.querySelector(".kanban-board");
const form = document.querySelector("#task-form");
const taskDialog = document.querySelector("#task-dialog");
const deleteDialog = document.querySelector("#delete-dialog");
const taskDialogTitle = document.querySelector("#task-dialog-title");
const searchInput = document.querySelector("#task-search");
const prioritySelect = document.querySelector("#priority-filter");
const tagSelect = document.querySelector("#tag-filter");
const checklistEditor = document.querySelector("#checklist-editor-items");
const checklistEditorTemplate = document.querySelector(
  "#checklist-editor-item-template",
);

function syncTagFilter(tasks) {
  const selectedTag = tagSelect.value;
  const tags = [...new Set(tasks.flatMap((task) => task.tags ?? []))].sort(
    (first, second) => first.localeCompare(second, "ru"),
  );

  tagSelect.replaceChildren(new Option("Все теги", "all"));
  tags.forEach((tag) => tagSelect.add(new Option(`#${tag}`, tag)));
  tagSelect.value = tags.includes(selectedTag) ? selectedTag : "all";
}

function getVisibleTasks(tasks = getTasks()) {
  return filterTasks(
    tasks,
    searchInput.value,
    prioritySelect.value,
    tagSelect.value,
  );
}

function refreshBoard() {
  const tasks = getTasks();
  syncTagFilter(tasks);
  renderBoard(getVisibleTasks(tasks), tasks);
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

function commitChanges(message) {
  const saved = saveTasks(getTasks());
  refreshBoard();
  showNotification(
    saved ? message : "Изменения внесены, но не удалось сохранить их в браузере",
    saved ? "success" : "error",
  );
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

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const taskData = Object.fromEntries(new FormData(form).entries());
  taskData.checklist = collectChecklist();
  const isEditing = Boolean(taskData.taskId);

  try {
    if (isEditing) {
      updateTask(taskData.taskId, taskData);
    } else {
      createTask(taskData);
    }

    taskDialog.close();
    commitChanges(isEditing ? "Задача обновлена" : "Задача создана");
  } catch (error) {
    showNotification(error.message, "error");
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const taskId = button.closest(".task-card")?.dataset.taskId;

  switch (button.dataset.action) {
    case "open-task-dialog":
      openCreateDialog();
      break;
    case "close-task-dialog":
      taskDialog.close();
      break;
    case "edit-task":
      openEditDialog(taskId);
      break;
    case "delete-task":
      openDeleteDialog(taskId);
      break;
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
    case "cancel-delete":
      closeDeleteDialog();
      break;
    case "confirm-delete": {
      const deletingTaskId = deleteDialog.dataset.taskId;

      if (deletingTaskId && deleteTask(deletingTaskId)) {
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
  }
});

searchInput.addEventListener("input", refreshBoard);
prioritySelect.addEventListener("change", refreshBoard);
tagSelect.addEventListener("change", refreshBoard);

board.addEventListener("change", (event) => {
  const checkbox = event.target.closest('[data-action="toggle-checklist"]');

  if (!checkbox) {
    return;
  }

  const card = checkbox.closest(".task-card");
  const task = getTaskById(card?.dataset.taskId);

  if (!task) {
    return;
  }

  const checklist = (task.checklist ?? []).map((item) =>
    item.id === checkbox.dataset.checklistId
      ? { ...item, done: checkbox.checked }
      : item,
  );
  updateTask(task.id, { checklist });
  commitChanges("Чек-лист обновлён");
});

[taskDialog, deleteDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
});

initDragAndDrop(board, (taskId, newStatus) => {
  const task = getTaskById(taskId);

  if (!task || task.status === newStatus) {
    return;
  }

  updateTask(taskId, { status: newStatus });
  commitChanges("Статус задачи изменён");
});

setTasks(loadTasks());
refreshBoard();
