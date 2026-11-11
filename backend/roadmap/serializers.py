from rest_framework import serializers

from pedidos.models import Pedido

from .models import Milestone, Release


class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ["id", "nome", "data"]


class PedidoDaReleaseSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)

    class Meta:
        model = Pedido
        fields = ["id", "titulo", "estado", "estado_display", "data_lancamento"]


class ReleaseSerializer(serializers.ModelSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)
    pedidos = PedidoDaReleaseSerializer(many=True, read_only=True)
    publicada = serializers.BooleanField(read_only=True)
    progresso = serializers.SerializerMethodField()

    def get_progresso(self, release) -> int:
        """Percentagem (0 a 100) de User Stories concluídas: a métrica "Roadmap progress"."""
        return round(release.progresso() * 100)

    class Meta:
        model = Release
        fields = [
            "id",
            "nome",
            "data_prevista",
            "data_publicacao",
            "publicada",
            "progresso",
            "milestones",
            "pedidos",
        ]
        read_only_fields = ["data_publicacao"]


class AssociarPedidoSerializer(serializers.Serializer):
    pedido = serializers.PrimaryKeyRelatedField(queryset=Pedido.objects.all())
