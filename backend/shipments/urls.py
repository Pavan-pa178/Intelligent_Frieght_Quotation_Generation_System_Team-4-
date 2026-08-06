from django.urls import path

from .views import ShipmentListCreateView, TrackingView

urlpatterns = [
    path('shipments/', ShipmentListCreateView.as_view(), name='shipment-list-create'),
    path('tracking/<str:tn>/', TrackingView.as_view(), name='shipment-tracking'),
]
