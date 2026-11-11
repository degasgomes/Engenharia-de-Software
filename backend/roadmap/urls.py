from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import ReleaseViewSet

router = SimpleRouter(trailing_slash=False)
router.register("releases", ReleaseViewSet, basename="release")

urlpatterns = [
    # O roadmap visual lê as Releases com os pedidos e os Milestones.
    path("roadmap", ReleaseViewSet.as_view({"get": "list"}), name="roadmap"),
    *router.urls,
]
