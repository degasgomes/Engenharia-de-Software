from django.db import transaction
from rest_framework import serializers

from .models import Anexo, Categoria, Pedido

TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024  # 10 MB


class AnexoSerializer(serializers.ModelSerializer):
    url = serializers.FileField(source="ficheiro", read_only=True)

    class Meta:
        model = Anexo
        fields = ["id", "nome_ficheiro", "url"]


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ["id", "nome"]


class PedidoSerializer(serializers.ModelSerializer):
    autor = serializers.CharField(source="autor.nome", read_only=True)
    categoria = serializers.CharField(source="categoria.nome", read_only=True, default=None)
    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    total_votos = serializers.IntegerField(read_only=True)
    votado = serializers.BooleanField(read_only=True)
    aceita_votos = serializers.BooleanField(read_only=True)
    anexos = AnexoSerializer(many=True, read_only=True)
    release_nome = serializers.CharField(source="release.nome", read_only=True, default=None)
    user_stories = serializers.SerializerMethodField()

    def get_user_stories(self, pedido) -> list:
        # Rastreabilidade: pedido → User Stories (US 3.1).
        return [
            {"id": s.id, "descricao": s.descricao, "estado": s.get_estado_display()}
            for s in pedido.user_stories.all()
        ]

    class Meta:
        model = Pedido
        fields = [
            "id",
            "titulo",
            "problema",
            "estado",
            "estado_display",
            "esforco",
            "impacto",
            "data_submissao",
            "justificacao_rejeicao",
            "autor",
            "autor_id",
            "categoria",
            "categoria_id",
            "total_votos",
            "votado",
            "aceita_votos",
            "anexos",
            "release",
            "release_nome",
            "data_lancamento",
            "user_stories",
        ]
        read_only_fields = fields


class SubmeterPedidoSerializer(serializers.ModelSerializer):
    """US 2.1: título e problema obrigatórios; categoria e anexo opcionais."""

    anexo = serializers.FileField(write_only=True, required=False)
    categoria = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Pedido
        fields = ["id", "titulo", "problema", "categoria", "anexo"]

    def validate_titulo(self, valor):
        if not valor.strip():
            raise serializers.ValidationError("O título é obrigatório.")
        return valor.strip()

    def validate_problema(self, valor):
        if not valor.strip():
            raise serializers.ValidationError("A descrição do problema é obrigatória.")
        return valor.strip()

    def validate_anexo(self, ficheiro):
        if ficheiro.size > TAMANHO_MAXIMO_ANEXO:
            raise serializers.ValidationError("O anexo não pode ter mais de 10 MB.")
        return ficheiro

    @transaction.atomic
    def create(self, validated_data):
        ficheiro = validated_data.pop("anexo", None)
        pedido = Pedido.objects.create(autor=self.context["request"].user, **validated_data)
        if ficheiro:
            Anexo.objects.create(pedido=pedido, nome_ficheiro=ficheiro.name, ficheiro=ficheiro)
        return pedido


class AvaliacaoSerializer(serializers.ModelSerializer):
    """PB 07: o Gestor de Produto define esforço e impacto (1 a 5)."""

    class Meta:
        model = Pedido
        fields = ["esforco", "impacto"]
        extra_kwargs = {"esforco": {"required": True}, "impacto": {"required": True}}


class RejeicaoSerializer(serializers.Serializer):
    justificacao = serializers.CharField()
