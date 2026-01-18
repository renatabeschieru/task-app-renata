import React, { useEffect, useMemo, useState } from "react";
import { db } from "./firebase"; //Importăm conexiunea către Firestore (db) din firebase.js.
import {
  addDoc,
  collection, // referință către o colecție (ex: "tasks")
  deleteDoc,
  doc,
  onSnapshot, // READ în timp real (subscribe / listener)
  query,
  serverTimestamp,
  updateDoc,
  writeBatch, // când faci reorder, scriem order pentru toate
} from "firebase/firestore"; // importăm funcții Firestore pe care le folosim pentru CRUD
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { where } from "firebase/firestore";

// Limită cerută (input validation)
const MAX_LEN = 100;

const CATEGORIES = [
  { name: "Work", emoji: "💼" },
  { name: "School", emoji: "🏫" },
  { name: "Personal", emoji: "💗" },
  { name: "Shopping", emoji: "🛍️" },
  { name: "Home things", emoji: "🏠" },
];

// 1) STATE (starea aplicației)
export default function App() {
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Personal");
  const [error, setError] = useState("");
  const [dragErrorTaskId, setDragErrorTaskId] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  /**
   * tasks = lista de task-uri citită din Firestore.
   * IMPORTANT: asta vine din baza de date, deci e persistent.
   */
  const [tasks, setTasks] = useState([]);

  // Filtrare și sortare (cerință)
  const [filter, setFilter] = useState("all"); // all | pending | completed
  const [sort, setSort] = useState("manual"); // manual | createdAt | deadline

  // 2) READ (citire din Firestore,din colectia tasks în timp real)
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    const q = query(
      collection(db, "tasks"),
      where("uid", "==", user.uid)
    ); // ascultare in timp real la colectia tasks

    const unsub = onSnapshot(q,(snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTasks(items);
      },
      (err) => {
        console.error(err);
        setError("Nu pot citi din Firebase. Verifică Firestore + rules.");
      }
    );
    return () => unsub();
  }, [user]);

// Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 3) CREATE (adăugare task în Firestore)
  async function addTask(e) {
    if (!user) return setError("Trebuie să te loghezi ca să adaugi task-uri.");


    e.preventDefault();
    const t = text.trim();

    if (!t) return setError("Task-ul nu poate fi gol 🥺");
    if (t.length > MAX_LEN) return setError(`Maxim ${MAX_LEN} caractere ✂️`);

    setError("");

    // Calculăm order pentru task-ul nou
    const maxOrder = tasks.reduce((m, x) => Math.max(m, x.order ?? 0), 0);

    // Scriem în Firestore (persistență)
    await addDoc(collection(db, "tasks"), {
      text: t,
      status: "pending",
      category,
      deadline: deadline || "",
      createdAt: serverTimestamp(),
      order: maxOrder + 1,
      uid: user.uid,
    });

    // Resetăm formularul după succes
    setText("");
    setDeadline("");
    setCategory("Personal");
  }

  // 4) UPDATE (modificare task în Firestore)
  async function toggleTask(task) {
    await updateDoc(doc(db, "tasks", task.id), {
      status: task.status === "completed" ? "pending" : "completed",
    });
  }

  // 5) DELETE (ștergere task din Firestore)
  async function removeTask(task) {
    await deleteDoc(doc(db, "tasks", task.id));
  }

  // 6) Derivări în UI: filtrare + sortare
  const visibleTasks = useMemo(() => {
    let arr = [...tasks];

    if (filter !== "all") arr = arr.filter((t) => t.status === filter);

    // baza: ordinea manuală (order)
    arr.sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));

    // dacă e manual, rămânem doar pe order (drag&drop)
    if (sort === "manual") return arr;

    // altfel, aplicăm sortările cerute
    if (sort === "createdAt") {
      arr.sort(
        (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
      );
    } else if (sort === "deadline") {
      arr.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    }

    return arr;
  }, [tasks, filter, sort]);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const doneCount = tasks.filter((t) => t.status === "completed").length;

  // Emoji pentru categorie (doar pentru UI)
  function catEmoji(cat) {
    return CATEGORIES.find((c) => c.name === cat)?.emoji ?? "💗";
  }

  // onDragEnd: gestionarea finalizării unei operațiuni de drag-and-drop
  async function onDragEnd(result) {
    // 🔒 Drag & drop permis DOAR în modul Manual
    if (sort !== "manual") return;

    // dacă nu există destinație (ex: ai eliberat în afara listei)
    if (!result.destination) {
      const draggedTask = visibleTasks[result.source.index];
      if (draggedTask) {
        setDragErrorTaskId(draggedTask.id);
        setTimeout(() => setDragErrorTaskId(null), 10000);
      }
      return;
    }

    setDragErrorTaskId(null);

    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    // Lucrăm pe lista vizibilă (cea afișată)
    const newArr = [...visibleTasks];
    const [moved] = newArr.splice(from, 1);
    newArr.splice(to, 0, moved);

    // Rescriem order pentru toate din newArr (1..n)
    const batch = writeBatch(db);
    newArr.forEach((t, idx) => {
      batch.update(doc(db, "tasks", t.id), { order: idx + 1 });
    });
    await batch.commit();
  }
//Metoda prin care se creaza un cont nou: user + parola
  async function signup(e) {
    e.preventDefault();
    setAuthError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err.message);
    }
  }
 //Metoda prin care se face login cu user + parola
  async function login(e) {
    e.preventDefault();
    setAuthError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail("");
      setPassword("");
    } catch (err) {
      setAuthError(err.message);
    }
  }
  // Metoda prin care se face logout
  async function logout() {
    await signOut(auth);
  }

  return (
    <div className="min-h-screen bg-pink-50">
      <div className="app-container">
        <div className="app-card">
          {/* Header */}
          <header className="app-header">
            <div>
              <h1 className="app-title">💖 Lista Renatei</h1>
              <p className="text-sm text-pink-600">
              Bifează task-urile zilnice ca să fii organizată ✨
              </p>
            </div>

            <div className="text-right">
              <div className="category-form-label">Pending</div>
              <div className="font-bold text-rose-700">{pendingCount}</div>
              <div className="category-form-label">Done</div>
              <div className="font-bold text-rose-700">{doneCount}</div>
            </div>
          </header>

          {/* Form (DESKTOP grid din CSS: task-form) */}
          
          <form onSubmit={addTask} className="task-form">
  {/* CARD 1: Task + Deadline */}
  <div className="container-tasks-deadline-category">
  <div>
        <label className="form-label-custom">✍️ Task (max {MAX_LEN})</label>

        <input
          className="task-input"
          placeholder="Ex: cumpăr luciu de buze 💄"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

<div className="row-between">
          <span className="task-counter">
            {text.trim().length}/{MAX_LEN}
          </span>

        </div>
        </div>
   <div className="category-dropdown">
        <label className="form-label-custom">🎀 Categorie</label>
        <select
          className="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
        </div>

        <div className="create-task-card">
        <label className="form-label-custom">📅 Deadline</label>
        <input
          type="date"
          className="deadline-input"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

        
        
      
    </div>
    <div className="create-task-card-button-component">
        <button className="create-task-btn" type="submit">
          ➕ Add task
        </button>
        {error && <span className="error-message">{error}</span>}
      </div>

</form>
          {/* Controls */}
          <div className="rounded-3xl bg-white shadow-sm border border-pink-100 p-4 flex items-center justify-between gap-4">
            <div className="flex gap-2 items-center">
              <span className="text-sm font-semibold text-rose-700">Filter:</span>
              <select
                className=".filter-button"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-sm font-semibold text-rose-700">Sort:</span>
              <select
                className="task-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="manual">Manual (drag & drop)</option>
                <option value="createdAt">Creation date</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>
          </div>

          {/* List with Drag & Drop */}
          {visibleTasks.length === 0 ? (
            <div className="text-center text-rose-400 py-10">
              🎀 No tasks yet. Add one above!
            </div>
          ) : (
            <div className="task-list">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="tasks">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                      {visibleTasks.map((t, index) => {
                        const done = t.status === "completed";

                        return (
                          <Draggable key={t.id} draggableId={t.id} index={index}>
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                className={`${done ? "opacity-70" : ""}`}
                              >
                                <div className={`task-card ${done ? "task-done" : ""}`}>
                                  {/* Drag handle */}
                                  <div
                                    {...prov.dragHandleProps}
                                    className="rounded-xl border border-pink-200 px-4 py-3 text-rose-700 select-none cursor-grab active:cursor-grabbing"
                                    title="Drag to reorder"
                                  >
                                    ⠿
                                  </div>

                                  {/* (îl lași așa momentan) mesajul e în card */}
                                  {dragErrorTaskId === t.id && (
                                    <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2">
                                      ⚠️ Plasează task-ul în interiorul listei
                                    </div>
                                  )}

                                  <button
                                    onClick={() => toggleTask(t)}
                                    className="flex-1 text-left"
                                    title="Click to toggle completed"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{catEmoji(t.category)}</span>
                                      <span className="font-semibold text-rose-800">
                                        {t.text}
                                      </span>
                                      <span className="text-xs px-2 py-0.5 rounded-full border border-pink-200 text-rose-600">
                                        {t.category || "Personal"}
                                      </span>
                                    </div>

                                    <div className="text-xs text-rose-400 mt-1">
                                      {t.deadline ? `📅 ${t.deadline}` : "📅 no deadline"} •{" "}
                                      {done ? "✅ completed" : "⏳ pending"}
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleTask(t)}
                                      className="task-btn"
                                      type="button"
                                    >
                                      {done ? "Undo" : "Done"}
                                    </button>

                                    <button
                                      onClick={() => removeTask(t)}
                                      className="task-btn"
                                      type="button"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}

          <p className="text-xs text-rose-400 text-center pt-4">
            Tip: Click pe task ca să îl marchezi ✅ / ⏳
          </p>
        </div>
      </div>
    </div>
  );
}