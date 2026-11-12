import { User } from './user.model';

export interface Post {
  id: number;
  owner: User;
  image: string;
  caption: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  isLikedByCurrentUser: boolean;
}
