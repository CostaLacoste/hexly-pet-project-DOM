const STORAGE_KEY = "flowboard-tasks";
const BOARDS_KEY = "flowboard-boards";
const ACTIVE_BOARD_KEY = "flowboard-active-board";
const THEME_KEY = "flowboard-theme";
const SORT_KEY = "flowboard-sort";
const LANGUAGE_KEY = "flowboard-language";
const COLUMNS_KEY = "flowboard-columns";
const TEMPLATES_KEY = "flowboard-templates";
const MEMBERS_KEY = "flowboard-members";
const ACTIVITY_KEY = "flowboard-activity";
const ACCESSIBILITY_KEY = "flowboard-accessibility";
const PROFILE_KEY = "flowboard-profile";

function saveValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Не удалось сохранить данные:", error);
    return false;
  }
}

function loadValue(key, fallback) {
  const saved = localStorage.getItem(key);

  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Не удалось загрузить данные:", error);
    return fallback;
  }
}

export function saveTasks(tasks) {
  return saveValue(STORAGE_KEY, tasks);
}

export function loadTasks() {
  const tasks = loadValue(STORAGE_KEY, []);
  return Array.isArray(tasks) ? tasks : [];
}

export function saveBoards(boards) {
  return saveValue(BOARDS_KEY, boards);
}

export function loadBoards() {
  const boards = loadValue(BOARDS_KEY, []);
  return Array.isArray(boards) ? boards : [];
}

export function saveSetting(key, value) {
  const storageKey = {
    activeBoard: ACTIVE_BOARD_KEY,
    theme: THEME_KEY,
    sort: SORT_KEY,
    language: LANGUAGE_KEY,
    columns: COLUMNS_KEY,
    templates: TEMPLATES_KEY,
    members: MEMBERS_KEY,
    activity: ACTIVITY_KEY,
    accessibility: ACCESSIBILITY_KEY,
    profile: PROFILE_KEY,
  }[key];
  return storageKey ? saveValue(storageKey, value) : false;
}

export function loadSetting(key, fallback) {
  const storageKey = {
    activeBoard: ACTIVE_BOARD_KEY,
    theme: THEME_KEY,
    sort: SORT_KEY,
    language: LANGUAGE_KEY,
    columns: COLUMNS_KEY,
    templates: TEMPLATES_KEY,
    members: MEMBERS_KEY,
    activity: ACTIVITY_KEY,
    accessibility: ACCESSIBILITY_KEY,
    profile: PROFILE_KEY,
  }[key];
  return storageKey ? loadValue(storageKey, fallback) : fallback;
}
