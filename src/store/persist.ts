const STORAGE_KEY = "planner_app_data";
const PROJECT_KEY = "planner_project_info";

export interface ProjectInfo {
  projectId: string;
  name: string;
  inviteCode: string;
}

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

export function loadProjectInfo(): ProjectInfo | null {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectInfo;
  } catch {
    return null;
  }
}

export function saveProjectInfo(info: ProjectInfo): void {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(info));
  } catch {
    // Ignore
  }
}

export function clearProjectInfo(): void {
  try {
    localStorage.removeItem(PROJECT_KEY);
  } catch {
    // Ignore
  }
}
