from rest_framework.routers import SimpleRouter

from .views import SprintViewSet

router = SimpleRouter(trailing_slash=False)
router.register("sprints", SprintViewSet, basename="sprint")

urlpatterns = router.urls
