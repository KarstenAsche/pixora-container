import io
import os
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Like, Post

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def make_test_image(name: str = 'test.jpg') -> SimpleUploadedFile:
    """Create a minimal valid JPEG for upload tests."""
    img = Image.new('RGB', (100, 100), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/jpeg')


class PostCRUDTests(APITestCase):
    """Tests for creating, listing, retrieving and deleting posts."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='postuser', email='post@example.com', password='pass1234!'
        )
        tokens = get_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        self.list_url = reverse('posts:post-list')

    def tearDown(self):
        # Clean up any uploaded files
        for post in Post.objects.all():
            if post.image and os.path.isfile(post.image.path):
                os.remove(post.image.path)

    def test_create_post(self):
        image = make_test_image()
        response = self.client.post(
            self.list_url,
            {'image': image, 'caption': 'Hello world'},
            format='multipart',
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Post.objects.count(), 1)
        self.assertEqual(Post.objects.first().owner, self.user)

    def test_create_post_without_image_fails(self):
        response = self.client.post(self.list_url, {'caption': 'No image'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_feed_is_empty_when_not_following_anyone(self):
        # Create a post by another user — should not appear in feed
        other = User.objects.create_user(username='other', email='o@x.com', password='pass1234!')
        Post.objects.create(owner=other, image=make_test_image(), caption='Other post')
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_retrieve_post(self):
        post = Post.objects.create(owner=self.user, image=make_test_image(), caption='My post')
        url = reverse('posts:post-detail', kwargs={'pk': post.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], post.pk)

    def test_delete_own_post(self):
        post = Post.objects.create(owner=self.user, image=make_test_image(), caption='Delete me')
        url = reverse('posts:post-detail', kwargs={'pk': post.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Post.objects.filter(pk=post.pk).exists())

    def test_delete_other_users_post_is_forbidden(self):
        other = User.objects.create_user(username='other2', email='o2@x.com', password='pass1234!')
        post = Post.objects.create(owner=other, image=make_test_image(), caption='Not yours')
        url = reverse('posts:post-detail', kwargs={'pk': post.pk})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class LikeUnlikeTests(APITestCase):
    """Tests for like and unlike actions on posts."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='likeuser', email='like@example.com', password='pass1234!'
        )
        tokens = get_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        self.post = Post.objects.create(owner=self.user, image=make_test_image(), caption='Like me')

    def tearDown(self):
        if self.post.image and os.path.isfile(self.post.image.path):
            os.remove(self.post.image.path)

    def test_like_post(self):
        url = reverse('posts:post-like', kwargs={'pk': self.post.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Like.objects.filter(post=self.post, user=self.user).count(), 1)

    def test_like_post_twice_fails(self):
        Like.objects.create(post=self.post, user=self.user)
        url = reverse('posts:post-like', kwargs={'pk': self.post.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unlike_post(self):
        Like.objects.create(post=self.post, user=self.user)
        url = reverse('posts:post-unlike', kwargs={'pk': self.post.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Like.objects.filter(post=self.post, user=self.user).exists())

    def test_unlike_post_not_liked_fails(self):
        url = reverse('posts:post-unlike', kwargs={'pk': self.post.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
