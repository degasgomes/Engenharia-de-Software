from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notificacao
from .serializers import NotificacaoSerializer


class NotificacaoViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Cada utilizador só vê e altera as suas notificações."""

    serializer_class = NotificacaoSerializer
    pagination_class = None
    http_method_names = ["get", "patch", "post", "head", "options"]

    def get_queryset(self):
        return Notificacao.objects.filter(utilizador=self.request.user)

    @action(detail=False, methods=["post"], url_path="marcar-todas")
    def marcar_todas(self, request):
        self.get_queryset().filter(lida=False).update(lida=True)
        return Response(self.get_serializer(self.get_queryset(), many=True).data)
