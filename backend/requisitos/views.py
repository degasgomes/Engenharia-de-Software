from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from contas.permissions import EDaEquipa, EGestor

from . import services
from .models import TransicaoStoryInvalida, UserStory
from .serializers import (
    CriterioSerializer,
    EstadoSerializer,
    MoverSerializer,
    UserStorySerializer,
)


class UserStoryViewSet(viewsets.ModelViewSet):
    """Product Backlog: as User Stories pela ordem que o Gestor de Produto definiu."""

    serializer_class = UserStorySerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        stories = UserStory.objects.select_related(
            "pedido", "sprint", "responsavel"
        ).prefetch_related("criterios")
        if pedido := self.request.query_params.get("pedido"):
            stories = stories.filter(pedido_id=pedido)
        return stories

    def get_permissions(self):
        # Toda a equipa vê o backlog e move as stories no quadro; só os Gestores as alteram.
        if self.action in ("list", "retrieve", "estado"):
            return [EDaEquipa()]
        return [EGestor()]

    def _resposta(self, story, codigo=status.HTTP_200_OK):
        return Response(self.get_serializer(self.get_queryset().get(pk=story.pk)).data, codigo)

    def perform_create(self, serializer):
        serializer.save(ordem_backlog=services.proxima_ordem())

    @action(detail=True, methods=["post"])
    def criterios(self, request, pk=None):
        story = self.get_object()
        dados = CriterioSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        dados.save(user_story=story)
        return self._resposta(story, status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"criterios/(?P<criterio_id>\d+)")
    def retirar_criterio(self, request, pk=None, criterio_id=None):
        story = self.get_object()
        get_object_or_404(story.criterios, pk=criterio_id).delete()
        return self._resposta(story)

    @action(detail=True, methods=["post"])
    def estado(self, request, pk=None):
        story = self.get_object()
        dados = EstadoSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        try:
            services.mudar_estado(story, dados.validated_data["estado"])
        except TransicaoStoryInvalida as erro:
            raise ValidationError({"detail": str(erro)}) from erro
        return self._resposta(story)

    @action(detail=True, methods=["post"])
    def mover(self, request, pk=None):
        story = self.get_object()
        dados = MoverSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        services.mover_no_backlog(story, dados.validated_data["direcao"])
        return self._resposta(story)
