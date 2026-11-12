from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Follow
from .serializers import (
    FollowSerializer,
    UserProfileSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


class IsOwnerOrReadOnly(IsAuthenticated):
    """Allow read access to anyone authenticated; write access only to the object owner."""

    def has_object_permission(self, request: Request, view: Any, obj: Any) -> bool:
        from rest_framework.permissions import SAFE_METHODS
        if request.method in SAFE_METHODS:
            return True
        return obj == request.user


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for listing, retrieving, and updating users."""

    queryset = User.objects.all().order_by('-date_joined')
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def create(self, request, *args, **kwargs):
        return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserProfileSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        if self.action in ('update', 'partial_update'):
            return [IsOwnerOrReadOnly()]
        return [IsAuthenticated()]

    def get_serializer_context(self) -> dict[str, Any]:
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        instance = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated], url_path='me')
    def me(self, request: Request) -> Response:
        """Return or update the profile of the currently authenticated user."""
        if request.method == 'PATCH':
            serializer = UserUpdateSerializer(
                request.user, data=request.data, partial=True, context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(UserProfileSerializer(request.user, context={'request': request}).data)
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='search')
    def search(self, request: Request) -> Response:
        """Search users by username."""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([])
        users = User.objects.filter(username__icontains=query).exclude(pk=request.user.pk)[:20]
        serializer = UserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='follow')
    def follow(self, request: Request, pk: str = None) -> Response:
        """Follow a user."""
        target_user = get_object_or_404(User, pk=pk)
        if target_user == request.user:
            return Response(
                {'detail': 'You cannot follow yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        follow, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target_user,
        )
        if not created:
            return Response(
                {'detail': 'You are already following this user.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = FollowSerializer(follow)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated], url_path='unfollow')
    def unfollow(self, request: Request, pk: str = None) -> Response:
        """Unfollow a user."""
        target_user = get_object_or_404(User, pk=pk)
        deleted_count, _ = Follow.objects.filter(
            follower=request.user,
            following=target_user,
        ).delete()
        if deleted_count == 0:
            return Response(
                {'detail': 'You are not following this user.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='suggested')
    def suggested(self, request: Request) -> Response:
        """Return users that the current user is not yet following (excluding themselves)."""
        already_following = Follow.objects.filter(follower=request.user).values_list('following_id', flat=True)
        suggestions = (
            User.objects.exclude(pk=request.user.pk)
            .exclude(pk__in=already_following)
            .order_by('?')[:20]
        )
        serializer = UserSerializer(suggestions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='followers')
    def followers(self, request: Request, pk: str = None) -> Response:
        """List all followers of a given user."""
        target_user = get_object_or_404(User, pk=pk)
        follows = Follow.objects.filter(following=target_user).select_related('follower')
        follower_users = [f.follower for f in follows]
        serializer = UserSerializer(follower_users, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated], url_path='following')
    def following(self, request: Request, pk: str = None) -> Response:
        """List all users that a given user is following."""
        target_user = get_object_or_404(User, pk=pk)
        follows = Follow.objects.filter(follower=target_user).select_related('following')
        following_users = [f.following for f in follows]
        serializer = UserSerializer(following_users, many=True, context={'request': request})
        return Response(serializer.data)
