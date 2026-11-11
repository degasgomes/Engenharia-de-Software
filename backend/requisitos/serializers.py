from rest_framework import serializers

from contas.models import Perfil, Utilizador

from .models import CriterioAceitacao, EstadoStory, UserStory


class CriterioSerializer(serializers.ModelSerializer):
    """Critério de aceitação Dado/Quando/Então; os três campos são obrigatórios."""

    class Meta:
        model = CriterioAceitacao
        fields = ["id", "dado", "quando", "entao"]


class UserStorySerializer(serializers.ModelSerializer):
    criterios = CriterioSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    pronta = serializers.SerializerMethodField()
    pedido_titulo = serializers.CharField(source="pedido.titulo", read_only=True, default=None)
    pedido_estado = serializers.CharField(source="pedido.estado", read_only=True, default=None)
    responsavel_nome = serializers.CharField(
        source="responsavel.nome", read_only=True, default=None
    )
    sprint_numero = serializers.IntegerField(source="sprint.numero", read_only=True, default=None)
    responsavel = serializers.PrimaryKeyRelatedField(
        queryset=Utilizador.objects.exclude(perfil=Perfil.CLIENTE), required=False, allow_null=True
    )

    class Meta:
        model = UserStory
        fields = [
            "id",
            "descricao",
            "story_points",
            "ordem_backlog",
            "data_prevista",
            "estado",
            "estado_display",
            "data_inicio",
            "data_conclusao",
            "gerada_por_ia",
            "pedido",
            "pedido_titulo",
            "pedido_estado",
            "sprint",
            "sprint_numero",
            "responsavel",
            "responsavel_nome",
            "criterios",
            "pronta",
        ]
        # O estado muda em /estado e o Sprint em /sprints/{id}/user-stories, onde estão as regras.
        read_only_fields = [
            "ordem_backlog",
            "estado",
            "data_inicio",
            "data_conclusao",
            "gerada_por_ia",
            "sprint",
        ]

    def get_pronta(self, story) -> bool:
        # Usa os critérios já carregados (prefetch) em vez de uma consulta por story.
        return len(story.criterios.all()) > 0

    def validate_descricao(self, valor):
        if not valor.strip():
            raise serializers.ValidationError("A descrição é obrigatória.")
        return valor.strip()

    def validate(self, dados):
        responsavel = dados.get("responsavel")
        sprint = self.instance.sprint if self.instance else None
        if responsavel and sprint and not sprint.equipa.membros.filter(pk=responsavel.pk).exists():
            raise serializers.ValidationError(
                {"responsavel": f"{responsavel.nome} não é membro da equipa {sprint.equipa.nome}."}
            )
        return dados


class EstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=EstadoStory.choices)


class MoverSerializer(serializers.Serializer):
    direcao = serializers.ChoiceField(choices=["cima", "baixo"])
