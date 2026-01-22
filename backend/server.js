const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express();
app.use(cors());
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 🔐 conectare backend la Firebase (Firestore) cu Service Account
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const tasksCol = db.collection("tasks");

/**
 * @openapi
 * tags:
 *   - name: Tasks
 *     description: CRUD operations for tasks
 *   - name: Offline
 *     description: Offline sync endpoints (IndexedDB -> Firestore)
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "abc123"
 *         text:
 *           type: string
 *           example: "Buy lip gloss 💄"
 *         status:
 *           type: string
 *           example: "pending"
 *         deadline:
 *           type: string
 *           example: "2026-01-25"
 *         category:
 *           type: string
 *           example: "Personal"
 *         uid:
 *           type: string
 *           example: "firebase-uid-123"
 *         order:
 *           type: number
 *           example: 1
 *         createdAtClient:
 *           type: number
 *           example: 1736900000000
 *
 *     CreateTaskRequest:
 *       type: object
 *       required: [text, uid]
 *       properties:
 *         text:
 *           type: string
 *           example: "Study for Web exam"
 *         deadline:
 *           type: string
 *           example: "2026-01-25"
 *         category:
 *           type: string
 *           example: "School"
 *         uid:
 *           type: string
 *           example: "firebase-uid-123"
 *         order:
 *           type: number
 *           example: 3
 *
 *     ReorderRequest:
 *       type: object
 *       required: [orderedIds]
 *       properties:
 *         orderedIds:
 *           type: array
 *           items:
 *             type: string
 *           example: ["id1", "id2", "id3"]
 *
 *     OfflineTaskInput:
 *       type: object
 *       required: [text]
 *       properties:
 *         text:
 *           type: string
 *           example: "Buy lip gloss 💄"
 *         deadline:
 *           type: string
 *           example: "2026-01-25"
 *         category:
 *           type: string
 *           example: "Personal"
 *         order:
 *           type: number
 *           example: 5
 *         createdAtClient:
 *           type: number
 *           example: 1736900000000
 *
 *     SyncTasksRequest:
 *       type: object
 *       required: [tasks]
 *       properties:
 *         tasks:
 *           type: array
 *           minItems: 1
 *           items:
 *             $ref: '#/components/schemas/OfflineTaskInput'
 *
 *     SyncTasksResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         createdIds:
 *           type: array
 *           items:
 *             type: string
 *           example: ["abc123", "def456"]
 */

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Get tasks for a user
 *     description: Returns all tasks from Firestore that belong to the given Firebase Auth UID.
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase Auth UID
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       400:
 *         description: Missing uid
 *       500:
 *         description: Firestore read failed
 */
app.get("/api/tasks", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });

    const snap = await tasksCol.where("uid", "==", uid).get();
    let tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // sortare desc după createdAt (fără orderBy -> evităm index requirement)
    tasks.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

    return res.json({ success: true, tasks });
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    return res.status(500).json({ success: false, message: "Firestore read failed" });
  }
});

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Create a new task
 *     description: Creates a new task in Firestore for the given user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: string
 *                   example: "abc123"
 *       400:
 *         description: Validation error
 *       500:
 *         description: Firestore write failed
 */
app.post("/api/tasks", async (req, res) => {
  try {
    const { text, deadline = "", category = "Personal", uid, order } = req.body;

    const t = (text || "").trim();
    if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });
    if (!t) return res.status(400).json({ success: false, message: "Task-ul nu poate fi gol" });
    if (t.length > 100) return res.status(400).json({ success: false, message: "Maxim 100 caractere" });

    const docRef = await tasksCol.add({
      text: t,
      status: "pending",
      deadline,
      category,
      uid,
      order: Number.isFinite(order) ? order : Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    return res.status(500).json({ success: false, message: "Firestore write failed" });
  }
});

/**
 * @openapi
 * /api/tasks/{id}/toggle:
 *   patch:
 *     tags: [Tasks]
 *     summary: Toggle task status (pending <-> completed)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task document id
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase Auth UID (ownership check)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: completed
 *       400:
 *         description: Missing uid
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       500:
 *         description: Firestore update failed
 */
app.patch("/api/tasks/:id/toggle", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });

    const id = req.params.id;
    const ref = tasksCol.doc(id);

    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ success: false, message: "Task not found" });

    const data = snap.data();
    if (data.uid !== uid) return res.status(403).json({ success: false, message: "Forbidden" });

    const current = data.status || "pending";
    const next = current === "completed" ? "pending" : "completed";

    await ref.update({ status: next });
    return res.json({ success: true, status: next });
  } catch (err) {
    console.error("PATCH /toggle error:", err);
    return res.status(500).json({ success: false, message: "Firestore update failed" });
  }
});

/**
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Missing uid
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       500:
 *         description: Firestore delete failed
 */
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });

    const id = req.params.id;
    const ref = tasksCol.doc(id);

    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ success: false, message: "Task not found" });

    const data = snap.data();
    if (data.uid !== uid) return res.status(403).json({ success: false, message: "Forbidden" });

    await ref.delete();
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks error:", err);
    return res.status(500).json({ success: false, message: "Firestore delete failed" });
  }
});

/**
 * @openapi
 * /api/tasks/reorder:
 *   patch:
 *     tags: [Tasks]
 *     summary: Reorder tasks (drag & drop)
 *     description: Updates the `order` field for tasks in the provided order.
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderRequest'
 *     responses:
 *       200:
 *         description: Reordered successfully
 *       400:
 *         description: Missing uid or invalid body
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Task not found
 *       500:
 *         description: Firestore reorder failed
 */
app.patch("/api/tasks/reorder", async (req, res) => {
  try {
    const { uid } = req.query;
    const { orderedIds } = req.body;

    if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ success: false, message: "orderedIds must be a non-empty array" });
    }

    const docs = await Promise.all(orderedIds.map((id) => tasksCol.doc(id).get()));
    for (const snap of docs) {
      if (!snap.exists) return res.status(404).json({ success: false, message: "Task not found" });
      if (snap.data().uid !== uid) return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const batch = db.batch();
    orderedIds.forEach((id, idx) => {
      batch.update(tasksCol.doc(id), { order: idx + 1 });
    });
    await batch.commit();

    return res.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/tasks/reorder error:", err);
    return res.status(500).json({ success: false, message: "Firestore reorder failed" });
  }
});

/**
 * @openapi
 * /api/tasks/sync:
 *   post:
 *     tags: [Offline]
 *     summary: Sync offline tasks to Firestore
 *     description: |
 *       Receives tasks created offline (stored in IndexedDB) and creates them in Firestore.
 *       Called automatically when the client reconnects to the internet.
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: Firebase Auth UID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SyncTasksRequest'
 *     responses:
 *       200:
 *         description: Synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SyncTasksResponse'
 *       400:
 *         description: Missing uid or invalid body
 *       500:
 *         description: Sync failed
 */
app.post("/api/tasks/sync", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });

    const { tasks } = req.body;
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ success: false, message: "tasks must be a non-empty array" });
    }

    const batch = db.batch();
    const createdIds = [];

    tasks.forEach((t) => {
      const ref = tasksCol.doc();
      createdIds.push(ref.id);

      batch.set(ref, {
        text: (t.text || "").trim(),
        status: "pending",
        deadline: t.deadline || "",
        category: t.category || "Personal",
        uid,
        order: Number.isFinite(t.order) ? t.order : Date.now(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtClient: t.createdAtClient || Date.now(),
      });
    });

    await batch.commit();
    return res.json({ success: true, createdIds });
  } catch (err) {
    console.error("POST /api/tasks/sync error:", err);
    return res.status(500).json({ success: false, message: "Sync failed" });
  }
});

// Health check
app.get("/", (req, res) => res.send("Task API running ✅"));

const PORT = 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));