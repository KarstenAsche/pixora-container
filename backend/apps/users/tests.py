from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class UserRegistrationTests(APITestCase):
    """Tests for user registration endpoint."""

    def setUp(self):
        self.register_url = reverse('auth:register')

    def test_register_with_valid_data(self):
        payload = {
            'username': 'testuser',
            'email': 'testuser@example.com',
            'password': 'StrongPass1!',
            'confirm_password': 'StrongPass1!',
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(User.objects.filter(username='testuser').exists())

    def test_register_with_mismatched_passwords(self):
        payload = {
            'username': 'testuser2',
            'email': 'testuser2@example.com',
            'password': 'StrongPass1!',
            'confirm_password': 'DifferentPass!',
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_with_short_password(self):
        payload = {
            'username': 'testuser3',
            'email': 'testuser3@example.com',
            'password': 'short',
            'confirm_password': 'short',
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_with_duplicate_username(self):
        User.objects.create_user(username='existing', email='existing@example.com', password='pass1234')
        payload = {
            'username': 'existing',
            'email': 'new@example.com',
            'password': 'StrongPass1!',
            'confirm_password': 'StrongPass1!',
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserProfileTests(APITestCase):
    """Tests for user profile endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='profileuser',
            email='profile@example.com',
            password='pass1234!',
        )
        tokens = get_tokens_for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {tokens["access"]}')
        self.me_url = reverse('users:user-me')

    def test_get_own_profile(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profileuser')

    def test_get_profile_unauthenticated(self):
        self.client.credentials()
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_users(self):
        User.objects.create_user(username='other', email='other@example.com', password='pass1234!')
        url = reverse('users:user-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_follow_user(self):
        other = User.objects.create_user(username='other2', email='other2@example.com', password='pass1234!')
        url = reverse('users:user-follow', kwargs={'pk': other.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_follow_self(self):
        url = reverse('users:user-follow', kwargs={'pk': self.user.pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
