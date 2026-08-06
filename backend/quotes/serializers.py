from rest_framework import serializers

from core.serializers import RenamedFieldsMixin


class CargoItemSerializer(serializers.Serializer):
    pkgType = serializers.CharField(max_length=32, required=False, default='Pallet')
    qty = serializers.IntegerField(min_value=0, required=False, default=1)
    weight = serializers.FloatField(min_value=0, required=False, default=0)
    length = serializers.FloatField(min_value=0, required=False, default=0)
    width = serializers.FloatField(min_value=0, required=False, default=0)
    height = serializers.FloatField(min_value=0, required=False, default=0)


class QuoteRequestSerializer(RenamedFieldsMixin, serializers.Serializer):
    """Accepts the same `from`/`to` keys the rest of the API uses."""

    RENAMED_FIELDS = {'origin': 'from', 'destination': 'to'}

    origin = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    destination = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    service = serializers.CharField(max_length=32)
    cargo = CargoItemSerializer(many=True)
    insurance = serializers.BooleanField(required=False, default=False)
    hazmat = serializers.BooleanField(required=False, default=False)

    def validate_cargo(self, value):
        if not value:
            raise serializers.ValidationError('At least one cargo item is required.')
        return value
