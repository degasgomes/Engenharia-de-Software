from rest_framework import serializers

from requisitos.models import UserStory
from requisitos.serializers import UserStorySerializer

from .models import Sprint


class SprintSerializer(serializers.ModelSerializer):
    equipa_nome = serializers.CharField(source="equipa.nome", read_only=True)
    user_stories = UserStorySerializer(many=True, read_only=True)
    total_story_points = serializers.SerializerMethodField()
    capacidade = serializers.SerializerMethodField()
    carga = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = [
            "id",
            "equipa",
            "equipa_nome",
            "numero",
            "objetivo",
            "data_inicio",
            "data_fim",
            "user_stories",
            "total_story_points",
            "capacidade",
            "carga",
        ]
        read_only_fields = ["numero"]

    def get_total_story_points(self, sprint) -> int:
        return sum(s.story_points or 0 for s in sprint.user_stories.all())

    def get_capacidade(self, sprint) -> int:
        """Story Points que a equipa consegue fazer num Sprint (soma de capacidade_sp)."""
        return sum(m.capacidade_sp or 0 for m in sprint.equipa.membros.all())

    def get_carga(self, sprint) -> list:
        """Métrica "Team workload": Story Points atribuídos a cada membro neste Sprint."""
        atribuidos = {}
        for story in sprint.user_stories.all():
            if story.responsavel_id:
                atribuidos[story.responsavel_id] = atribuidos.get(story.responsavel_id, 0) + (
                    story.story_points or 0
                )
        return [
            {
                "id": m.id,
                "nome": m.nome,
                "capacidade_sp": m.capacidade_sp or 0,
                "story_points": atribuidos.get(m.id, 0),
            }
            for m in sprint.equipa.membros.all()
        ]

    def validate(self, dados):
        if dados["data_fim"] < dados["data_inicio"]:
            raise serializers.ValidationError(
                {"data_fim": "A data de fim não pode ser anterior à data de início."}
            )
        return dados


class EntradaNoSprintSerializer(serializers.Serializer):
    user_story = serializers.PrimaryKeyRelatedField(queryset=UserStory.objects.all())
