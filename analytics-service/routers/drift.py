import numpy as np
from scipy import stats
from fastapi import APIRouter, HTTPException

from models.drift import (
    PSIRequest, PSIResponse,
    KSRequest, KSResponse,
    CSIRequest, CSIResponse, CSIFeatureResult,
)

router = APIRouter(prefix="/analytics", tags=["drift"])

# PSI thresholds (industry standard SR 11-7 / SS 1/23 guidance)
PSI_STABLE = 0.1
PSI_MODERATE = 0.25

# KS p-value threshold for flagging shift
KS_P_THRESHOLD = 0.05


def _psi_interpretation(psi: float) -> str:
    if psi < PSI_STABLE:
        return "stable"
    if psi < PSI_MODERATE:
        return "moderate_shift"
    return "significant_shift"


def _ks_interpretation(ks_stat: float, p_value: float) -> str:
    if p_value > KS_P_THRESHOLD:
        return "stable"
    if ks_stat < 0.1:
        return "moderate_shift"
    return "significant_shift"


def _compute_psi(expected: list[float], actual: list[float], bins: int) -> tuple[float, list[dict]]:
    """
    Population Stability Index.
    Returns (psi_value, bin_details_list).
    """
    if len(expected) < 2 or len(actual) < 2:
        raise ValueError("Each distribution must have at least 2 observations")

    # Build bin edges from combined data range
    combined = np.concatenate([expected, actual])
    bin_edges = np.linspace(combined.min(), combined.max(), bins + 1)
    # Ensure last edge is slightly above max to include it
    bin_edges[-1] += 1e-10

    exp_counts, _ = np.histogram(expected, bins=bin_edges)
    act_counts, _ = np.histogram(actual, bins=bin_edges)

    # Convert to proportions, replacing zeros with small epsilon to avoid log(0)
    eps = 1e-6
    exp_pct = np.maximum(exp_counts / len(expected), eps)
    act_pct = np.maximum(act_counts / len(actual), eps)

    bin_psi = (act_pct - exp_pct) * np.log(act_pct / exp_pct)
    psi_value = float(np.sum(bin_psi))

    bin_details = [
        {
            "bin": i + 1,
            "edge_low": float(bin_edges[i]),
            "edge_high": float(bin_edges[i + 1]),
            "expected_pct": float(exp_pct[i]),
            "actual_pct": float(act_pct[i]),
            "bin_psi": float(bin_psi[i]),
        }
        for i in range(bins)
    ]

    return psi_value, bin_details


@router.post("/psi", response_model=PSIResponse)
def compute_psi(req: PSIRequest) -> PSIResponse:
    try:
        psi_value, bin_details = _compute_psi(req.expected, req.actual, req.bins)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return PSIResponse(
        psi=round(psi_value, 6),
        interpretation=_psi_interpretation(psi_value),
        bin_details=bin_details,
    )


@router.post("/ks", response_model=KSResponse)
def compute_ks(req: KSRequest) -> KSResponse:
    if len(req.reference) < 2 or len(req.current) < 2:
        raise HTTPException(status_code=422, detail="Each sample must have at least 2 observations")

    ks_result = stats.ks_2samp(req.reference, req.current)
    ks_stat = float(ks_result.statistic)
    p_value = float(ks_result.pvalue)

    return KSResponse(
        ks_statistic=round(ks_stat, 6),
        p_value=round(p_value, 6),
        interpretation=_ks_interpretation(ks_stat, p_value),
    )


@router.post("/csi", response_model=CSIResponse)
def compute_csi(req: CSIRequest) -> CSIResponse:
    if not req.features:
        raise HTTPException(status_code=422, detail="At least one feature must be provided")

    results: dict[str, CSIFeatureResult] = {}
    csi_values: list[float] = []

    for feature_name, feature_data in req.features.items():
        try:
            csi_val, _ = _compute_psi(feature_data.expected, feature_data.actual, req.bins)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"Feature '{feature_name}': {e}")

        csi_val = round(csi_val, 6)
        csi_values.append(csi_val)
        results[feature_name] = CSIFeatureResult(
            csi=csi_val,
            interpretation=_psi_interpretation(csi_val),
        )

    overall = round(float(np.mean(csi_values)), 6)

    return CSIResponse(
        csi_by_feature=results,
        overall_csi=overall,
        interpretation=_psi_interpretation(overall),
    )
