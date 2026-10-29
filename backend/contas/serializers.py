from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Utilizador


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
