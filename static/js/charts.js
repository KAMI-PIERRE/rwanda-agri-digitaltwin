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
        
        // Create histogram data
        const binCount = 40;
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
                    label: 'Frequency',
                    data: bins,
                    backgroundColor: this.colors.primary + '80',
                    borderColor: this.colors.primary,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                const start = parseInt(tooltipItems[0].label.replace(/,/g, ''));
                                const end = start + binSize;
                                return `$${start.toLocaleString()} - $${Math.round(end).toLocaleString()}`;
                            },
                            label: function(context) {
                                return `Frequency: ${context.parsed.y}`;
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
                            text: 'Frequency',
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
        
        // Update ring
        ring.style.strokeDashoffset = offset;
        ring.style.stroke = this.getProbabilityColor(probability);
        
        // Update text
        const percent = (probability * 100).toFixed(1);
        probabilityValue.textContent = percent;
        probabilityValue.className = Utils.getProbabilityClass(probability);
        probabilityBadge.textContent = percent + '%';
        probabilityBadge.className = 'probability-badge ' + Utils.getProbabilityClass(probability);
        
        // Update interpretation
        const interpretation = document.getElementById('interpretation-text');
        if (interpretation) {
            interpretation.textContent = Utils.getProbabilityDescription(probability);
        }
    }

    // Get color based on probability
    getProbabilityColor(probability) {
        if (probability >= 0.8) return this.colors.success;
        if (probability >= 0.5) return this.colors.warning;
        return this.colors.danger;
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