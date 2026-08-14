"""
Unit tests for shipments/pricing_service.py — the M1 indicative pricing
engine. Pure functions, no DB, no Django test client needed.

Run: pytest shipments/tests_pricing_service.py -v
"""
import math
from decimal import Decimal

import pytest

from shipments.pricing_service import (
    GATEWAYS,
    MODE_CONFIG,
    resolve_gateway,
    haversine_km,
    estimate_transit_days,
    chargeable_weight,
    indicative_total,
    compute_estimate,
    UnresolvedGatewayError,
)


# ---------- resolve_gateway ----------

class TestResolveGateway:
    def test_known_city_lowercase(self):
        gw = resolve_gateway("mumbai")
        assert gw["name"] == "Mumbai, IN"

    def test_case_insensitive_and_whitespace_tolerant(self):
        gw = resolve_gateway("  MUMBAI  ")
        assert gw["name"] == "Mumbai, IN"

    def test_unknown_city_raises(self):
        with pytest.raises(UnresolvedGatewayError):
            resolve_gateway("Atlantis")

    def test_empty_string_raises(self):
        with pytest.raises(UnresolvedGatewayError):
            resolve_gateway("")

    def test_none_raises(self):
        with pytest.raises(UnresolvedGatewayError):
            resolve_gateway(None)


# ---------- haversine_km ----------

class TestHaversine:
    def test_zero_distance_for_same_point(self):
        a = GATEWAYS["mumbai"]
        assert haversine_km(a, a) == pytest.approx(0.0, abs=1e-6)

    def test_known_mumbai_dubai_distance(self):
        # Real-world great-circle distance Mumbai-Dubai is ~1930-1960 km
        d = haversine_km(GATEWAYS["mumbai"], GATEWAYS["dubai"])
        assert 1850 < d < 2050

    def test_symmetric(self):
        a, b = GATEWAYS["mumbai"], GATEWAYS["rotterdam"]
        assert haversine_km(a, b) == pytest.approx(haversine_km(b, a), abs=1e-9)

    def test_long_haul_mumbai_new_york(self):
        # Sanity bound: this is a long-haul pair, should be > 10,000 km
        d = haversine_km(GATEWAYS["mumbai"], GATEWAYS["new york"])
        assert d > 10000


# ---------- estimate_transit_days ----------

class TestEstimateTransit:
    @pytest.mark.parametrize("mode", list(MODE_CONFIG.keys()))
    def test_never_below_one_day(self, mode):
        # Even a ~0 km move should floor at 1.0 day per the max(1.0, ...) clamp
        assert estimate_transit_days(0.01, mode) >= 1.0

    def test_air_faster_than_sea_same_distance(self):
        distance = 5000
        assert estimate_transit_days(distance, "air") < estimate_transit_days(distance, "sea")

    def test_road_faster_than_rail_below_crossover_distance(self):
        # road: 500 km/day + 0.5d dwell -> d/500 + 0.5
        # rail: 650 km/day + 1.0d dwell -> d/650 + 1.0
        # Solving d/500 + 0.5 == d/650 + 1.0 gives a crossover at ~1083 km:
        # below it, road's lower dwell wins; above it, rail's higher speed
        # wins. At d=500 (below crossover) road must be faster.
        distance = 500
        road = estimate_transit_days(distance, "road")
        rail = estimate_transit_days(distance, "rail")
        assert road == pytest.approx(distance / 500 + 0.5, abs=0.05)
        assert rail == pytest.approx(distance / 650 + 1.0, abs=0.05)
        assert road < rail

    def test_rail_faster_than_road_above_crossover_distance(self):
        # At d=2000 (above the ~1083 km crossover) rail's higher line-haul
        # speed overtakes road's lower dwell advantage.
        distance = 2000
        road = estimate_transit_days(distance, "road")
        rail = estimate_transit_days(distance, "rail")
        assert rail < road

    def test_unknown_mode_raises_keyerror(self):
        with pytest.raises(KeyError):
            estimate_transit_days(1000, "hyperloop")

    def test_rounding_to_one_decimal(self):
        result = estimate_transit_days(1234.5, "sea")
        assert result == round(result, 1)


# ---------- chargeable_weight ----------

class TestChargeableWeight:
    def test_actual_weight_dominates_when_denser(self):
        # 500kg in a small 0.5 m3 box -> volumetric = 0.5*250 = 125kg, actual wins
        assert chargeable_weight(weight_kg=500, volume_m3=0.5) == 500

    def test_volumetric_weight_dominates_when_bulky(self):
        # 10kg but 2 m3 -> volumetric = 2*250 = 500kg, volumetric wins
        assert chargeable_weight(weight_kg=10, volume_m3=2) == 500

    def test_zero_volume_falls_back_to_actual(self):
        assert chargeable_weight(weight_kg=42, volume_m3=0) == 42

    def test_none_volume_treated_as_zero(self):
        assert chargeable_weight(weight_kg=42, volume_m3=None) == 42

    def test_none_weight_treated_as_zero(self):
        assert chargeable_weight(weight_kg=None, volume_m3=1) == 250


# ---------- indicative_total ----------

class TestIndicativeTotal:
    def test_returns_decimal_quantized_to_cents(self):
        total = indicative_total(1000, 500, "standard", "sea")
        assert isinstance(total, Decimal)
        # exponent -2 means quantized to 2 decimal places (cents)
        assert total.as_tuple().exponent == -2

    def test_hazardous_costs_more_than_standard(self):
        std = indicative_total(1000, 500, "standard", "air")
        haz = indicative_total(1000, 500, "hazardous", "air")
        assert haz > std
        # CARGO_MULTIPLIER hazardous=1.4 vs standard=1.0
        assert haz == pytest.approx(std * Decimal("1.4"), abs=Decimal("0.5"))

    def test_unknown_cargo_type_defaults_to_1x_multiplier(self):
        std = indicative_total(1000, 500, "standard", "air")
        unknown = indicative_total(1000, 500, "not-a-real-cargo-type", "air")
        assert unknown == std

    def test_fuel_surcharge_applied(self):
        # manually recompute the base and confirm the 12% surcharge is present
        distance, weight, mode = 1000, 500, "sea"
        cfg = MODE_CONFIG[mode]
        base = Decimal(str(distance)) * Decimal(str(cfg["base_rate_per_km"])) * (Decimal(str(weight)) / Decimal("1000"))
        expected = (base * Decimal("1.12")).quantize(Decimal("0.01"))
        assert indicative_total(distance, weight, "standard", mode) == expected

    def test_unknown_mode_raises_keyerror(self):
        with pytest.raises(KeyError):
            indicative_total(1000, 500, "standard", "hyperloop")


# ---------- compute_estimate (integration of the above) ----------

class TestComputeEstimate:
    def test_happy_path_shape(self):
        result = compute_estimate("mumbai", "dubai", weight_kg=200, volume_m3=1, cargo_type="standard", mode="air")
        assert result["is_indicative"] is True
        assert result["origin_label"] == "Mumbai, IN"
        assert result["destination_label"] == "Dubai, AE"
        assert result["distance_km"] > 0
        assert result["transit_days"] >= 1.0
        assert result["chargeable_kg"] >= 200
        assert isinstance(result["indicative_total"], Decimal)

    def test_unresolved_origin_propagates(self):
        with pytest.raises(UnresolvedGatewayError):
            compute_estimate("Nowhereville", "dubai", 100, 1, "standard", "air")

    def test_unresolved_destination_propagates(self):
        with pytest.raises(UnresolvedGatewayError):
            compute_estimate("mumbai", "Nowhereville", 100, 1, "standard", "air")

    def test_same_origin_and_destination_zero_distance(self):
        # pricing_service itself does not reject same-origin/destination
        # (that validation lives in the serializer) — confirm it degrades
        # to zero distance rather than crashing.
        result = compute_estimate("mumbai", "mumbai", 100, 1, "standard", "air")
        assert result["distance_km"] == 0