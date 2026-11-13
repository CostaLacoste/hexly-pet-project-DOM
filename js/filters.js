// Поиск и фильтрация задач.
// TODO: реализовать фильтрацию по тексту и приоритету.
export function filterTasks(tasks, search, priority) {
  const normalizedSearch = search.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(normalizedSearch) ||
      task.description.toLowerCase().includes(normalizedSearch);

    const matchesPriority =
      priority === "all" || task.priority === priority;

    return matchesSearch && matchesPriority;
  });
}

searchInput.addEventListener("input", applyFilters);
prioritySelect.addEventListener("change", applyFilters);

board.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".task-card");

  if (card) {
    event.dataTransfer.setData("text/plain", card.dataset.taskId);
  }
});

board.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-task-list]")) {
    event.preventDefault();
  }
});

board.addEventListener("drop", (event) => {
  const list = event.target.closest("[data-task-list]");

  if (!list) {
    return;
  }

  event.preventDefault();

  const taskId = event.dataTransfer.getData("text/plain");
  const newStatus = list.dataset.taskList;

  updateTask(taskId, { status: newStatus });
  commitChanges();
});