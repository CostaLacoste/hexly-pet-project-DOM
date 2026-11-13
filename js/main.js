// Точка входа в приложение.
// TODO: подключить остальные модули и выполнить инициализацию.
const form = document.querySelector("#task-form");
const taskDialog = document.querySelector("#task-dialog");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const taskData = Object.fromEntries(formData.entries());
});

form.reset();
form.elements.taskId.value = "";
taskDialog.showModal();

const board = document.querySelector(".kanban-board");

board.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const card = button.closest(".task-card");
  const taskId = card?.dataset.taskId;

  if (button.dataset.action === "edit-task") {
    // Открыть форму редактирования.
  }

  if (button.dataset.action === "delete-task") {
    // Открыть подтверждение удаления.
  }
});