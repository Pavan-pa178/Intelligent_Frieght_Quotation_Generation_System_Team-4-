"""Seed the rate table with the values the frontend currently hardcodes."""

from django.core.management.base import BaseCommand

from rates.models import RateConfiguration

DEFAULT_RATES = [
    {'key': 'ocean',   'label': 'Ocean Freight', 'base': 14500, 'per_kg': 68,  'transit': '18–26 days'},
    {'key': 'air',     'label': 'Air Freight',   'base': 21000, 'per_kg': 260, 'transit': '3–5 days'},
    {'key': 'ground',  'label': 'Ground & Rail', 'base': 9500,  'per_kg': 95,  'transit': '5–9 days'},
    {'key': 'express', 'label': 'Express Air',   'base': 27500, 'per_kg': 420, 'transit': '1–2 days'},
]


class Command(BaseCommand):
    help = 'Create or update the default RateConfiguration documents.'

    def handle(self, *args, **options):
        for entry in DEFAULT_RATES:
            rate = RateConfiguration.objects(key=entry['key']).first()
            if rate is None:
                RateConfiguration(**entry).save()
                self.stdout.write(self.style.SUCCESS(f"created  {entry['key']}"))
            else:
                for field, value in entry.items():
                    setattr(rate, field, value)
                rate.active = True
                rate.save()
                self.stdout.write(f"updated  {entry['key']}")
        self.stdout.write(self.style.SUCCESS('Rate table seeded.'))
