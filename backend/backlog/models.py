from django.db import models


class Sprint(models.Model):
    equipa = models.ForeignKey("contas.Equipa", on_delete=models.CASCADE, related_name="sprints")
    numero = models.PositiveIntegerField()
    objetivo = models.TextField()
    data_inicio = models.DateField()
    data_fim = models.DateField()

    class Meta:
        db_table = "sprint"
        ordering = ["-data_inicio", "-numero"]
        constraints = [
            models.UniqueConstraint(fields=["equipa", "numero"], name="sprint_equipa_numero_unico")
        ]

    def __str__(self):
        return f"Sprint {self.numero} — {self.equipa}"
