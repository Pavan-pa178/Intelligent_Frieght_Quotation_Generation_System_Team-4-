from datetime import date as date_cls

from rest_framework import serializers

from core.serializers import RenamedFieldsMixin

from .models import STATUS_CHOICES, ContactInfo, Shipment, TrackingStep


class TrackingStepSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=80)
    loc = serializers.CharField(max_length=120, allow_blank=True, required=False, default='')
    ts = serializers.CharField(max_length=64, required=False, default='Pending')
    done = serializers.BooleanField(required=False, default=False)
    current = serializers.BooleanField(required=False, default=False)


class ContactInfoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, allow_blank=True, required=False, default='')
    company = serializers.CharField(max_length=160, allow_blank=True, required=False, default='')
    email = serializers.CharField(max_length=160, allow_blank=True, required=False, default='')
    phone = serializers.CharField(max_length=32, allow_blank=True, required=False, default='')


class ShipmentSerializer(RenamedFieldsMixin, serializers.Serializer):
    """
    Wire shape matches mockData.js exactly:
        { tn, from, to, service, status, weight, cost, date, steps: [...] }
    plus the booking-detail fields Ship.jsx sends on create.
    """

    RENAMED_FIELDS = {'origin': 'from', 'destination': 'to'}

    tn = serializers.CharField(max_length=32)
    origin = serializers.CharField(max_length=120)
    destination = serializers.CharField(max_length=120)
    service = serializers.CharField(max_length=64)
    status = serializers.ChoiceField(choices=STATUS_CHOICES, required=False, default='Booked')
    weight = serializers.FloatField(min_value=0, required=False, default=0)
    cost = serializers.IntegerField(min_value=0, required=False, default=0)
    date = serializers.CharField(max_length=10, required=False)
    steps = TrackingStepSerializer(many=True, required=False, default=list)

    contact = ContactInfoSerializer(required=False)
    declValue = serializers.FloatField(min_value=0, required=False, default=0)
    note = serializers.CharField(required=False, allow_blank=True, default='')
    fragile = serializers.BooleanField(required=False, default=False)
    hazmat = serializers.BooleanField(required=False, default=False)
    insurance = serializers.BooleanField(required=False, default=False)

    def validate_tn(self, value):
        value = value.strip().upper()
        if Shipment.objects(tn=value).first():
            raise serializers.ValidationError('A shipment with this tracking number already exists.')
        return value

    def create(self, validated_data):
        steps = validated_data.pop('steps', [])
        contact = validated_data.pop('contact', {})
        validated_data.setdefault('date', date_cls.today().isoformat())

        shipment = Shipment(**validated_data)
        shipment.steps = [TrackingStep(**step) for step in steps]
        shipment.contact = ContactInfo(**contact)
        shipment.owner = self.context.get('owner')
        shipment.save()
        return shipment
