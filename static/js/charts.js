/**
 * Chart.js Utilities for Rwanda Agriculture Digital Twin
 */

class ChartManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#2E86AB',
            secondary: '#A23B72',
            accent: '#F18F01',
            success: '#2A9D8F',
            warning: '#E9C46A',
            danger: '#E76F51',
            lightGray: '#E9ECEF',
            gridColor: 'rgba(0, 0, 0, 0.05)'
        };
    }

    // Create distribution chart
    createDistributionChart(canvasId, data, targetValue = 7000) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // Calculate statistics
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const sorted = [...data].sort((a, b) => a - b);
        const p5 = sorted[Math.floor(data.length * 0.05)];
        const p50 = sorted[Math.floor(data.length * 0.50)];
        const p95 = sorted[Math.floor(data.length * 0.95)];
        
        // Create histogram with very many bins to show density of all 2000 outcomes
        const binCount = Math.max(150, Math.ceil(data.length / 15)); // Very dense: ~150+ bins for 2000 data points
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binSize = (max - min) / binCount;
        const bins = new Array(binCount).fill(0);
        const labels = new Array(binCount).fill(0).map((_, i) => 
            Math.round(min + i * binSize).toLocaleString()
        );

        data.forEach(value => {
            const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binSize));
            bins[binIndex]++;
        });

        // Create chart
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `All ${data.length} Simulation Outcomes`,
                    data: bins,
                    backgroundColor: this.colors.primary + '95',
                    borderColor: this.colors.primary,
                    borderWidth: 0.2,
                    borderRadius: 1,
                    barPercentage: 1.0,  // No gap between bars
                    categoryPercentage: 1.0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                const start = parseInt(tooltipItems[0].label.replace(/,/g, ''));
                                const end = start + binSize;
                                return `$${start.toLocaleString()} - $${Math.round(end).toLocaleString()}`;
                            },
                            label: function(context) {
                                return `Count: ${context.parsed.y} simulations`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Agriculture PPP per Capita (International $)',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        grid: {
                            color: this.colors.gridColor
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Frequency (Number of Simulations)',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        beginAtZero: true,
                        grid: {
                            color: this.colors.gridColor
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            },
            plugins: [{
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    
                    // Draw target line
                    const targetX = xAxis.getPixelForValue(targetValue);
                    if (targetX >= xAxis.left && targetX <= xAxis.right) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(targetX, yAxis.top);
                        ctx.lineTo(targetX, yAxis.bottom);
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = this.colors.danger;
                        ctx.setLineDash([5, 5]);
                        ctx.stroke();
                        
                        // Add target label
                        ctx.fillStyle = this.colors.danger;
                        ctx.font = 'bold 12px Inter';
                        ctx.textAlign = 'right';
                        ctx.fillText('Target: $7,000', targetX - 10, yAxis.top + 20);
                        ctx.restore();
                    }
                    
                    // Draw mean line
                    const meanX = xAxis.getPixelForValue(mean);
                    if (meanX >= xAxis.left && meanX <= xAxis.right) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(meanX, yAxis.top);
                        ctx.lineTo(meanX, yAxis.bottom);
                        ctx.lineWidth = 1.5;
                        ctx.strokeStyle = this.colors.primary + 'CC';
                        ctx.setLineDash([3, 3]);
                        ctx.stroke();
                        
                        // Add mean label
                        ctx.fillStyle = this.colors.primary;
                        ctx.font = 'bold 12px Inter';
                        ctx.textAlign = 'left';
                        ctx.fillText(`Mean: $${Math.round(mean).toLocaleString()}`, meanX + 10, yAxis.top + 20);
                        ctx.restore();
                    }
                }
            }]
        });

        // Update quantile displays
        document.getElementById('p5-value').textContent = Utils.formatCurrency(p5);
        document.getElementById('p50-value').textContent = Utils.formatCurrency(p50);
        document.getElementById('p95-value').textContent = Utils.formatCurrency(p95);

        return this.charts[canvasId];
    }

    // Create sensitivity chart
    createSensitivityChart(canvasId, sensitivityData) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        // Destroy existing chart
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }

        // Prepare data
        const labels = sensitivityData.map(item => 
            item.intervention.length > 20 
                ? item.intervention.substring(0, 20) + '...' 
                : item.intervention
        );
        
        const impacts = sensitivityData.map(item => item.marginal_impact * 100); // Convert to percentage
        const colors = impacts.map(impact => 
            impact > 0 ? this.colors.success : this.colors.danger
        );

        // Create chart
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Probability Impact (%)',
                    data: impacts,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Impact: ${context.parsed.x.toFixed(2)}%`;
                            },
                            afterLabel: function(context) {
                                const data = sensitivityData[context.dataIndex];
                                return [
                                    `Cost: ${data.cost}`,
                                    `Cost Effectiveness: ${(data.cost_effectiveness * 100).toFixed(2)}% per unit`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Probability Impact (%)',
                            font: {
                                weight: 'bold',
                                size: 12
                            }
                        },
                        grid: {
                            color: this.colors.gridColor
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 10
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });

        return this.charts[canvasId];
    }

    // Create probability ring
    updateProbabilityRing(probability) {
        const ring = document.getElementById('probability-ring');
        const probabilityValue = document.getElementById('probability-value');
        const probabilityBadge = document.getElementById('probability-badge');
        
        if (!ring || !probabilityValue || !probabilityBadge) return;

        // Calculate dash offset (circumference = 2πr = 2π*80 ≈ 502.4)
        const circumference = 502.4;
        const offset = circumference - (probability * circumference);
        
        // Get color based on probability
        const color = this.getProbabilityColor(probability);
        
        // Update ring
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = color;
        
        // Update text
        const percent = (probability * 100).toFixed(1);
        probabilityValue.textContent = percent;
        probabilityValue.className = Utils.getProbabilityClass(probability);
        probabilityValue.style.color = color;
        probabilityBadge.textContent = percent + '%';
        probabilityBadge.className = 'probability-badge ' + Utils.getProbabilityClass(probability);
        probabilityBadge.style.color = color;
        
        // Update interpretation
        const interpretation = document.getElementById('interpretation-text');
        if (interpretation) {
            interpretation.textContent = Utils.getProbabilityDescription(probability);
        }
    }

    // Get color based on probability (red->yellow->green gradient)
    getProbabilityColor(probability) {
        const toRgb = (hex) => {
            const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 0, g: 0, b: 0 };
        };

        const lerp = (a, b, t) => ({
            r: Math.round(a.r + (b.r - a.r) * t),
            g: Math.round(a.g + (b.g - a.g) * t),
            b: Math.round(a.b + (b.b - a.b) * t)
        });

        const hex = (c) => `rgb(${c.r}, ${c.g}, ${c.b})`;

        const red = toRgb('#E74C3C');      // Darker red
        const yellow = toRgb('#F39C12');   // Golden yellow
        const green = toRgb('#27AE60');    // Darker green

        const pct = Math.max(0, Math.min(1, probability));
        let color;
        if (pct <= 0.5) {
            const t = pct / 0.5;
            color = lerp(red, yellow, t);
        } else {
            const t = (pct - 0.5) / 0.5;
            color = lerp(yellow, green, t);
        }

        return hex(color);
    }

    // Destroy all charts
    destroyAllCharts() {
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};
    }

    // Export chart as PNG
    exportChart(canvasId, filename) {
        const chart = this.charts[canvasId];
        if (chart) {
            Utils.downloadChart(chart.canvas, filename);
        }
    }

    // Fullscreen chart
    toggleFullscreen(canvasId) {
        const chart = this.charts[canvasId];
        if (!chart) return;

        const canvas = chart.canvas;
        if (canvas.requestFullscreen) {
            if (!document.fullscreenElement) {
                canvas.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        } else if (canvas.webkitRequestFullscreen) {
            if (!document.webkitFullscreenElement) {
                canvas.webkitRequestFullscreen();
            } else {
                document.webkitExitFullscreen();
            }
        }
    }
}

// Initialize chart manager
const chartManager = new ChartManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = chartManager;
}