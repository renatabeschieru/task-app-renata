import React from "react";

export default function Header({ pendingCount, doneCount, onLogout, user}) {
  console.log("Current user:", user);
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">💖 Lista {user.email}
       </h1>
        <p className="text-sm text-pink-600">
          Bifează task-urile zilnice ✨
        </p>
      </div>
{/*//Trimiți valorile calculate (pendingCount, doneCount) către componenta Header și le afișezi aici.*/}
      <div className="text-right">
        <div className="category-form-label">Pending</div>
        <div className="font-bold text-rose-700">{pendingCount}</div> 
        <div className="category-form-label">Done</div>
        <div className="font-bold text-rose-700">{doneCount}</div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="mt-2 task-btn text-sm text-rose-700"
            type="button"
          >
            🚪 Logout
          </button>
        )}
      </div>
    </header>
  );
}
