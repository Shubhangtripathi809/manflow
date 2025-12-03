"""
URL configuration for Users app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import ChangeUserRoleView

from . import views

urlpatterns = [
    path("create-user/", views.UserCreateView.as_view(), name="create-user"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path("users/", views.UserListView.as_view(), name="user-list"),
    path('update-role/<int:user_id>/', ChangeUserRoleView.as_view(), name='update-user-role'),
]

