"""Serviços de domínio da priorização (EDS-10, camada 2)."""

from django.db import IntegrityError, transaction

from .models import Voto


def votar(utilizador, pedido):
    """Regista o voto; se o utilizador já tinha votado, retira-o. Devolve True se ficou votado."""
    apagados, _ = Voto.objects.filter(utilizador=utilizador, pedido=pedido).delete()
    if apagados:
        return False
    try:
        with transaction.atomic():
            Voto.objects.create(utilizador=utilizador, pedido=pedido)
    except IntegrityError:
        # Dois pedidos em simultâneo: a restrição única já garante um só voto.
        pass
    return True


def retirar_voto(utilizador, pedido):
    Voto.objects.filter(utilizador=utilizador, pedido=pedido).delete()


def avaliar(pedido, esforco, impacto):
    pedido.esforco = esforco
    pedido.impacto = impacto
    pedido.save(update_fields=["esforco", "impacto"])
    return pedido
