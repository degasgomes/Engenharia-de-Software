from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Equipa, Perfil, Utilizador
from .permissions import EDaEquipa, EGestor
from .serializers import (
    EquipaSerializer,
    MembroSerializer,
    RegistoSerializer,
    UtilizadorSerializer,
)


class RegistoView(generics.CreateAPIView):
    serializer_class = RegistoSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class EuView(APIView):
    def get(self, request):
        return Response(UtilizadorSerializer(request.user).data)


class UtilizadorInternoListView(generics.ListAPIView):
    """Quem pode entrar numa equipa ou ficar responsável por uma User Story."""

    queryset = Utilizador.objects.exclude(perfil=Perfil.CLIENTE).order_by("nome")
    serializer_class = UtilizadorSerializer
    permission_classes = [EDaEquipa]
    pagination_class = None


class EquipaViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Equipa.objects.prefetch_related("membros")
    serializer_class = EquipaSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [EDaEquipa()]
        return [EGestor()]

    @action(detail=True, methods=["post"])
    def membros(self, request, pk=None):
        equipa = self.get_object()
        dados = MembroSerializer(data=request.data)
        dados.is_valid(raise_exception=True)
        equipa.membros.add(dados.validated_data["utilizador"])
        return Response(EquipaSerializer(equipa).data, status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"membros/(?P<utilizador_id>\d+)")
    def retirar_membro(self, request, pk=None, utilizador_id=None):
        equipa = self.get_object()
        equipa.membros.remove(get_object_or_404(equipa.membros, pk=utilizador_id))
        return Response(EquipaSerializer(equipa).data)
