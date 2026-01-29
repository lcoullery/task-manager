import { Droppable } from '@hello-pangea/dnd'
import { TaskCard } from './TaskCard'
import { QuickAdd } from './QuickAdd'

export function Column({ column, tasks, onTaskClick }) {
  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      <div className="flex items-center justify-between px-3 py-2 mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {column.name}
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[200px] p-2 rounded-lg transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-blue-50 dark:bg-blue-900/20'
                : 'bg-gray-100 dark:bg-gray-800/50'
            }`}
          >
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={() => onTaskClick(task)}
                />
              ))}
              {provided.placeholder}
            </div>
            <div className="mt-2">
              <QuickAdd columnId={column.id} />
            </div>
          </div>
        )}
      </Droppable>
    </div>
  )
}
