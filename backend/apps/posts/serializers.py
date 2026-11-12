from __future__ import annotations

import os
from typing import Any

from django.conf import settings
from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Comment, Like, Post


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for post comments, including nested user info."""

    user = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'post', 'user', 'text', 'parent', 'replies', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_replies(self, obj: Comment) -> list[dict[str, Any]]:
        if obj.parent is not None:
            return []
        replies = obj.replies.all().select_related('user')
        return CommentSerializer(replies, many=True, context=self.context).data


class CommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a comment."""

    class Meta:
        model = Comment
        fields = ['id', 'text', 'parent']
        read_only_fields = ['id']


class LikeSerializer(serializers.ModelSerializer):
    """Serializer for likes."""

    user = UserSerializer(read_only=True)

    class Meta:
        model = Like
        fields = ['id', 'post', 'user', 'created_at']
        read_only_fields = fields


class PostSerializer(serializers.ModelSerializer):
    """Read serializer for listing and retrieving posts."""

    owner = UserSerializer(read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    is_liked_by_current_user = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id',
            'owner',
            'image',
            'caption',
            'created_at',
            'updated_at',
            'like_count',
            'comment_count',
            'is_liked_by_current_user',
        ]
        read_only_fields = fields

    def get_is_liked_by_current_user(self, obj: Post) -> bool:
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated:
            return False
        return obj.likes.filter(user=request.user).exists()


class PostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a post with image validation."""

    image = serializers.ImageField(required=True, allow_null=False)

    class Meta:
        model = Post
        fields = ['id', 'image', 'caption']
        read_only_fields = ['id']

    def validate_image(self, value: Any) -> Any:
        ext = os.path.splitext(value.name)[1].lstrip('.').lower()
        if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
            raise serializers.ValidationError(
                f'Unsupported image format. Allowed formats: {", ".join(settings.ALLOWED_IMAGE_EXTENSIONS)}.'
            )
        if value.size > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f'Image size must not exceed {settings.MAX_IMAGE_SIZE_MB} MB.'
            )
        return value
