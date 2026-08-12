from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class QuoteState:
    """
    Typed QuoteState dataclass (Section 6.2)
    Establishes agent state container pattern for route calculation and optimization.
    """
    quote_id: str
    origin_code: str
    dest_code: str
    mode: str = 'OCEAN'
    load_type: str = 'FCL'
    incoterm: str = 'FOB'
    cargo_items: List[Dict[str, Any]] = field(default_factory=list)
    
    # Flags
    is_hazardous: bool = False
    is_temp_controlled: bool = False
    un_number: Optional[str] = None
    imo_class: Optional[str] = None
    
    # Calculation Outputs
    actual_weight_kg: float = 0.0
    volumetric_weight_kg: float = 0.0
    chargeable_units: float = 0.0
    charge_basis: str = 'PER_CONTAINER'
    main_distance_nm: float = 0.0
    
    # Route Agent Outputs
    routes: List[Dict[str, Any]] = field(default_factory=list)
    recommended_route_id: Optional[str] = None
    indicative_total_inr: float = 0.0
    is_indicative: bool = True
