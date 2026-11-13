export function filterTasks(tasks, search, priority) {
  const normalizedSearch = String(search ?? "").trim().toLowerCase();

  return tasks.filter((task) => {
    const title = String(task.title ?? "").toLowerCase();
    const description = String(task.description ?? "").toLowerCase();
    const matchesSearch =
      title.includes(normalizedSearch) ||
      description.includes(normalizedSearch);

    const matchesPriority =
      priority === "all" || task.priority === priority;

    return matchesSearch && matchesPriority;
  });
}
