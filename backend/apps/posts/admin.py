from django.contrib import admin

from .models import Comment, Like, Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'owner', 'caption_preview', 'like_count', 'comment_count', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('owner__username', 'caption')
    ordering = ('-created_at',)
    raw_id_fields = ('owner',)

    def caption_preview(self, obj: Post) -> str:
        return obj.caption[:60] + '...' if len(obj.caption) > 60 else obj.caption
    caption_preview.short_description = 'Caption'


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username',)
    ordering = ('-created_at',)
    raw_id_fields = ('user', 'post')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'text_preview', 'parent', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'text')
    ordering = ('-created_at',)
    raw_id_fields = ('user', 'post', 'parent')

    def text_preview(self, obj: Comment) -> str:
        return obj.text[:60] + '...' if len(obj.text) > 60 else obj.text
    text_preview.short_description = 'Text'
