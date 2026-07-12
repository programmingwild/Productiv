export interface Task {
  id: string
  title: string
  description: string | null
  position: number
  priority: string
  dueDate: string | null
  assigneeId: string | null
  columnId: string
  assignee: { id: string; name: string | null; image: string | null } | null
  taskDependencies: { id: string; dependsOnTask: { id: string; title: string } }[]
  blockingDependents: { id: string; task: { id: string; title: string } }[]
}

export interface Column {
  id: string
  name: string
  position: number
  color: string
  tasks: Task[]
}

export interface BoardData {
  id: string
  name: string
  columns: Column[]
}

export interface Member {
  id: string
  name: string | null
  image: string | null
}
