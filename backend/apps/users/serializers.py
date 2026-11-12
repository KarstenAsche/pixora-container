from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Follow

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer for user data."""

    follower_count = serializers.IntegerField(read_only=True)
    following_count = serializers.IntegerField(read_only=True)
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'bio',
            'avatar',
            'follower_count',
            'following_count',
            'post_count',
            'created_at',
        ]
        read_only_fields = fields


class UserProfileSerializer(UserSerializer):
    """Serializer for a user profile, includes follow status for the requesting user."""

    is_followed_by_current_user = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['is_followed_by_current_user']

    def get_is_followed_by_current_user(self, obj: Any) -> bool:
        request = self.context.get('request')
        if request is None or not request.user.is_authenticated:
            return False
        return Follow.objects.filter(follower=request.user, following=obj).exists()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for registering a new user."""

    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, style={'input_type': 'password'}, label='Confirm password')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'confirm_password']

    def validate_password(self, value: str) -> str:
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long.')
        if value.isdigit():
            raise serializers.ValidationError('Password cannot be entirely numeric.')
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirmPassword': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data: dict[str, Any]) -> User:
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = ['bio', 'avatar', 'email']
        extra_kwargs = {
            'email': {'required': False},
            'bio': {'required': False},
            'avatar': {'required': False},
        }


class FollowSerializer(serializers.ModelSerializer):
    """Serializer for Follow relationships."""

    follower = UserSerializer(read_only=True)
    following = UserSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ['id', 'follower', 'following', 'created_at']
        read_only_fields = fields
