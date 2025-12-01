"""
URL configuration for Ground Truth app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from . import views

router = DefaultRouter()
router.register(r"", views.DocumentViewSet, basename="document")

# Nested router for comments under documents
documents_router = nested_routers.NestedDefaultRouter(router, r"", lookup="document")
documents_router.register(r"comments", views.DocumentCommentViewSet, basename="document-comments")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(documents_router.urls)),
]
