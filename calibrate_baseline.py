#!/usr/bin/env python3
"""
Calibrate Monte Carlo parameters to achieve 45% baseline probability
with base_growth_rate fixed at 5.5%
"""
import numpy as np

class MonteCarloEngine:
    def __init__(self, baseline_alpha=0.0420):
        self.base_year = 2025
        self.target_year = 2050
        self.base_ag_ppp = 803
        self.target_ag_ppp = 7000
        self.base_growth_rate = 0.055  # Fixed at 5.5%
        self.baseline_alpha = baseline_alpha  # Autonomous improvement
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
        
        # Drift includes baseline_alpha (autonomous improvement)
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

baseline_vector = np.zeros(20)  # All interventions at 0

print("=" * 70)
print("CALIBRATING FOR 45% BASELINE PROBABILITY")
print("With base_growth_rate = 5.5% (fixed)")
print("=" * 70)

# First, test current settings
print("\n1. Testing current settings (baseline_alpha=0.0420):")
engine = MonteCarloEngine(baseline_alpha=0.0420)
prob, mean_ppp, _ = engine.run_simulation(baseline_vector, n_simulations=5000)
print(f"   Probability: {prob*100:.2f}%")
print(f"   Mean PPP: ${mean_ppp:.0f}")

# Now calibrate baseline_alpha
print("\n2. Calibrating baseline_alpha to achieve 45%...")
print("   (keeping base_growth_rate = 5.5% fixed)")

low, high = 0.001, 0.15
tolerance = 0.005
max_iterations = 25
iteration = 0
target_prob = 0.45

while (high - low) > 0.0001 and iteration < max_iterations:
    mid = (low + high) / 2
    engine = MonteCarloEngine(baseline_alpha=mid)
    prob, mean_ppp, _ = engine.run_simulation(baseline_vector, n_simulations=3000)
    
    iteration += 1
    print(f"   Iter {iteration:2d} | baseline_alpha={mid:.5f} | Prob={prob*100:.2f}% | Mean=${mean_ppp:.0f}")
    
    if abs(prob - target_prob) < tolerance:
        print(f"\n✓ CONVERGED: baseline_alpha={mid:.5f} produces {prob*100:.2f}% (target 45.0%)")
        print(f"\nRECOMMENDED SETTINGS:")
        print(f"  base_growth_rate = 0.0550 (fixed at 5.5%)")
        print(f"  baseline_alpha = {mid:.5f}")
        print(f"  alpha_scale = 0.1750 (unchanged)")
        print(f"  volatility_floor = 0.0500 (unchanged)")
        break
    elif prob > target_prob:
        # Probability too high, need lower baseline_alpha
        high = mid
    else:
        # Probability too low, need higher baseline_alpha
        low = mid
else:
    mid = (low + high) / 2
    engine = MonteCarloEngine(baseline_alpha=mid)
    prob, mean_ppp, _ = engine.run_simulation(baseline_vector, n_simulations=3000)
    print(f"\nFinal | baseline_alpha={mid:.5f} produces {prob*100:.2f}% (target 45.0%)")
    print(f"\nRECOMMENDED SETTINGS:")
    print(f"  base_growth_rate = 0.0550 (fixed at 5.5%)")
    print(f"  baseline_alpha = {mid:.5f}")
    print(f"  alpha_scale = 0.1750 (unchanged)")
    print(f"  volatility_floor = 0.0500 (unchanged)")

print("=" * 70)

