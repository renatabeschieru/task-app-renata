const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express();
app.use(cors());
app.use(express.json());
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
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         text:
 *           type: string
 *         status:
 *           type: string
 *           example: pending
 *         deadline:
 *           type: string
 *           example: "2026-01-25"
 *         category:
 *           type: string
 *           example: Personal
 *         uid:
 *           type: string
 *         order:
 *           type: number
 */
/**
 * 
 * ✅ 1) GET /api/tasks  (retrieving list)
 * Îți returnează toate task-urile din Firestore
 */
/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: Returnează task-urile unui user
 *     description: Returnează toate task-urile din Firestore care aparțin unui user (filtrate după uid).
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: UID-ul userului din Firebase Authentication
 *     responses:
 *       200:
 *         description: Lista de task-uri
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
 *         description: UID lipsă
 *       500:
 *         description: Eroare la citirea din Firestore
 */
app.get("/api/tasks", async (req, res) => {
    try {
      const { uid } = req.query;
      if (!uid) {
        return res.status(400).json({ success: false, message: "Missing uid" });
      }
  
      // ✅ fără orderBy în Firestore (evităm index requirement)
      const snap = await tasksCol.where("uid", "==", uid).get();
  
      let tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
      // ✅ sortare în backend (după createdAt desc)
      tasks.sort((a, b) => {
        const as = a.createdAt?.seconds ?? 0;
        const bs = b.createdAt?.seconds ?? 0;
        return bs - as;
      });
  
      return res.json({ success: true, tasks });
    } catch (err) {
      console.error("GET /api/tasks error:", err);
      return res.status(500).json({ success: false, message: "Firestore read failed" });
    }
  });

/**
 * ✅ 2) POST /api/tasks  (create item)
 * Body: { text, deadline, category }
 */
/**
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: Creează un task nou
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, uid]
 *             properties:
 *               text:
 *                 type: string
 *               deadline:
 *                 type: string
 *               category:
 *                 type: string
 *               uid:
 *                 type: string
 *               order:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created
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
        order: Number.isFinite(order) ? order : Date.now(), // fallback
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  
      return res.status(201).json({ success: true, id: docRef.id });
    } catch (err) {
      console.error("POST /api/tasks error:", err);
      return res.status(500).json({ success: false, message: "Firestore write failed" });
    }
  });

/**
 * ✅ 3) PATCH /api/tasks/:id/complete  (mark complete)
 */
/**
 * @openapi
 * /api/tasks/{id}/complete:
 *   patch:
 *     summary: Marchează task-ul ca completed
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
 *         description: OK
 */
/**
 * ✅ PATCH /api/tasks/:id/toggle  (pending <-> completed)
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

app.get("/", (req, res) => res.send("Task API running ✅"));

const PORT = 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));

/**
 * ✅ 4) DELETE /api/tasks/:id (delete task)
 */
/**
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     summary: Șterge un task
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
 * ✅ PATCH /api/tasks/reorder  (drag&drop reorder)
 * Query: ?uid=USER_ID
 * Body: { orderedIds: ["id1","id2","id3"] }
 */
/**
 * @openapi
 * /api/tasks/reorder:
 *   patch:
 *     summary: Reordonează task-urile (drag & drop)
 *     description: Primește o listă de ID-uri în ordinea dorită și actualizează câmpul `order` în Firestore.
 *     parameters:
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: ID-ul userului (din Firebase Auth)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedIds]
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["id1", "id2", "id3"]
 *     responses:
 *       200:
 *         description: Ordinea a fost salvată cu succes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Parametri lipsă sau body invalid
 *       403:
 *         description: Task-uri care nu aparțin userului
 *       404:
 *         description: Task inexistent
 *       500:
 *         description: Eroare server / Firestore
 */
app.patch("/api/tasks/reorder", async (req, res) => {
    try {
      const { uid } = req.query;
      const { orderedIds } = req.body;
  
      if (!uid) return res.status(400).json({ success: false, message: "Missing uid" });
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ success: false, message: "orderedIds must be a non-empty array" });
      }
  
      // verificăm că toate task-urile aparțin userului
      const docs = await Promise.all(orderedIds.map((id) => tasksCol.doc(id).get()));
      for (const snap of docs) {
        if (!snap.exists) return res.status(404).json({ success: false, message: "Task not found" });
        if (snap.data().uid !== uid) return res.status(403).json({ success: false, message: "Forbidden" });
      }
  
      // batch update order
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