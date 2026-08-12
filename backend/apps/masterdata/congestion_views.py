from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

PORT_CONGESTION_DATA = [
    { 'code': 'INNSA', 'name': 'Nhava Sheva (JNPT), Mumbai', 'waiting_hours': 14.5, 'congestion_index': 0.71, 'status': 'MODERATE' },
    { 'code': 'AEJEA', 'name': 'Jebel Ali, Dubai', 'waiting_hours': 8.0, 'congestion_index': 0.65, 'status': 'NORMAL' },
    { 'code': 'NLRTM', 'name': 'Port of Rotterdam', 'waiting_hours': 18.2, 'congestion_index': 0.78, 'status': 'ELEVATED' },
    { 'code': 'SGSIN', 'name': 'Port of Singapore', 'waiting_hours': 6.5, 'congestion_index': 0.55, 'status': 'NORMAL' },
    { 'code': 'DEHAM', 'name': 'Port of Hamburg', 'waiting_hours': 22.0, 'congestion_index': 0.85, 'status': 'HIGH' }
]

class PortCongestionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(PORT_CONGESTION_DATA)
