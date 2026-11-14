export function filterTasks(tasks, search, priority, tag = "all") {
  const normalizedSearch = String(search ?? "").trim().toLowerCase();

  return tasks.filter((task) => {
    const title = String(task.title ?? "").toLowerCase();
    const description = String(task.description ?? "").toLowerCase();
    const tags = Array.isArray(task.tags) ? task.tags : [];
    const checklistText = Array.isArray(task.checklist)
      ? task.checklist.map((item) => item.text).join(" ").toLowerCase()
      : "";
    const matchesSearch =
      title.includes(normalizedSearch) ||
      description.includes(normalizedSearch) ||
      tags.some((taskTag) => taskTag.includes(normalizedSearch)) ||
      checklistText.includes(normalizedSearch);

    const matchesPriority =
      priority === "all" || task.priority === priority;
    const matchesTag = tag === "all" || tags.includes(tag);

    return matchesSearch && matchesPriority && matchesTag;
  });
}
