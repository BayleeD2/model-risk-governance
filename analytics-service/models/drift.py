from pydantic import BaseModel, Field
from typing import Optional


class PSIRequest(BaseModel):
    expected: list[float] = Field(..., description="Baseline/training distribution values")
    actual: list[float] = Field(..., description="Current/production distribution values")
    bins: int = Field(default=10, ge=2, le=50)


class PSIResponse(BaseModel):
    psi: float
    interpretation: str  # "stable" | "moderate_shift" | "significant_shift"
    bin_details: list[dict]


class KSRequest(BaseModel):
    reference: list[float] = Field(..., description="Reference/baseline sample")
    current: list[float] = Field(..., description="Current production sample")


class KSResponse(BaseModel):
    ks_statistic: float
    p_value: float
    interpretation: str  # "stable" | "moderate_shift" | "significant_shift"


class CSIFeatureInput(BaseModel):
    expected: list[float]
    actual: list[float]


class CSIRequest(BaseModel):
    features: dict[str, CSIFeatureInput] = Field(
        ..., description="Map of feature name to expected/actual distributions"
    )
    bins: int = Field(default=10, ge=2, le=50)


class CSIFeatureResult(BaseModel):
    csi: float
    interpretation: str


class CSIResponse(BaseModel):
    csi_by_feature: dict[str, CSIFeatureResult]
    overall_csi: float
    interpretation: str
