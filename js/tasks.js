import { getTasks, setTasks } from "./state.js";

const VALID_PRIORITIES = new Set(["low", "medium", "high"]);
const VALID_RECURRENCES = new Set(["none", "daily", "weekly", "monthly"]);

function createId() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags ?? "").split(",");

  return [...new Set(
    values
      .map((tag) => String(tag).trim().toLowerCase().slice(0, 20))
      .filter(Boolean),
  )].slice(0, 5);
}

function normalizeChecklist(checklist) {
  if (!Array.isArray(checklist)) {
    return [];
  }

  return checklist
    .map((item) => ({
      id: String(item?.id || createId()),
      text: String(item?.text ?? "").trim().slice(0, 100),
      done: Boolean(item?.done),
    }))
    .filter((item) => item.text)
    .slice(0, 8);
}

function normalizeTaskData(taskData) {
  const title = String(taskData.title ?? "").trim();

  if (!title) {
    throw new Error("Название задачи не может быть пустым");
  }

  return {
    title,
    description: String(taskData.description ?? "").trim(),
    status: String(taskData.status || "todo").trim().slice(0, 30) || "todo",
    priority: VALID_PRIORITIES.has(taskData.priority)
      ? taskData.priority
      : "low",
    deadline: String(taskData.deadline ?? ""),
    boardId: String(taskData.boardId || "default"),
    order: Number.isFinite(Number(taskData.order)) ? Number(taskData.order) : 0,
    archived: Boolean(taskData.archived),
    recurrence: VALID_RECURRENCES.has(taskData.recurrence)
      ? taskData.recurrence
      : "none",
    tags: normalizeTags(taskData.tags),
    checklist: normalizeChecklist(taskData.checklist),
    dependsOn: [...new Set(
      (Array.isArray(taskData.dependsOn) ? taskData.dependsOn : [taskData.dependsOn])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean),
    )].slice(0, 12),
    assignee: String(taskData.assignee ?? "").trim().slice(0, 50),
    color: ["default", "pink", "lime", "purple", "yellow", "blue"].includes(taskData.color)
      ? taskData.color
      : "default",
    cover: String(taskData.cover ?? "").trim().slice(0, 4),
    comments: Array.isArray(taskData.comments)
      ? taskData.comments.map((comment) => ({
          id: String(comment?.id || createId()),
          author: String(comment?.author || "User").trim().slice(0, 50),
          text: String(comment?.text || "").trim().slice(0, 500),
          createdAt: String(comment?.createdAt || new Date().toISOString()),
        })).filter((comment) => comment.text).slice(-30)
      : [],
  };
}

export function createTask(taskData) {
  const normalized = normalizeTaskData(taskData);
  const newTask = {
    id: createId(),
    ...normalized,
    createdAt: new Date().toISOString(),
    completedAt: normalized.status === "done" ? new Date().toISOString() : "",
  };

  setTasks([...getTasks(), newTask]);
  return newTask;
}

export function updateTask(id, changes) {
  const currentTask = getTaskById(id);

  if (!currentTask) {
    return null;
  }

  const normalizedChanges = normalizeTaskData({
    ...currentTask,
    ...changes,
  });
  const movedToDone = currentTask.status !== "done" && normalizedChanges.status === "done";
  const updatedTask = {
    ...currentTask,
    ...normalizedChanges,
    completedAt: movedToDone
      ? new Date().toISOString()
      : normalizedChanges.status === "done"
        ? currentTask.completedAt || new Date().toISOString()
        : "",
  };
  const updatedTasks = getTasks().map((task) =>
    task.id === id ? updatedTask : task,
  );

  setTasks(updatedTasks);
  return updatedTask;
}

export function deleteTask(id) {
  const tasks = getTasks();
  const remainingTasks = tasks.filter((task) => task.id !== id);

  if (remainingTasks.length === tasks.length) {
    return false;
  }

  setTasks(remainingTasks);
  return true;
}

export function getTaskById(id) {
  return getTasks().find((task) => task.id === id);
}

function shiftDeadline(deadline, recurrence, now = new Date()) {
  const base = deadline ? new Date(`${deadline}T12:00:00`) : new Date(now);

  if (recurrence === "daily") {
    base.setDate(base.getDate() + 1);
  } else if (recurrence === "weekly") {
    base.setDate(base.getDate() + 7);
  } else if (recurrence === "monthly") {
    base.setMonth(base.getMonth() + 1);
  }

  return [
    base.getFullYear(),
    String(base.getMonth() + 1).padStart(2, "0"),
    String(base.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getRecurringTaskData(task, now = new Date()) {
  if (!task || task.recurrence === "none") {
    return null;
  }

  return {
    ...task,
    id: undefined,
    status: "todo",
    archived: false,
    deadline: shiftDeadline(task.deadline, task.recurrence, now),
    checklist: (task.checklist ?? []).map((item) => ({ ...item, id: "", done: false })),
  };
}

export function moveTask(taskId, newStatus, beforeTaskId = null) {
  const allTasks = getTasks();
  const movingTask = allTasks.find((task) => task.id === taskId);

  if (!movingTask) {
    return null;
  }

  const peers = allTasks
    .filter((task) =>
      task.id !== taskId &&
      task.boardId === movingTask.boardId &&
      !task.archived &&
      task.status === newStatus,
    )
    .sort((first, second) => first.order - second.order);
  const foundIndex = beforeTaskId
    ? peers.findIndex((task) => task.id === beforeTaskId)
    : -1;
  const insertAt = foundIndex >= 0 ? foundIndex : peers.length;
  peers.splice(insertAt, 0, { ...movingTask, status: newStatus });

  const orderById = new Map(peers.map((task, index) => [task.id, index]));
  const updatedTasks = allTasks.map((task) =>
    orderById.has(task.id)
      ? {
          ...task,
          status: task.id === taskId ? newStatus : task.status,
          completedAt: task.id === taskId
            ? newStatus === "done"
              ? task.completedAt || new Date().toISOString()
              : ""
            : task.completedAt,
          order: orderById.get(task.id),
        }
      : task,
  );
  setTasks(updatedTasks);
  return getTaskById(taskId);
}

export function areDependenciesComplete(task, tasks = getTasks()) {
  const dependencyIds = Array.isArray(task?.dependsOn) ? task.dependsOn : [];
  return dependencyIds.every((id) => tasks.find((candidate) => candidate.id === id)?.status === "done");
}
