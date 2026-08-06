from rest_framework import serializers
from .models import CARGO_TYPES, TRANSPORT_MODES


class ShipmentEnquirySerializer(serializers.Serializer):
    """
    Validates the incoming enquiry. Not a ModelSerializer because Shipment is
    a mongoengine Document, not a Django ORM model — validation happens here,
    the mongoengine Document is built and saved manually in the view.
    """

    origin = serializers.CharField(max_length=100)
    destination = serializers.CharField(max_length=100)
    ready_date = serializers.DateField()
    transport_mode = serializers.ChoiceField(choices=TRANSPORT_MODES)
    weight_kg = serializers.FloatField(min_value=0.01)
    volume_m3 = serializers.FloatField(min_value=0)
    cargo_type = serializers.ChoiceField(choices=CARGO_TYPES, default="standard")

    def validate(self, data):
        if data["origin"].strip().lower() == data["destination"].strip().lower():
            raise serializers.ValidationError("Origin and destination must differ.")
        return data


class ShipmentResponseSerializer(serializers.Serializer):
    """Shapes a Shipment document for JSON output."""

    id = serializers.CharField(source="pk")
    origin = serializers.CharField()
    destination = serializers.CharField()
    ready_date = serializers.DateTimeField()
    transport_mode = serializers.CharField()
    weight_kg = serializers.FloatField()
    volume_m3 = serializers.FloatField()
    cargo_type = serializers.CharField()
    distance_km = serializers.FloatField()
    transit_days = serializers.FloatField()
    chargeable_kg = serializers.FloatField()
    indicative_total = serializers.DecimalField(max_digits=14, decimal_places=2)
    status = serializers.CharField()
    created_at = serializers.DateTimeField()
