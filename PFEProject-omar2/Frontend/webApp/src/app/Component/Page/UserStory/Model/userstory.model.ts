

export enum UserStoryStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Review',
  TESTING = 'Testing',
  DONE = 'Done'
}
export interface  UserStoryDto {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority: number;
  status: UserStoryStatus;
  sprintId: string;
  assignedToId?: string;
  assignedToName?: string;
  taskCount: number;
  completedTaskCount: number;
  createdAt: Date;
  updatedAt?: Date;
}
export interface UserStoryDetailDto 
  {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority: number;
  status: UserStoryStatus;
  sprintId: string;
  assignedToId?: string;
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
  sprintId: string;
  assignedToId?: string;
}
export interface UpdateUserStoryRequest {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  storyPoints: number;
  priority?: number;
  assignedToId?: string;
}
export interface UpdateUserStoryStatusRequest {
  status: UserStoryStatus
}
export interface TaskDto {
    id: string;
  title: string;
  description: string;
  status: UserStoryStatus;
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
  status: UserStoryStatus
}
