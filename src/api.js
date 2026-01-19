const API_BASE = "http://localhost:3000";

export async function apiGetTasks(uid) {
  const res = await fetch(`${API_BASE}/api/tasks?uid=${encodeURIComponent(uid)}`);
  if (!res.ok) throw new Error("GET /api/tasks failed");
  return res.json();
}

export async function apiCreateTask(payload) {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("POST /api/tasks failed");
  return res.json();
}

export async function apiToggleTask(id, uid) {
    const res = await fetch(
      `http://localhost:3000/api/tasks/${id}/toggle?uid=${encodeURIComponent(uid)}`,
      { method: "PATCH" }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  }

export async function apiDeleteTask(id, uid) {
  const res = await fetch(
    `${API_BASE}/api/tasks/${id}?uid=${encodeURIComponent(uid)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("DELETE failed");
  return res.json();
}