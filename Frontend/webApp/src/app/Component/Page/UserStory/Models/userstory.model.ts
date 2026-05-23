

export enum UserStoryStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Review',
  TESTING = 'Testing',
  DONE = 'Done'
}
export type UserStoryStateValue = UserStoryStatus | number;
export interface  UserStoryDto {
  name: string;
  id: string;
  title: string;
  description: string;

  estimatedDuration?: number;
  userStoryState?: number;
  priority?: number;
  acceptanceCriteria: string;
  storyPoints: number;

  status?: UserStoryStateValue;
  sprintId: string;
  assignedToId?: string;
  assignedToName?: string;
  taskCount: number;
  completedTaskCount: number;
  createdAt: Date;
  updatedAt?: Date;
}
export interface User{
  id: string;
  name: string;
  email: string;
  role:string;
}
export interface UserStoryDetailDto 
  {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority: number;
  status?: UserStoryStateValue;
  sprintId: string;
  assignedToId?: string;
  assignedToName?: string;
  tasks: TaskDto[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateUserStoryRequest {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  estimatedDuration: number;
  userStoryState: number;
  projectId: number;
  sprintId: number;
  title?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority?: number;
  status?: UserStoryStateValue;
  assignedToId?: string;
}
export interface UpdateUserStoryRequest {
  id: number;
  name: string;
  description: string;
  

  estimatedDuration: number;
  userStoryState: number;
  projectId: number;
  sprintId: number;
  title?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority?: number;

  status?: UserStoryStateValue;
  assignedToId?: string;
}
export interface UpdateUserStoryStatusRequest {
  status: UserStoryStateValue
}
export interface TaskDto {
    id: string;
  title: string;
  description: string;
  status: UserStoryStateValue;
  estimatedHours: number;
  actualHours: number;
  userStoryId: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: Date;
  updatedAt?: Date;
}
export interface CreateTaskRequest {
  title: string;
  description: string;
  estimatedHours: number;
  userStoryId: string;
  assignedToId?: string;
}
export interface UpdateTaskRequest {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  actualHours: number;
  assignedToId?: string;
}
export interface UpdateTaskStatusRequest {
  status: UserStoryStateValue
}