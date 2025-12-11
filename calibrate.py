"""
Calibration script to find alpha_scale that produces 80% target probability
when all interventions are set to 100%.
"""

import numpy as np
from app import mc_engine, interventions_to_vector, INTERVENTIONS

def test_alpha_scale(alpha_scale, target_prob=0.80, tolerance=0.02):
    """
    Test a given alpha_scale and return the observed probability.
    """
    # Temporarily set the scale
    original_scale = mc_engine.alpha_scale
    mc_engine.alpha_scale = alpha_scale
    
    # Create intervention vector with all 100s
    interventions = {name: 100 for name in INTERVENTIONS}
    vec = interventions_to_vector(interventions)
    
    # Run simulation
    result = mc_engine.run_simulation(vec, n_simulations=3000)
    prob = result['probability']
    
    # Restore original
    mc_engine.alpha_scale = original_scale
    
    return prob

def calibrate(target_prob=0.80, tolerance=0.01):
    """
    Binary search to find alpha_scale that produces target_prob ± tolerance.
    """
    low, high = 0.05, 0.30
    best_scale = mc_engine.alpha_scale
    best_prob = test_alpha_scale(best_scale, target_prob)
    
    print(f"Calibrating to target probability: {target_prob*100:.1f}% ± {tolerance*100:.1f}%")
    print(f"Initial alpha_scale={best_scale:.4f} → probability={best_prob*100:.2f}%\n")
    
    iterations = 0
    max_iterations = 15
    
    while iterations < max_iterations:
        mid = (low + high) / 2
        prob = test_alpha_scale(mid, target_prob)
        iterations += 1
        
        print(f"Iteration {iterations}: alpha_scale={mid:.4f} → probability={prob*100:.2f}%")
        
        # Check if within tolerance
        if abs(prob - target_prob) <= tolerance:
            print(f"\n✓ CONVERGED: alpha_scale={mid:.4f} produces {prob*100:.2f}% (target {target_prob*100:.1f}%)")
            return mid, prob
        
        # Adjust bounds
        if prob < target_prob:
            # Need higher probability → lower alpha_scale (fewer interventions impact)
            high = mid
        else:
            # Need lower probability → higher alpha_scale (more interventions impact)
            low = mid
    
    print(f"\n⚠ Max iterations reached. Best result: alpha_scale={mid:.4f} → probability={prob*100:.2f}%")
    return mid, prob

if __name__ == '__main__':
    best_alpha_scale, final_prob = calibrate(target_prob=0.80, tolerance=0.01)
    print(f"\nRecommended alpha_scale: {best_alpha_scale:.4f}")
    print(f"Expected probability at 100% interventions: {final_prob*100:.2f}%")
