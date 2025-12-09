/**
 * Utility Functions for Rwanda Agriculture Digital Twin
 */

const Utils = {
    // Format numbers with commas
    formatNumber: function(num) {
        if (num === null || num === undefined) return '--';
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    },

    // Format currency
    formatCurrency: function(num) {
        if (num === null || num === undefined) return '--';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    },

    // Format percentage
    formatPercent: function(num) {
        if (num === null || num === undefined) return '--';
        return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(num);
    },

    // Get probability color class
    getProbabilityClass: function(probability) {
        if (probability >= 0.8) return 'probability-high';
        if (probability >= 0.5) return 'probability-medium';
        return 'probability-low';
    },

    // Get probability description
    getProbabilityDescription: function(probability) {
        if (probability >= 0.8) {
            return "High confidence of achieving Vision 2050 target. Current intervention mix is well-aligned with transformation goals.";
        } else if (probability >= 0.6) {
            return "Moderate confidence. Some adjustments needed to increase likelihood of success.";
        } else if (probability >= 0.4) {
            return "Significant improvements required. Consider using AI optimization to identify priority interventions.";
        } else {
            return "Substantial acceleration needed. Review intervention mix and consider increasing budget allocation.";
        }
    },

    // Debounce function for performance
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Download data as JSON
    downloadJSON: function(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Download chart as PNG
    downloadChart: function(canvas, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    },

    // Show notification
    showNotification: function(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#2A9D8F' : type === 'error' ? '#E76F51' : '#2E86AB'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    // Validate intervention values
    validateInterventions: function(interventions) {
        const errors = [];
        
        Object.entries(interventions).forEach(([key, value]) => {
            if (value < 0 || value > 100) {
                errors.push(`${key} must be between 0 and 100`);
            }
            if (isNaN(value)) {
                errors.push(`${key} must be a valid number`);
            }
        });

        return errors;
    },

    // Calculate structural index
    calculateStructuralIndex: function(interventionValues) {
        const values = Object.values(interventionValues);
        if (values.length === 0) return 0;
        
        // Special handling for Postharvest Loss (inverted)
        const adjustedValues = values.map((val, idx) => {
            // Assuming Postharvest Loss is at specific index - adjust based on your data
            return idx === 13 ? 100 - val : val;
        });
        
        const sum = adjustedValues.reduce((a, b) => a + b, 0);
        return (sum / adjustedValues.length).toFixed(1);
    },

    // Generate color gradient
    generateColorGradient: function(startColor, endColor, steps) {
        const start = this.hexToRgb(startColor);
        const end = this.hexToRgb(endColor);
        const colors = [];

        for (let i = 0; i < steps; i++) {
            const r = Math.round(start.r + (end.r - start.r) * (i / (steps - 1)));
            const g = Math.round(start.g + (end.g - start.g) * (i / (steps - 1)));
            const b = Math.round(start.b + (end.b - start.b) * (i / (steps - 1)));
            colors.push(`rgb(${r}, ${g}, ${b})`);
        }

        return colors;
    },

    // Convert hex to RGB
    hexToRgb: function(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    // Get current time
    updateTime: function() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeElement = document.getElementById('current-time');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
};

// Initialize time updates
if (typeof window !== 'undefined') {
    setInterval(() => Utils.updateTime(), 1000);
    document.addEventListener('DOMContentLoaded', () => Utils.updateTime());
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}