from django.contrib import admin

from .models import Milestone, Release

admin.site.register(Release)
admin.site.register(Milestone)
