from rest_framework import serializers

from .models import Notificacao


class NotificacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacao
        fields = ["id", "mensagem", "lida", "data", "pedido"]
        read_only_fields = ["id", "mensagem", "data", "pedido"]
