from datetime import datetime

from django.contrib.auth.hashers import check_password, make_password
from mongoengine import Document, EmailField, StringField, BooleanField, DateTimeField


class User(Document):
    """
    Application user, stored in MongoDB.

    Deliberately NOT django.contrib.auth.User — that model requires a
    relational backend. DRF permission classes only need `is_authenticated`
    and `is_anonymous`, which are provided below.
    """

    name = StringField(required=True, max_length=120)
    company = StringField(max_length=160, default='')
    email = EmailField(required=True, unique=True)
    phone = StringField(max_length=32, default='')
    password = StringField(required=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'users',
        'indexes': ['email'],
        'ordering': ['-created_at'],
    }

    # --- password handling (reuses Django's PBKDF2 hasher) ---

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)

    # --- DRF / SimpleJWT compatibility ---

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def since(self):
        """Human-readable join date, matching the frontend's `user.since`."""
        return self.created_at.strftime('%B %Y')

    def __str__(self):
        return f'{self.name} <{self.email}>'


class ContactMessage(Document):
    """Enquiry submitted from the public Contact page."""

    name = StringField(required=True, max_length=120)
    email = EmailField(required=True)
    subject = StringField(max_length=120, default='General')
    message = StringField(required=True)
    handled = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'contact_messages',
        'ordering': ['-created_at'],
    }

    def __str__(self):
        return f'{self.subject} — {self.email}'
