// Хранение данных в localStorage.
// TODO: реализовать загрузку и сохранение состояния доски.
const STORAGE_KEY = "flowboard-tasks";

export function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    return JSON.parse(savedTasks);
  } catch {
    return [];
  }
}

function commitChanges() {
  saveTasks(getTasks());
  renderBoard(getTasks());
}