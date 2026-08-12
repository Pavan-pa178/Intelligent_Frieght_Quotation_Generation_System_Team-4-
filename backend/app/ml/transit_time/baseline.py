from app.calc.transit import estimate_transit

def predict_transit_baseline(features: dict) -> dict:
    """
    Baseline Rule-Based Transit Predictor (Section 7.1)
    Ships as default baseline transit estimator.
    """
    distance_nm = float(features.get('distance_nm', 1205))
    mode = features.get('mode', 'OCEAN')
    load_type = features.get('load_type', 'FCL')
    ready_date = features.get('ready_date', '')

    res = estimate_transit(distance_nm, mode, load_type, ready_date)
    return {
        'model_version': 'v1.0-baseline-rule',
        'predicted_days_min': res['minDays'],
        'predicted_days_max': res['maxDays'],
        'transit_range': res['transitRange'],
        'arrival_date': res['arrivalDateFormatted'],
        'is_ml': False
    }
