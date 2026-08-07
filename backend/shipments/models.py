import datetime
from mongoengine import (
    Document, EmbeddedDocument, StringField, FloatField,
    BooleanField, ListField, EmbeddedDocumentField, DateTimeField,
)


class ShipmentStep(EmbeddedDocument):
    label = StringField()
    loc = StringField()
    ts = StringField()
    done = BooleanField(default=False)
    current = BooleanField(default=False)


class ContactInfo(EmbeddedDocument):
    name = StringField()
    company = StringField()
    email = StringField()
    phone = StringField()


class Shipment(Document):
    user_id = StringField(required=True)
    tn = StringField(required=True, unique=True)
    origin = StringField(required=True)
    destination = StringField(required=True)
    service = StringField(required=True)
    status = StringField(default="Booked")
    weight = FloatField()
    cost = FloatField()
    date = StringField()
    steps = ListField(EmbeddedDocumentField(ShipmentStep))
    contact = EmbeddedDocumentField(ContactInfo)
    decl_value = StringField(default="")
    note = StringField(default="")
    fragile = BooleanField(default=False)
    hazmat = BooleanField(default=False)
    insurance = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.datetime.utcnow)

    meta = {"collection": "shipments", "indexes": ["tn", "user_id"], "ordering": ["-created_at"]}