export interface Like {
  id: number;
  post: number;
  user: number;
  createdAt: string;
}

export interface Follow {
  id: number;
  follower: number;
  following: number;
  createdAt: string;
}
