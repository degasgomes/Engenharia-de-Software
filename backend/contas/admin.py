from django.contrib import admin

from .models import Utilizador


@admin.register(Utilizador)
class UtilizadorAdmin(admin.ModelAdmin):
    list_display = ["email", "nome", "perfil", "is_staff"]
    list_filter = ["perfil"]
    search_fields = ["email", "nome"]
    exclude = ["password"]
