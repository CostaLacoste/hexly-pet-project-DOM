// Состояние канбан-доски.
// TODO: описать структуру данных задач и функции изменения состояния.
let tasks = [];

export function getTasks() {
  return tasks;
}

export function setTasks(newTasks) {
  tasks = newTasks;
}