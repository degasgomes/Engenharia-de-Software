from django.contrib import admin

from .models import Voto


@admin.register(Voto)
class VotoAdmin(admin.ModelAdmin):
    list_display = ["utilizador", "pedido", "data"]
