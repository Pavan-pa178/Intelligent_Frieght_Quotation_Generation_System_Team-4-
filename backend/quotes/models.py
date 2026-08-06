from datetime import datetime

from mongoengine import (
    BooleanField, DateTimeField, Document, EmbeddedDocument,
    EmbeddedDocumentListField, FloatField, IntField, ReferenceField, StringField,
)


class CargoItem(EmbeddedDocument):
    pkgType = StringField(max_length=32, default='Pallet')
    qty = IntField(default=1, min_value=0)
    weight = FloatField(default=0, min_value=0)   # kg per unit
    length = FloatField(default=0, min_value=0)   # cm
    width = FloatField(default=0, min_value=0)
    height = FloatField(default=0, min_value=0)


class Quote(Document):
    """
    A priced enquiry. Persisted on every quote request so the pricing team
    has a training/audit trail of what was asked for and what was charged.
    """

    origin = StringField(max_length=120, default='')
    destination = StringField(max_length=120, default='')
    service = StringField(required=True, max_length=32)   # rate key: 'ocean', 'air', ...
    cargo = EmbeddedDocumentListField(CargoItem)

    insurance = BooleanField(default=False)
    hazmat = BooleanField(default=False)

    total_weight = FloatField(default=0)
    volumetric_weight = FloatField(default=0)
    chargeable_weight = FloatField(default=0)
    cost = IntField(default=0)
    transit = StringField(max_length=64, default='')

    owner = ReferenceField('User', required=False)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'quotes',
        'indexes': ['service', 'owner'],
        'ordering': ['-created_at'],
    }

    def __str__(self):
        return f'{self.service} {self.origin}->{self.destination}: {self.cost}'
