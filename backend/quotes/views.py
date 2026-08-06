from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rates.models import RateConfiguration

from .models import CargoItem, Quote
from .pricing import calculate_quote
from .serializers import QuoteRequestSerializer


class QuoteCreateView(APIView):
    """
    POST /api/quotes/

    Body:  { from, to, service, cargo: [{qty, weight, length, width, height}], insurance, hazmat }
    Reply: weight breakdown + cost, and the persisted quote id.

    Ship.jsx still computes this client-side for the live-updating summary
    panel; this endpoint is the authoritative figure and the hook for the
    ML pricing model.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = QuoteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        rate = RateConfiguration.objects(key=data['service'], active=True).first()
        if rate is None:
            return Response(
                {'detail': f"Unknown service '{data['service']}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        breakdown = calculate_quote(
            cargo=data['cargo'],
            rate=rate,
            insurance=data['insurance'],
            hazmat=data['hazmat'],
        )

        quote = Quote(
            origin=data['origin'],
            destination=data['destination'],
            service=data['service'],
            cargo=[CargoItem(**item) for item in data['cargo']],
            insurance=data['insurance'],
            hazmat=data['hazmat'],
            total_weight=breakdown['totalWeight'],
            volumetric_weight=breakdown['volumetricWeight'],
            chargeable_weight=breakdown['chargeableWeight'],
            cost=breakdown['cost'],
            transit=breakdown['transit'],
            owner=request.user if request.user and request.user.is_authenticated else None,
        )
        quote.save()

        return Response({'id': str(quote.id), **breakdown}, status=status.HTTP_201_CREATED)
