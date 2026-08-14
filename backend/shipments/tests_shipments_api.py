"""
Integration tests for the live shipments endpoints: POST/GET /api/shipments/,
GET /api/tracking/<tn>/. Shipment is a mongoengine Document, so these run
against mongomock (wired up in conftest.py) rather than a real Mongo instance.
Auth (User, JWT) still goes through Django's real ORM/SQLite test DB.

Run: pytest shipments/tests_shipments_api.py -v
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture
def user(db):
    return User.objects.create_user(username="u@example.com", email="u@example.com", password="pw")


@pytest.fixture
def auth_client(user):
    client = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


VALID_SHIPMENT = {
    "tn": "TN-1001",
    "from": "Mumbai",
    "to": "Dubai",
    "service": "air",
    "status": "Booked",
    "weight": 120.5,
    "cost": 4300.00,
    "date": "2026-08-20",
}


@pytest.mark.django_db
class TestShipmentCreate:
    def test_requires_auth(self):
        resp = APIClient().post("/api/shipments/", VALID_SHIPMENT, format="json")
        assert resp.status_code == 401

    def test_create_with_all_required_fields(self, auth_client):
        resp = auth_client.post("/api/shipments/", VALID_SHIPMENT, format="json")
        assert resp.status_code == 201, resp.data
        assert resp.data["tn"] == "TN-1001"
        assert resp.data["from"] == "Mumbai"
        assert resp.data["status"] == "Booked"

    def test_missing_required_field_rejected(self, auth_client):
        payload = dict(VALID_SHIPMENT)
        del payload["weight"]
        resp = auth_client.post("/api/shipments/", payload, format="json")
        assert resp.status_code == 400
        assert "weight" in resp.data["detail"]

    def test_duplicate_tracking_number_rejected(self, auth_client):
        first = auth_client.post("/api/shipments/", VALID_SHIPMENT, format="json")
        assert first.status_code == 201
        second = auth_client.post("/api/shipments/", VALID_SHIPMENT, format="json")
        assert second.status_code == 400
        assert "already exists" in second.data["detail"]

    def test_steps_and_contact_persisted(self, auth_client):
        payload = dict(VALID_SHIPMENT, tn="TN-1002", steps=[
            {"label": "Picked up", "loc": "Mumbai", "ts": "2026-08-20T10:00:00Z", "done": True, "current": False},
            {"label": "In transit", "loc": "In air", "ts": "", "done": False, "current": True},
        ], contact={"name": "Asha", "company": "Acme", "email": "a@acme.com", "phone": "+911234567890"})
        resp = auth_client.post("/api/shipments/", payload, format="json")
        assert resp.status_code == 201
        assert len(resp.data["steps"]) == 2
        assert resp.data["steps"][1]["current"] is True


@pytest.mark.django_db
class TestShipmentList:
    def test_list_only_returns_own_shipments(self, auth_client, user):
        auth_client.post("/api/shipments/", VALID_SHIPMENT, format="json")

        other_user = User.objects.create_user(username="other@example.com", email="other@example.com", password="pw")
        other_client = APIClient()
        other_token = str(RefreshToken.for_user(other_user).access_token)
        other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token}")
        other_client.post("/api/shipments/", dict(VALID_SHIPMENT, tn="TN-OTHER"), format="json")

        resp = auth_client.get("/api/shipments/")
        assert resp.status_code == 200
        tns = [s["tn"] for s in resp.data]
        assert "TN-1001" in tns
        assert "TN-OTHER" not in tns

    def test_empty_list_for_new_user(self, auth_client):
        resp = auth_client.get("/api/shipments/")
        assert resp.status_code == 200
        assert resp.data == []


@pytest.mark.django_db
class TestShipmentTracking:
    def test_tracking_found(self, auth_client):
        auth_client.post("/api/shipments/", VALID_SHIPMENT, format="json")
        resp = auth_client.get("/api/tracking/TN-1001/")
        assert resp.status_code == 200
        assert resp.data["tn"] == "TN-1001"

    def test_tracking_case_insensitive(self, auth_client):
        auth_client.post("/api/shipments/", VALID_SHIPMENT, format="json")
        resp = auth_client.get("/api/tracking/tn-1001/")
        assert resp.status_code == 200

    def test_tracking_not_found(self, auth_client):
        resp = auth_client.get("/api/tracking/DOES-NOT-EXIST/")
        assert resp.status_code == 404

    def test_tracking_requires_auth(self):
        resp = APIClient().get("/api/tracking/TN-1001/")
        assert resp.status_code == 401