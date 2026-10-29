from django.conf import settings
from django.db import models
from django.utils import timezone


class Voto(models.Model):
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votos"
    )
    pedido = models.ForeignKey("pedidos.Pedido", on_delete=models.CASCADE, related_name="votos")
    data = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "voto"
        constraints = [
            # US 2.2: um voto por utilizador e pedido
            models.UniqueConstraint(fields=["utilizador", "pedido"], name="voto_unico"),
        ]

    def __str__(self):
        return f"{self.utilizador} → {self.pedido}"
