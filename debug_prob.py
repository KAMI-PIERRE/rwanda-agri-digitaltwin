#!/usr/bin/env python3
"""Quick debug: Test what probability we get at baseline (35%)"""
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
        
        print(f"DEBUG: drift={drift:.6f}, vol={vol:.6f}")
        
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

# Test 1: Zero interventions (baseline_alpha=0.03519)
print("="*70)
print("TEST 1: Zero interventions (all at 0%)")
print("="*70)
zero_vector = np.zeros(20)
engine = MonteCarloEngine(baseline_alpha=0.03519)
prob, mean_ppp, dist = engine.run_simulation(zero_vector, n_simulations=2000)
print(f"Probability: {prob*100:.2f}%")
print(f"Mean PPP: ${mean_ppp:.0f}")

# Test 2: Baseline interventions (35%)
print("\n" + "="*70)
print("TEST 2: Baseline interventions (all at 35%)")
print("="*70)
baseline_vector = np.ones(20) * 0.35
baseline_vector[-1] = 0.40  # Postharvest Loss (%) = 60% means effective_value = 40%
engine2 = MonteCarloEngine(baseline_alpha=0.03519)
prob2, mean_ppp2, dist2 = engine2.run_simulation(baseline_vector, n_simulations=2000)
print(f"Probability: {prob2*100:.2f}%")
print(f"Mean PPP: ${mean_ppp2:.0f}")

print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print(f"Zero interventions (0%):      {prob*100:.2f}%")
print(f"Baseline interventions (35%): {prob2*100:.2f}%")
