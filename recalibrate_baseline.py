#!/usr/bin/env python3
"""
Calibrate baseline_alpha to achieve 45% when ALL interventions are at 35%
(not at 0%, as the previous calibration did)
"""
import numpy as np

class MonteCarloEngine:
    def __init__(self, baseline_alpha=0.03519):
        self.base_year = 2025
        self.target_year = 2050
        self.base_ag_ppp = 803
        self.target_ag_ppp = 7000
        self.base_growth_rate = 0.055  # Fixed at 5.5%
        self.baseline_alpha = baseline_alpha
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

# Create baseline vector with all interventions at 35%
baseline_vector = np.ones(20) * 0.35
baseline_vector[-1] = 0.40  # Postharvest Loss (%) = 60% means effective_value = 100 - 60 = 40%

print("=" * 70)
print("CALIBRATING FOR 45% BASELINE PROBABILITY AT 35% INTERVENTIONS")
print("With base_growth_rate = 5.5% (fixed)")
print("=" * 70)

# Now calibrate baseline_alpha
print("\nCalibrating baseline_alpha...")
print("(keeping base_growth_rate = 5.5% fixed)")

low, high = -0.100, 0.100  # Wider range, can be negative
tolerance = 0.005
max_iterations = 50
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
        print(f"\nRECOMMENDED SETTINGS FOR 45% AT 35% INTERVENTIONS:")
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
    # If we didn't converge, show final result
    print(f"\n⚠ Did not converge after {max_iterations} iterations")
    final_engine = MonteCarloEngine(baseline_alpha=(low+high)/2)
    final_prob, final_mean, _ = final_engine.run_simulation(baseline_vector, n_simulations=3000)
    print(f"Final estimate: baseline_alpha={(low+high)/2:.5f} produces {final_prob*100:.2f}%")
