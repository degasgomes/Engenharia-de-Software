from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from contas.permissions import EDaEquipa, EGestor
from requisitos.models import UserStory

from . import services
from .models import Sprint
from .serializers import EntradaNoSprintSerializer, SprintSerializer


class DefinitionOfReadyNaoCumprida(APIException):
    """Diagrama de Sequência 4: a validação é feita no servidor e responde 422."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_code = "definition_of_ready"


class SprintViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SprintSerializer
    pagination_class = None

    def get_queryset(self):
        stories = UserStory.objects.select_related(
            "pedido", "sprint", "responsavel"
        ).prefetch_related("criterios")
        return Sprint.objects.select_related("equipa").prefetch_related(
            Prefetch("user_stories", queryset=stories), "equipa__membros"
        )

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [EDaEquipa()]
        return [EGestor()]

    def _resposta(self, sprint, codigo=status.HTTP_200_OK):
        return Response(self.get_serializer(self.get_queryset().get(pk=sprint.pk)).data, codigo)

    def create(self, request, *args, **kwargs):
        dados = self.get_serializer(data=request.data)
        dados.is_valid(raise_exception=True)
        sprint = services.criar_sprint(**dados.validated_data)
        return self._resposta(sprint, status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="user-stories")
    def user_stories(self, request, pk=None):
        sprint = self.get_object()
        dados = EntradaNoSprintSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        try:
            services.mover_para_sprint(sprint, dados.validated_data["user_story"])
        except services.StoryNaoPronta as erro:
            raise DefinitionOfReadyNaoCumprida(str(erro)) from erro
        return self._resposta(sprint, status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"user-stories/(?P<story_id>\d+)")
    def retirar_user_story(self, request, pk=None, story_id=None):
        sprint = self.get_object()
        services.retirar_do_sprint(sprint, get_object_or_404(sprint.user_stories, pk=story_id))
        return self._resposta(sprint)
