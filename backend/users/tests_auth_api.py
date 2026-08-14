"""
Integration tests for the live auth endpoints: /api/auth/register/,
/api/auth/login/, /api/auth/me/. These use Django's real ORM (SQLite,
pytest-django's transactional test DB) since users/models.py is a normal
Django model, not mongoengine.

Run: pytest users/tests_auth_api.py -v
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestRegister:
    def test_register_creates_user_and_returns_tokens(self, api_client):
        resp = api_client.post("/api/auth/register/", {
            "name": "Asha Rao", "company": "Acme Freight", "email": "asha@example.com",
            "password": "Str0ngPassw0rd!",
        }, format="json")
        assert resp.status_code == 201, resp.data
        assert "access" in resp.data and "refresh" in resp.data
        assert resp.data["user"]["email"] == "asha@example.com"
        assert User.objects.filter(email="asha@example.com").exists()

    def test_register_duplicate_email_rejected(self, api_client):
        payload = {"name": "A", "company": "", "email": "dupe@example.com", "password": "Str0ngPassw0rd!"}
        first = api_client.post("/api/auth/register/", payload, format="json")
        assert first.status_code == 201
        second = api_client.post("/api/auth/register/", payload, format="json")
        assert second.status_code == 400
        assert "already exists" in second.data["detail"]

    def test_register_missing_email_rejected(self, api_client):
        resp = api_client.post("/api/auth/register/", {"name": "A", "password": "Str0ngPassw0rd!"}, format="json")
        assert resp.status_code == 400

    def test_register_missing_password_rejected(self, api_client):
        resp = api_client.post("/api/auth/register/", {"name": "A", "email": "x@example.com"}, format="json")
        assert resp.status_code == 400

    def test_register_weak_password_rejected(self, api_client):
        # Django's default validators reject short/common passwords
        resp = api_client.post("/api/auth/register/", {
            "name": "A", "email": "weak@example.com", "password": "123",
        }, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestLogin:
    def _register(self, api_client, email="login@example.com", password="Str0ngPassw0rd!"):
        api_client.post("/api/auth/register/", {
            "name": "L", "company": "", "email": email, "password": password,
        }, format="json")

    def test_login_correct_credentials(self, api_client):
        self._register(api_client)
        resp = api_client.post("/api/auth/login/", {"email": "login@example.com", "password": "Str0ngPassw0rd!"}, format="json")
        assert resp.status_code == 200
        assert "access" in resp.data

    def test_login_wrong_password_rejected(self, api_client):
        self._register(api_client)
        resp = api_client.post("/api/auth/login/", {"email": "login@example.com", "password": "wrong"}, format="json")
        assert resp.status_code == 401

    def test_login_unknown_email_rejected(self, api_client):
        resp = api_client.post("/api/auth/login/", {"email": "nobody@example.com", "password": "whatever"}, format="json")
        assert resp.status_code == 401

    def test_login_email_case_insensitive(self, api_client):
        self._register(api_client, email="CaseTest@Example.com")
        resp = api_client.post("/api/auth/login/", {"email": "casetest@example.com", "password": "Str0ngPassw0rd!"}, format="json")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestMe:
    def test_me_requires_auth(self, api_client):
        resp = api_client.get("/api/auth/me/")
        assert resp.status_code == 401

    def test_me_returns_profile_with_valid_token(self, api_client):
        reg = api_client.post("/api/auth/register/", {
            "name": "Profile Test", "company": "Acme", "email": "me@example.com", "password": "Str0ngPassw0rd!",
        }, format="json")
        token = reg.data["access"]
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = api_client.get("/api/auth/me/")
        assert resp.status_code == 200
        assert resp.data["email"] == "me@example.com"
        assert resp.data["company"] == "Acme"