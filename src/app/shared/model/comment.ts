import { User } from './user.model';

export interface Comment {
  content: string;
  status: string;
  id: number;
  createdAt: string;
  updatedAt: string;
  user: User;
}
