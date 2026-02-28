
export enum UserStoryStatus {
  PENDING = 0,
  TODO = 1,
  IN_PROGRESS = 2,
  DONE = 3,
  VALIDATED = 4
}
export interface  UserStoryDto {
  id: number;
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority: number;
  status: UserStoryStatus;
  sprintId: number;
  assignedToId?: number;
  assignedToName?: string;
  taskCount: number;
  completedTaskCount: number;
  createdAt: Date;
  updatedAt?: Date;
}
export interface UserStoryDetailDto 
  {
  id: number;
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority: number;
  status: UserStoryStatus;
  sprintId: number;
  assignedToId?: number;
  assignedToName?: string;
  tasks: TaskDto[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateUserStoryRequest {
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority: number;
  sprintId: number;
  assignedToId?: number;
}
export interface UpdateUserStoryRequest {
  id: number;
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority?: number;
  assignedToId?: number;
}
export interface UpdateUserStoryStatusRequest {
  status: UserStoryStatus
}
export interface TaskDto {
  id: number;
  title: string;
  description: string;
  status: UserStoryStatus;
  estimatedHours: number;
  actualHours: number;
  userStoryId: number;
  assignedToId?: number;
  assignedToName?: string;
  createdAt: Date;
  updatedAt?: Date;
}
export interface CreateTaskRequest {
  title: string;
  description: string;
  estimatedHours: number;
  userStoryId: number;
  assignedToId?: number;
}
export interface UpdateTaskRequest {
  id: number;
  title: string;
  description: string;
  estimatedHours: number;
  actualHours: number;
  assignedToId?: number;
}
export interface UpdateTaskStatusRequest {
  status: UserStoryStatus
}