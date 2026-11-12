from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.posts.views import UserPostsView

from .views import UserViewSet

app_name = 'users'

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:user_id>/posts/', UserPostsView.as_view(), name='user-posts'),
]
