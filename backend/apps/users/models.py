from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class User(AbstractUser):
    """Custom user model extending AbstractUser with profile fields."""

    email = models.EmailField(unique=True)
    bio: models.TextField = models.TextField(blank=True, default='')
    avatar: models.ImageField = models.ImageField(
        upload_to='avatars/',
        blank=True,
        null=True,
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self) -> str:
        return self.username

    @property
    def follower_count(self) -> int:
        """Number of users following this user."""
        return self.followers_set.count()

    @property
    def following_count(self) -> int:
        """Number of users this user is following."""
        return self.following_set.count()

    @property
    def post_count(self) -> int:
        """Number of posts by this user."""
        return self.posts.count()


class Follow(models.Model):
    """Represents a follow relationship between two users."""

    follower: models.ForeignKey = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='following_set',
        verbose_name='Follower',
    )
    following: models.ForeignKey = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='followers_set',
        verbose_name='Following',
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Follow'
        verbose_name_plural = 'Follows'
        unique_together = ('follower', 'following')
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.follower.username} -> {self.following.username}'

    def clean(self) -> None:
        """Prevent a user from following themselves."""
        if self.follower == self.following:
            raise ValidationError('A user cannot follow themselves.')

    def save(self, *args, **kwargs) -> None:
        self.clean()
        super().save(*args, **kwargs)
