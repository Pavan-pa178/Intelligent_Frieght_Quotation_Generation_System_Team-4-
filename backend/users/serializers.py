from rest_framework import serializers

from .models import ContactMessage, User


class UserSerializer(serializers.Serializer):
    """Read-only shape consumed by AppContext / Portal.jsx."""

    id = serializers.CharField(read_only=True)
    name = serializers.CharField(read_only=True)
    company = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)
    since = serializers.CharField(read_only=True)


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    company = serializers.CharField(max_length=160, required=False, allow_blank=True, default='')
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True, default='')
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects(email=value).first():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = User.objects(email=attrs['email'].strip().lower()).first()
        if user is None or not user.check_password(attrs['password']):
            # Same message either way so we don't leak which emails exist.
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'This account is disabled.'})
        attrs['user'] = user
        return attrs


class ContactMessageSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    subject = serializers.CharField(max_length=120, required=False, allow_blank=True, default='General')
    message = serializers.CharField()

    def create(self, validated_data):
        return ContactMessage(**validated_data).save()
