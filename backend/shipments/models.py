import datetime
from mongoengine import (
    Document,
    StringField,
    FloatField,
    DateTimeField,
    DecimalField,
    IntField,
)

CARGO_TYPES = ("standard", "fragile", "hazardous", "perishable")
TRANSPORT_MODES = ("road", "rail", "air", "sea")
STATUS_CHOICES = ("draft", "confirmed", "expired")


class Shipment(Document):
    # Owner
    user_id = StringField(required=True)  # links to the JWT-authenticated user

    # Route
    origin = StringField(required=True)
    destination = StringField(required=True)
    ready_date = DateTimeField(required=True)

    # Service
    transport_mode = StringField(required=True, choices=TRANSPORT_MODES)

    # Cargo
    weight_kg = FloatField(required=True, min_value=0.01)
    volume_m3 = FloatField(required=True, min_value=0)
    cargo_type = StringField(required=True, choices=CARGO_TYPES, default="standard")

    # Computed at creation time by pricing_service — stored so history never
    # silently changes if the rate config or gateway data changes later.
    distance_km = FloatField()
    transit_days = FloatField()
    chargeable_kg = FloatField()
    indicative_total = DecimalField(precision=2)

    status = StringField(choices=STATUS_CHOICES, default="draft")
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {
        "collection": "shipments",
        "indexes": ["user_id", "created_at"],
        "ordering": ["-created_at"],
    }
