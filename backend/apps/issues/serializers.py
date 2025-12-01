"""
Issues app serializers - Phase 3 implementation.
"""
from rest_framework import serializers

from .models import Issue, IssueAttachment, IssueComment, IssueLink


class IssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Issue
        fields = "__all__"


class IssueLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueLink
        fields = "__all__"


class IssueAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueAttachment
        fields = "__all__"


class IssueCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueComment
        fields = "__all__"
