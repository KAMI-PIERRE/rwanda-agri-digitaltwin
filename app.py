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
        self.base_growth_rate = 0.055  # 5.5% baseline growth
        self.base_volatility = 0.02
        # Calibration knobs
        # baseline_alpha: additional growth rate applied even when no interventions (represents structural improvements)
        self.baseline_alpha = 0.02480  # calibrated to achieve 45% at 35% baseline interventions
        self.alpha_scale = 0.1100  # calibrated to yield ~90% at full implementation (realistic ceiling)
        self.beta_scale = 1.0
        self.volatility_floor = 0.05  # high floor ensures significant uncertainty
        
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
        
        # Apply scaling to alpha/beta for calibration
        effective_alpha = self.alpha * self.alpha_scale
        effective_beta = self.beta * self.beta_scale

        # Drift includes baseline_alpha (autonomous improvement) plus intervention contributions
        drift = self.base_growth_rate + self.baseline_alpha + np.dot(effective_alpha, intervention_vector)
        # Use configured volatility floor to keep uncertainty realistic
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
        
        return {
            'probability': probability,
            'mean_ppp': float(np.mean(results_array)),
            'median_ppp': float(np.median(results_array)),
            'distribution': results_array.tolist(),  # Send all data to frontend
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
    # Lowered default target intensities to produce more realistic baseline
    "Land Consolidation": 35,
    "Land Use Productivity": 35,
    "Irrigation & Water Use Efficiency": 35,
    "Climate Adaptation Index": 35,
    "Staple Crop Productivity": 35,
    "Cash Crop Productivity": 35,
    "Livestock Productivity (Breed Improvement & Feeding Systems)": 35,
    "Inputs Efficiency (fertilizer, seeds)": 35,
    "Soil Health Indicators": 35,
    "Mechanization": 35,
    "Digital Agriculture Adoption": 35,
    "R&D + Extension (AI-augmented advisory)": 35,
    "Digital Twin simulations for plots & cooperatives": 35,
    # For Postharvest Loss (%), use a conservative default (higher loss = worse)
    "Postharvest Loss (%)": 60,
    "Storage/Processing Value Addition": 35,
    "Access to Finance": 35,
    "Insurance Penetration": 35,
    "Domestic Market Integration": 35,
    "Export Competitiveness": 35,
    "Supply–Demand Stability Score (AI forecast model)": 35
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
    """Generate base64 encoded chart with dense histogram"""
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # Plot histogram with more bins for denser visualization
    n_bins = max(50, int(np.sqrt(len(distribution))))  # Adaptive bins based on data size
    ax.hist(distribution, bins=n_bins, alpha=0.75, color='#2E86AB', edgecolor='#1a4d7a', linewidth=0.5)
    
    # Add target line
    ax.axvline(x=7000, color='#E63946', linestyle='--', linewidth=2.5, label='Target: $7,000', zorder=10)
    
    # Add mean line
    mean_val = np.mean(distribution)
    ax.axvline(x=mean_val, color='#457B9D', linestyle='-', linewidth=2, alpha=0.9, label=f'Mean: ${mean_val:,.0f}', zorder=9)
    
    # Add median line
    median_val = np.median(distribution)
    ax.axvline(x=median_val, color='#F4A261', linestyle=':', linewidth=2, alpha=0.8, label=f'Median: ${median_val:,.0f}', zorder=8)
    
    # Styling
    ax.set_xlabel('Agriculture PPP per Capita (International $)', fontsize=13, fontweight='bold')
    ax.set_ylabel('Frequency (Number of Simulations)', fontsize=13, fontweight='bold')
    ax.set_title('Monte Carlo Simulation Results - 2050 Projection', fontsize=15, fontweight='bold', pad=20)
    ax.grid(True, alpha=0.3, linestyle='--')
    ax.legend(fontsize=11, loc='upper left', framealpha=0.95)
    
    # Format x-axis with dollar signs
    ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
    
    # Add probability annotation with better styling
    prob = np.mean(np.array(distribution) >= 7000) * 100
    stats_text = f'Success Rate: {prob:.1f}%\nSimulations: {len(distribution):,}'
    ax.text(0.98, 0.97, stats_text, 
            transform=ax.transAxes, fontsize=11, fontweight='bold',
            verticalalignment='top', horizontalalignment='right',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.9, edgecolor='#2E86AB', linewidth=1.5))
    
    plt.tight_layout()
    
    # Convert to base64
    buf = BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')
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
    # Build a structured interventions list to drive the dashboard sliders
    categories = [
        'land_water', 'land_water', 'land_water', 'land_water',
        'productivity', 'productivity', 'productivity', 'productivity',
        'productivity', 'productivity', 'technology', 'technology',
        'technology', 'value_chain', 'value_chain', 'finance_risk',
        'finance_risk', 'value_chain', 'value_chain', 'technology'
    ]

    units = [
        '%', '%', '%', 'index', '%', '%', '%', '%', 'index', '%',
        '%', '%', '%', '%', '%', '%', '%', '%', '%', 'index'
    ]

    intervention_objects = []
    for i, name in enumerate(INTERVENTIONS):
        intervention_objects.append({
            'id': i,
            'name': name,
            'baseline': DEFAULT_TARGETS.get(name, 50),
            'category': categories[i] if i < len(categories) else 'other',
            'unit': units[i] if i < len(units) else '%'
        })

    return render_template('dashboard.html', 
                          interventions=intervention_objects, 
                          default_targets=DEFAULT_TARGETS)

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


@app.route('/api/model-params')
def model_params():
    """Return model parameters (alpha, beta, base rates) for client-side estimator"""
    try:
        return jsonify({
            'base_year': mc_engine.base_year,
            'target_year': mc_engine.target_year,
            'base_ag_ppp': mc_engine.base_ag_ppp,
            'target_ag_ppp': mc_engine.target_ag_ppp,
            'base_growth_rate': mc_engine.base_growth_rate,
            'baseline_alpha': mc_engine.baseline_alpha,
            'base_volatility': mc_engine.base_volatility,
            'alpha_scale': mc_engine.alpha_scale,
            'beta_scale': mc_engine.beta_scale,
            'volatility_floor': mc_engine.volatility_floor,
            'alpha': mc_engine.alpha.tolist(),
            'beta': mc_engine.beta.tolist()
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