"""
Testing app views - Phase 2 implementation.
"""
from rest_framework import viewsets

from .models import TestResult, TestRun
from .serializers import TestResultSerializer, TestRunSerializer


class TestRunViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TestRun - Phase 2 implementation.
    """
    queryset = TestRun.objects.all()
    serializer_class = TestRunSerializer


class TestResultViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TestResult - Phase 2 implementation.
    """
    queryset = TestResult.objects.all()
    serializer_class = TestResultSerializer
