import React from "react";

export default function TaskFilters({ filter, setFilter, sort, setSort }) {
  return (
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
  );
}
