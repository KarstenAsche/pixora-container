from __future__ import annotations

from django.conf import settings
from django.db import models


class Post(models.Model):
    """An image post by a user."""

    owner: models.ForeignKey = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts',
        verbose_name='Owner',
    )
    image: models.ImageField = models.ImageField(
        upload_to='posts/%Y/%m/%d/',
        blank=True,
        null=True,
        verbose_name='Image',
    )
    caption: models.TextField = models.TextField(
        max_length=2200,
        blank=True,
        default='',
        verbose_name='Caption',
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'Post by {self.owner.username} at {self.created_at:%Y-%m-%d}'

    @property
    def like_count(self) -> int:
        return self.likes.count()

    @property
    def comment_count(self) -> int:
        return self.comments.filter(parent__isnull=True).count()


class Like(models.Model):
    """A like on a post by a user."""

    post: models.ForeignKey = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name='Post',
    )
    user: models.ForeignKey = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='likes',
        verbose_name='User',
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Like'
        verbose_name_plural = 'Likes'
        unique_together = ('post', 'user')
        ordering = ['-created_at']

    def __str__(self) -> str:
        return f'{self.user.username} likes post {self.post_id}'


class Comment(models.Model):
    """A comment on a post, optionally a reply to another comment."""

    post: models.ForeignKey = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='Post',
    )
    user: models.ForeignKey = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='User',
    )
    text: models.TextField = models.TextField(
        max_length=2200,
        verbose_name='Text',
    )
    parent: models.ForeignKey = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name='Parent comment',
    )
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Comment'
        verbose_name_plural = 'Comments'
        ordering = ['created_at']

    def __str__(self) -> str:
        return f'Comment by {self.user.username} on post {self.post_id}'
