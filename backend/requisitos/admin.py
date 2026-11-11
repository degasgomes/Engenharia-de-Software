from django.contrib import admin

from .models import CriterioAceitacao, UserStory


class CriterioInline(admin.TabularInline):
    model = CriterioAceitacao
    extra = 0


@admin.register(UserStory)
class UserStoryAdmin(admin.ModelAdmin):
    list_display = ["id", "descricao", "estado", "sprint", "responsavel"]
    list_filter = ["estado"]
    inlines = [CriterioInline]
