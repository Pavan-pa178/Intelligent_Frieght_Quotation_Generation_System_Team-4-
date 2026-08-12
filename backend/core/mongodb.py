import os
import logging
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/freight_db')
DB_NAME = os.getenv('MONGO_DB_NAME', 'freight_db')

logger = logging.getLogger(__name__)

_mongo_client = None
_mongo_db = None

def get_mongo_db():
    """
    Returns MongoDB database instance using PyMongo.
    Gracefully handles connection attempts to MongoDB Atlas or local MongoDB.
    """
    global _mongo_client, _mongo_db
    if _mongo_db is not None:
        return _mongo_db

    try:
        from pymongo import MongoClient
        _mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Test connection
        _mongo_client.admin.command('ping')
        _mongo_db = _mongo_client[DB_NAME]
        logger.info(f"Connected successfully to MongoDB database: {DB_NAME}")
        return _mongo_db
    except Exception as e:
        logger.warning(f"MongoDB connection notice: {e}. Falling back to Django ORM storage.")
        return None

def get_collection(collection_name: str):
    db = get_mongo_db()
    if db is not None:
        return db[collection_name]
    return None
