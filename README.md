# Task App – Web Application

## Overview
This project is a full-stack **Task Management Web Application** built with **React**, **Firebase**, and a custom **Node.js API**.  
Users can register, log in, and manage their own task list with persistent storage, filtering, sorting, and drag-and-drop reordering.

The application was developed as a **solo project** and follows modern web development best practices: component-based architecture, hooks, REST APIs, and documentation with Swagger (OpenAPI).

---

## Features

### ✅ Authentication
- User authentication using **Firebase Authentication**
- Email & password login / signup
- Each user can access **only their own tasks**

### ✅ Task Management (CRUD)
- Create tasks (text, category, deadline)
- Read tasks from a persistent data source (**Firestore**)
- Update task status (pending ↔ completed)
- Delete tasks

### ✅ Drag & Drop Reordering
- Tasks can be reordered using **drag and drop**
- Implemented with `@hello-pangea/dnd`
- Task order is persisted in Firestore using an `order` field

### ✅ Filtering & Sorting
- Filter tasks by:
  - All
  - Pending
  - Completed
- Sort tasks by:
  - Manual order (drag & drop)
  - Creation date
  - Deadline

### ✅ Responsive UI
- Styled using **Tailwind CSS**
- Mobile-friendly and responsive layout
- Clean, card-based design

---

## Technologies Used

### Frontend
- **React**
- React Hooks: `useState`, `useEffect`, `useMemo`
- **Tailwind CSS** for styling
- **Firebase Authentication**
- Drag & Drop library: `@hello-pangea/dnd`

### Backend
- **Node.js**
- **Express.js**
- **Firebase Admin SDK**
- REST API for task operations
- **Swagger (OpenAPI)** for API documentation

### Database
- **Firebase Firestore**
- Persistent storage of tasks
- Tasks are linked to users via `uid`

---

## Application Architecture

### Component Structure