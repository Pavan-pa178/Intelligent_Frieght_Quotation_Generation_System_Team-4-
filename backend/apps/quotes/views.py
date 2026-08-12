from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

SEED_QUOTES = [
  {
    'id': 'QT-2026-00934',
    'customer': 'Sharma Textiles',
    'city': 'Mumbai',
    'laneCode': 'INNSA → AEJEA',
    'laneName': 'Mumbai → Dubai',
    'region': 'Middle East',
    'mode': 'Ocean FCL',
    'modeKey': 'ocean',
    'basis': '2 × 40HC',
    'transit': '6–10 d',
    'indicativeTotal': 384500,
    'status': 'Draft',
    'created': '2 min ago',
    'details': {
      'originGw': { 'code': 'INNSA', 'name': 'Nhava Sheva, Mumbai', 'city': 'Mumbai', 'country': 'India' },
      'destGw': { 'code': 'AEJEA', 'name': 'Jebel Ali, Dubai', 'city': 'Dubai', 'country': 'UAE' },
      'commodity': 'Cotton textile rolls, unbleached',
      'hsCode': '5208.11',
      'grossWeightKg': 18400,
      'routes': [
        {
          'id': 'r1',
          'carrier': 'Maersk',
          'serviceName': 'MECL Direct Express',
          'type': 'Direct',
          'sailingFrequency': 'Weekly sailing (Mon)',
          'reliabilityPct': 94,
          'recommended': True,
          'cost': 384500,
          'indicative': True,
          'scores': { 'transit': 0.92, 'cost': 0.78, 'reliability': 0.94, 'congestion': 0.71, 'composite': 0.86 }
        },
        {
          'id': 'r2',
          'carrier': 'CMA CGM',
          'serviceName': 'EPIC 1 Transhipment',
          'type': '1 Transhipment (Salalah)',
          'sailingFrequency': 'Twice weekly (Wed/Sat)',
          'reliabilityPct': 89,
          'recommended': False,
          'cost': 341200,
          'indicative': True,
          'scores': { 'transit': 0.64, 'cost': 0.95, 'reliability': 0.89, 'congestion': 0.82, 'composite': 0.80 }
        },
        {
          'id': 'r3',
          'carrier': 'Hapag-Lloyd',
          'serviceName': 'AGX Direct Service',
          'type': 'Direct',
          'sailingFrequency': 'Weekly sailing (Fri)',
          'reliabilityPct': 92,
          'recommended': False,
          'cost': 402900,
          'indicative': True,
          'scores': { 'transit': 0.88, 'cost': 0.70, 'reliability': 0.92, 'congestion': 0.65, 'composite': 0.79 }
        }
      ],
      'transitBreakdown': [
        { 'label': 'Pickup leg (34 km road)', 'val': '1.0 d' },
        { 'label': 'Origin dwell — FCL', 'val': '3.0 d' },
        { 'label': 'Sea leg — 1,205 nm ÷ 400', 'val': '3.0 d' },
        { 'label': 'Schedule wait (weekly ÷ 2)', 'val': '3.5 d' },
        { 'label': 'Destination dwell', 'val': '3.0 d' },
        { 'label': 'Delivery leg', 'val': '0.0 d' }
      ]
    }
  },
  {
    'id': 'QT-2026-00933',
    'customer': 'Nordic Imports AB',
    'city': 'Gothenburg',
    'laneCode': 'INNSA → NLRTM',
    'laneName': 'Mumbai → Rotterdam',
    'region': 'Asia–Europe',
    'mode': 'Ocean FCL',
    'modeKey': 'ocean',
    'basis': '1 × 20GP',
    'transit': '24–28 d',
    'indicativeTotal': 215800,
    'status': 'Issued',
    'created': '1 hour ago',
    'details': {
      'originGw': { 'code': 'INNSA', 'name': 'Nhava Sheva, Mumbai', 'city': 'Mumbai', 'country': 'India' },
      'destGw': { 'code': 'NLRTM', 'name': 'Port of Rotterdam', 'city': 'Rotterdam', 'country': 'Netherlands' },
      'commodity': 'Precision engineering components',
      'hsCode': '8483.40',
      'grossWeightKg': 14200,
      'routes': [
        {
          'id': 'r1',
          'carrier': 'MSC Mediterranean Shipping',
          'serviceName': 'IPAK Europe Direct Corridor',
          'type': 'Direct',
          'sailingFrequency': 'Weekly sailing (Thu)',
          'reliabilityPct': 91,
          'recommended': True,
          'cost': 215800,
          'indicative': True,
          'scores': { 'transit': 0.89, 'cost': 0.85, 'reliability': 0.91, 'congestion': 0.75, 'composite': 0.85 }
        },
        {
          'id': 'r2',
          'carrier': 'Hapag-Lloyd',
          'serviceName': 'IOS Express Express',
          'type': 'Direct Express',
          'sailingFrequency': 'Weekly sailing (Tue)',
          'reliabilityPct': 95,
          'recommended': False,
          'cost': 238000,
          'indicative': True,
          'scores': { 'transit': 0.94, 'cost': 0.72, 'reliability': 0.95, 'congestion': 0.80, 'composite': 0.85 }
        }
      ],
      'transitBreakdown': [
        { 'label': 'Pickup leg (45 km road)', 'val': '1.0 d' },
        { 'label': 'Origin dwell — FCL', 'val': '3.0 d' },
        { 'label': 'Sea leg — 6,400 nm ÷ 400', 'val': '16.0 d' },
        { 'label': 'Schedule wait', 'val': '3.5 d' },
        { 'label': 'Destination dwell (Rotterdam)', 'val': '3.0 d' }
      ]
    }
  },
  {
    'id': 'QT-2026-00932',
    'customer': 'Gulf Machinery LLC',
    'city': 'Dubai',
    'laneCode': 'BOM → DXB',
    'laneName': 'Mumbai → Dubai',
    'region': 'Middle East',
    'mode': 'Air Freight',
    'modeKey': 'air',
    'basis': '250 kg ch.',
    'transit': '5–7 d',
    'indicativeTotal': 64300,
    'status': 'Issued',
    'created': '3 hours ago',
    'details': {
      'originGw': { 'code': 'BOM', 'name': 'Mumbai Airport (BOM)', 'city': 'Mumbai', 'country': 'India' },
      'destGw': { 'code': 'DXB', 'name': 'Dubai Intl Airport (DXB)', 'city': 'Dubai', 'country': 'UAE' },
      'commodity': 'High-precision hydraulic pump valves',
      'hsCode': '8413.70',
      'grossWeightKg': 250,
      'routes': [
        {
          'id': 'r1',
          'carrier': 'Emirates SkyCargo',
          'serviceName': 'EK Priority Air Freighter',
          'type': 'Direct Flight',
          'sailingFrequency': 'Daily flights',
          'reliabilityPct': 97,
          'recommended': True,
          'cost': 64300,
          'indicative': True,
          'scores': { 'transit': 0.98, 'cost': 0.80, 'reliability': 0.97, 'congestion': 0.88, 'composite': 0.91 }
        }
      ],
      'transitBreakdown': [
        { 'label': 'Airport handling origin (BOM)', 'val': '1.0 d' },
        { 'label': 'Flight linehaul (1,920 km)', 'val': '0.5 d' },
        { 'label': 'Customs & import handling (DXB)', 'val': '1.5 d' }
      ]
    }
  },
  {
    'id': 'QT-2026-00931',
    'customer': 'Silk Road Traders Ltd',
    'city': 'Singapore',
    'laneCode': 'INNSA → SGSIN',
    'laneName': 'Mumbai → Singapore',
    'region': 'Intra-Asia',
    'mode': 'Ocean LCL',
    'modeKey': 'ocean',
    'basis': '4.2 R/T',
    'transit': '11–16 d',
    'indicativeTotal': 88400,
    'status': 'Draft',
    'created': 'Yesterday',
    'details': {
      'originGw': { 'code': 'INNSA', 'name': 'Nhava Sheva, Mumbai', 'city': 'Mumbai', 'country': 'India' },
      'destGw': { 'code': 'SGSIN', 'name': 'Port of Singapore', 'city': 'Singapore', 'country': 'Singapore' },
      'commodity': 'Organic essential oils & botanical extracts',
      'hsCode': '3301.29',
      'grossWeightKg': 2100,
      'routes': [
        {
          'id': 'r1',
          'carrier': 'ONE Ocean Network Express',
          'serviceName': 'Intra-Asia Loop 2',
          'type': 'Direct',
          'sailingFrequency': 'Twice weekly',
          'reliabilityPct': 93,
          'recommended': True,
          'cost': 88400,
          'indicative': True,
          'scores': { 'transit': 0.91, 'cost': 0.88, 'reliability': 0.93, 'congestion': 0.80, 'composite': 0.88 }
        }
      ],
      'transitBreakdown': [
        { 'label': 'Origin LCL consolidation dwell', 'val': '5.0 d' },
        { 'label': 'Sea leg — 2,450 nm ÷ 400', 'val': '6.1 d' },
        { 'label': 'Destination LCL deconsolidation', 'val': '4.0 d' }
      ]
    }
  },
  {
    'id': 'QT-2026-00930',
    'customer': 'Andes Trading SAC',
    'city': 'Callao',
    'laneCode': 'INNSA → PECLL',
    'laneName': 'Mumbai → Callao',
    'region': 'South America',
    'mode': 'Ocean FCL',
    'modeKey': 'ocean',
    'basis': '—',
    'transit': '—',
    'indicativeTotal': None,
    'status': 'No routing',
    'created': 'Yesterday',
    'details': {
      'originGw': { 'code': 'INNSA', 'name': 'Nhava Sheva, Mumbai', 'city': 'Mumbai', 'country': 'India' },
      'destGw': { 'code': 'PECLL', 'name': 'Port of Callao', 'city': 'Callao', 'country': 'Peru' },
      'commodity': 'Industrial agricultural tools',
      'hsCode': '8201.30',
      'grossWeightKg': 16500,
      'routes': [],
      'transitBreakdown': []
    }
  }
]

from core.mongodb import get_collection

class QuoteListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user_email = request.query_params.get('email', '').strip().lower()
        try:
            col = get_collection('quotes')
            if col is not None:
                query = {'user_email': user_email} if user_email else {}
                db_quotes = list(col.find(query, {'_id': 0}))
                if db_quotes:
                    return Response(db_quotes)
                elif user_email and user_email != 'demo@portline.in':
                    return Response([])
        except Exception:
            pass
        if user_email and user_email != 'demo@portline.in':
            return Response([])
        return Response(SEED_QUOTES)

    def post(self, request):
        payload = request.data
        if not payload:
            return Response({'detail': 'Payload empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        user_email = payload.get('user_email') or (request.user.email if request.user and request.user.is_authenticated else '')
        if user_email:
            payload['user_email'] = user_email.lower()

        try:
            col = get_collection('quotes')
            if col is not None:
                # Upsert by quote id
                qid = payload.get('id')
                if qid:
                    col.update_one({'id': qid}, {'$set': payload}, upsert=True)
                else:
                    col.insert_one(payload)
        except Exception as e:
            pass

        return Response(payload, status=status.HTTP_201_CREATED)

class QuoteDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, quote_id):
        qid = (quote_id or '').strip().upper()
        try:
            col = get_collection('quotes')
            if col is not None:
                found_db = col.find_one({'id': {'$regex': f'^{qid}$', '$options': 'i'}}, {'_id': 0})
                if found_db:
                    return Response(found_db)
        except Exception:
            pass

        found = next((q for q in SEED_QUOTES if q['id'].upper() == qid), SEED_QUOTES[0])
        return Response(found)


class QuoteAgentActionView(APIView):
    """Agent approve / reject a quote and store the decision."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, quote_id):
        from datetime import datetime, timezone
        qid = (quote_id or '').strip()
        action = request.data.get('action', '').strip()   # 'approved' | 'rejected'
        comment = request.data.get('comment', '').strip()
        agent_email = request.data.get('agent_email', '').strip()
        agent_name = request.data.get('agent_name', '').strip()

        if action not in ('approved', 'rejected'):
            return Response({'detail': 'action must be approved or rejected'}, status=status.HTTP_400_BAD_REQUEST)

        review = {
            'status': action,
            'comment': comment,
            'agent_email': agent_email,
            'agent_name': agent_name,
            'reviewed_at': datetime.now(timezone.utc).isoformat(),
        }

        try:
            col = get_collection('quotes')
            if col is not None:
                result = col.update_one(
                    {'id': {'$regex': f'^{qid}$', '$options': 'i'}},
                    {'$set': {'agent_review': review}}
                )
                if result.matched_count == 0:
                    return Response({'detail': f'Quote {qid} not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'ok': True, 'quote_id': qid, 'review': review})
