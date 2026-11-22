from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Equipa, Perfil, Utilizador


class UtilizadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilizador
        fields = ["id", "nome", "email", "perfil"]
        read_only_fields = fields


class RegistoSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = Utilizador
        fields = ["id", "nome", "email", "password", "perfil"]
        # O registo público cria sempre um Cliente; os outros perfis são atribuídos no admin.
        read_only_fields = ["id", "perfil"]

    def create(self, validated_data):
        return Utilizador.objects.create_user(**validated_data)


class EquipaSerializer(serializers.ModelSerializer):
    membros = UtilizadorSerializer(many=True, read_only=True)

    class Meta:
        model = Equipa
        fields = ["id", "nome", "membros"]


class MembroSerializer(serializers.Serializer):
    # Os Clientes não fazem parte de equipas de desenvolvimento.
    utilizador = serializers.PrimaryKeyRelatedField(
        queryset=Utilizador.objects.exclude(perfil=Perfil.CLIENTE)
    )
