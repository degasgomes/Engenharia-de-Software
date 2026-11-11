from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Perfil

GESTORES = (Perfil.GESTOR_PRODUTO, Perfil.GESTOR_PROJETO)


class _PorPerfil(BasePermission):
    perfis = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.perfil in self.perfis)


class EGestorProduto(_PorPerfil):
    """Só o Gestor de Produto avalia, aprova e rejeita pedidos (ADR-005)."""

    message = "Apenas o Gestor de Produto pode realizar esta ação."
    perfis = (Perfil.GESTOR_PRODUTO,)


class EGestor(_PorPerfil):
    """Planeamento (Sprints, Equipas, Releases): Gestor de Produto ou Gestor de Projeto."""

    message = "Apenas um Gestor de Produto ou de Projeto pode realizar esta ação."
    perfis = GESTORES


class EDaEquipa(BasePermission):
    """Todos os perfis internos (não Clientes) trabalham com as User Stories."""

    message = "Os Clientes não têm acesso a esta área."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.perfil != Perfil.CLIENTE)


class LeituraParaTodosEscritaParaGestores(BasePermission):
    """O roadmap é público para quem tem sessão; só os Gestores o alteram."""

    message = EGestor.message

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or user.perfil in GESTORES
