from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, RegisterView, UserMeView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('me/', UserMeView.as_view(), name='auth_me'),
]
