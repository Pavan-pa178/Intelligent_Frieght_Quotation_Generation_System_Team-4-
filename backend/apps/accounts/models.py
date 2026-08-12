from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    company = models.CharField(max_length=255, default='Sharma Textiles')
    role = models.CharField(max_length=50, default='Broker')
    phone = models.CharField(max_length=50, blank=True, default='+91 98765 43210')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.company} ({self.role})"
