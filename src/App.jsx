import React, { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";//Importăm conexiunea către Firestore (db) din firebase.js. 
import {
  addDoc,
  collection, //referință către o colecție (ex: "tasks")
  deleteDoc,
  doc,
  onSnapshot, //READ în timp real (subscribe / listener)
  query,
  serverTimestamp,
  updateDoc,
  writeBatch, //Când adaugi un task nou, îi dăm un order (număr)
} from "firebase/firestore";//importăm funcții Firestore pe care le folosim pentru CRUD
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// implement input validation to ensure no empty tasks or tasks exceeding a character limit (example: 100 characters)
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

/**
   * tasks = lista de task-uri citită din Firestore.
   * IMPORTANT: asta vine din baza de date, deci e persistent.
   */
  const [tasks, setTasks] = useState([]);

   // Filtrare și sortare (cerință)
  const [filter, setFilter] = useState("all"); // all | pending | completed
  const [sort, setSort] = useState("manual"); //  manual


  // 2) READ (citire din Firestore, în timp real)
  useEffect(() => {
    const q = query(collection(db, "tasks"));   //ascultare in timp real la colectia tasks 
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTasks(items);
      },
      (err) => {
        console.error(err);
        setError("Nu pot citi din Firebase. Verifică Firestore + rules.");
      }
    );
    return () => unsub();
  }, []);


  // 3) CREATE (adăugare task în Firestore)
  async function addTask(e) {
    e.preventDefault();
    const t = text.trim();

    if (!t) return setError("Task-ul nu poate fi gol 🥺");
    if (t.length > MAX_LEN) return setError(`Maxim ${MAX_LEN} caractere ✂️`);

    setError("");

    // Calculăm order pentru task-ul nou
    const maxOrder = tasks.reduce((m, t) => Math.max(m, t.order ?? 0), 0);

// Scriem în Firestore (persistență)
    await addDoc(collection(db, "tasks"), {
      text: t,
      status: "pending",
      category,
      deadline: deadline || "",
      createdAt: serverTimestamp(),
      order: maxOrder + 1,
    });

// Resetăm formularul după succes
    setText("");
    setDeadline("");
    setCategory("Personal");
  }
  // 4) UPDATE (modificare task în Firestore)
//când apeși pe task / butonul Done/Undo, schimbă statusul
  async function toggleTask(task) {
    await updateDoc(doc(db, "tasks", task.id), {
      status: task.status === "completed" ? "pending" : "completed",
    });
  }
//5) DELETE (ștergere task din Firestore)
  async function removeTask(task) {
    await deleteDoc(doc(db, "tasks", task.id));
  }
// onDragEnd: gestionarea finalizării unei operațiuni de drag-and-drop
  async function onDragEnd(result) {
     // 🔒 Drag & drop permis DOAR în modul Manual
      if (sort !== "manual") return;
       // dacă nu există destinație (ex: ai eliberat în afara listei)
       if (!result.destination) {
        const draggedTask = visibleTasks[result.source.index];
        // salvăm ID-ul lui
        setDragErrorTaskId(draggedTask.id);
        // ✅ ștergem mesajul automat după 10 secunde
      setTimeout(() => {
      setDragErrorTaskId(null);
  }, 10000);

  return;
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
//6) Derivări în UI: filtrare + sortare + numărători
//useMemo: optimizează: recalculăm lista vizibilă doar când se schimbă tasks/filter/sort
  const visibleTasks = useMemo(() => {
    let arr = [...tasks];

    if (filter !== "all") arr = arr.filter((t) => t.status === filter);
   
    arr.sort((a, b) => (a.order ?? 999999) - (b.order ?? 999999));

// IMPORTANT: dacă e manual, păstrăm ordinea de drag&drop și nu mai sortăm altfel
if (sort === "manual") return arr;

if (sort === "createdAt") {
  arr.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Header girlish */}
        <header className="rounded-3xl p-5 bg-white/80 backdrop-blur border border-pink-100 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-rose-600">
                💖 Lista Renatei
              </h1>
              <p className="text-sm text-rose-500/80">
                Nu uita sa iti bifezi task-urile!
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-rose-500">Pending</div>
              <div className="font-bold text-rose-700">{pendingCount}</div>
              <div className="text-xs text-rose-500 mt-1">Done</div>
              <div className="font-bold text-rose-700">{doneCount}</div>
            </div>
          </div>
        </header>

        {/* Form */}
        <form
          onSubmit={addTask}
          className="rounded-3xl bg-white shadow-sm border border-pink-100 p-4 sm:p-5 space-y-3"
        >
          <div>
            <label className="block text-sm font-semibold text-rose-700 mb-1">
              ✍️ Task (max {MAX_LEN})
            </label>
            <input
              className="w-full rounded-2xl border border-pink-200 px-4 py-3 outline-none focus:ring-2 focus:ring-pink-300"
              placeholder="Ex: cumpăr luciu de buze 💄"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-rose-400">
                {text.trim().length}/{MAX_LEN}
              </span>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-rose-700 mb-1">
                📅 Deadline
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-pink-200 px-4 py-3 outline-none focus:ring-2 focus:ring-pink-300"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-rose-700 mb-1">
                🎀 Categorie
              </label>
              <select
                className="w-full rounded-2xl border border-pink-200 px-4 py-3 outline-none focus:ring-2 focus:ring-pink-300"
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

            <div className="flex items-end">
  <button className="w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 shadow-sm">
    ➕ Add
  </button>
</div>
          </div>
        </form>

        {/* Controls */}
        <div className="rounded-3xl bg-white shadow-sm border border-pink-100 p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2 items-center">
            <span className="text-sm font-semibold text-rose-700">Filter:</span>
            <select
              className="rounded-2xl border border-pink-200 px-3 py-2"
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
              className="rounded-2xl border border-pink-200 px-3 py-2"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
{/* select-ul de Sort */}
              <option value="createdAt">Creation date</option>
              <option value="deadline">Deadline</option>
              <option value="manual">Manual (drag & drop)</option>
            </select>
          </div>
        </div>

          {/* List with Drag & Drop */}
{visibleTasks.length === 0 ? (
  <div className="text-center text-rose-400 py-10">
    🎀 No tasks yet. Add one above!
  </div>
) : (
  <DragDropContext onDragEnd={onDragEnd}>
    <Droppable droppableId="tasks">
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="space-y-3"
        >
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
                    <div className="rounded-3xl bg-white border border-pink-100 shadow-sm p-4 flex items-center justify-between gap-3">
  {/* Drag handle */}
  <div
    {...prov.dragHandleProps}
    className="rounded-xl border border-pink-200 px-4 py-3 text-rose-700 select-none cursor-grab active:cursor-grabbing"
    title="Drag to reorder"
  >
    ⠿
  </div>
  {dragErrorTaskId === t.id && (
  <div className="mt-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2">
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
                          <span
                            className={`font-semibold text-rose-800 ${
                              done ? "line-through text-rose-400" : ""
                            }`}
                          >
                            {t.text}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border border-pink-200 text-rose-600">
                            {t.category || "Personal"}
                          </span>
                        </div>

                        <div className="text-xs text-rose-400 mt-1">
                          {t.deadline
                            ? `📅 ${t.deadline}`
                            : "📅 no deadline"}{" "}
                          • {done ? "✅ completed" : "⏳ pending"}
                        </div>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTask(t)}
                          className="rounded-2xl border border-pink-200 px-3 py-2 text-rose-700"
                        >
                          {done ? "Undo" : "Done"}
                        </button>

                        <button
                          onClick={() => removeTask(t)}
                          className="rounded-2xl border border-rose-200 px-3 py-2 text-rose-700 hover:bg-rose-50"
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
)}
        {/* Footer tip */}

        <p className="text-xs text-rose-400 text-center pt-2">
          Tip: click pe task ca să îl marchezi ✅ / ⏳
        </p>
      </div>
    </div>
  );
}
