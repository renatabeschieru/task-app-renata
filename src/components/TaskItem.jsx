import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { CATEGORIES } from "./TaskForm";

// Emoji pentru categorie (doar pentru UI)
function catEmoji(cat) {
  return CATEGORIES.find((c) => c.name === cat)?.emoji ?? "💗";
}

export default function TaskItem({
  task,
  index,
  onToggle,
  onRemove,
  dragErrorTaskId,
  sort,
}) {
  const done = task.status === "completed";

  return (
    <Draggable
  draggableId={task.id}
  index={index}
  isDragDisabled={sort !== "manual"}
>
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
                <span className="text-xs px-2 py-0.5 rounded-full border border-pink-200 text-rose-600">
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
                onClick={() => onToggle(task)}
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
