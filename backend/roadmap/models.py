from django.db import models


class Release(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    data_prevista = models.DateField()
    data_publicacao = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "release"
        ordering = ["data_prevista", "id"]

    def __str__(self):
        return self.nome

    @property
    def publicada(self):
        return self.data_publicacao is not None

    def progresso(self):
        """EDS-13: parte das User Stories dos pedidos da Release que já estão concluídas (0 a 1).

        Uma Release publicada está completa; uma Release sem stories ainda não começou.
        """
        if self.publicada:
            return 1.0
        stories = [s for pedido in self.pedidos.all() for s in pedido.user_stories.all()]
        if not stories:
            return 0.0
        return sum(s.estado == "CONCLUIDO" for s in stories) / len(stories)


class Milestone(models.Model):
    release = models.ForeignKey(Release, on_delete=models.CASCADE, related_name="milestones")
    nome = models.CharField(max_length=100)
    data = models.DateField()

    class Meta:
        db_table = "milestone"
        ordering = ["data", "id"]

    def __str__(self):
        return self.nome
