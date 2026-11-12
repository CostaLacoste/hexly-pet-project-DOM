// Создание карточек и обновление DOM.
// TODO: добавить функции отрисовки доски, счётчиков и пустых состояний.
const template = document.querySelector("#task-card-template");

export function createTaskCard(task) {
  const card = template.content.firstElementChild.cloneNode(true);

  card.dataset.taskId = task.id;
  card.querySelector(".task-card__title").textContent = task.title;
  card.querySelector(".task-card__description").textContent =
    task.description;

  return card;
}

const lists = {
  todo: document.querySelector('[data-task-list="todo"]'),
  progress: document.querySelector('[data-task-list="progress"]'),
  done: document.querySelector('[data-task-list="done"]'),
};

emptyState.hidden = columnTasks.length > 0;