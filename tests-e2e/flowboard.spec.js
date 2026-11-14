import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/");
});

test("полный сценарий: доска, задача, повторение, архив и undo", async ({ page }) => {
  page.once("dialog", (dialog) => dialog.accept("Работа"));
  await page.getByRole("button", { name: "+ Доска" }).click();
  await expect(page.locator("#active-board-name")).toHaveText("Работа");

  await page.getByRole("button", { name: "Новая задача" }).click();
  await page.locator("#task-title").fill("Подготовить релиз");
  await page.locator("#task-tags").fill("релиз, команда");
  await page.locator("#task-deadline").fill("2026-11-14");
  await page.locator("#task-recurrence").selectOption("weekly");
  await page.getByRole("button", { name: "+ Добавить пункт" }).click();
  await page.locator(".checklist-editor__text").fill("Проверить сборку");
  await page.getByRole("button", { name: "Сохранить" }).click();

  await expect(page.getByRole("heading", { name: "Подготовить релиз" })).toBeVisible();
  await expect(page.locator("#tag-filter option")).toHaveCount(3);
  await page.locator(".task-checklist__item input").check();
  await expect(page.locator('[data-stat="checklist"]')).toHaveText("1/1");

  await page.getByRole("button", { name: "Изменить" }).click();
  await page.locator("#task-status").selectOption("done");
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.locator('[data-stat="done"]')).toHaveText("1");
  await expect(page.locator(".task-card")).toHaveCount(2);

  await page.getByRole("button", { name: "Архив", exact: true }).click();
  await expect(page.locator("#archive-count")).toHaveText("1");
  await page.getByRole("button", { name: /Архив 1/ }).click();
  await page.getByRole("button", { name: "Восстановить" }).click();
  await page.getByRole("button", { name: "Закрыть архив" }).click();
  await expect(page.locator('[data-stat="done"]')).toHaveText("1");

  await page.getByRole("button", { name: /Отменить/ }).click();
  await expect(page.locator("#archive-count")).toHaveText("1");
});

test("темы, сортировка и клавиатурные команды", async ({ page }) => {
  await page.locator("#theme-select").selectOption("dark");
  await expect(page.locator("body")).toHaveAttribute("data-theme", "dark");

  await page.keyboard.press("n");
  await expect(page.locator("#task-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("/");
  await expect(page.locator("#task-search")).toBeFocused();

  await page.locator("#sort-select").selectOption("priority");
  await expect(page.locator("#sort-select")).toHaveValue("priority");
});

test("экспортирует и импортирует рабочее пространство", async ({ page }) => {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Экспорт" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^flowboard-\d{4}-\d{2}-\d{2}\.json$/);

  const payload = {
    version: 2,
    activeBoardId: "imported",
    boards: [{ id: "imported", name: "Импортированная", createdAt: new Date().toISOString() }],
    tasks: [{
      id: "task-imported",
      boardId: "imported",
      title: "Задача из файла",
      description: "",
      status: "todo",
      priority: "medium",
      deadline: "",
      tags: ["импорт"],
      checklist: [],
      order: 0,
      archived: false,
      recurrence: "none",
      createdAt: new Date().toISOString(),
    }],
  };
  await page.locator("#workspace-import").setInputFiles({
    name: "flowboard-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });

  await expect(page.locator("#active-board-name")).toHaveText("Импортированная");
  await expect(page.getByRole("heading", { name: "Задача из файла" })).toBeVisible();
});
