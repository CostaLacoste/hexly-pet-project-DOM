import { calculateStatistics, isTaskOverdue } from "./statistics.js";

const template = document.querySelector("#task-card-template");
const totalTaskCount = document.querySelector("#total-task-count");
const notificationRegion = document.querySelector("#notification-region");
const doneTaskCount = document.querySelector('[data-stat="done"]');
const progressValue = document.querySelector('[data-stat="progress"]');
const overdueTaskCount = document.querySelector('[data-stat="overdue"]');
const checklistValue = document.querySelector('[data-stat="checklist"]');
const progressBar = document.querySelector("[data-stat-progress-bar]");

const lists = {
  todo: document.querySelector('[data-task-list="todo"]'),
  progress: document.querySelector('[data-task-list="progress"]'),
  done: document.querySelector('[data-task-list="done"]'),
};

const priorityLabels = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

function formatDeadline(deadline) {
  const date = new Date(`${deadline}T00:00:00`);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function renderTags(card, task) {
  const container = card.querySelector(".task-card__tags");
  const tags = Array.isArray(task.tags) ? task.tags : [];

  tags.forEach((tag) => {
    const element = document.createElement("span");
    element.className = "task-tag";
    element.textContent = `#${tag}`;
    container.append(element);
  });

  container.hidden = tags.length === 0;
}

function renderChecklist(card, task) {
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const container = card.querySelector(".task-checklist");

  if (checklist.length === 0) {
    return;
  }

  const completed = checklist.filter((item) => item.done).length;
  const percent = Math.round((completed / checklist.length) * 100);
  const items = container.querySelector(".task-checklist__items");

  container.hidden = false;
  container.querySelector(".task-checklist__count").textContent =
    `${completed}/${checklist.length}`;
  container.querySelector(".task-checklist__bar span").style.width = `${percent}%`;

  checklist.forEach((item) => {
    const label = document.createElement("label");
    label.className = "task-checklist__item";
    label.classList.toggle("is-complete", item.done);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.done;
    checkbox.dataset.action = "toggle-checklist";
    checkbox.dataset.checklistId = item.id;
    checkbox.setAttribute("aria-label", `Отметить пункт «${item.text}»`);

    const text = document.createElement("span");
    text.textContent = item.text;
    label.append(checkbox, text);
    items.append(label);
  });
}

function renderStats(tasks) {
  const stats = calculateStatistics(tasks);

  doneTaskCount.textContent = String(stats.done);
  progressValue.textContent = `${stats.progress}%`;
  overdueTaskCount.textContent = String(stats.overdue);
  checklistValue.textContent = `${stats.checklistDone}/${stats.checklistTotal}`;
  progressBar.style.width = `${stats.progress}%`;
}

export function createTaskCard(task) {
  const card = template.content.firstElementChild.cloneNode(true);
  const description = card.querySelector(".task-card__description");
  const priority = card.querySelector(".priority-badge");
  const deadline = card.querySelector(".task-card__deadline");

  card.dataset.taskId = task.id;
  card.querySelector(".task-card__title").textContent = task.title;
  renderTags(card, task);
  renderChecklist(card, task);

  if (task.description) {
    description.textContent = task.description;
  } else {
    description.hidden = true;
  }

  priority.textContent = priorityLabels[task.priority] ?? "Без приоритета";
  priority.classList.add(`priority-badge--${task.priority}`);

  if (task.deadline) {
    const overdue = isTaskOverdue(task);
    deadline.dateTime = task.deadline;
    deadline.textContent = `${overdue ? "Просрочено" : "До"}: ${formatDeadline(task.deadline)}`;
    deadline.classList.toggle("task-card__deadline--overdue", overdue);
  } else {
    deadline.hidden = true;
  }

  if (task.status === "done") {
    card.classList.add("task-card--done");
  }

  return card;
}

export function renderBoard(visibleTasks, allTasks = visibleTasks) {
  Object.entries(lists).forEach(([status, list]) => {
    list.querySelectorAll(".task-card").forEach((card) => card.remove());

    const columnTasks = visibleTasks.filter((task) => task.status === status);
    const emptyState = list.querySelector("[data-empty-state]");
    const counter = document.querySelector(`[data-count-for="${status}"]`);

    columnTasks.forEach((task) => list.append(createTaskCard(task)));
    emptyState.hidden = columnTasks.length > 0;
    counter.textContent = String(columnTasks.length);
  });

  totalTaskCount.textContent = String(allTasks.length);
  renderStats(allTasks);
}

export function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification notification--${type}`;
  notification.textContent = message;
  notificationRegion.append(notification);

  window.setTimeout(() => {
    notification.classList.add("is-leaving");
    notification.addEventListener("animationend", () => notification.remove(), {
      once: true,
    });
  }, 2600);
}
