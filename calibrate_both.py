#!/usr/bin/env python3
"""
Simultaneous calibration of both parameters:
- baseline_alpha: achieve 45% at baseline (35%)
- alpha_scale: achieve 90% at maximum (100%)
"""
import numpy as np

class MonteCarloEngine:
    def __init__(self, baseline_alpha=0.01855, alpha_scale=0.175):
        self.base_year = 2025
        self.target_year = 2050
        self.base_ag_ppp = 803
        self.target_ag_ppp = 7000
        self.base_growth_rate = 0.055
        self.baseline_alpha = baseline_alpha
        self.base_volatility = 0.02
        self.alpha_scale = alpha_scale
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
print("SIMULTANEOUS CALIBRATION FOR 45% BASELINE AND 90% MAXIMUM")
print("=" * 70)
print()

# Start with reasonable initial guesses
ba_low, ba_high = 0.0, 0.05
as_low, as_high = 0.08, 0.16

iteration = 0
max_iterations = 100

while iteration < max_iterations:
    ba_mid = (ba_low + ba_high) / 2
    as_mid = (as_low + as_high) / 2
    
    engine = MonteCarloEngine(baseline_alpha=ba_mid, alpha_scale=as_mid)
    prob_base = engine.run_simulation(baseline_vector, n_simulations=2000)
    prob_max = engine.run_simulation(maximum_vector, n_simulations=2000)
    
    iteration += 1
    if iteration % 5 == 0 or iteration <= 10:
        print(f"   Iter {iteration:2d} | ba={ba_mid:.5f} | as={as_mid:.5f} | Base={prob_base*100:.2f}% | Max={prob_max*100:.2f}%")
    
    # Check if converged
    base_error = abs(prob_base - 0.45)
    max_error = abs(prob_max - 0.90)
    
    if base_error < 0.015 and max_error < 0.015:
        print(f"\nCONVERGED at iteration {iteration}!")
        print(f"\nFINAL RESULTS:")
        print(f"  Baseline (35% interventions):  {prob_base*100:.2f}% probability")
        print(f"  Maximum (100% interventions):  {prob_max*100:.2f}% probability")
        print(f"\nRECOMMENDED SETTINGS:")
        print(f"  baseline_alpha = {ba_mid:.5f}")
        print(f"  alpha_scale = {as_mid:.5f}")
        break
    
    # Adjust parameters based on errors
    if prob_base < 0.45:
        ba_low = ba_mid
    else:
        ba_high = ba_mid
    
    if prob_max < 0.90:
        as_low = as_mid
    else:
        as_high = as_mid
else:
    print(f"\nBest result after {max_iterations} iterations:")
    print(f"  Baseline: {prob_base*100:.2f}% (target 45%)")
    print(f"  Maximum: {prob_max*100:.2f}% (target 90%)")
    print(f"\nRECOMMENDED SETTINGS:")
    print(f"  baseline_alpha = {ba_mid:.5f}")
    print(f"  alpha_scale = {as_mid:.5f}")
