from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shipment
from .serializers import ShipmentSerializer


class ShipmentListCreateView(APIView):
    """
    GET  /api/shipments/  — authenticated; the caller's own shipments.
    POST /api/shipments/  — open, because Ship.jsx lets guests book with
                            just a contact name and email. If a valid token
                            is present the shipment is linked to that user.
    """

    def get_permissions(self):
        return [AllowAny()] if self.request.method == 'POST' else [IsAuthenticated()]

    def get(self, request):
        shipments = Shipment.objects(owner=request.user.id)
        return Response(ShipmentSerializer(shipments, many=True).data)

    def post(self, request):
        owner = request.user if request.user and request.user.is_authenticated else None
        serializer = ShipmentSerializer(data=request.data, context={'owner': owner})
        serializer.is_valid(raise_exception=True)
        shipment = serializer.save()
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)


class TrackingView(APIView):
    """
    GET /api/tracking/<tn>/ — public lookup by tracking number.

    api.js swallows the error and returns null, which the UI renders as
    "not found", so a plain 404 is the right response here.
    """

    permission_classes = [AllowAny]

    def get(self, request, tn):
        shipment = Shipment.objects(tn=tn.strip().upper()).first()
        if shipment is None:
            return Response({'detail': 'Tracking number not found.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(ShipmentSerializer(shipment).data)
