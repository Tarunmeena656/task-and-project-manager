export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export const PROJECT_STATUSES: ProjectStatus[] = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];
export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  _count: { tasks: number };
}

export interface ProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
}

export interface TaskQuery {
  search?: string;
  status?: TaskStatus | '';
  priority?: TaskPriority | '';
  dueFrom?: string;
  dueTo?: string;
  sort: 'createdAt' | 'dueDate' | 'priority';
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Dashboard {
  projects: Project[];
  totalProjects: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
}
