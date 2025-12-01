"""
URL configuration for Issues app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.IssueViewSet, basename="issue")

urlpatterns = [
    path("", include(router.urls)),
]
