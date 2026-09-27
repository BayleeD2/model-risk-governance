import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


# ── PSI tests ──────────────────────────────────────────────────────────────────

def test_psi_identical_distributions():
    data = list(range(100))
    resp = client.post("/analytics/psi", json={"expected": data, "actual": data, "bins": 10})
    assert resp.status_code == 200
    body = resp.json()
    assert body["psi"] < 0.01  # identical → near-zero PSI
    assert body["interpretation"] == "stable"


def test_psi_stable():
    import random
    random.seed(42)
    expected = [random.gauss(0, 1) for _ in range(500)]
    actual = [random.gauss(0.05, 1) for _ in range(500)]  # tiny shift
    resp = client.post("/analytics/psi", json={"expected": expected, "actual": actual, "bins": 10})
    assert resp.status_code == 200
    assert resp.json()["interpretation"] == "stable"


def test_psi_significant_shift():
    expected = [float(i) for i in range(100)]
    actual = [float(i + 50) for i in range(100)]  # large shift
    resp = client.post("/analytics/psi", json={"expected": expected, "actual": actual, "bins": 10})
    assert resp.status_code == 200
    assert resp.json()["psi"] > 0.25
    assert resp.json()["interpretation"] == "significant_shift"


def test_psi_returns_bin_details():
    data = [float(i) for i in range(50)]
    resp = client.post("/analytics/psi", json={"expected": data, "actual": data, "bins": 5})
    assert resp.status_code == 200
    assert len(resp.json()["bin_details"]) == 5


def test_psi_too_few_observations():
    resp = client.post("/analytics/psi", json={"expected": [1.0], "actual": [1.0], "bins": 10})
    assert resp.status_code == 422


# ── KS tests ───────────────────────────────────────────────────────────────────

def test_ks_identical_distributions():
    data = [float(i) for i in range(100)]
    resp = client.post("/analytics/ks", json={"reference": data, "current": data})
    assert resp.status_code == 200
    body = resp.json()
    assert body["ks_statistic"] == 0.0
    assert body["p_value"] == 1.0
    assert body["interpretation"] == "stable"


def test_ks_significant_shift():
    reference = [float(i) for i in range(100)]
    current = [float(i + 100) for i in range(100)]  # completely separated
    resp = client.post("/analytics/ks", json={"reference": reference, "current": current})
    assert resp.status_code == 200
    body = resp.json()
    assert body["ks_statistic"] == 1.0
    assert body["p_value"] < 0.05
    assert body["interpretation"] == "significant_shift"


def test_ks_too_few_observations():
    resp = client.post("/analytics/ks", json={"reference": [1.0], "current": [2.0]})
    assert resp.status_code == 422


# ── CSI tests ──────────────────────────────────────────────────────────────────

def test_csi_stable_features():
    data = [float(i) for i in range(100)]
    payload = {
        "features": {
            "feature_a": {"expected": data, "actual": data},
            "feature_b": {"expected": data, "actual": data},
        },
        "bins": 10,
    }
    resp = client.post("/analytics/csi", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["overall_csi"] < 0.01
    assert body["interpretation"] == "stable"
    assert "feature_a" in body["csi_by_feature"]
    assert "feature_b" in body["csi_by_feature"]


def test_csi_mixed_features():
    stable_data = [float(i) for i in range(100)]
    shifted_data = [float(i + 60) for i in range(100)]
    payload = {
        "features": {
            "stable_feature": {"expected": stable_data, "actual": stable_data},
            "drifted_feature": {"expected": stable_data, "actual": shifted_data},
        },
        "bins": 10,
    }
    resp = client.post("/analytics/csi", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["csi_by_feature"]["stable_feature"]["interpretation"] == "stable"
    assert body["csi_by_feature"]["drifted_feature"]["psi" if "psi" in body["csi_by_feature"]["drifted_feature"] else "csi"] > 0.1


def test_csi_empty_features():
    resp = client.post("/analytics/csi", json={"features": {}, "bins": 10})
    assert resp.status_code == 422


# ── Health check ───────────────────────────────────────────────────────────────

def test_healthz():
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
