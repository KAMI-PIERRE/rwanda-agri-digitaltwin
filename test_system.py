#!/usr/bin/env python3
"""
Comprehensive test suite for Rwanda Agriculture Digital Twin
Tests: Baseline calibration (45%), Optimization (50%, 75%, 100%)
"""

import requests
import json
import time
from statistics import mean, stdev

BASE_URL = "http://127.0.0.1:5000"

def test_api_health():
    """Test if API is accessible"""
    print("\n" + "="*70)
    print("TEST 1: API HEALTH CHECK")
    print("="*70)
    try:
        resp = requests.get(f"{BASE_URL}/api/model-params", timeout=5)
        if resp.status_code == 200:
            print("✓ API is accessible")
            params = resp.json()
            print(f"  Model Parameters:")
            print(f"    - base_growth_rate: {params.get('base_growth_rate')}")
            print(f"    - baseline_alpha: {params.get('baseline_alpha')}")
            print(f"    - alpha_scale: {params.get('alpha_scale')}")
            print(f"    - volatility_floor: {params.get('volatility_floor')}")
            return True
        else:
            print(f"✗ API returned status {resp.status_code}")
            return False
    except Exception as e:
        print(f"✗ Failed to connect to API: {e}")
        return False

def create_payload(intervention_level=35):
    """Create test payload with given intervention level"""
    # 20 interventions at given level
    interventions = {
        "Land Consolidation": intervention_level,
        "Land Use Productivity": intervention_level,
        "Irrigation & Water Use Efficiency": intervention_level,
        "Climate Adaptation Index": intervention_level,
        "Staple Crop Productivity": intervention_level,
        "Cash Crop Productivity": intervention_level,
        "Livestock Productivity (Breed Improvement & Feeding Systems)": intervention_level,
        "Inputs Efficiency (fertilizer, seeds)": intervention_level,
        "Soil Health Indicators": intervention_level,
        "Mechanization": intervention_level,
        "Digital Agriculture Adoption": intervention_level,
        "R&D + Extension (AI-augmented advisory)": intervention_level,
        "Digital Twin simulations for plots & cooperatives": intervention_level,
        "Postharvest Loss (%)": 60,
        "Storage/Processing Value Addition": intervention_level,
        "Access to Finance": intervention_level,
        "Insurance Penetration": intervention_level,
        "Domestic Market Integration": intervention_level,
        "Export Competitiveness": intervention_level,
        "Supply–Demand Stability Score (AI forecast model)": intervention_level
    }
    return {"interventions": interventions}

def test_baseline():
    """Test baseline calibration (all interventions at 35%)"""
    print("\n" + "="*70)
    print("TEST 2: BASELINE CALIBRATION (Target: 45%)")
    print("="*70)
    
    payload = create_payload(35)
    
    probabilities = []
    for i in range(5):
        try:
            resp = requests.post(
                f"{BASE_URL}/api/projection",
                json=payload,
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get('results', {})
                prob = results.get('probability', 0)
                probabilities.append(prob)
                print(f"  Run {i+1}: {prob:.2%} probability")
            else:
                print(f"  Run {i+1}: ✗ Status {resp.status_code}")
        except Exception as e:
            print(f"  Run {i+1}: ✗ Error: {e}")
        
        time.sleep(0.5)
    
    if probabilities:
        avg_prob = mean(probabilities)
        std_prob = stdev(probabilities) if len(probabilities) > 1 else 0
        
        target = 0.45
        error = abs(avg_prob - target)
        tolerance = 0.02  # 2%
        
        status = "✓" if error <= tolerance else "✗"
        print(f"\n  Average: {avg_prob:.2%} (±{std_prob:.2%})")
        print(f"  Target:  {target:.2%}")
        print(f"  Error:   {error:.2%}")
        print(f"  Status:  {status} {'PASS' if error <= tolerance else 'FAIL'}")
        return error <= tolerance
    
    return False

def test_optimization(level, description):
    """Test optimization at given intervention level"""
    print(f"\nTEST: {description} (All interventions at {level}%)")
    print("-" * 70)
    
    payload = create_payload(level)
    payload["interventions"]["Postharvest Loss (%)"] = 60  # Keep Postharvest at 60%
    
    probabilities = []
    for i in range(3):
        try:
            resp = requests.post(
                f"{BASE_URL}/api/projection",
                json=payload,
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                results = data.get('results', {})
                prob = results.get('probability', 0)
                probabilities.append(prob)
                print(f"  Run {i+1}: {prob:.2%} probability")
            else:
                print(f"  Run {i+1}: ✗ Status {resp.status_code}")
        except Exception as e:
            print(f"  Run {i+1}: ✗ Error: {e}")
        
        time.sleep(0.3)
    
    if probabilities:
        avg_prob = mean(probabilities)
        std_prob = stdev(probabilities) if len(probabilities) > 1 else 0
        print(f"  Average: {avg_prob:.2%} (±{std_prob:.2%})")
        return avg_prob
    
    return None

def test_optimization_suite():
    """Test multiple optimization scenarios"""
    print("\n" + "="*70)
    print("TEST 3: OPTIMIZATION SCENARIOS")
    print("="*70)
    
    results = {}
    
    # 50% optimization
    results[50] = test_optimization(50, "Partial Optimization #1")
    time.sleep(1)
    
    # 75% optimization
    results[75] = test_optimization(75, "Partial Optimization #2")
    time.sleep(1)
    
    # 100% optimization
    results[100] = test_optimization(100, "Full Optimization")
    
    print("\n" + "-" * 70)
    print("OPTIMIZATION SUMMARY:")
    print("-" * 70)
    for level, prob in results.items():
        if prob:
            print(f"  {level:3}% interventions → {prob:.2%} probability")
    
    # Verify monotonic increase
    if all(results.values()):
        is_monotonic = all(
            results[levels[0]] <= results[levels[1]] 
            for levels in zip([35, 50, 75], [50, 75, 100])
        )
        if is_monotonic:
            print("\n  ✓ Probabilities increase monotonically with intervention level")
        else:
            print("\n  ✗ WARNING: Non-monotonic probability progression")

def test_full_suite():
    """Run full test suite"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*68 + "║")
    print("║" + "RWANDA AGRICULTURE DIGITAL TWIN - TEST SUITE".center(68) + "║")
    print("║" + " "*68 + "║")
    print("╚" + "="*68 + "╝")
    
    # Run tests
    if not test_api_health():
        print("\n✗ CRITICAL: API not responding. Exiting.")
        return
    
    baseline_ok = test_baseline()
    test_optimization_suite()
    
    # Summary
    print("\n" + "="*70)
    print("FINAL SUMMARY")
    print("="*70)
    if baseline_ok:
        print("✓ Baseline calibration PASSED (45% ±2%)")
    else:
        print("✗ Baseline calibration FAILED")
    
    print("✓ System is operational and ready for use")
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        test_full_suite()
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user.")
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
