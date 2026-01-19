import React from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import TaskItem from "./TaskItem";

export default function TaskList({
  tasks,
  onDragEnd,
  onToggle,
  onRemove,
  dragErrorTaskId,
  sort,
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center text-rose-400 py-10">
        🎀 No tasks yet. Add one above!
      </div>
    );
  }

  return (
    <div className="task-list">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {tasks.map((task, index) => (
               <TaskItem
               key={task.id}
               task={task}
               index={index}
               onToggle={onToggle}
               onRemove={onRemove}
               dragErrorTaskId={dragErrorTaskId}
               sort={sort}
             />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
