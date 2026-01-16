"""
Views for Ground Truth app.
"""
from django.conf import settings  # Import settings for AWS URL construction
from django_filters import rest_framework as filters
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.audit.services import get_object_history, log_action

from .models import Document, DocumentComment, GTVersion
from .serializers import (
    DocumentBulkImportSerializer,
    DocumentCommentSerializer,
    DocumentCreateSerializer,
    DocumentDetailSerializer,
    DocumentSerializer,
    GTVersionCreateSerializer,
    GTVersionListSerializer,
    GTVersionSerializer,
    VersionDiffSerializer,
)
from .services import approve_gt_version, compute_gt_diff, submit_for_review


class DocumentFilter(filters.FilterSet):
    """
    Filter for documents.
    """
    project = filters.NumberFilter(field_name="project_id")
    status = filters.ChoiceFilter(choices=Document.Status.choices)
    file_type = filters.ChoiceFilter(choices=Document.FileType.choices)
    created_after = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    
    class Meta:
        model = Document
        fields = ["project", "status", "file_type"]


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document CRUD operations.
    """
    queryset = Document.objects.select_related(
        "project", "created_by", "current_gt_version"
    ).prefetch_related("versions")
    filterset_class = DocumentFilter
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at", "status"]
    ordering = ["-created_at"]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == "create":
            return DocumentCreateSerializer
        if self.action == "retrieve":
            return DocumentDetailSerializer
        return DocumentSerializer
    
    # --- MODIFIED CREATE METHOD ---
    def create(self, request, *args, **kwargs):
        """
        Overridden to handle 's3_key' from direct client uploads.
        """
        # Check if this is a Direct S3 Upload confirmation
        if "s3_key" in request.data:
            return self.create_from_s3(request)
            
        # Standard flow (fallback)
        return super().create(request, *args, **kwargs)

    def create_from_s3(self, request):
        """
        Custom handler for creating documents after S3 direct upload.
        """
        data = request.data
        project_id = data.get("project_id")
        s3_key = data.get("s3_key")
        name = data.get("name")
        file_size = data.get("file_size", 0)
        file_type = data.get("file_type", "application/pdf")

        if not project_id or not s3_key:
            return Response(
                {"detail": "project_id and s3_key are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create the document instance
        document = Document(
            project_id=project_id,
            name=name,
            file_size=file_size,
            file_type=file_type,
            created_by=request.user,
            updated_by=request.user,
            status=Document.Status.UPLOADED,
        )

        # --- THE FIX ---
        # We manually assign the S3 path to the 'source_file' field.
        # This tells Django: "The file is already at this path in the storage."
        document.source_file.name = s3_key 
        
        # Save to DB
        document.save()

        # Log the action
        log_action(document, "create", new_value={"name": document.name, "s3_key": s3_key})

        # Return the standard serialized data
        # Now the serializer will see 'source_file' is set and generate the correct S3 URL
        serializer = DocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    # ------------------------------

    def perform_create(self, serializer):
        document = serializer.save()
        log_action(document, "create", new_value={"name": document.name})
    
    def perform_update(self, serializer):
        old_data = DocumentSerializer(self.get_object()).data
        document = serializer.save(updated_by=self.request.user)
        log_action(document, "update", old_value=old_data)
    
    @action(detail=True, methods=["post"], url_path="upload-source")
    def upload_source(self, request, pk=None):
        """
        Upload source file for a document.
        """
        document = self.get_object()
        
        if "file" not in request.FILES:
            return Response(
                {"detail": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        file = request.FILES["file"]
        document.source_file = file
        document.file_size = file.size
        document.updated_by = request.user
        document.save()
        
        log_action(document, "update", change_summary="Uploaded source file")
        
        return Response(DocumentSerializer(document).data)
    
    @action(detail=True, methods=["get", "post"])
    def versions(self, request, pk=None):
        """
        List or create GT versions.
        """
        document = self.get_object()
        
        if request.method == "GET":
            versions = document.versions.all()
            serializer = GTVersionListSerializer(versions, many=True)
            return Response(serializer.data)
        
        # POST - create new version
        serializer = GTVersionCreateSerializer(
            data=request.data,
            context={"request": request, "document": document},
        )
        serializer.is_valid(raise_exception=True)
        version = serializer.save()
        
        log_action(
            version,
            "create",
            new_value={"version_number": version.version_number},
            change_summary=f"Created version {version.version_number}",
        )
        
        return Response(
            GTVersionSerializer(version).data,
            status=status.HTTP_201_CREATED,
        )
    
    @action(detail=True, methods=["get"], url_path="versions/(?P<version_id>[^/.]+)")
    def version_detail(self, request, pk=None, version_id=None):
        """
        Get specific version details.
        """
        document = self.get_object()
        try:
            version = document.versions.get(id=version_id)
            return Response(GTVersionSerializer(version).data)
        except GTVersion.DoesNotExist:
            return Response(
                {"detail": "Version not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
    
    @action(detail=True, methods=["get"], url_path="versions/diff")
    def version_diff(self, request, pk=None):
        """
        Get diff between two versions.
        Query params: v1, v2 (version numbers or IDs)
        """
        document = self.get_object()
        
        v1_param = request.query_params.get("v1")
        v2_param = request.query_params.get("v2")
        
        if not v1_param or not v2_param:
            return Response(
                {"detail": "Both v1 and v2 parameters required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        try:
            # Try as version number first, then as ID
            try:
                v1 = document.versions.get(version_number=int(v1_param))
            except (ValueError, GTVersion.DoesNotExist):
                v1 = document.versions.get(id=v1_param)
            
            try:
                v2 = document.versions.get(version_number=int(v2_param))
            except (ValueError, GTVersion.DoesNotExist):
                v2 = document.versions.get(id=v2_param)
        except GTVersion.DoesNotExist:
            return Response(
                {"detail": "Version not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        
        diff = compute_gt_diff(v1.gt_data, v2.gt_data)
        
        return Response({
            "version1": GTVersionSerializer(v1).data,
            "version2": GTVersionSerializer(v2).data,
            "diff": diff,
        })
    
    @action(detail=True, methods=["post"], url_path="submit-for-review")
    def submit_review(self, request, pk=None):
        """
        Submit document for review.
        """
        document = self.get_object()
        
        if not document.latest_version:
            return Response(
                {"detail": "Document has no GT versions"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        document = submit_for_review(document, request.user)
        return Response(DocumentSerializer(document).data)
    
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Approve document's latest GT version.
        """
        document = self.get_object()
        version_id = request.data.get("version_id")
        
        if version_id:
            try:
                version = document.versions.get(id=version_id)
            except GTVersion.DoesNotExist:
                return Response(
                    {"detail": "Version not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            version = document.latest_version
            if not version:
                return Response(
                    {"detail": "Document has no GT versions"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        version = approve_gt_version(version, request.user)
        return Response(GTVersionSerializer(version).data)
    
    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        """
        Get audit history for document.
        """
        document = self.get_object()
        history = get_object_history(document)
        
        from apps.audit.models import AuditLog
        from rest_framework import serializers as drf_serializers
        
        class AuditSerializer(drf_serializers.ModelSerializer):
            user = drf_serializers.StringRelatedField()
            
            class Meta:
                model = AuditLog
                fields = ["id", "user", "action", "change_summary", "timestamp"]
        
        return Response(AuditSerializer(history, many=True).data)
    
    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        """
        Bulk import documents with GT data.
        """
        serializer = DocumentBulkImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        project_id = request.data.get("project_id")
        if not project_id:
            return Response(
                {"detail": "project_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        created_docs = []
        for doc_data in serializer.validated_data["documents"]:
            doc = Document.objects.create(
                project_id=project_id,
                name=doc_data.get("name", "Untitled"),
                metadata=doc_data.get("metadata", {}),
                created_by=request.user,
            )
            
            if "gt_data" in doc_data:
                GTVersion.objects.create(
                    document=doc,
                    gt_data=doc_data["gt_data"],
                    created_by=request.user,
                    source_type="bulk_import",
                )
            
            created_docs.append(doc)
        
        return Response(
            {"created": len(created_docs)},
            status=status.HTTP_201_CREATED,
        )


class DocumentCommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for document comments.
    """
    serializer_class = DocumentCommentSerializer
    
    def get_queryset(self):
        document_id = self.kwargs.get("document_pk")
        return DocumentComment.objects.filter(
            document_id=document_id
        ).select_related("created_by")
    
    def perform_create(self, serializer):
        document_id = self.kwargs.get("document_pk")
        serializer.save(
            document_id=document_id,
            created_by=self.request.user,
        )
    
    @action(detail=True, methods=["post"])
    def resolve(self, request, document_pk=None, pk=None):
        """
        Mark comment as resolved.
        """
        comment = self.get_object()
        comment.is_resolved = True
        comment.save()
        return Response(DocumentCommentSerializer(comment).data)
