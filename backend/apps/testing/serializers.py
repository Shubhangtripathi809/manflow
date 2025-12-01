"""
Testing app serializers - Phase 2 implementation.
"""
from rest_framework import serializers

from .models import TestResult, TestRun


class TestRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestRun
        fields = "__all__"


class TestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = "__all__"
