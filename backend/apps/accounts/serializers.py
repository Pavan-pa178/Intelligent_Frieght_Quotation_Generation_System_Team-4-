from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    company = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'name', 'company', 'role', 'phone')

    def get_name(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full if full else obj.username.split('@')[0]

    def get_company(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.company
        return 'Company'

    def get_role(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.role
        return 'Broker'

    def get_phone(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.phone
        return ''

class RegisterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(write_only=True, required=False)
    company = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'name', 'company', 'phone')

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        company = validated_data.pop('company', 'Company')
        phone = validated_data.pop('phone', '')
        email = validated_data['email'].strip().lower()
        password = validated_data['password']

        names = name.split(' ') if name else []
        first_name = names[0] if len(names) > 0 else ''
        last_name = ' '.join(names[1:]) if len(names) > 1 else ''

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        UserProfile.objects.create(user=user, company=company, phone=phone)
        return user
