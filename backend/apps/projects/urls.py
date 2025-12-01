"""
URL configuration for Projects app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from . import views

router = DefaultRouter()
router.register(r"", views.ProjectViewSet, basename="project")

# Nested router for labels under projects
projects_router = nested_routers.NestedDefaultRouter(router, r"", lookup="project")
projects_router.register(r"labels", views.LabelViewSet, basename="project-labels")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(projects_router.urls)),
]
