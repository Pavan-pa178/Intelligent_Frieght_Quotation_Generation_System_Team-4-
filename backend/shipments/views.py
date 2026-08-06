from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Shipment
from .serializers import ShipmentEnquirySerializer, ShipmentResponseSerializer
from . import pricing_service


class EstimateView(APIView):
    """
    POST /api/estimate
    Stateless — does not create a shipment. This is what the Live Estimate
    panel calls (debounced) to independently verify the client-side number,
    and what it falls back to if the browser-side calc can't run.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ShipmentEnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            estimate = pricing_service.compute_estimate(
                origin=data["origin"],
                destination=data["destination"],
                weight_kg=data["weight_kg"],
                volume_m3=data["volume_m3"],
                cargo_type=data["cargo_type"],
                mode=data["transport_mode"],
            )
        except pricing_service.UnresolvedGatewayError as exc:
            return Response(
                {"success": False, "error": {"code": "GATEWAY_UNRESOLVED", "message": str(exc)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "data": estimate})


class ShipmentListCreateView(APIView):
    """
    GET  /api/shipments  -> list the current user's shipments
    POST /api/shipments  -> create an enquiry; computes and persists the
                             estimate at creation time so history is stable
                             even if rates change later.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        shipments = Shipment.objects(user_id=str(request.user.id))
        serializer = ShipmentResponseSerializer(shipments, many=True)
        return Response({"success": True, "data": serializer.data})

    def post(self, request):
        serializer = ShipmentEnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            estimate = pricing_service.compute_estimate(
                origin=data["origin"],
                destination=data["destination"],
                weight_kg=data["weight_kg"],
                volume_m3=data["volume_m3"],
                cargo_type=data["cargo_type"],
                mode=data["transport_mode"],
            )
        except pricing_service.UnresolvedGatewayError as exc:
            return Response(
                {"success": False, "error": {"code": "GATEWAY_UNRESOLVED", "message": str(exc)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shipment = Shipment(
            user_id=str(request.user.id),
            origin=data["origin"],
            destination=data["destination"],
            ready_date=data["ready_date"],
            transport_mode=data["transport_mode"],
            weight_kg=data["weight_kg"],
            volume_m3=data["volume_m3"],
            cargo_type=data["cargo_type"],
            distance_km=estimate["distance_km"],
            transit_days=estimate["transit_days"],
            chargeable_kg=estimate["chargeable_kg"],
            indicative_total=estimate["indicative_total"],
            status="draft",
        )
        shipment.save()

        response_data = ShipmentResponseSerializer(shipment).data
        return Response({"success": True, "data": response_data}, status=status.HTTP_201_CREATED)


class ShipmentDetailView(APIView):
    """GET /api/shipments/<id> — a single shipment, scoped to its owner."""

    permission_classes = [IsAuthenticated]

    def get(self, request, shipment_id):
        shipment = Shipment.objects(id=shipment_id, user_id=str(request.user.id)).first()
        if not shipment:
            return Response(
                {"success": False, "error": {"code": "NOT_FOUND", "message": "Shipment not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": ShipmentResponseSerializer(shipment).data})
