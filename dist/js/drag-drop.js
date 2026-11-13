function clearDropHighlights(board) {
  board
    .querySelectorAll(".task-list.is-drag-over")
    .forEach((list) => list.classList.remove("is-drag-over"));
}

export function initDragAndDrop(board, onMove) {
  board.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".task-card");

    if (!card || !event.dataTransfer) {
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.taskId);
    card.classList.add("is-dragging");
  });

  board.addEventListener("dragend", (event) => {
    event.target.closest(".task-card")?.classList.remove("is-dragging");
    clearDropHighlights(board);
  });

  board.addEventListener("dragover", (event) => {
    const list = event.target.closest("[data-task-list]");

    if (!list || !event.dataTransfer) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDropHighlights(board);
    list.classList.add("is-drag-over");
  });

  board.addEventListener("dragleave", (event) => {
    const list = event.target.closest("[data-task-list]");

    if (list && !list.contains(event.relatedTarget)) {
      list.classList.remove("is-drag-over");
    }
  });

  board.addEventListener("drop", (event) => {
    const list = event.target.closest("[data-task-list]");

    if (!list || !event.dataTransfer) {
      return;
    }

    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    const newStatus = list.dataset.taskList;
    clearDropHighlights(board);

    if (taskId && newStatus) {
      onMove(taskId, newStatus);
    }
  });
}
