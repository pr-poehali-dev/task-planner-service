const STORAGE_KEY = "planner_app_data";

export interface PersistedData {
  branches: unknown[];
  employees: unknown[];
  categories: unknown[];
  tasks: unknown[];
  groupGoals: unknown[];
  groupTasks: unknown[];
  personalGoals: unknown[];
  userTaskTypes: unknown[];
  notes: unknown[];
  files: unknown[];
  passwords: Record<string, string>;
  currentUserId: string | null;
}

export function loadFromStorage(): PersistedData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedData;
  } catch {
    return null;
  }
}

export function saveToStorage(data: PersistedData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}