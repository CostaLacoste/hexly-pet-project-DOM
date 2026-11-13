const template = document.querySelector("#task-card-template");
const totalTaskCount = document.querySelector("#total-task-count");
const notificationRegion = document.querySelector("#notification-region");

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

function isOverdue(task) {
  if (!task.deadline || task.status === "done") {
    return false;
  }

  const today = new Date();
  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return task.deadline < localToday;
}

export function createTaskCard(task) {
  const card = template.content.firstElementChild.cloneNode(true);
  const description = card.querySelector(".task-card__description");
  const priority = card.querySelector(".priority-badge");
  const deadline = card.querySelector(".task-card__deadline");

  card.dataset.taskId = task.id;
  card.querySelector(".task-card__title").textContent = task.title;

  if (task.description) {
    description.textContent = task.description;
  } else {
    description.hidden = true;
  }

  priority.textContent = priorityLabels[task.priority] ?? "Без приоритета";
  priority.classList.add(`priority-badge--${task.priority}`);

  if (task.deadline) {
    const overdue = isOverdue(task);
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
