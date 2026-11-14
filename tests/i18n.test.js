import assert from "node:assert/strict";
import test from "node:test";

import { getLanguage, getLocale, setLanguage, t } from "../js/i18n.js";

test("переключает язык и подставляет переменные", () => {
  setLanguage("en");

  assert.equal(getLanguage(), "en");
  assert.equal(getLocale(), "en-US");
  assert.equal(t("board.default"), "Main board");
  assert.equal(t("notice.archived", { count: 3 }), "Archived: 3");
});

test("поддерживает Igbo, узбекский, украинский, иврит и идиш", () => {
  const translations = {
    ig: "Bọdụ bụ isi",
    uz: "Asosiy doska",
    uk: "Основна дошка",
    he: "לוח ראשי",
    yi: "הויפּט־ברעט",
  };

  Object.entries(translations).forEach(([language, expected]) => {
    setLanguage(language);
    assert.equal(t("board.default"), expected);
  });
});

test("использует русский для неизвестного языка", () => {
  setLanguage("unknown");

  assert.equal(getLanguage(), "ru");
  assert.equal(t("board.default"), "Основная доска");
});
