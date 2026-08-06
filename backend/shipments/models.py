from datetime import datetime

from mongoengine import (
    BooleanField, DateTimeField, Document, EmbeddedDocument,
    EmbeddedDocumentField, EmbeddedDocumentListField, FloatField, IntField,
    ReferenceField, StringField,
)

STATUS_CHOICES = (
    'Booked', 'In Transit', 'Customs', 'Out for Delivery', 'Delivered', 'Cancelled',
)


class TrackingStep(EmbeddedDocument):
    """One row of the Tracking.jsx timeline."""

    label = StringField(required=True, max_length=80)
    loc = StringField(max_length=120, default='')
    ts = StringField(max_length=64, default='Pending')
    done = BooleanField(default=False)
    current = BooleanField(default=False)


class ContactInfo(EmbeddedDocument):
    """Booking contact — present even for anonymous bookings from Ship.jsx."""

    name = StringField(max_length=120, default='')
    company = StringField(max_length=160, default='')
    email = StringField(max_length=160, default='')
    phone = StringField(max_length=32, default='')


class Shipment(Document):
    # `from` and `to` are Python keywords, so they are stored as
    # origin/destination and renamed on the wire by RenamedFieldsMixin.
    tn = StringField(required=True, unique=True, max_length=32)
    origin = StringField(required=True, max_length=120)
    destination = StringField(required=True, max_length=120)
    service = StringField(required=True, max_length=64)
    status = StringField(default='Booked', choices=STATUS_CHOICES)
    weight = FloatField(default=0, min_value=0)     # chargeable kg
    cost = IntField(default=0, min_value=0)         # INR
    date = StringField(max_length=10)               # YYYY-MM-DD, as the UI renders it
    steps = EmbeddedDocumentListField(TrackingStep)

    # Booking detail — captured but not shown in the shipment list.
    contact = EmbeddedDocumentField(ContactInfo, default=ContactInfo)
    declValue = FloatField(default=0, min_value=0)
    note = StringField(default='')
    fragile = BooleanField(default=False)
    hazmat = BooleanField(default=False)
    insurance = BooleanField(default=False)

    owner = ReferenceField('User', required=False)  # null for guest bookings
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'shipments',
        'indexes': ['tn', 'owner', 'status'],
        'ordering': ['-created_at'],
    }

    def __str__(self):
        return f'{self.tn} ({self.origin} -> {self.destination})'
