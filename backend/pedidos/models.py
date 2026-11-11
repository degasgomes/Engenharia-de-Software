from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class EstadoPedido(models.TextChoices):
    SUBMETIDO = "SUBMETIDO", "Submetido"
    EM_TRIAGEM = "EM_TRIAGEM", "Em Triagem"
    APROVADO = "APROVADO", "Aprovado"
    REJEITADO = "REJEITADO", "Rejeitado"
    PLANEADO = "PLANEADO", "Planeado"
    EM_DESENVOLVIMENTO = "EM_DESENVOLVIMENTO", "Em Desenvolvimento"
    LANCADO = "LANCADO", "Lançado"


# Diagrama de Estados 1: o Gestor só aprova ou rejeita depois da triagem.
ESTADOS_EM_AVALIACAO = (EstadoPedido.EM_TRIAGEM,)

ESCALA_1_A_5 = [MinValueValidator(1), MaxValueValidator(5)]

# Diagrama de Sequência 3: num pedido terminado já não se vota nem se retira o voto.
ESTADOS_VOTACAO_FECHADA = (EstadoPedido.REJEITADO, EstadoPedido.LANCADO)


class TransicaoInvalida(Exception):
    """Uma transição do Diagrama de Estados 1 cuja condição não se verifica."""


class Categoria(models.Model):
    nome = models.CharField(max_length=60, unique=True)

    class Meta:
        db_table = "categoria"
        verbose_name_plural = "categorias"

    def __str__(self):
        return self.nome


class Pedido(models.Model):
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="pedidos"
    )
    categoria = models.ForeignKey(
        Categoria, on_delete=models.SET_NULL, null=True, blank=True, related_name="pedidos"
    )
    release = models.ForeignKey(
        "roadmap.Release", on_delete=models.SET_NULL, null=True, blank=True, related_name="pedidos"
    )
    titulo = models.CharField(max_length=200)
    problema = models.TextField()
    estado = models.CharField(
        max_length=20, choices=EstadoPedido.choices, default=EstadoPedido.SUBMETIDO
    )
    esforco = models.PositiveSmallIntegerField(null=True, blank=True, validators=ESCALA_1_A_5)
    impacto = models.PositiveSmallIntegerField(null=True, blank=True, validators=ESCALA_1_A_5)
    data_submissao = models.DateTimeField(default=timezone.now)
    data_lancamento = models.DateTimeField(null=True, blank=True)
    justificacao_rejeicao = models.TextField(blank=True, default="")
    sugestoes_ia = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "pedido"
        ordering = ["-data_submissao"]

    def __str__(self):
        return self.titulo

    def concluir_triagem(self, sugestoes=None):
        """Submetido → Em Triagem, com ou sem sugestões da IA (Diagrama de Estados 1)."""
        if self.estado != EstadoPedido.SUBMETIDO:
            raise TransicaoInvalida(f"Um pedido {self.get_estado_display()} já foi triado.")
        self.sugestoes_ia = sugestoes
        self.estado = EstadoPedido.EM_TRIAGEM
        self.save(update_fields=["estado", "sugestoes_ia"])

    def aprovar(self):
        if self.estado not in ESTADOS_EM_AVALIACAO:
            raise TransicaoInvalida(f"Um pedido {self.get_estado_display()} não pode ser aprovado.")
        if self.esforco is None or self.impacto is None:
            raise TransicaoInvalida("Defina o esforço e o impacto antes de aprovar.")
        self.estado = EstadoPedido.APROVADO
        self.save(update_fields=["estado"])

    def rejeitar(self, justificacao):
        if self.estado not in ESTADOS_EM_AVALIACAO:
            raise TransicaoInvalida(
                f"Um pedido {self.get_estado_display()} não pode ser rejeitado."
            )
        if not justificacao or not justificacao.strip():
            raise TransicaoInvalida("A rejeição exige uma justificação.")
        self.estado = EstadoPedido.REJEITADO
        self.justificacao_rejeicao = justificacao.strip()
        self.save(update_fields=["estado", "justificacao_rejeicao"])

    def planear(self, release):
        """Aprovado → Planeado, ao ser associado a uma Release (Diagrama de Estados 1)."""
        if self.estado != EstadoPedido.APROVADO:
            raise TransicaoInvalida(
                f"Só um pedido Aprovado entra numa Release; este está {self.get_estado_display()}."
            )
        self.release = release
        self.estado = EstadoPedido.PLANEADO
        self.save(update_fields=["estado", "release"])

    def iniciar_desenvolvimento(self):
        """Planeado → Em Desenvolvimento, quando a 1.ª User Story entra em Em Progresso."""
        if self.estado != EstadoPedido.PLANEADO:
            raise TransicaoInvalida(
                f"Um pedido {self.get_estado_display()} não pode passar a Em Desenvolvimento."
            )
        self.estado = EstadoPedido.EM_DESENVOLVIMENTO
        self.save(update_fields=["estado"])

    def lancar(self, data):
        """Planeado ou Em Desenvolvimento → Lançado, quando a Release é publicada."""
        if self.estado not in (EstadoPedido.PLANEADO, EstadoPedido.EM_DESENVOLVIMENTO):
            raise TransicaoInvalida(f"Um pedido {self.get_estado_display()} não pode ser lançado.")
        self.estado = EstadoPedido.LANCADO
        self.data_lancamento = data
        self.save(update_fields=["estado", "data_lancamento"])

    @property
    def aceita_votos(self):
        return self.estado not in ESTADOS_VOTACAO_FECHADA

    def total_votos(self):
        return self.votos.count()


class Anexo(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="anexos")
    nome_ficheiro = models.CharField(max_length=255)
    ficheiro = models.FileField(upload_to="anexos/%Y/%m/", max_length=500, db_column="url")

    class Meta:
        db_table = "anexo"

    def __str__(self):
        return self.nome_ficheiro
