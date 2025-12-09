"""
Rwanda Agriculture Digital Twin - Fixed Flask Application
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import base64
from io import BytesIO
import json
import os
from datetime import datetime

app = Flask(__name__)

# ==================== MONTE CARLO ENGINE ====================

class MonteCarloEngine:
    def __init__(self):
        # Model parameters
        self.base_year = 2025
        self.target_year = 2050
        self.base_ag_ppp = 803
        self.target_ag_ppp = 7000
        self.base_growth_rate = 0.055
        self.base_volatility = 0.02
        
        # Alpha & Beta coefficients (20 interventions)
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
        
        self.costs = np.array([5,4,6,3,4,5,5,4,3,6,3,4,2,3,4,3,3,4,5,3])
        
    def run_simulation(self, intervention_vector, n_simulations=2000):
        """Run Monte Carlo simulation"""
        np.random.seed(42)  # For reproducibility
        
        drift = self.base_growth_rate + np.dot(self.alpha, intervention_vector)
        vol = max(0.004, self.base_volatility - np.dot(self.beta, intervention_vector))
        
        results = []
        for _ in range(n_simulations):
            ppp = self.base_ag_ppp
            for _ in range(self.target_year - self.base_year):
                shock = np.random.normal(0, vol)
                ppp *= (1 + drift + shock)
            results.append(ppp)
        
        results_array = np.array(results)
        probability = float(np.mean(results_array >= self.target_ag_ppp))
        
        return {
            'probability': probability,
            'mean_ppp': float(np.mean(results_array)),
            'median_ppp': float(np.median(results_array)),
            'distribution': results_array.tolist()[:1000],  # Limit for frontend
            'quantiles': {
                'p5': float(np.percentile(results_array, 5)),
                'p25': float(np.percentile(results_array, 25)),
                'p50': float(np.percentile(results_array, 50)),
                'p75': float(np.percentile(results_array, 75)),
                'p95': float(np.percentile(results_array, 95))
            }
        }

# Initialize engine
mc_engine = MonteCarloEngine()

# ==================== INTERVENTIONS CONFIG ====================

INTERVENTIONS = [
    "Land Consolidation",
    "Land Use Productivity", 
    "Irrigation & Water Use Efficiency",
    "Climate Adaptation Index",
    "Staple Crop Productivity",
    "Cash Crop Productivity",
    "Livestock Productivity (Breed Improvement & Feeding Systems)",
    "Inputs Efficiency (fertilizer, seeds)",
    "Soil Health Indicators",
    "Mechanization",
    "Digital Agriculture Adoption",
    "R&D + Extension (AI-augmented advisory)",
    "Digital Twin simulations for plots & cooperatives",
    "Postharvest Loss (%)",
    "Storage/Processing Value Addition",
    "Access to Finance",
    "Insurance Penetration",
    "Domestic Market Integration",
    "Export Competitiveness",
    "Supply–Demand Stability Score (AI forecast model)"
]

DEFAULT_TARGETS = {
    "Land Consolidation": 80,
    "Land Use Productivity": 85,
    "Irrigation & Water Use Efficiency": 88,
    "Climate Adaptation Index": 75,
    "Staple Crop Productivity": 82,
    "Cash Crop Productivity": 80,
    "Livestock Productivity (Breed Improvement & Feeding Systems)": 83,
    "Inputs Efficiency (fertilizer, seeds)": 80,
    "Soil Health Indicators": 82,
    "Mechanization": 78,
    "Digital Agriculture Adoption": 85,
    "R&D + Extension (AI-augmented advisory)": 88,
    "Digital Twin simulations for plots & cooperatives": 85,
    "Postharvest Loss (%)": 22,
    "Storage/Processing Value Addition": 80,
    "Access to Finance": 82,
    "Insurance Penetration": 72,
    "Domestic Market Integration": 85,
    "Export Competitiveness": 82,
    "Supply–Demand Stability Score (AI forecast model)": 87
}

# ==================== HELPER FUNCTIONS ====================

def interventions_to_vector(interventions):
    """Convert intervention dict to vector"""
    vector = []
    for intervention in INTERVENTIONS:
        value = interventions.get(intervention, DEFAULT_TARGETS.get(intervention, 50))
        # For Postharvest Loss, invert (lower is better)
        if intervention == "Postharvest Loss (%)":
            effective_value = 100 - value
        else:
            effective_value = value
        vector.append(effective_value / 100.0)
    return np.array(vector)

def generate_chart(distribution):
    """Generate base64 encoded chart"""
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # Plot histogram
    ax.hist(distribution, bins=40, alpha=0.7, color='#2E86AB', edgecolor='black')
    
    # Add target line
    ax.axvline(x=7000, color='#E63946', linestyle='--', linewidth=2, label='Target: $7,000')
    
    # Add mean line
    mean_val = np.mean(distribution)
    ax.axvline(x=mean_val, color='#457B9D', linestyle='-', linewidth=1.5, alpha=0.8)
    
    # Styling
    ax.set_xlabel('Agriculture PPP per Capita (International $)', fontsize=12)
    ax.set_ylabel('Frequency', fontsize=12)
    ax.set_title('Monte Carlo Simulation Results - 2050 Projection', fontsize=14)
    ax.grid(True, alpha=0.3)
    ax.legend()
    
    # Add probability annotation
    prob = np.mean(np.array(distribution) >= 7000) * 100
    ax.text(0.02, 0.98, f'Probability ≥ $7,000: {prob:.1f}%', 
            transform=ax.transAxes, fontsize=11, fontweight='bold',
            verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    plt.tight_layout()
    
    # Convert to base64
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

# ==================== ROUTES ====================

@app.context_processor
def inject_now():
    """Inject current datetime into all templates"""
    return {'now': datetime.now()}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html', 
                          interventions=INTERVENTIONS, 
                          defaults=DEFAULT_TARGETS)

@app.route('/api/projection', methods=['POST'])
def projection():
    """API endpoint for Monte Carlo projections"""
    try:
        data = request.get_json()
        
        if not data or 'interventions' not in data:
            return jsonify({'error': 'No intervention data'}), 400
        
        # Convert to vector
        x = interventions_to_vector(data['interventions'])
        
        # Run simulation
        n_sim = data.get('n_simulations', 2000)
        results = mc_engine.run_simulation(x, n_simulations=n_sim)
        
        # Generate chart
        chart = generate_chart(results['distribution'])
        
        return jsonify({
            'success': True,
            'results': results,
            'chart': chart
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})

# ==================== RUN APPLICATION ====================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("RWANDA AGRICULTURE DIGITAL TWIN")
    print("="*60)
    print("Dashboard: http://127.0.0.1:5000/dashboard")
    print("API: POST http://127.0.0.1:5000/api/projection")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)