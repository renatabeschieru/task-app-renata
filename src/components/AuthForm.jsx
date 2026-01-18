import React from "react";

export default function AuthForm({ email, setEmail, password, setPassword, onLogin, onSignup, authError }) {
  return (
    <form className="flex flex-col gap-2" onSubmit={onLogin}>
      <input
        className="task-input"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
      />
      <input
        className="task-input"
        placeholder="Parolă"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
      />

      <div className="flex gap-2">
        <button className="task-btn" type="submit">
          Login
        </button>
        <button className="task-btn" type="button" onClick={onSignup}>
          Sign up
        </button>
      </div>

      {authError && <div className="text-xs text-red-600">{authError}</div>}
    </form>
  );
}
