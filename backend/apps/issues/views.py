"""
Issues app views - Phase 3 implementation.
"""
from rest_framework import viewsets

from .models import Issue, IssueAttachment, IssueComment, IssueLink
from .serializers import (
    IssueAttachmentSerializer,
    IssueCommentSerializer,
    IssueLinkSerializer,
    IssueSerializer,
)


class IssueViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Issue - Phase 3 implementation.
    """
    queryset = Issue.objects.all()
    serializer_class = IssueSerializer
