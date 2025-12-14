#!/usr/bin/env python3
"""
Two-step calibration:
1. Fix alpha_scale at 0.12328 (for 90% max)
2. Calibrate baseline_alpha to achieve 45% at baseline
"""
import numpy as np

class MonteCarloEngine:
    def __init__(self, baseline_alpha=0.01855, alpha_scale=0.12328):
        self.base_year = 2025
        self.target_year = 2050
        self.base_ag_ppp = 803
        self.target_ag_ppp = 7000
        self.base_growth_rate = 0.055
        self.baseline_alpha = baseline_alpha  # What we're calibrating
        self.base_volatility = 0.02
        self.alpha_scale = alpha_scale  # Fixed at 0.12328
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
        return probability

baseline_vector = np.ones(20) * 0.35
baseline_vector[-1] = 0.40

maximum_vector = np.ones(20) * 1.0
maximum_vector[-1] = 0.0

print("=" * 70)
print("TWO-STEP CALIBRATION")
print("=" * 70)
print("\nStep 1: alpha_scale = 0.12328 (fixed for 90% max)")
print("Step 2: Calibrate baseline_alpha for 45% baseline")
print()

# Calibrate baseline_alpha
low, high = -0.05, 0.10
tolerance = 0.005
max_iterations = 50
iteration = 0
target_base = 0.45

while (high - low) > 0.0001 and iteration < max_iterations:
    mid = (low + high) / 2
    engine = MonteCarloEngine(baseline_alpha=mid, alpha_scale=0.12328)
    prob_base = engine.run_simulation(baseline_vector, n_simulations=2000)
    prob_max = engine.run_simulation(maximum_vector, n_simulations=2000)
    
    iteration += 1
    print(f"   Iter {iteration:2d} | baseline_alpha={mid:.5f} | Base={prob_base*100:.2f}% | Max={prob_max*100:.2f}%")
    
    if abs(prob_base - target_base) < tolerance:
        print(f"\nCONVERGED: baseline_alpha={mid:.5f}")
        print(f"\nFINAL RESULTS:")
        print(f"  Baseline (35% interventions):  {prob_base*100:.2f}% probability")
        print(f"  Maximum (100% interventions):  {prob_max*100:.2f}% probability")
        print(f"\nRECOMMENDED SETTINGS:")
        print(f"  baseline_alpha = {mid:.5f}")
        print(f"  alpha_scale = 0.12328")
        break
    elif prob_base > target_base:
        # Baseline probability too high, need lower baseline_alpha
        high = mid
    else:
        # Baseline probability too low, need higher baseline_alpha
        low = mid
