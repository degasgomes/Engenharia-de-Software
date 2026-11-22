from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("contas.urls")),
    path("api/v1/", include("pedidos.urls")),
    path("api/v1/", include("contas.urls_equipas")),
    path("api/v1/", include("requisitos.urls")),
    path("api/v1/", include("backlog.urls")),
    path("api/v1/", include("roadmap.urls")),
    path("api/v1/", include("colaboracao.urls")),
    path("api/v1/schema", SpectacularAPIView.as_view(), name="schema"),
    path("api/v1/docs", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
