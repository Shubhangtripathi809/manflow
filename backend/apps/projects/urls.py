"""
URL configuration for Projects app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from . import views

# Standard Router for CRUD operations (List, Create, Retrieve, Update, Delete)
router = DefaultRouter()
router.register(r"", views.ProjectViewSet, basename="project")

# Nested router for labels under projects
projects_router = nested_routers.NestedDefaultRouter(router, r"", lookup="project")
projects_router.register(r"labels", views.LabelViewSet, basename="project-labels")

urlpatterns = [
    # --- Custom Endpoints (Moved from views.py @actions) ---
    
    # POST /projects/{pk}/get-upload-url/
    path(
        "<uuid:pk>/get-upload-url/", 
        views.ProjectViewSet.as_view({"post": "get_upload_url"}), 
        name="project-get-upload-url"
    ),
    path(
        "<uuid:pk>/confirm-upload/", 
        views.ProjectViewSet.as_view({"post": "confirm_upload"}), 
        name="project-confirm-upload"
    ),
    path(
        "<uuid:pk>/get-download-url/", 
        views.ProjectViewSet.as_view({"post": "get_download_url"}), 
        name="project-get-download-url"
    ),
    
    # GET /projects/{pk}/stats/
    path(
        "<uuid:pk>/stats/", 
        views.ProjectViewSet.as_view({"get": "stats"}), 
        name="project-stats"
    ),
    
    # GET /projects/{pk}/audit-log/
    path(
        "<uuid:pk>/audit-log/", 
        views.ProjectViewSet.as_view({"get": "audit_log"}), 
        name="project-audit-log"
    ),
    
    # POST /projects/{pk}/add-member/
    path(
        "<uuid:pk>/add-member/", 
        views.ProjectViewSet.as_view({"post": "add_member"}), 
        name="project-add-member"
    ),
    
    # DELETE /projects/{pk}/members/{user_id}/
    path(
        "<uuid:pk>/members/<int:user_id>/", 
        views.ProjectViewSet.as_view({"delete": "remove_member"}), 
        name="project-remove-member"
    ),

    # --- Standard Router URLs (CRUD) ---
    path("", include(router.urls)),
    path("", include(projects_router.urls)),
]