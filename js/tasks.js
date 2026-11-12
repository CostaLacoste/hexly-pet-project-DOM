// Операции с задачами.
// TODO: реализовать создание, редактирование, удаление и смену статуса.
import { getTasks, setTasks } from "./state.js";

export function createTask(taskData) {
  const newTask = {
    id: crypto.randomUUID(),
    title: taskData.title.trim(),
    description: taskData.description.trim(),
    status: taskData.status,
    priority: taskData.priority,
    deadline: taskData.deadline,
    createdAt: new Date().toISOString(),
  };

  setTasks([...getTasks(), newTask]);
}

export function updateTask(id, changes) {
  const updatedTasks = getTasks().map((task) =>
    task.id === id ? { ...task, ...changes } : task,
  );

  setTasks(updatedTasks);
}

export function deleteTask(id) {
  const remainingTasks = getTasks().filter((task) => task.id !== id);
  setTasks(remainingTasks);
}

export function getTaskById(id) {
  return getTasks().find((task) => task.id === id);
}