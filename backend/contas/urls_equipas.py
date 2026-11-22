from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import EquipaViewSet, UtilizadorInternoListView

router = SimpleRouter(trailing_slash=False)
router.register("equipas", EquipaViewSet, basename="equipa")

urlpatterns = [
    path("utilizadores", UtilizadorInternoListView.as_view(), name="utilizadores"),
    *router.urls,
]
