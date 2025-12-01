"""
URL configuration for ZanFlow project.
"""
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    
    # API v1
    path("api/v1/", include([
        path("auth/", include("apps.users.urls")),
        path("projects/", include("apps.projects.urls")),
        path("documents/", include("apps.groundtruth.urls")),
        path("test-runs/", include("apps.testing.urls")),
        path("issues/", include("apps.issues.urls")),
    ])),
    
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
