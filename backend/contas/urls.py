from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import EuView, RegistoView

urlpatterns = [
    path("registo", RegistoView.as_view(), name="registo"),
    path("token", TokenObtainPairView.as_view(), name="token"),
    path("token/renovar", TokenRefreshView.as_view(), name="token-renovar"),
    path("eu", EuView.as_view(), name="eu"),
]
