from django.urls import path
from .views import SuggestTaskAIView, RefineTaskTextView

urlpatterns = [
    path('suggest-task/', SuggestTaskAIView.as_view(), name='suggest-task-ai'),
    path('refine-text/', RefineTaskTextView.as_view(), name='refine-task-text'),
]