from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .route_agent import build_route_options

ROUTE_ANALYTICS_DATA = {
  'kpis': {
    'routesAnalysed': '12,450',
    'laneCoveragePct': '98.5%',
    'transitMaeDays': '1.7 d',
    'avgOptionsPerLane': '3.2'
  },
  'lanePerformance': [
    { 'lane': 'INNSA→AEJEA', 'sub': 'Asia–Middle East', 'transit': '6–10 d', 'onTimePct': 96, 'vol': 412, 'status': 'ok' },
    { 'lane': 'INNSA→NLRTM', 'sub': 'Asia–Europe', 'transit': '24–28 d', 'onTimePct': 93, 'vol': 318, 'status': 'ok' },
    { 'lane': 'INNSA→SGSIN', 'sub': 'Intra-Asia', 'transit': '11–16 d', 'onTimePct': 98, 'vol': 276, 'status': 'ok' },
    { 'lane': 'INNSA→DEHAM', 'sub': 'Asia–Europe', 'transit': '26–31 d', 'onTimePct': 91, 'vol': 184, 'status': 'warn' },
    { 'lane': 'BOM→DXB', 'sub': 'Air · Middle East', 'transit': '5–7 d', 'onTimePct': 97, 'vol': 142, 'status': 'ok' },
    { 'lane': 'INNSA→PECLL', 'sub': 'Asia–South America', 'transit': '—', 'onTimePct': None, 'vol': 6, 'status': 'no_data' }
  ]
}

class RouteAnalyticsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(ROUTE_ANALYTICS_DATA)

class RouteAgentOptionsView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        origin_code = data.get('originCode', 'INNSA')
        dest_code = data.get('destCode', 'AEJEA')
        mode = data.get('mode', 'OCEAN')
        indicative_total = float(data.get('indicativeTotal', 384500))
        is_hazardous = bool(data.get('isHazardous', False))
        is_temp = bool(data.get('isTempControlled', False))

        routes = build_route_options(
            origin_code=origin_code,
            dest_code=dest_code,
            mode=mode,
            indicative_total=indicative_total,
            is_hazardous=is_hazardous,
            is_temp=is_temp
        )
        return Response({
            'originCode': origin_code,
            'destCode': dest_code,
            'count': len(routes),
            'routes': routes
        }, status=status.HTTP_200_OK)
