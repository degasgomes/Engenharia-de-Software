from rest_framework.routers import SimpleRouter

from .views import NotificacaoViewSet

router = SimpleRouter(trailing_slash=False)
router.register("notificacoes", NotificacaoViewSet, basename="notificacao")

urlpatterns = router.urls
