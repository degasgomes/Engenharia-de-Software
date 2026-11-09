from django.contrib import admin

from .models import Anexo, Categoria, Pedido


class AnexoInline(admin.TabularInline):
    model = Anexo
    extra = 0


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ["titulo", "autor", "estado", "esforco", "impacto", "data_submissao"]
    list_filter = ["estado", "categoria"]
    search_fields = ["titulo", "problema"]
    inlines = [AnexoInline]


admin.site.register(Categoria)
