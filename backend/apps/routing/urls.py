from django.urls import path
from .views import RouteAnalyticsView, RouteAgentOptionsView

urlpatterns = [
    path('analytics/', RouteAnalyticsView.as_view(), name='route_analytics'),
    path('options/', RouteAgentOptionsView.as_view(), name='route_agent_options'),
]
