import { User } from './user.model';

export interface Comment {
  id: number;
  post: number;
  user: User;
  text: string;
  createdAt: string;
  updatedAt: string;
}
