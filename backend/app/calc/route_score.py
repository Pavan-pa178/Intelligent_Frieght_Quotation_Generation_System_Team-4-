def score_route(transit_score: float, cost_score: float, reliability_score: float, congestion_score: float, misses_delivery_date: bool = False) -> float:
    """
    Computes composite route score (0.0 to 1.0)
    Section 3.6 formula:
    score = 0.35 * transit_score + 0.30 * cost_score + 0.20 * reliability_score + 0.15 * congestion_score
    If required_delivery_date is missed: score = score * 0.4 (heavy penalty)
    """
    raw_score = (0.35 * transit_score) + (0.30 * cost_score) + (0.20 * reliability_score) + (0.15 * congestion_score)
    if misses_delivery_date:
        raw_score *= 0.4
    return round(max(0.0, min(1.0, raw_score)), 2)
