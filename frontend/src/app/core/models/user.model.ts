export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  createdAt: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface UserProfile extends User {
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowedByCurrentUser: boolean;
}
