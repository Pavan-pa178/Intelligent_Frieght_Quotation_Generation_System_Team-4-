from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

GATEWAYS_DATA = [
    { 'code': 'INNSA', 'name': 'Nhava Sheva (JNPT), Mumbai', 'city': 'Mumbai', 'country': 'India', 'countryCode': 'IN', 'type': 'PORT', 'lat': 18.95, 'lon': 72.95, 'modes': ['OCEAN'] },
    { 'code': 'AEJEA', 'name': 'Jebel Ali, Dubai', 'city': 'Dubai', 'country': 'UAE', 'countryCode': 'AE', 'type': 'PORT', 'lat': 24.98, 'lon': 55.06, 'modes': ['OCEAN'] },
    { 'code': 'NLRTM', 'name': 'Port of Rotterdam', 'city': 'Rotterdam', 'country': 'Netherlands', 'countryCode': 'NL', 'type': 'PORT', 'lat': 51.95, 'lon': 4.15, 'modes': ['OCEAN'] },
    { 'code': 'SGSIN', 'name': 'Port of Singapore', 'city': 'Singapore', 'country': 'Singapore', 'countryCode': 'SG', 'type': 'PORT', 'lat': 1.26, 'lon': 103.84, 'modes': ['OCEAN'] },
    { 'code': 'DEHAM', 'name': 'Port of Hamburg', 'city': 'Hamburg', 'country': 'Germany', 'countryCode': 'DE', 'type': 'PORT', 'lat': 53.53, 'lon': 9.96, 'modes': ['OCEAN'] },
    { 'code': 'PECLL', 'name': 'Port of Callao', 'city': 'Callao', 'country': 'Peru', 'countryCode': 'PE', 'type': 'PORT', 'lat': -12.05, 'lon': -77.15, 'modes': ['OCEAN'] },
    { 'code': 'OMSLL', 'name': 'Port of Salalah', 'city': 'Salalah', 'country': 'Oman', 'countryCode': 'OM', 'type': 'PORT', 'lat': 16.94, 'lon': 54.01, 'modes': ['OCEAN'] },
    { 'code': 'BOM', 'name': 'Chhatrapati Shivaji Maharaj Intl Airport (BOM)', 'city': 'Mumbai', 'country': 'India', 'countryCode': 'IN', 'type': 'AIRPORT', 'lat': 19.09, 'lon': 72.87, 'modes': ['AIR', 'EXPRESS_AIR'] },
    { 'code': 'DXB', 'name': 'Dubai International Airport (DXB)', 'city': 'Dubai', 'country': 'UAE', 'countryCode': 'AE', 'type': 'AIRPORT', 'lat': 25.25, 'lon': 55.36, 'modes': ['AIR', 'EXPRESS_AIR'] },
]

CONTAINER_TYPES_DATA = [
    { 'code': '40HC', 'name': '40ft High Cube', 'internal_cbm': 76.4, 'max_payload_kg': 28800, 'is_reefer': False },
    { 'code': '20GP', 'name': '20ft General Purpose', 'internal_cbm': 33.2, 'max_payload_kg': 21800, 'is_reefer': False },
    { 'code': '40GP', 'name': '40ft General Purpose', 'internal_cbm': 67.7, 'max_payload_kg': 26600, 'is_reefer': False },
    { 'code': '40RF', 'name': '40ft Reefer', 'internal_cbm': 67.0, 'max_payload_kg': 27000, 'is_reefer': True },
    { 'code': '20RF', 'name': '20ft Reefer', 'internal_cbm': 28.3, 'max_payload_kg': 21000, 'is_reefer': True },
    { 'code': '20OT', 'name': '20ft Open Top', 'internal_cbm': 32.0, 'max_payload_kg': 21500, 'is_reefer': False },
    { 'code': '40FR', 'name': '40ft Flat Rack', 'internal_cbm': 55.0, 'max_payload_kg': 31000, 'is_reefer': False }
]

class GatewaySearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').lower().strip()
        mode = request.query_params.get('mode', 'OCEAN').upper()

        results = []
        for g in GATEWAYS_DATA:
            matches_mode = mode in g['modes'] or (mode == 'AIR' and g['type'] == 'AIRPORT') or (mode == 'OCEAN' and g['type'] == 'PORT')
            matches_query = (not q) or (q in g['code'].lower() or q in g['name'].lower() or q in g['city'].lower())
            if matches_mode and matches_query:
                results.append(g)

        return Response(results[:10])

class ContainerTypesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(CONTAINER_TYPES_DATA)

from core.mongodb import get_collection
import datetime

class ContactView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.data or {}
        payload['created_at'] = datetime.datetime.utcnow().isoformat()
        try:
            col = get_collection('contact_messages')
            if col is not None:
                col.insert_one(payload)
        except Exception:
            pass
        return Response({'ok': True, 'message': 'Message received successfully'}, status=status.HTTP_201_CREATED)
