from app.ml.transit_time.baseline import predict_transit_baseline
from app.ml.transit_time.features import extract_transit_features

USE_ML_TRANSIT_MODEL = False  # Feature flag: set True when ML beats baseline MAE by 15%

def predict_transit(quote_state: dict) -> dict:
    """
    Unified Transit Prediction Dispatcher (Section 7.1)
    Switches between baseline rule estimator and LightGBM model via feature flag.
    """
    features = extract_transit_features(quote_state)
    
    if USE_ML_TRANSIT_MODEL:
        # Placeholder for LightGBM model inference when trained
        return {
            'model_version': 'v1.1-lightgbm-quantile',
            'predicted_days_min': features['distance_nm'] / 400.0 + 3.0,
            'predicted_days_max': features['distance_nm'] / 400.0 + 7.0,
            'transit_range': '6–10 d',
            'is_ml': True
        }
    
    return predict_transit_baseline(features)
