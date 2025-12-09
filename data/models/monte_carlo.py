"""
Monte Carlo Simulation Engine for Rwanda Agriculture Digital Twin
"""

import numpy as np
from typing import Dict, List, Tuple
import json
from datetime import datetime

class MonteCarloEngine:
    def __init__(self, config_path: str = 'data/config/interventions.json'):
        """Initialize Monte Carlo Engine with configuration"""
        # Load configuration
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Model parameters
        self.base_year = config['model_parameters']['base_year']
        self.target_year = config['model_parameters']['target_year']
        self.base_ag_ppp = config['model_parameters']['base_ag_ppp']
        self.target_ag_ppp = config['model_parameters']['target_ag_ppp']
        self.base_growth_rate = config['model_parameters']['base_growth_rate']
        self.base_volatility = config['model_parameters']['base_volatility']
        
        # Intervention parameters
        self.interventions = config['interventions']
        self.alpha_coefficients = np.array([i['alpha'] for i in self.interventions])
        self.beta_coefficients = np.array([i['beta'] for i in self.interventions])
        self.costs = np.array([i['cost'] for i in self.interventions])
        
        # Calculate years
        self.years = np.arange(self.base_year, self.target_year + 1)
        self.n_years = len(self.years) - 1  # Years to simulate
        
    def run_simulation(self, 
                      intervention_vector: np.ndarray,
                      n_simulations: int = 2000,
                      target_year: int = 2050,
                      random_seed: int = 42) -> Dict:
        """
        Run Monte Carlo simulation for given intervention vector
        
        Parameters:
        -----------
        intervention_vector : np.ndarray
            Array of intervention intensities (0-1 scale)
        n_simulations : int
            Number of Monte Carlo simulations to run
        target_year : int
            Target year for projection
        random_seed : int
            Random seed for reproducibility
            
        Returns:
        --------
        dict : Simulation results including probability, distribution, and statistics
        """
        # Validate input
        if len(intervention_vector) != len(self.interventions):
            raise ValueError(f"Expected {len(self.interventions)} interventions, got {len(intervention_vector)}")
        
        # Set random seed
        np.random.seed(random_seed)
        
        # Calculate drift and volatility based on interventions
        drift = self.base_growth_rate + np.dot(self.alpha_coefficients, intervention_vector)
        volatility = max(0.004, self.base_volatility - np.dot(self.beta_coefficients, intervention_vector))
        
        # Run simulations
        results = []
        for _ in range(n_simulations):
            # Start from base PPP
            ppp = self.base_ag_ppp
            
            # Simulate each year
            for year in range(self.n_years):
                # Random shock with the calculated volatility
                shock = np.random.normal(0, volatility)
                ppp *= (1 + drift + shock)
            
            results.append(ppp)
        
        results_array = np.array(results)
        
        # Calculate statistics
        probability = float(np.mean(results_array >= self.target_ag_ppp))
        mean_ppp = float(np.mean(results_array))
        median_ppp = float(np.median(results_array))
        std_ppp = float(np.std(results_array))
        quantiles = np.percentile(results_array, [5, 25, 50, 75, 95]).tolist()
        
        return {
            'probability': probability,
            'mean_ppp': mean_ppp,
            'median_ppp': median_ppp,
            'std_ppp': std_ppp,
            'distribution': results_array.tolist(),
            'quantiles': {
                'p5': quantiles[0],
                'p25': quantiles[1],
                'p50': quantiles[2],
                'p75': quantiles[3],
                'p95': quantiles[4]
            },
            'drift': drift,
            'volatility': volatility,
            'simulation_params': {
                'n_simulations': n_simulations,
                'target_year': target_year,
                'random_seed': random_seed
            }
        }
    
    def optimize_interventions(self,
                              budget: float = 60,
                              n_iterations: int = 500,
                              n_simulations: int = 1000) -> Dict:
        """
        Optimize intervention mix under budget constraint
        
        Parameters:
        -----------
        budget : float
            Budget constraint (normalized units)
        n_iterations : int
            Number of optimization iterations
        n_simulations : int
            Number of simulations per iteration
            
        Returns:
        --------
        dict : Optimized intervention mix and results
        """
        best_probability = -1
        best_interventions = None
        best_cost = None
        best_results = None
        
        for i in range(n_iterations):
            # Generate random intervention vector within budget
            while True:
                random_vector = np.random.rand(len(self.interventions))
                total_cost = np.dot(self.costs, random_vector)
                
                if total_cost <= budget:
                    break
            
            # Run simulation
            results = self.run_simulation(random_vector, n_simulations=n_simulations)
            
            # Check if this is the best so far
            if results['probability'] > best_probability:
                best_probability = results['probability']
                best_interventions = random_vector.tolist()
                best_cost = total_cost
                best_results = results
        
        return {
            'optimized_interventions': best_interventions,
            'probability': best_probability,
            'total_cost': float(best_cost),
            'budget_utilization': float(best_cost / budget * 100),
            'results': best_results
        }
    
    def sensitivity_analysis(self,
                            baseline_interventions: np.ndarray,
                            n_simulations: int = 1000) -> List[Dict]:
        """
        Perform sensitivity analysis on interventions
        
        Parameters:
        -----------
        baseline_interventions : np.ndarray
            Baseline intervention vector
        n_simulations : int
            Number of simulations per sensitivity test
            
        Returns:
        --------
        list : Sensitivity analysis results for each intervention
        """
        sensitivity_results = []
        
        # Get baseline probability
        baseline_results = self.run_simulation(baseline_interventions, n_simulations)
        baseline_prob = baseline_results['probability']
        
        # Test each intervention
        for idx, intervention in enumerate(self.interventions):
            # Create test vector with this intervention at maximum
            test_vector = baseline_interventions.copy()
            test_vector[idx] = 1.0  # Maximum intensity
            
            # Run simulation
            test_results = self.run_simulation(test_vector, n_simulations)
            test_prob = test_results['probability']
            
            # Calculate marginal impact
            marginal_impact = test_prob - baseline_prob
            
            sensitivity_results.append({
                'intervention': intervention['name'],
                'category': intervention['category'],
                'baseline_intensity': float(baseline_interventions[idx]),
                'test_intensity': 1.0,
                'baseline_probability': baseline_prob,
                'test_probability': test_prob,
                'marginal_impact': marginal_impact,
                'cost': float(self.costs[idx]),
                'cost_effectiveness': marginal_impact / self.costs[idx] if self.costs[idx] > 0 else 0
            })
        
        # Sort by marginal impact
        sensitivity_results.sort(key=lambda x: x['marginal_impact'], reverse=True)
        
        return sensitivity_results