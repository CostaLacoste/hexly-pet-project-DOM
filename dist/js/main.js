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

function getVisibleTasks() {
  return filterTasks(getTasks(), searchInput.value, prioritySelect.value);
}

function refreshBoard() {
  renderBoard(getVisibleTasks(), getTasks());
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
      refreshBoard();
      break;
  }
});

searchInput.addEventListener("input", refreshBoard);
prioritySelect.addEventListener("change", refreshBoard);

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
