import React, { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { where } from "firebase/firestore";

// Import components
import AuthForm from "./components/AuthForm";
import Header from "./components/Header";
import TaskForm, { MAX_LEN } from "./components/TaskForm";
import TaskFilters from "./components/TaskFilters";
import TaskList from "./components/TaskList";

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
    ); // ascultare in timp real 

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

  // Metoda prin care se creaza un cont nou: user + parola
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

  // Metoda prin care se face login cu user + parola
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
      {/* Auth section */}
      {!user ? (
        <AuthForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onLogin={login}
          onSignup={signup}
          authError={authError}
        />
      ) : (
        <div className="app-container">
          <div className="app-card">
            {/* Header */}
            <Header pendingCount={pendingCount} doneCount={doneCount} onLogout={logout} user={user} />

            {/* Form */}
            <TaskForm
              text={text}
              setText={setText}
              deadline={deadline}
              setDeadline={setDeadline}
              category={category}
              setCategory={setCategory}
              error={error}
              onSubmit={addTask}
            />

            {/* Controls */}
            <TaskFilters filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} />

            {/* List with Drag & Drop */}
            <TaskList
              tasks={visibleTasks}
              onDragEnd={onDragEnd}
              onToggle={toggleTask}
              onRemove={removeTask}
              dragErrorTaskId={dragErrorTaskId}
            />

            <p className="text-xs text-rose-400 text-center pt-4">
              Tip: Click pe task ca să îl marchezi ✅ / ⏳
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
