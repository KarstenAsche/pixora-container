import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap, map } from 'rxjs';
import { ApiService } from './api.service';
import { Post } from '../models/post.model';
import { Comment } from '../models/comment.model';

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PostService {
  private readonly api = inject(ApiService);

  private readonly postsSubject = new BehaviorSubject<Post[]>([]);
  readonly posts$ = this.postsSubject.asObservable();

  private readonly isLoadingSubject = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this.isLoadingSubject.asObservable();

  fetchFeed(page = 1): Observable<PaginatedResponse<Post>> {
    this.isLoadingSubject.next(true);
    return this.api
      .get<PaginatedResponse<Post>>('/posts/', { page })
      .pipe(
        tap((response) => {
          if (page === 1) {
            this.postsSubject.next(response.results);
          } else {
            this.postsSubject.next([
              ...this.postsSubject.getValue(),
              ...response.results,
            ]);
          }
          this.isLoadingSubject.next(false);
        })
      );
  }

  createPost(formData: FormData): Observable<Post> {
    return this.api.postFormData<Post>('/posts/', formData).pipe(
      tap((post) => {
        this.postsSubject.next([post, ...this.postsSubject.getValue()]);
      })
    );
  }

  getPostById(id: number): Observable<Post> {
    return this.api.get<Post>(`/posts/${id}/`);
  }

  deletePost(id: number): Observable<void> {
    return this.api.delete<void>(`/posts/${id}/`).pipe(
      tap(() => {
        const filtered = this.postsSubject
          .getValue()
          .filter((p) => p.id !== id);
        this.postsSubject.next(filtered);
      })
    );
  }

  likePost(postId: number): Observable<unknown> {
    return this.api.post<unknown>(`/posts/${postId}/like/`, {}).pipe(
      tap(() => {
        this.updatePostLike(postId, true);
      })
    );
  }

  unlikePost(postId: number): Observable<void> {
    return this.api.post<void>(`/posts/${postId}/unlike/`, {}).pipe(
      tap(() => {
        this.updatePostLike(postId, false);
      })
    );
  }

  addComment(postId: number, text: string): Observable<Comment> {
    return this.api.post<Comment>(`/posts/${postId}/comments/`, { text }).pipe(
      tap(() => {
        this.updatePostCommentCount(postId, 1);
      })
    );
  }

  deleteComment(commentId: number, postId: number): Observable<void> {
    return this.api.delete<void>(`/posts/${postId}/comments/${commentId}/`).pipe(
      tap(() => {
        this.updatePostCommentCount(postId, -1);
      })
    );
  }

  getComments(postId: number): Observable<Comment[]> {
    return this.api
      .get<PaginatedResponse<Comment>>(`/posts/${postId}/comments/`)
      .pipe(map((r) => r.results));
  }

  getUserPosts(userId: number): Observable<Post[]> {
    return this.api
      .get<PaginatedResponse<Post>>(`/users/${userId}/posts/`)
      .pipe(map((r) => r.results));
  }

  private updatePostLike(postId: number, liked: boolean): void {
    const posts = this.postsSubject.getValue().map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          isLikedByCurrentUser: liked,
          likeCount: liked ? p.likeCount + 1 : p.likeCount - 1,
        };
      }
      return p;
    });
    this.postsSubject.next(posts);
  }

  private updatePostCommentCount(postId: number, delta: number): void {
    const posts = this.postsSubject.getValue().map((p) => {
      if (p.id === postId) {
        return { ...p, commentCount: p.commentCount + delta };
      }
      return p;
    });
    this.postsSubject.next(posts);
  }
}
