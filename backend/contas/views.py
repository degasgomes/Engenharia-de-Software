from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegistoSerializer, UtilizadorSerializer


class RegistoView(generics.CreateAPIView):
    serializer_class = RegistoSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class EuView(APIView):
    def get(self, request):
        return Response(UtilizadorSerializer(request.user).data)
