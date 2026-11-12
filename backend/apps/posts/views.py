from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from apps.users.models import Follow
from apps.users.serializers import UserSerializer

from .models import Comment, Like, Post
from .serializers import (
    CommentCreateSerializer,
    CommentSerializer,
    LikeSerializer,
    PostCreateSerializer,
    PostSerializer,
)

User = get_user_model()


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsOwnerOrReadOnly(IsAuthenticated):
    """Write access only for the object owner; read access for any authenticated user."""

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        from rest_framework.permissions import SAFE_METHODS
        if request.method in SAFE_METHODS:
            return True
        owner = getattr(obj, 'owner', None) or getattr(obj, 'user', None)
        return owner == request.user


class PostViewSet(viewsets.ModelViewSet):
    """ViewSet for posts: feed, create, retrieve, delete, like, unlike, comments."""

    pagination_class = StandardPagination
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.action == 'list':
            # Feed: own posts + posts from followed users
            following_ids = Follow.objects.filter(
                follower=self.request.user
            ).values_list('following_id', flat=True)
            return (
                Post.objects.filter(
                    Q(owner_id__in=following_ids) | Q(owner=self.request.user)
                )
                .select_related('owner')
                .prefetch_related('likes', 'comments')
                .order_by('-created_at')
            )
        return Post.objects.all().select_related('owner').prefetch_related('likes', 'comments')

    def get_serializer_class(self):
        if self.action == 'create':
            return PostCreateSerializer
        return PostSerializer

    def get_permissions(self):
        if self.action in {'update', 'partial_update', 'destroy'}:
            return [IsOwnerOrReadOnly()]
        return [IsAuthenticated()]

    def get_serializer_context(self) -> dict[str, Any]:
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer) -> None:
        serializer.save(owner=self.request.user)

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full post data after creation
        post = serializer.instance
        output = PostSerializer(post, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='like')
    def like(self, request: Request, pk: str = None) -> Response:
        """Like a post."""
        post = get_object_or_404(Post, pk=pk)
        like, created = Like.objects.get_or_create(post=post, user=request.user)
        if not created:
            return Response({'detail': 'You already liked this post.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = LikeSerializer(like)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='unlike')
    def unlike(self, request: Request, pk: str = None) -> Response:
        """Unlike a post."""
        post = get_object_or_404(Post, pk=pk)
        deleted_count, _ = Like.objects.filter(post=post, user=request.user).delete()
        if deleted_count == 0:
            return Response({'detail': 'You have not liked this post.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path='likes')
    def likes(self, request: Request, pk: str = None) -> Response:
        """List users who liked a post."""
        post = get_object_or_404(Post, pk=pk)
        liked_users = User.objects.filter(likes__post=post)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(liked_users, request)
        serializer = UserSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request: Request, pk: str = None) -> Response:
        """List comments on a post (GET) or add a comment (POST)."""
        post = get_object_or_404(Post, pk=pk)

        if request.method == 'GET':
            top_level = Comment.objects.filter(post=post, parent__isnull=True).select_related('user')
            paginator = StandardPagination()
            page = paginator.paginate_queryset(top_level, request)
            serializer = CommentSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        # POST: create comment
        serializer = CommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(post=post, user=request.user)
        output = CommentSerializer(comment, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)


class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for comments — supports destroy with IsOwnerOrReadOnly."""

    http_method_names = ['delete', 'head', 'options']
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        post = get_object_or_404(Post, pk=self.kwargs['post_pk'])
        return Comment.objects.filter(post=post).select_related('user', 'post')

    def get_serializer_class(self):
        return CommentSerializer

    def get_permissions(self):
        return [IsOwnerOrReadOnly()]


class UserPostsView(generics.ListAPIView):
    """List all posts for a given user. GET /api/users/{user_id}/posts/"""

    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination

    def get_queryset(self):
        user = get_object_or_404(User, pk=self.kwargs['user_id'])
        return (
            Post.objects.filter(owner=user)
            .select_related('owner')
            .prefetch_related('likes', 'comments')
            .order_by('-created_at')
        )

    def get_serializer_context(self) -> dict[str, Any]:
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
