"""
SimpleJWT authentication backed by mongoengine instead of the Django ORM.

The stock `JWTAuthentication.get_user()` calls `get_user_model().objects.get(...)`,
which requires a relational auth table. Our users live in MongoDB, so we override
just that one hook and leave token signing/validation untouched.
"""

from mongoengine.errors import ValidationError as MongoValidationError
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings

from users.models import User


class MongoJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken('Token contained no recognizable user identification')

        try:
            user = User.objects.get(id=user_id)
        except (User.DoesNotExist, MongoValidationError):
            raise AuthenticationFailed('User not found', code='user_not_found')

        if not user.is_active:
            raise AuthenticationFailed('User is inactive', code='user_inactive')

        return user
