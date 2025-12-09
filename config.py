"""
Configuration settings for Rwanda Agriculture Digital Twin
"""

import os
from datetime import datetime

class Config:
    # Application
    APP_NAME = "Rwanda Agriculture Digital Twin"
    APP_VERSION = "1.0.0"
    APP_DESCRIPTION = "AI-driven optimization for Rwanda's agricultural transition to Vision 2050"
    
    # Paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    STATIC_FOLDER = os.path.join(BASE_DIR, 'static')
    TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'templates')
    DATA_FOLDER = os.path.join(BASE_DIR, 'data')
    
    # Monte Carlo Parameters
    BASE_YEAR = 2025
    TARGET_YEAR = 2050
    BASE_AG_PPP = 803  # 2025 baseline
    TARGET_AG_PPP = 7000  # 2050 target
    
    # Growth Parameters
    BASE_GROWTH_RATE = 0.055  # 5.5% baseline growth
    BASE_VOLATILITY = 0.02  # 2% baseline volatility
    
    # Simulation
    DEFAULT_SIMULATIONS = 2000
    MAX_SIMULATIONS = 10000
    
    # Optimization
    DEFAULT_BUDGET = 60  # Normalized budget units
    MAX_BUDGET = 100
    OPTIMIZATION_ITERATIONS = 500
    
    # Visualization
    CHART_WIDTH = 800
    CHART_HEIGHT = 500
    
    # Colors (Rwanda Flag Colors)
    COLORS = {
        'primary': '#00A3E0',  # Rwanda Blue
        'secondary': '#FCD116',  # Rwanda Yellow
        'success': '#1EB53A',  # Rwanda Green
        'danger': '#CE1126',  # Rwanda Red
        'warning': '#FFA500',
        'info': '#17A2B8',
        'light': '#F8F9FA',
        'dark': '#343A40',
        'background': '#F5F7FA'
    }
    
    @classmethod
    def get_intervention_categories(cls):
        """Get intervention categories"""
        return {
            'land_water': 'Land & Water Systems',
            'productivity': 'Productivity Enhancement',
            'technology': 'Technology & Innovation',
            'value_chain': 'Value Chain & Markets',
            'finance_risk': 'Finance & Risk Management'
        }