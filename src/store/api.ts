const API_URL = "https://functions.poehali.dev/b3ba1b8d-e62f-489b-b1c4-26d7f258b238";

export async function createProject(name: string, ownerName: string) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create", name, ownerName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка создания проекта");
  return data;
}

export async function joinProject(inviteCode: string) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "join", inviteCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Проект не найден");
  return data;
}

export async function saveProjectData(projectId: string, data: unknown) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", projectId, data }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Ошибка сохранения");
  return result;
}

export async function loadProjectData(projectId: string) {
  const res = await fetch(`${API_URL}?action=load&projectId=${encodeURIComponent(projectId)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
  return data;
}
