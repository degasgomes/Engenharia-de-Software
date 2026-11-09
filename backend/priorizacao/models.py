from django.conf import settings
from django.db import models
from django.utils import timezone


class Voto(models.Model):
    # EDS-14: chave primária composta (utilizador_id, pedido_id), ou seja,
    # um voto por utilizador e pedido (US 2.2), garantido pela própria base de dados.
    pk = models.CompositePrimaryKey("utilizador", "pedido")
    utilizador = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votos"
    )
    pedido = models.ForeignKey("pedidos.Pedido", on_delete=models.CASCADE, related_name="votos")
    data = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "voto"

    def __str__(self):
        return f"{self.utilizador} → {self.pedido}"
