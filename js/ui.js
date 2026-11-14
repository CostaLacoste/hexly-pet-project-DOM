import { calculateStatistics, isTaskOverdue } from "./statistics.js";
import { getLocale, t } from "./i18n.js";

const template = document.querySelector("#task-card-template");
const totalTaskCount = document.querySelector("#total-task-count");
const notificationRegion = document.querySelector("#notification-region");
const doneTaskCount = document.querySelector('[data-stat="done"]');
const progressValue = document.querySelector('[data-stat="progress"]');
const overdueTaskCount = document.querySelector('[data-stat="overdue"]');
const checklistValue = document.querySelector('[data-stat="checklist"]');
const progressBar = document.querySelector("[data-stat-progress-bar]");
const weeklyChart = document.querySelector("[data-weekly-chart]");
const weekTotal = document.querySelector("[data-week-total]");
const archiveCount = document.querySelector("#archive-count");
const archiveList = document.querySelector("#archive-list");

const lists = {
  todo: document.querySelector('[data-task-list="todo"]'),
  progress: document.querySelector('[data-task-list="progress"]'),
  done: document.querySelector('[data-task-list="done"]'),
};

const priorityLabel = (priority) => t(`priority.${priority}`);
const recurrenceLabel = (recurrence) => t(`task.${recurrence}`);

function formatDeadline(deadline) {
  const date = new Date(`${deadline}T00:00:00`);

  return new Intl.DateTimeFormat(getLocale(), {
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
    checkbox.setAttribute("aria-label", `${t("task.checklist")}: ${item.text}`);

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

  document.querySelector('[data-priority="high"]').textContent = String(stats.priority.high);
  document.querySelector('[data-priority="medium"]').textContent = String(stats.priority.medium);
  document.querySelector('[data-priority="low"]').textContent = String(stats.priority.low);

  const maxCount = Math.max(1, ...stats.completionDays.map((day) => day.count));
  weeklyChart.replaceChildren();
  stats.completionDays.forEach((day) => {
    const item = document.createElement("div");
    item.className = "weekly-chart__day";
    item.innerHTML = `
      <span class="weekly-chart__value">${day.count}</span>
      <span class="weekly-chart__bar" style="height: ${Math.max(8, (day.count / maxCount) * 100)}%"></span>
      <span class="weekly-chart__label">${new Intl.DateTimeFormat(getLocale(), { weekday: "short" }).format(new Date(`${day.key}T12:00:00`))}</span>
    `;
    weeklyChart.append(item);
  });
  const totalForWeek = stats.completionDays.reduce((sum, day) => sum + day.count, 0);
  weekTotal.textContent = t("analytics.tasks", { count: totalForWeek });
}

export function createTaskCard(task) {
  const card = template.content.firstElementChild.cloneNode(true);
  const description = card.querySelector(".task-card__description");
  const priority = card.querySelector(".priority-badge");
  const deadline = card.querySelector(".task-card__deadline");

  card.dataset.taskId = task.id;
  card.tabIndex = 0;
  card.setAttribute(
    "aria-label",
    `${task.title}. Alt и стрелки — переместить задачу`,
  );
  card.querySelector(".task-card__title").textContent = task.title;
  card.querySelector('[data-action="edit-task"]').textContent = t("task.editButton");
  card.querySelector('[data-action="delete-task"]').textContent = t("task.deleteButton");
  card.querySelector("[data-i18n=\"task.checklist\"]").textContent = t("task.checklist");
  renderTags(card, task);
  renderChecklist(card, task);

  if (task.description) {
    description.textContent = task.description;
  } else {
    description.hidden = true;
  }

  priority.textContent = priorityLabel(task.priority) ?? t("priority.none");
  priority.classList.add(`priority-badge--${task.priority}`);

  const recurrence = card.querySelector(".recurrence-badge");
  if (["daily", "weekly", "monthly"].includes(task.recurrence)) {
    recurrence.hidden = false;
    recurrence.textContent = recurrenceLabel(task.recurrence);
  }

  if (task.deadline) {
    const overdue = isTaskOverdue(task);
    deadline.dateTime = task.deadline;
    deadline.textContent = `${t(overdue ? "task.overdue" : "task.due")}: ${formatDeadline(task.deadline)}`;
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

export function renderArchive(tasks) {
  archiveCount.textContent = String(tasks.length);
  archiveList.replaceChildren();

  if (tasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "archive-list__empty";
    empty.textContent = t("archive.empty");
    archiveList.append(empty);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("article");
    item.className = "archive-item";
    item.dataset.taskId = task.id;

    const title = document.createElement("h3");
    title.textContent = task.title;
    const meta = document.createElement("p");
    meta.textContent = `${priorityLabel(task.priority) ?? t("priority.none")} · ${task.tags?.map((tag) => `#${tag}`).join(" ") || t("archive.noTags")}`;
    const restore = document.createElement("button");
    restore.className = "secondary-button";
    restore.type = "button";
    restore.dataset.action = "restore-task";
    restore.textContent = t("archive.restore");
    item.append(title, meta, restore);
    archiveList.append(item);
  });
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
