from rest_framework.routers import SimpleRouter

from .views import UserStoryViewSet

router = SimpleRouter(trailing_slash=False)
router.register("user-stories", UserStoryViewSet, basename="user-story")

urlpatterns = router.urls
