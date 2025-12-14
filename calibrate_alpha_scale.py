#!/usr/bin/env python3
"""
Calibrate alpha_scale to achieve 90% probability at 100% interventions
while keeping baseline at 45% for 35% interventions
"""
import numpy as np

class MonteCarloEngine:
    def __init__(self, alpha_scale=0.175):
        self.base_year = 2025
        self.target_year = 2050
        self.base_ag_ppp = 803
        self.target_ag_ppp = 7000
        self.base_growth_rate = 0.055  # Fixed at 5.5%
        self.baseline_alpha = 0.01855  # Fixed (calibrated for 45% baseline)
        self.base_volatility = 0.02
        self.alpha_scale = alpha_scale  # This is what we're calibrating
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
        
        return probability, mean_ppp, results_array

# Test vectors
baseline_vector = np.ones(20) * 0.35
baseline_vector[-1] = 0.40  # Postharvest Loss = 60% → effective 40%

maximum_vector = np.ones(20) * 1.0
maximum_vector[-1] = 0.0  # Postharvest Loss = 100% → effective 0% (no loss reduction)

print("=" * 70)
print("CALIBRATING ALPHA_SCALE FOR 90% MAX PROBABILITY")
print("=" * 70)

# Test current setting
print("\n1. Testing current alpha_scale=0.175:")
engine = MonteCarloEngine(alpha_scale=0.175)
prob_base, mean_base, _ = engine.run_simulation(baseline_vector, n_simulations=3000)
prob_max, mean_max, _ = engine.run_simulation(maximum_vector, n_simulations=3000)
print(f"   Baseline (35%):  {prob_base*100:.2f}% probability")
print(f"   Maximum (100%):  {prob_max*100:.2f}% probability")

# Now calibrate alpha_scale
print("\n2. Calibrating alpha_scale to achieve 90% at maximum...")

low, high = 0.01, 0.30
tolerance = 0.01  # 1% tolerance
max_iterations = 40
iteration = 0
target_prob = 0.90

while (high - low) > 0.001 and iteration < max_iterations:
    mid = (low + high) / 2
    engine = MonteCarloEngine(alpha_scale=mid)
    prob_base, mean_base, _ = engine.run_simulation(baseline_vector, n_simulations=2000)
    prob_max, mean_max, _ = engine.run_simulation(maximum_vector, n_simulations=2000)
    
    iteration += 1
    print(f"   Iter {iteration:2d} | alpha_scale={mid:.5f} | Base={prob_base*100:.2f}% | Max={prob_max*100:.2f}%")
    
    if abs(prob_max - target_prob) < tolerance:
        print(f"\nCONVERGED: alpha_scale={mid:.5f}")
        print(f"\nFINAL RESULTS:")
        print(f"  Baseline (35% interventions):  {prob_base*100:.2f}% probability")
        print(f"  Maximum (100% interventions):  {prob_max*100:.2f}% probability")
        print(f"\nRECOMMENDED SETTINGS:")
        print(f"  alpha_scale = {mid:.5f}")
        break
    elif prob_max > target_prob:
        # Probability too high, need lower alpha_scale
        high = mid
    else:
        # Probability too low, need higher alpha_scale
        low = mid
else:
    # If we didn't converge perfectly, show the best attempt
    final_mid = (low + high) / 2
    final_engine = MonteCarloEngine(alpha_scale=final_mid)
    final_prob_base, _, _ = final_engine.run_simulation(baseline_vector, n_simulations=2000)
    final_prob_max, _, _ = final_engine.run_simulation(maximum_vector, n_simulations=2000)
    print(f"\nBest estimate after {max_iterations} iterations:")
    print(f"  alpha_scale = {final_mid:.5f}")
    print(f"  Baseline: {final_prob_base*100:.2f}%")
    print(f"  Maximum: {final_prob_max*100:.2f}%")
