from rest_framework.permissions import BasePermission

from .models import Perfil


class EGestorProduto(BasePermission):
    """Só o Gestor de Produto avalia, aprova e rejeita pedidos (ADR-005)."""

    message = "Apenas o Gestor de Produto pode realizar esta ação."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.perfil == Perfil.GESTOR_PRODUTO)
