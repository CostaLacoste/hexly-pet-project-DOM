const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };

function checklistProgress(task) {
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  return checklist.length === 0
    ? 0
    : checklist.filter((item) => item.done).length / checklist.length;
}

function deadlineValue(task) {
  return task.deadline || "9999-12-31";
}

export function sortTasks(tasks, mode = "manual") {
  const sorted = [...tasks];

  sorted.sort((first, second) => {
    switch (mode) {
      case "deadline":
        return deadlineValue(first).localeCompare(deadlineValue(second));
      case "priority":
        return (PRIORITY_WEIGHT[first.priority] ?? 3) -
          (PRIORITY_WEIGHT[second.priority] ?? 3);
      case "created":
        return String(second.createdAt ?? "").localeCompare(String(first.createdAt ?? ""));
      case "checklist":
        return checklistProgress(second) - checklistProgress(first);
      default:
        return (Number(first.order) || 0) - (Number(second.order) || 0);
    }
  });

  return sorted;
}
