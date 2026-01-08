from django.urls import path
from .views import SuggestTaskAIView

urlpatterns = [
    path('suggest-task/', SuggestTaskAIView.as_view(), name='suggest-task-ai'),
]