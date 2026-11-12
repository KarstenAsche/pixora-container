from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import LogoutView, RegisterView, UsernameTokenObtainPairView

app_name = 'auth'

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', UsernameTokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
]
