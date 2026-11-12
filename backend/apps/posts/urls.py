from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, PostViewSet, UserPostsView

app_name = 'posts'

router = DefaultRouter()
router.register(r'', PostViewSet, basename='post')

urlpatterns = [
    path('', include(router.urls)),
    path('<int:post_pk>/comments/<int:pk>/', CommentViewSet.as_view({'delete': 'destroy'}), name='comment-detail'),
]
