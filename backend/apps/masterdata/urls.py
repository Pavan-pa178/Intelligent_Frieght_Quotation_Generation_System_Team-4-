from django.urls import path
from .views import GatewaySearchView, ContainerTypesView
from .congestion_views import PortCongestionView

urlpatterns = [
    path('search/', GatewaySearchView.as_view(), name='gateway_search'),
    path('container-types/', ContainerTypesView.as_view(), name='container_types'),
    path('congestion/', PortCongestionView.as_view(), name='port_congestion'),
]
