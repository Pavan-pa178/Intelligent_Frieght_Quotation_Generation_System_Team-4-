"""
Pytest fixtures shared across the suite.

The project's core/settings.py opens a real MongoDB connection at import
time via mongoengine.connect(host=config('MONGO_URI')). For tests we do not
want (and should not need) a live Mongo instance, so we tear that connection
down and replace it with mongomock before any test touches the database.
This has to happen before Django apps are loaded, hence importing mongoengine
directly rather than going through django.setup() first.
"""
import mongoengine
import mongomock
import pytest


def pytest_configure(config):
    mongoengine.disconnect_all()
    mongoengine.connect(
        db="freight_test",
        host="mongodb://localhost",
        mongo_client_class=mongomock.MongoClient,
        alias="default",
    )


@pytest.fixture(autouse=True)
def _clean_mongo_collections():
    """Every test starts with empty Mongo collections (mongomock is in-memory
    and shared across the process, so state can otherwise leak between tests)."""
    yield
    from shipments.models import Shipment
    Shipment.drop_collection()