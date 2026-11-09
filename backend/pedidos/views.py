from django.db.models import Count, Exists, OuterRef
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from contas.permissions import EGestorProduto
from priorizacao import services as priorizacao
from priorizacao.models import Voto

from . import services
from .models import Categoria, Pedido, TransicaoInvalida
from .serializers import (
    AvaliacaoSerializer,
    CategoriaSerializer,
    PedidoSerializer,
    RejeicaoSerializer,
    SubmeterPedidoSerializer,
)


class PedidoViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        votos_do_utilizador = Voto.objects.filter(
            pedido=OuterRef("pk"), utilizador=self.request.user
        )
        return (
            Pedido.objects.select_related("autor", "categoria")
            .prefetch_related("anexos")
            .annotate(
                total_votos=Count("votos__utilizador", distinct=True),
                votado=Exists(votos_do_utilizador),
            )
            .order_by("-total_votos", "-data_submissao")
        )

    def get_permissions(self):
        if self.action in ("partial_update", "aprovar", "rejeitar"):
            return [EGestorProduto()]
        return super().get_permissions()

    def get_serializer_class(self):
        if self.action == "create":
            return SubmeterPedidoSerializer
        if self.action == "partial_update":
            return AvaliacaoSerializer
        return PedidoSerializer

    def _resposta(self, pedido, codigo=status.HTTP_200_OK):
        pedido = self.get_queryset().get(pk=pedido.pk)
        return Response(
            PedidoSerializer(pedido, context=self.get_serializer_context()).data, codigo
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pedido = serializer.save()
        services.processar_submissao(pedido)
        return self._resposta(pedido, status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        pedido = self.get_object()
        serializer = AvaliacaoSerializer(pedido, data=request.data)
        serializer.is_valid(raise_exception=True)
        priorizacao.avaliar(pedido, **serializer.validated_data)
        return self._resposta(pedido)

    @action(detail=True, methods=["post"])
    def aprovar(self, request, pk=None):
        pedido = self.get_object()
        try:
            pedido.aprovar()
        except TransicaoInvalida as erro:
            raise ValidationError({"detail": str(erro)}) from erro
        return self._resposta(pedido)

    @action(detail=True, methods=["post"])
    def rejeitar(self, request, pk=None):
        pedido = self.get_object()
        serializer = RejeicaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            pedido.rejeitar(serializer.validated_data["justificacao"])
        except TransicaoInvalida as erro:
            raise ValidationError({"detail": str(erro)}) from erro
        return self._resposta(pedido)

    @action(detail=True, methods=["post", "delete"])
    def votos(self, request, pk=None):
        pedido = self.get_object()
        # Diagrama de Sequência 3: POST insere o voto (201 Created se for novo),
        # DELETE retira-o (200 OK); ambos devolvem o pedido com o novo total.
        codigo = status.HTTP_200_OK
        try:
            if request.method == "POST":
                if priorizacao.votar(request.user, pedido):
                    codigo = status.HTTP_201_CREATED
            else:
                priorizacao.retirar_voto(request.user, pedido)
        except priorizacao.VotacaoFechada as erro:
            raise PermissionDenied(str(erro)) from erro
        return self._resposta(pedido, codigo)


class CategoriaListView(generics.ListAPIView):
    queryset = Categoria.objects.order_by("nome")
    serializer_class = CategoriaSerializer
    pagination_class = None
