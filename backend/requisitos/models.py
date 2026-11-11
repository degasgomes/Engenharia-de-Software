from django.conf import settings
from django.db import models
from django.utils import timezone


class EstadoStory(models.TextChoices):
    A_FAZER = "A_FAZER", "A Fazer"
    EM_PROGRESSO = "EM_PROGRESSO", "Em Progresso"
    EM_REVISAO = "EM_REVISAO", "Em Revisão"
    CONCLUIDO = "CONCLUIDO", "Concluído"


# Diagrama de Estados 2: o quadro avança coluna a coluna; a revisão pode devolver a story.
TRANSICOES = {
    EstadoStory.A_FAZER: (EstadoStory.EM_PROGRESSO,),
    EstadoStory.EM_PROGRESSO: (EstadoStory.EM_REVISAO, EstadoStory.A_FAZER),
    EstadoStory.EM_REVISAO: (EstadoStory.CONCLUIDO, EstadoStory.EM_PROGRESSO),
    EstadoStory.CONCLUIDO: (),
}


class TransicaoStoryInvalida(Exception):
    """Uma mudança de estado que o quadro não permite."""


class UserStory(models.Model):
    pedido = models.ForeignKey(
        "pedidos.Pedido",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_stories",
    )
    sprint = models.ForeignKey(
        "backlog.Sprint",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_stories",
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_stories",
    )
    descricao = models.TextField()
    story_points = models.PositiveSmallIntegerField(null=True, blank=True)
    ordem_backlog = models.PositiveIntegerField(default=0)
    data_prevista = models.DateField(null=True, blank=True)
    estado = models.CharField(
        max_length=20, choices=EstadoStory.choices, default=EstadoStory.A_FAZER
    )
    data_inicio = models.DateTimeField(null=True, blank=True)
    data_conclusao = models.DateTimeField(null=True, blank=True)
    # US 1.3: a IA só sugere; fica registado que o esboço veio dela.
    gerada_por_ia = models.BooleanField(default=False)

    class Meta:
        db_table = "user_story"
        ordering = ["ordem_backlog", "id"]
        verbose_name_plural = "user stories"

    def __str__(self):
        return self.descricao[:60]

    def esta_pronta(self):
        """Definition of Ready (Diagrama de Sequência 4): pelo menos um critério de aceitação."""
        return self.criterios.exists()

    def mudar_estado(self, novo):
        if novo not in TRANSICOES[EstadoStory(self.estado)]:
            destino = EstadoStory(novo).label
            raise TransicaoStoryInvalida(
                f"Uma story {self.get_estado_display()} não pode passar a {destino}."
            )
        agora = timezone.now()
        if novo == EstadoStory.EM_PROGRESSO and self.data_inicio is None:
            self.data_inicio = agora
        if novo == EstadoStory.CONCLUIDO:
            self.data_conclusao = agora
        self.estado = novo
        self.save(update_fields=["estado", "data_inicio", "data_conclusao"])


class CriterioAceitacao(models.Model):
    user_story = models.ForeignKey(UserStory, on_delete=models.CASCADE, related_name="criterios")
    dado = models.TextField()
    quando = models.TextField()
    entao = models.TextField()

    class Meta:
        db_table = "criterio_aceitacao"
        ordering = ["id"]
        verbose_name_plural = "critérios de aceitação"

    def __str__(self):
        return f"Dado {self.dado}, quando {self.quando}, então {self.entao}"
