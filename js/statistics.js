function getLocalDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function isTaskOverdue(task, now = new Date()) {
  if (!task?.deadline || task.status === "done") {
    return false;
  }

  return task.deadline < getLocalDateKey(now);
}

export function calculateStatistics(tasks, now = new Date()) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  const done = taskList.filter((task) => task.status === "done").length;
  const overdue = taskList.filter((task) => isTaskOverdue(task, now)).length;
  const checklist = taskList.flatMap((task) =>
    Array.isArray(task.checklist) ? task.checklist : [],
  );
  const checklistDone = checklist.filter((item) => item.done).length;
  const progress = taskList.length === 0
    ? 0
    : Math.round((done / taskList.length) * 100);

  return {
    done,
    overdue,
    progress,
    checklistDone,
    checklistTotal: checklist.length,
  };
}
