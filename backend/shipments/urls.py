from django.urls import path
from .views import ShipmentListCreateView, ShipmentDetailView, EstimateView

urlpatterns = [
    path("shipments", ShipmentListCreateView.as_view(), name="shipment-list-create"),
    path("shipments/<str:shipment_id>", ShipmentDetailView.as_view(), name="shipment-detail"),
    path("estimate", EstimateView.as_view(), name="estimate"),
]
