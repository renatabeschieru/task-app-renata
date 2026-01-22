import React, { useEffect, useMemo, useState } from "react";
import { auth } from "./firebase";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { apiGetTasks, apiCreateTask, apiToggleTask, apiDeleteTask } from "./api";
import { queueOfflineTask, getOfflineTasks, removeOfflineTask } from "./offlineDb";

// Import components
import AuthForm from "./components/AuthForm";
import Header from "./components/Header";
import TaskForm, { MAX_LEN } from "./components/TaskForm";
import TaskFilters from "./components/TaskFilters";
import TaskList from "./components/TaskList";

//memoria UI-ului (starea aplicației)
export default function App() {
  const [text, setText] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Personal");
  const [error, setError] = useState("");
  const [dragErrorTaskId, setDragErrorTaskId] = useState(null);
  const [user, setUser] = useState(null); //	user === null → nimeni nu e logat
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /**
   * tasks = lista de task-uri citită din Firestore.
   * IMPORTANT: asta vine din baza de date, deci e persistent.
   */
  const [tasks, setTasks] = useState([]);

  // Filtrare și sortare (optiunile UI-ului)
  const [filter, setFilter] = useState("all"); // all | pending | completed
  const [sort, setSort] = useState("manual"); // manual | createdAt | deadline

//Listener de online/offline
//actualizează isOnline AUTOMAT când se schimbă situația conexiunii
//[]: Rulează o singură dată la mount și adaugă event listeners
  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
    }
    function onOffline() {
      setIsOnline(false);
    }
  
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // READ 
  //Când se schimbă user (login/logout) sau se schimbă conexiunea, reîncarci lista cu apiGetTasks(user.uid)
  useEffect(() => {
   //setTasks([]) -> când nu exista utilizator autentificat, golim lista
    if (!user) {
      setTasks([]);
      return;
    }
  
    // dacă ești offline, NU încercăm să chemăm API
    if (!isOnline) return;
  
    async function loadTasks() {
      try {
        setError("");
  
        const data = await apiGetTasks(user.uid);
  
        if (!data.success) {
          setError(data.message || "Nu pot încărca task-urile din API.");
          setTasks([]);
          return;
        }
  
        setTasks(data.tasks || []);
      } catch (err) {
        console.error(err);
        setError("Nu pot încărca task-urile din API.");
        setTasks([]);
      }
    }
  
    loadTasks();
  }, [user, isOnline]);

  // Listener de autentificare, asculta schimbarile de autentificare din Firebase

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
  
    const maxOrder = tasks.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
  
    // ✅ OFFLINE: salvăm în IndexedDB + afișăm imediat
    if (!isOnline) {
      const localTask = {
        uid: user.uid,
        text: t,
        deadline: deadline || "",
        category,
        order: maxOrder + 1,
        status: "pending",
        createdAtClient: Date.now(),
      };

      // 1) Afișează imediat în UI (indiferent dacă IndexedDB reușește sau nu)
      setTasks((prev) => [
        ...prev,
        { ...localTask, id: `local-${localTask.createdAtClient}`, localOnly: true },
      ]);


      // 2) Încearcă să îl pui și în IndexedDB (pentru sincronizare ulterioară)
      try {
        await queueOfflineTask(localTask);
        setError("Ești offline. Task-ul a fost salvat local și se va sincroniza.");
      } catch (e) {
        console.error("IndexedDB queue error:", e);
        setError("Ești offline. Task-ul a fost adăugat în UI, dar NU am putut salva în IndexedDB.");
      }  

      setText("");
      setDeadline("");
      setCategory("Personal");
      // setError("Ești offline. Task-ul a fost salvat local și se va sincroniza.");

      // opțional: ca să-l vezi sigur
      setFilter("all");

      return;
    }
  
    // ✅ ONLINE: create prin API
    try {
      await apiCreateTask({
        text: t,
        category,
        deadline: deadline || "",
        order: maxOrder + 1,
        uid: user.uid,
      });
  
      const data = await apiGetTasks(user.uid);
      setTasks(data.tasks || []);
  
      setText("");
      setDeadline("");
      setCategory("Personal");
    } catch (err) {
      console.error(err);
      setError("Nu am putut crea task-ul.");
    }
  }

  // 4) UPDATE (toggle pending <-> completed)
  async function toggleTask(task) {
    try {
      if (!user) return;
  
      if (task.localOnly) {
        setError("Task-ul e local (offline). Se sincronizează când revii online.");
        return;
      }
     //trimit cererea catre backend
      await apiToggleTask(task.id, user.uid);
     //reîncarc lista
      const data = await apiGetTasks(user.uid);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error(err);
      setError("Nu am putut schimba statusul task-ului.");
    }
  }


  // 5) DELETE task
async function removeTask(task) {
  try {
    if (!user) return;

    // dacă task-ul e doar local (offline queue)
    if (task.localOnly) {
      setError("Task-ul e local (offline). Se sincronizează când revii online.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    // dacă ești offline, nu încercăm API
    if (!isOnline) {
      setError("Ești offline. Nu pot șterge acum. Reîncearcă după ce revii online.");
      setTimeout(() => setError(""), 4000);
      return;
    }

    await apiDeleteTask(task.id, user.uid);

    const data = await apiGetTasks(user.uid);
    setTasks(data.tasks || []);
  } catch (err) {
    console.error(err);
    setError("Nu am putut șterge task-ul.");
  }
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

  //tasks e lista completa de taskuri, fiecare task are un status
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const doneCount = tasks.filter((t) => t.status === "completed").length;

  // onDragEnd: gestionarea finalizării unei operațiuni de drag-and-drop
  async function onDragEnd(result) {
    if (sort !== "manual") return;
    if (!result.destination) return;
  
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
  
    const newArr = [...visibleTasks];
    const [moved] = newArr.splice(from, 1);
    newArr.splice(to, 0, moved);
  
    // update UI imediat
    setTasks((prev) => {
      const ids = newArr.map((x) => x.id);
      const map = new Map(prev.map((t) => [t.id, t]));
      return ids.map((id, idx) => ({ ...map.get(id), order: idx + 1 }));
    });
  
    // dacă e offline -> nu putem persista reorder
    if (!isOnline) {
      setError("Ești offline. Reordonarea nu se poate sincroniza acum.");
      return;
    }
  
    // persist în backend
    try {
      await fetch(`http://localhost:3000/api/tasks/reorder?uid=${encodeURIComponent(user.uid)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: newArr.map((x) => x.id) }),
      });
  
      // reload lista
      const data = await apiGetTasks(user.uid);
      if (data.success) setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
      setError("Nu am putut salva reordonarea.");
    }
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


  // Sincronizarea task-urilor offline cu backend-ul
  async function syncOfflineTasks(uid) {
    const offline = await getOfflineTasks();
  
    // nimic de sincronizat
    if (!offline || offline.length === 0) return;
  
    try {
      const res = await fetch(
        `http://localhost:3000/api/tasks/sync?uid=${encodeURIComponent(uid)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: offline.map((x) => ({
              text: x.text,
              deadline: x.deadline || "",
              category: x.category || "Personal",
              order: x.order,
              createdAtClient: x.createdAtClient,
            })),
          }),
        }
      );
  
      // dacă backend-ul răspunde cu 4xx/5xx
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Sync HTTP ${res.status}: ${txt}`);
      }
  
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Sync failed");
  
      // ✅ ștergem local din IndexedDB după succes
      for (const t of offline) {
        // IMPORTANT: trebuie să existe t.localId în offlineDb
        await removeOfflineTask(t.localId);
      }
  
      // ✅ reîncărcăm lista din API ca să vezi imediat task-urile reale din Firestore
      const refreshed = await apiGetTasks(uid);
      if (refreshed.success) setTasks(refreshed.tasks || []);
    } catch (e) {
      console.error("syncOfflineTasks error:", e);
      setError("Nu am putut sincroniza task-urile offline.");
    }
  }

// Sincronizare la revenirea online:  revii online → trimite coada
  useEffect(() => {
    if (isOnline && user) {
      syncOfflineTasks(user.uid);syncOfflineTasks
    }
  }, [isOnline, user]);

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

//min-h-screen (Tailwind) → aplicația ocupă toată înălțimea ecranului
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
            {/* Header afiseaza numarul de taskuri pending si numarul de task-uri completed + contine butonul Logout */}
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
             sort={sort}
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
