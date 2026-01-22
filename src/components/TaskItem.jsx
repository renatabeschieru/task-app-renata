import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { CATEGORIES } from "./TaskForm";
//Import categoriile ca să poți afișa emoji-ul categoriei lângă text.


// Emoji pentru categorie, daca taskul are categorie ia emoji-ul; daca nu foloseste fallback 💗
// catEmoji primește un string cat (ex: "Work").
function catEmoji(cat) { 
  return CATEGORIES.find((c) => c.name === cat)?.emoji ?? "💗";
}

//componenta TaskItem care primeste props: task, index, onToggle, onRemove, dragErrorTaskId, sort
export default function TaskItem({
  task,
  index,
  onToggle,
  onRemove,
  dragErrorTaskId,
  sort,
}) {
  //variabila boolean care verifica daca statusul taskului este "completed"
  const done = task.status === "completed";

  return (
    <Draggable
    
  draggableId={task.id} //Draggable trebuie să primească un draggableId unic: task.id.
  index={index}         //index-ul taskului în lista.
  isDragDisabled={sort !== "manual"} //dezactivează drag dacă sort nu e "manual"
>
      {(prov) => (
        <div
          ref={prov.innerRef}
          {...prov.draggableProps}
          className={`${done ? "opacity-70" : ""}`}
        > 
        {/* dacă e done, îl faci semi-transparent */}
          <div className={`task-card ${done ? "task-done" : ""}`}>
            {/* Drag handle */}
            <div
              {...prov.dragHandleProps}
              className="rounded-xl border border-pink-200 px-4 py-3 text-rose-700 select-none cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              ⠿
            </div>

            {dragErrorTaskId === task.id && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-3 py-2">
                ⚠️ Plasează task-ul în interiorul listei
              </div>
            )}

            <button
              onClick={() => onToggle(task)}
              className="flex-1 text-left"
              title="Click to toggle completed"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{catEmoji(task.category)}</span>
                <span className="font-semibold text-rose-800">{task.text}</span>
                <span className="text-xs px-2 py-0.5 rounded-full border border-pink-200 text-green-700">
                  {task.category || "Personal"}
                </span>
              </div>

              <div className="text-xs text-rose-400 mt-1">
                {task.deadline ? `📅 ${task.deadline}` : "📅 no deadline"} •{" "}
                {done ? "✅ completed" : "⏳ pending"}
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggle(task)} //trimiți task-ul către funcția din App.jsx
                className="task-btn"
                type="button"
              >
                {done ? "Undo" : "Done"}
              </button>

              <button
                onClick={() => onRemove(task)}
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
}
