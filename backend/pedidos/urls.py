from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CategoriaListView, PedidoViewSet

router = SimpleRouter(trailing_slash=False)
router.register("pedidos", PedidoViewSet, basename="pedido")

urlpatterns = [path("categorias", CategoriaListView.as_view(), name="categorias"), *router.urls]
