from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RateConfiguration
from .serializers import RateConfigurationSerializer


class RateListView(APIView):
    """
    GET /api/rates/

    Returns a dict keyed by service, identical in shape to the frontend's
    RATES constant:
        { "ocean": {"label": ..., "base": ..., "perKg": ..., "transit": ...}, ... }
    """

    permission_classes = [AllowAny]

    def get(self, request):
        rates = RateConfiguration.objects(active=True)
        return Response({
            rate.key: RateConfigurationSerializer(rate).data
            for rate in rates
        })
