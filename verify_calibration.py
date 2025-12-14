#!/usr/bin/env python3
"""
Verify 45% baseline probability and distribution
"""
import numpy as np

class MonteCarloEngine:
    def __init__(self):
        self.base_year = 2025
        self.target_year = 2050
        self.base_ag_ppp = 803
        self.target_ag_ppp = 7000
        self.base_growth_rate = 0.055
        self.baseline_alpha = 0.03519
        self.base_volatility = 0.02
        self.alpha_scale = 0.175
        self.beta_scale = 1.0
        self.volatility_floor = 0.05
        
        self.alpha = np.array([
            0.011, 0.013, 0.016, 0.012, 0.015, 0.015, 0.015, 0.012, 0.013,
            0.015, 0.014, 0.014, 0.010, 0.013, 0.014, 0.011, 0.011,
            0.014, 0.016, 0.015
        ])
        
        self.beta = np.array([
            0.006, 0.005, 0.007, 0.012, 0.005, 0.005, 0.007, 0.006, 0.005,
            0.006, 0.007, 0.007, 0.009, 0.011, 0.005, 0.005, 0.011,
            0.007, 0.005, 0.013
        ])
    
    def run_simulation(self, intervention_vector, n_simulations=5000):
        """Run Monte Carlo simulation"""
        np.random.seed(42)
        
        effective_alpha = self.alpha * self.alpha_scale
        effective_beta = self.beta * self.beta_scale
        
        drift = self.base_growth_rate + self.baseline_alpha + np.dot(effective_alpha, intervention_vector)
        vol = max(self.volatility_floor, self.base_volatility - np.dot(effective_beta, intervention_vector))
        
        results = []
        for _ in range(n_simulations):
            ppp = self.base_ag_ppp
            for _ in range(self.target_year - self.base_year):
                shock = np.random.normal(0, vol)
                ppp *= (1 + drift + shock)
            results.append(ppp)
        
        results_array = np.array(results)
        probability = float(np.mean(results_array >= self.target_ag_ppp))
        mean_ppp = float(np.mean(results_array))
        median_ppp = float(np.median(results_array))
        
        return probability, mean_ppp, median_ppp, results_array

print("=" * 70)
print("VERIFICATION: 45% BASELINE PROBABILITY WITH 5.5% BASE GROWTH")
print("=" * 70)

baseline_vector = np.zeros(20)
engine = MonteCarloEngine()

print("\n1. BASELINE (all interventions = 0%):")
prob_baseline, mean_baseline, median_baseline, dist_baseline = engine.run_simulation(baseline_vector, n_simulations=5000)
print(f"   Probability: {prob_baseline*100:.2f}%")
print(f"   Mean PPP: ${mean_baseline:.0f}")
print(f"   Median PPP: ${median_baseline:.0f}")
print(f"   Distribution samples: {len(dist_baseline)}")
print(f"   Expected: 45% ± 0.5%")
print(f"   Status: {'✓ PASS' if 0.445 <= prob_baseline <= 0.455 else '✗ FAIL'}")

# Test full implementation
print("\n2. FULL IMPLEMENTATION (all interventions = 100%):")
full_vector = np.ones(20)
full_vector[12] = 0  # Postharvest Loss is inverted
prob_full, mean_full, median_full, dist_full = engine.run_simulation(full_vector, n_simulations=5000)
print(f"   Probability: {prob_full*100:.2f}%")
print(f"   Mean PPP: ${mean_full:.0f}")
print(f"   Median PPP: ${median_full:.0f}")
print(f"   Expected: ~75-85%")
print(f"   Status: {'✓ REASONABLE' if 0.70 <= prob_full <= 0.90 else '⚠ CHECK'}")

print("\n3. DISTRIBUTION CHART DATA:")
print(f"   Baseline: {len(dist_baseline)} samples")
print(f"   Full: {len(dist_full)} samples")
print(f"   Ready for Monte Carlo distribution histogram: ✓ YES")

print("\n" + "=" * 70)
print("SUMMARY:")
print(f"  • Baseline calibration: {prob_baseline*100:.2f}% (target: 45.0%)")
print(f"  • Base growth rate: 5.5% (fixed)")
print(f"  • Baseline alpha component: 0.03519")
print(f"  • Distribution samples available for charting: {len(dist_baseline)}")
print("=" * 70)
