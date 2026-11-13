import { getTasks, setTasks } from "./state.js";

const VALID_STATUSES = new Set(["todo", "progress", "done"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

function normalizeTaskData(taskData) {
  const title = String(taskData.title ?? "").trim();

  if (!title) {
    throw new Error("Название задачи не может быть пустым");
  }

  return {
    title,
    description: String(taskData.description ?? "").trim(),
    status: VALID_STATUSES.has(taskData.status) ? taskData.status : "todo",
    priority: VALID_PRIORITIES.has(taskData.priority)
      ? taskData.priority
      : "low",
    deadline: String(taskData.deadline ?? ""),
  };
}

export function createTask(taskData) {
  const newTask = {
    id: crypto.randomUUID(),
    ...normalizeTaskData(taskData),
    createdAt: new Date().toISOString(),
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
  const updatedTask = { ...currentTask, ...normalizedChanges };
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
