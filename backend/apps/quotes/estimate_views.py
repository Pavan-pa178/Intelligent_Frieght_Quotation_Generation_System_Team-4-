import math
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

DIVISORS = {
    'AIR': 6000,
    'EXPRESS_AIR': 5000,
    'GROUND_RAIL': 4500,
    'OCEAN_LCL': 1000
}

FLAT_UPLIFT = 0.35

class LiveEstimateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        mode = data.get('mode', 'OCEAN').upper()
        load_type = data.get('loadType', 'FCL').upper()
        cargo_items = data.get('cargoItems', [])
        distance_nm = float(data.get('distanceNm', 1205))

        # Calculate actual weight
        gross_weight = 0.0
        for item in cargo_items:
            if item.get('package_type') == 'CONTAINER':
                gross_weight += float(item.get('gross_weight_kg', 0))
            else:
                qty = float(item.get('quantity', 1))
                w = float(item.get('weight_per_unit_kg', 0))
                gross_weight += qty * w

        # Calculate container count or revenue tons / chargeable kg
        if load_type == 'FCL' or any(i.get('package_type') == 'CONTAINER' for i in cargo_items):
            container_count = sum(int(i.get('container_count', 1)) for i in cargo_items) or 1
            units_label = f"{container_count} × 40HC"
            charge_basis = "Per container — FCL"
            base_rate = (95000 + (distance_nm * 45)) * container_count
        elif mode == 'OCEAN' and load_type == 'LCL':
            tonnes = gross_weight / 1000.0
            cbm = sum((float(i.get('length_cm', 0)) * float(i.get('width_cm', 0)) * float(i.get('height_cm', 0)) * float(i.get('quantity', 1))) / 1000000.0 for i in cargo_items)
            rt = max(cbm, tonnes, 1.0)
            units_label = f"{rt:.1f} R/T"
            charge_basis = "Revenue tons — LCL"
            base_rate = max(25000, (12500 + (distance_nm * 8)) * rt)
        else:
            divisor = DIVISORS.get(mode, 6000)
            vol_kg = sum((float(i.get('length_cm', 0)) * float(i.get('width_cm', 0)) * float(i.get('height_cm', 0)) * float(i.get('quantity', 1))) / divisor for i in cargo_items)
            chg_kg = max(gross_weight, vol_kg, 1.0)
            units_label = f"{math.ceil(chg_kg)} kg ch."
            charge_basis = "Chargeable weight"
            per_kg = 280 if mode == 'EXPRESS_AIR' else (180 if mode == 'AIR' else 45)
            base_rate = max(25000, (per_kg * chg_kg) + (distance_nm * 15))

        total_amount = round((base_rate * 1.08) * (1 + FLAT_UPLIFT))

        return Response({
            'isComplete': True,
            'chargeBasis': charge_basis,
            'unitsLabel': units_label,
            'grossWeightKg': round(gross_weight),
            'mainDistanceNm': round(distance_nm),
            'transitRange': '6–10 d',
            'totalAmount': total_amount,
            'totalFormatted': f"₹ {total_amount:,}",
            'currency': 'INR',
            'isIndicative': True
        })
