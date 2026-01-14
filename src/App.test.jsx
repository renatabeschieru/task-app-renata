import React from "react";
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// Mock la firebase ca să nu lovim baza de date în test
vi.mock("./firebase", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn((q, onNext) => {
    // returnăm o funcție "unsubscribe"
    onNext({ docs: [] });
    return () => {};
  }),
}));

test("afișează header-ul aplicației", () => {
  render(<App />);
  expect(screen.getByText(/Lista Renatei/i)).toBeInTheDocument();
});

test("afișează mesajul când nu există task-uri", () => {
  render(<App />);
  expect(screen.getByText(/No tasks yet/i)).toBeInTheDocument();
});