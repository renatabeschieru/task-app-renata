## Key Features (Frontend + Backend)

### Authentication (Firebase Auth)
- Users can sign up / log in with email + password.
- After login, the app loads only the tasks that belong to the logged-in user (filtered by `uid`).

### Task API (Express + Firestore)
The frontend does NOT write directly to Firestore anymore.
Instead, it calls a custom REST API, and the backend persists data to Firestore using `firebase-admin`.

**Endpoints:**
- `GET /api/tasks?uid=...` → returns the user’s tasks
- `POST /api/tasks` → creates a new task
- `PATCH /api/tasks/:id/toggle?uid=...` → toggles `pending <-> completed`
- `DELETE /api/tasks/:id?uid=...` → deletes a task
- `PATCH /api/tasks/reorder?uid=...` → saves drag & drop order
- `POST /api/tasks/sync?uid=...` → sync offline tasks from IndexedDB

### Toggle (Done / Undo) logic
When the user clicks a task card or presses the Done/Undo button:
1. Frontend calls `PATCH /api/tasks/:id/toggle?uid=...`
2. Backend verifies ownership (`task.uid === uid`) and updates `status`
3. Frontend reloads tasks with `GET /api/tasks?uid=...` to stay in sync

### Delete logic
When the user presses the trash icon:
1. Frontend calls `DELETE /api/tasks/:id?uid=...`
2. Backend verifies ownership and deletes the task in Firestore
3. Frontend reloads tasks via `GET /api/tasks?uid=...`

### Drag & Drop reorder
Drag & drop is implemented with **@hello-pangea/dnd**.
- UI reorder happens instantly (optimistic update)
- When online, the app persists the order by calling:
  `PATCH /api/tasks/reorder?uid=...` with `orderedIds`

### Offline support (IndexedDB + Sync)
If the user is offline:
- New tasks are stored locally in IndexedDB (`localOnly: true`)
- When the connection is restored:
  - the app calls `POST /api/tasks/sync?uid=...`
  - backend writes tasks to Firestore
  - local offline queue is cleared
  - tasks are reloaded from the API

### Styling & UI
- Tailwind CSS is used for layout and responsive design.
- App structure is component-based (AuthForm, Header, TaskForm, TaskList, TaskItem etc.)
- Hooks used: `useState`, `useEffect`, `useMemo`

### API Documentation (Swagger / OpenAPI)
Swagger UI is available at:
- `http://localhost:3000/api-docs`
It documents all REST endpoints and request/response payloads.
