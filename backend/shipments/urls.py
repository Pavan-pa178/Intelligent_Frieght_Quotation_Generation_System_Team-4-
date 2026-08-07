from django.urls import path
from .views import ShipmentListCreateView, ShipmentTrackingView

urlpatterns = [
    path("shipments/", ShipmentListCreateView.as_view(), name="shipment-list-create"),
    path("tracking/<str:tracking_number>/", ShipmentTrackingView.as_view(), name="shipment-tracking"),
]