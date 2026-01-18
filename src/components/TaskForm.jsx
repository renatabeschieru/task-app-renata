import React from "react";

const MAX_LEN = 100;
const CATEGORIES = [
  { name: "Work", emoji: "💼" },
  { name: "School", emoji: "🏫" },
  { name: "Personal", emoji: "💗" },
  { name: "Shopping", emoji: "🛍️" },
  { name: "Home things", emoji: "🏠" },
];

export { MAX_LEN, CATEGORIES };

export default function TaskForm({
  text,
  setText,
  deadline,
  setDeadline,
  category,
  setCategory,
  error,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="task-form">
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
  );
}
