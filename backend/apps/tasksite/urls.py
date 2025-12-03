from django.urls import path
from .views import TaskListCreateView, TaskRetrieveUpdateView, AllUsersListView

urlpatterns = [
    path('', TaskListCreateView.as_view(), name='task_list_create'),
    path('<int:task_id>/', TaskRetrieveUpdateView.as_view(), name='task_retrieve_update'),
    path('all-users/', AllUsersListView.as_view(), name='all_users_list'),
]
