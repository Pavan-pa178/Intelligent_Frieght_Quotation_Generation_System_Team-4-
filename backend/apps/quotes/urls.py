from django.urls import path
from .views import QuoteListCreateView, QuoteDetailView, QuoteAgentActionView

urlpatterns = [
    path('', QuoteListCreateView.as_view(), name='quote_list_create'),
    path('<str:quote_id>/', QuoteDetailView.as_view(), name='quote_detail'),
    path('<str:quote_id>/action/', QuoteAgentActionView.as_view(), name='quote_agent_action'),
]
