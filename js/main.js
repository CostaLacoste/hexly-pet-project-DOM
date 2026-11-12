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