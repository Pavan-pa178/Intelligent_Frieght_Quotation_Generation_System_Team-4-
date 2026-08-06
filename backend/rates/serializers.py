from rest_framework import serializers


class RateConfigurationSerializer(serializers.Serializer):
    """
    Emits camelCase `perKg` to match the frontend's existing RATES shape,
    so getRateTable() can be swapped for a fetch with no other changes.
    """

    key = serializers.CharField(read_only=True)
    label = serializers.CharField(read_only=True)
    base = serializers.FloatField(read_only=True)
    perKg = serializers.FloatField(source='per_kg', read_only=True)
    transit = serializers.CharField(read_only=True)
