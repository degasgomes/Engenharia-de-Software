from django.conf import settings
from django.db import models
from django.utils import timezone


class Notificacao(models.Model):
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notificacoes"
    )
    pedido = models.ForeignKey(
        "pedidos.Pedido",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notificacoes",
    )
    mensagem = models.TextField()
    lida = models.BooleanField(default=False)
    data = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "notificacao"
        ordering = ["-data", "-id"]
        verbose_name_plural = "notificações"

    def __str__(self):
        return self.mensagem
