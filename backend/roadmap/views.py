from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from contas.permissions import LeituraParaTodosEscritaParaGestores
from pedidos.models import TransicaoInvalida

from . import services
from .models import Release
from .serializers import AssociarPedidoSerializer, MilestoneSerializer, ReleaseSerializer


class ReleaseViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """O roadmap: Releases com os seus pedidos e Milestones. Todos o veem; os Gestores gerem."""

    queryset = Release.objects.prefetch_related("milestones", "pedidos__user_stories")
    serializer_class = ReleaseSerializer
    permission_classes = [LeituraParaTodosEscritaParaGestores]
    pagination_class = None

    def _resposta(self, release, codigo=status.HTTP_200_OK):
        return Response(ReleaseSerializer(self.get_queryset().get(pk=release.pk)).data, codigo)

    def _executar(self, operacao, release, *args):
        try:
            operacao(release, *args)
        except (services.ReleaseJaPublicada, TransicaoInvalida) as erro:
            raise ValidationError({"detail": str(erro)}) from erro

    @action(detail=True, methods=["post"])
    def pedidos(self, request, pk=None):
        release = self.get_object()
        dados = AssociarPedidoSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        self._executar(services.associar_pedido, release, dados.validated_data["pedido"])
        return self._resposta(release, status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def milestones(self, request, pk=None):
        release = self.get_object()
        dados = MilestoneSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        dados.save(release=release)
        return self._resposta(release, status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def publicar(self, request, pk=None):
        release = self.get_object()
        self._executar(services.publicar, release)
        return self._resposta(release)
