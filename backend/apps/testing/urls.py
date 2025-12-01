"""
URL configuration for Testing app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.TestRunViewSet, basename="testrun")

urlpatterns = [
    path("", include(router.urls)),
]
