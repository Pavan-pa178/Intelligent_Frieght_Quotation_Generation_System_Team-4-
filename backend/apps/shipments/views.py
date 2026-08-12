import uuid
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

SEED_SHIPMENTS = [
  {
    'tn': 'PORT-58213-IN',
    'from': 'Mumbai, IN',
    'to': 'Dubai, AE',
    'service': 'Ocean Freight',
    'status': 'In Transit',
    'weight': 18400,
    'cost': 384500,
    'date': '2026-07-14',
    'steps': [
      { 'label': 'Booked', 'loc': 'Mumbai, IN', 'ts': 'Jul 14, 09:02', 'done': True },
      { 'label': 'Picked up', 'loc': 'JNPT Port, Mumbai', 'ts': 'Jul 15, 14:20', 'done': True },
      { 'label': 'Departed origin port', 'loc': 'Mumbai, IN', 'ts': 'Jul 16, 22:10', 'done': True },
      { 'label': 'In transit — ocean', 'loc': 'Arabian Sea', 'ts': 'Jul 20, 06:00', 'done': True, 'current': True },
      { 'label': 'Customs clearance', 'loc': 'Dubai, AE', 'ts': 'Est. Aug 01', 'done': False },
      { 'label': 'Out for delivery', 'loc': 'Dubai, AE', 'ts': 'Est. Aug 02', 'done': False },
      { 'label': 'Delivered', 'loc': 'Dubai, AE', 'ts': 'Est. Aug 03', 'done': False },
    ],
  },
  {
    'tn': 'PORT-77410-IN',
    'from': 'Bengaluru, IN',
    'to': 'Singapore, SG',
    'service': 'Air Freight',
    'status': 'Delivered',
    'weight': 84,
    'cost': 48200,
    'date': '2026-06-30',
    'steps': [
      { 'label': 'Booked', 'loc': 'Bengaluru, IN', 'ts': 'Jun 30, 08:11', 'done': True },
      { 'label': 'Picked up', 'loc': 'Kempegowda Intl Cargo', 'ts': 'Jun 30, 15:40', 'done': True },
      { 'label': 'Delivered', 'loc': 'Singapore, SG', 'ts': 'Jul 02, 13:47', 'done': True, 'current': True },
    ],
  }
]

from core.mongodb import get_collection

class ShipmentListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user_email = request.query_params.get('email', '').strip().lower()
        try:
            col = get_collection('shipments')
            if col is not None:
                query = {'user_email': user_email} if user_email else {}
                db_shipments = list(col.find(query, {'_id': 0}))
                if db_shipments:
                    return Response(db_shipments)
                elif user_email and user_email != 'demo@portline.in':
                    return Response([])
        except Exception:
            pass
        if user_email and user_email != 'demo@portline.in':
            return Response([])
        return Response(SEED_SHIPMENTS)

    def post(self, request):
        payload = request.data
        if not payload:
            return Response({'detail': 'Payload empty'}, status=status.HTTP_400_BAD_REQUEST)
            
        user_email = payload.get('user_email') or (request.user.email if request.user and request.user.is_authenticated else '')
        if user_email:
            payload['user_email'] = user_email.lower()

        try:
            col = get_collection('shipments')
            if col is not None:
                tn = payload.get('tn')
                if tn:
                    col.update_one({'tn': tn}, {'$set': payload}, upsert=True)
                else:
                    col.insert_one(payload)
        except Exception:
            pass

        return Response({
            'shipment_id': f"SHP-{uuid.uuid4().hex[:8].upper()}",
            'reference': payload.get('tn', 'PORT-REQ-2026'),
            'status': 'DRAFT_CREATED',
            'data': payload
        }, status=status.HTTP_201_CREATED)

class TrackingDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, tracking_number):
        tn = (tracking_number or '').strip().upper()
        try:
            col = get_collection('shipments')
            if col is not None:
                found_db = col.find_one({'tn': {'$regex': f'^{tn}$', '$options': 'i'}}, {'_id': 0})
                if found_db:
                    return Response(found_db)
        except Exception:
            pass

        found = next((s for s in SEED_SHIPMENTS if s['tn'].upper() == tn), None)
        if found:
            return Response(found)
        return Response({'detail': f'Shipment {tracking_number} not found'}, status=status.HTTP_404_NOT_FOUND)

class GenerateQuoteView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, shipment_id):
        run_id = f"RUN-{uuid.uuid4().hex[:8].upper()}"
        return Response({
            'run_id': run_id,
            'shipment_id': shipment_id,
            'status': 'ACCEPTED',
            'message': 'Async Route Agent optimization job started'
        }, status=status.HTTP_202_ACCEPTED)

class AgentRunStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, run_id):
        return Response({
            'run_id': run_id,
            'status': 'COMPLETED',
            'progress': 100,
            'quote_id': 'QT-2026-00934',
            'agent_logs': [
                'Gateway resolved: INNSA -> AEJEA',
                'Route Agent found 3 carrier services',
                'Transit & Cost score calculated'
            ]
        }, status=status.HTTP_200_OK)
