"""Serializer helpers shared across apps."""


class RenamedFieldsMixin:
    """
    Maps internal field names to different names on the wire.

    Needed because the frontend sends `from` and `to`, which are Python
    keywords and cannot be used as serializer attribute names. Documents
    store `origin`/`destination`; this mixin translates in both directions
    so the frontend contract stays untouched.

        RENAMED_FIELDS = {'origin': 'from', 'destination': 'to'}
    """

    RENAMED_FIELDS = {}

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for internal, wire in self.RENAMED_FIELDS.items():
            if internal in data:
                data[wire] = data.pop(internal)
        return data

    def to_internal_value(self, data):
        if hasattr(data, 'dict'):
            data = data.dict()
        else:
            data = dict(data)
        for internal, wire in self.RENAMED_FIELDS.items():
            if wire in data:
                data[internal] = data.pop(wire)
        return super().to_internal_value(data)
