from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Shipment, ShipmentStep, ContactInfo


def shipment_to_dict(s):
    return {
        "tn": s.tn, "from": s.origin, "to": s.destination, "service": s.service,
        "status": s.status, "weight": s.weight, "cost": s.cost, "date": s.date,
        "steps": [{"label": st.label, "loc": st.loc, "ts": st.ts, "done": st.done, "current": st.current} for st in s.steps],
    }


class ShipmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shipments = Shipment.objects(user_id=str(request.user.id)).order_by("-created_at")
        return Response([shipment_to_dict(s) for s in shipments])

    def post(self, request):
        data = request.data
        required = ["tn", "from", "to", "service", "status", "weight", "cost", "date"]
        missing = [f for f in required if data.get(f) in (None, "")]
        if missing:
            return Response({"detail": f"Missing fields: {', '.join(missing)}"}, status=400)
        if Shipment.objects(tn=data["tn"]).first():
            return Response({"detail": "A shipment with this tracking number already exists"}, status=400)

        steps = [ShipmentStep(label=st.get("label",""), loc=st.get("loc",""), ts=st.get("ts",""),
                               done=bool(st.get("done", False)), current=bool(st.get("current", False)))
                 for st in data.get("steps", [])]
        contact_data = data.get("contact") or {}
        contact = ContactInfo(name=contact_data.get("name",""), company=contact_data.get("company",""),
                               email=contact_data.get("email",""), phone=contact_data.get("phone",""))

        shipment = Shipment(
            user_id=str(request.user.id), tn=data["tn"], origin=data["from"], destination=data["to"],
            service=data["service"], status=data["status"], weight=data.get("weight"), cost=data.get("cost"),
            date=data.get("date"), steps=steps, contact=contact, decl_value=str(data.get("declValue","")),
            note=data.get("note",""), fragile=bool(data.get("fragile", False)),
            hazmat=bool(data.get("hazmat", False)), insurance=bool(data.get("insurance", False)),
        )
        shipment.save()
        return Response(shipment_to_dict(shipment), status=201)


class ShipmentTrackingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tracking_number):
        shipment = Shipment.objects(tn__iexact=tracking_number).first()
        if not shipment:
            return Response({"detail": "Not found"}, status=404)
        return Response(shipment_to_dict(shipment))