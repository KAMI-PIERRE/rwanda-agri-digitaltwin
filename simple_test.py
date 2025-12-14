#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://127.0.0.1:5000"

# Create proper payload
interventions = {
    "Land Consolidation": 35,
    "Land Use Productivity": 35,
    "Irrigation & Water Use Efficiency": 35,
    "Climate Adaptation Index": 35,
    "Staple Crop Productivity": 35,
    "Cash Crop Productivity": 35,
    "Livestock Productivity (Breed Improvement & Feeding Systems)": 35,
    "Inputs Efficiency (fertilizer, seeds)": 35,
    "Soil Health Indicators": 35,
    "Mechanization": 35,
    "Digital Agriculture Adoption": 35,
    "R&D + Extension (AI-augmented advisory)": 35,
    "Digital Twin simulations for plots & cooperatives": 35,
    "Postharvest Loss (%)": 60,
    "Storage/Processing Value Addition": 35,
    "Access to Finance": 35,
    "Insurance Penetration": 35,
    "Domestic Market Integration": 35,
    "Export Competitiveness": 35,
    "Supply–Demand Stability Score (AI forecast model)": 35
}

payload = {"interventions": interventions}

print(f"Sending payload with {len(interventions)} interventions")
print(f"Payload keys: {list(interventions.keys())[:3]}... ")

try:
    resp = requests.post(
        f"{BASE_URL}/api/projection",
        json=payload,
        timeout=15
    )
    print(f"\nStatus: {resp.status_code}")
    data = resp.json()
    
    print(f"Response: {json.dumps(data, indent=2)[:1000]}")
    
except Exception as e:
    print(f"Error: {e}")
