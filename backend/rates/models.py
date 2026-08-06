from datetime import datetime

from mongoengine import (
    BooleanField, DateTimeField, Document, FloatField, StringField,
)


class RateConfiguration(Document):
    """
    Per-service pricing parameters. Mirrors the RATES object currently
    hardcoded in the frontend's mockData.js, so the pricing/ML team can
    tune rates without a frontend redeploy.

    All monetary figures in INR.
    """

    key = StringField(required=True, unique=True, max_length=32)   # 'ocean', 'air', ...
    label = StringField(required=True, max_length=64)              # 'Ocean Freight'
    base = FloatField(required=True, min_value=0)                  # flat fee
    per_kg = FloatField(required=True, min_value=0)                # per chargeable kg
    transit = StringField(required=True, max_length=64)            # '18-26 days'
    active = BooleanField(default=True)
    updated_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'rate_configurations',
        'indexes': ['key'],
        'ordering': ['key'],
    }

    def save(self, *args, **kwargs):
        self.updated_at = datetime.utcnow()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.key}: base={self.base} per_kg={self.per_kg}'
