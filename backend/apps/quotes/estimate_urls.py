from django.urls import path
from .estimate_views import LiveEstimateView

urlpatterns = [
    path('', LiveEstimateView.as_view(), name='live_estimate'),
]
