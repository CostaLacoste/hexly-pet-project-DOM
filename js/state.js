let tasks = [];

function cloneTask(task) {
  return {
    ...task,
    tags: Array.isArray(task.tags) ? [...task.tags] : [],
    checklist: Array.isArray(task.checklist)
      ? task.checklist.map((item) => ({ ...item }))
      : [],
  };
}

export function getTasks() {
  return tasks.map(cloneTask);
}

export function setTasks(newTasks) {
  tasks = Array.isArray(newTasks)
    ? newTasks.map(cloneTask)
    : [];
}
