from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Perfil(models.TextChoices):
    CLIENTE = "CLIENTE", "Cliente"
    GESTOR_PRODUTO = "GESTOR_PRODUTO", "Gestor de Produto"
    PROGRAMADOR = "PROGRAMADOR", "Programador"
    GESTOR_PROJETO = "GESTOR_PROJETO", "Gestor de Projeto"


class UtilizadorManager(BaseUserManager):
    def create_user(self, email, nome, password=None, **extra):
        if not email:
            raise ValueError("O email é obrigatório")
        utilizador = self.model(email=self.normalize_email(email), nome=nome, **extra)
        utilizador.set_password(password)
        utilizador.save(using=self._db)
        return utilizador

    def create_superuser(self, email, nome, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("perfil", Perfil.GESTOR_PRODUTO)
        return self.create_user(email, nome, password, **extra)


class Utilizador(AbstractBaseUser, PermissionsMixin):
    """EDS-13: o perfil é um atributo, não uma subclasse (decisão 3.3)."""

    nome = models.CharField(max_length=100)
    email = models.EmailField(max_length=150, unique=True)
    password = models.CharField(max_length=255, db_column="password_hash")
    perfil = models.CharField(max_length=20, choices=Perfil.choices, default=Perfil.CLIENTE)
    capacidade_sp = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UtilizadorManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nome"]

    class Meta:
        db_table = "utilizador"
        verbose_name_plural = "utilizadores"

    def __str__(self):
        return f"{self.nome} <{self.email}>"

    @property
    def e_gestor_produto(self):
        return self.perfil == Perfil.GESTOR_PRODUTO
