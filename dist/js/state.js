let tasks = [];

export function getTasks() {
  return tasks.map((task) => ({ ...task }));
}

export function setTasks(newTasks) {
  tasks = Array.isArray(newTasks)
    ? newTasks.map((task) => ({ ...task }))
    : [];
}
