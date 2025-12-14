#!/usr/bin/env python3
"""
Quick test to verify 43% baseline probability and distribution chart
"""
import requests
import json

BASE_URL = "http://127.0.0.1:5000"

# Test baseline (all interventions at 0)
print("=" * 60)
print("TESTING BASELINE PROBABILITY (all interventions = 0)")
print("=" * 60)

baseline_interventions = {
    "Drought Tolerant Crops (%)": 0,
    "Irrigation Expansion (%)": 0,
    "Soil Conservation (%)": 0,
    "Agroforestry (%)": 0,
    "Mechanization (%)": 0,
    "Improved Varieties (%)": 0,
    "Fertilizer Access (%)": 0,
    "Pest Management (%)": 0,
    "Training & Knowledge (%)": 0,
    "Credit Access (%)": 0,
    "Market Infrastructure (%)": 0,
    "Value Addition (%)": 0,
    "Postharvest Loss (%)": 0,
    "Climate Info Services (%)": 0,
    "Water Harvesting (%)": 0,
    "Agroecology (%)": 0,
    "Land Tenure Security (%)": 0,
    "Cooperative Strength (%)": 0,
    "Producer Organizations (%)": 0,
    "Youth Engagement (%)": 0
}

payload = {
    "interventions": baseline_interventions,
    "n_simulations": 5000
}

try:
    response = requests.post(
        f"{BASE_URL}/api/projection",
        json=payload,
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        prob = result.get('results', {}).get('probability', 0)
        mean_ppp = result.get('results', {}).get('mean_ppp', 0)
        dist_len = len(result.get('results', {}).get('distribution', []))
        
        print(f"\n✓ SUCCESS")
        print(f"  Baseline Probability: {prob*100:.2f}%")
        print(f"  Mean PPP: ${mean_ppp:.0f}")
        print(f"  Distribution samples: {dist_len}")
        print(f"\n  Expected baseline: ~43%")
        print(f"  Status: {'✓ PASSED' if 0.40 <= prob <= 0.46 else '✗ OUT OF RANGE'}")
        
        if dist_len > 0:
            print(f"\n✓ Distribution chart will have {dist_len} simulation points")
        else:
            print(f"\n✗ WARNING: No distribution data returned")
            
    else:
        print(f"✗ API Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"✗ Error: {e}")

print("\n" + "=" * 60)
print("Testing with all interventions at 100%")
print("=" * 60)

full_interventions = {k: 100 for k in baseline_interventions.keys()}
payload['interventions'] = full_interventions

try:
    response = requests.post(
        f"{BASE_URL}/api/projection",
        json=payload,
        timeout=30
    )
    
    if response.status_code == 200:
        result = response.json()
        prob = result.get('results', {}).get('probability', 0)
        mean_ppp = result.get('results', {}).get('mean_ppp', 0)
        
        print(f"\n✓ SUCCESS")
        print(f"  Full Implementation Probability: {prob*100:.2f}%")
        print(f"  Mean PPP: ${mean_ppp:.0f}")
        print(f"\n  Expected (from calibration): ~80%")
        print(f"  Status: {'✓ REASONABLE RANGE' if 0.75 <= prob <= 0.85 else '⚠ CHECK CALIBRATION'}")
        
    else:
        print(f"✗ API Error: {response.status_code}")
        
except Exception as e:
    print(f"✗ Error: {e}")

print("=" * 60)
