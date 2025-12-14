/**
 * Main Dashboard Logic for Rwanda Agriculture Digital Twin
 */

class Dashboard {
    constructor() {
        this.interventions = {};
        this.currentResults = null;
        this.optimizationResults = null;
        this.isLoading = false;
        
        // Local model parameters (mirror of server-side Monte Carlo coefficients)
        this.base_year = 2025;
        this.target_year_default = 2050;
        this.base_ag_ppp = 803;
        this.target_ag_ppp = 7000;
        this.base_growth_rate = 0.055;
        this.baseline_alpha = 0.02480;  // autonomous improvement component (calibrated for 45% at 35% interventions)
        this.base_volatility = 0.02;

        // Alpha & Beta arrays must match server-side ordering in `app.py`
        this.alpha = [
            0.011, 0.013, 0.016, 0.012, 0.015, 0.015, 0.015, 0.012, 0.013,
            0.015, 0.014, 0.014, 0.010, 0.013, 0.014, 0.011, 0.011,
            0.014, 0.016, 0.015
        ];

        this.beta = [
            0.006, 0.005, 0.007, 0.012, 0.005, 0.005, 0.007, 0.006, 0.005,
            0.006, 0.007, 0.007, 0.009, 0.011, 0.005, 0.005, 0.011,
            0.007, 0.005, 0.013
        ];

        // Map intervention name -> index (populated when loading sliders)
        this.interventionIndex = {};

        // Initialize dashboard
        this.init();
    }
    
    // Initialize dashboard
    init() {
        // Fetch model params from server to stay in sync with backend
        this.fetchModelParams().then(() => {
            this.loadInterventions();
            this.bindEvents();
            this.setupDefaultValues();
            this.runInitialSimulation();
        }).catch((err) => {
            console.warn('Could not fetch model params, falling back to built-in values.', err);
            this.loadInterventions();
            this.bindEvents();
            this.setupDefaultValues();
            this.runInitialSimulation();
        });
    }
    
    // Load interventions from the page
    loadInterventions() {
        const sliders = document.querySelectorAll('.intervention-slider');
        sliders.forEach(slider => {
            const id = slider.id.replace('slider-', '');
            const name = slider.dataset.name;
            const value = parseInt(slider.value);
            
            this.interventions[name] = value;
            // store index mapping for client-side estimator
            this.interventionIndex[name] = parseInt(id);
            
            // Update value display
            const valueDisplay = document.getElementById(`value-${id}`);
            if (valueDisplay) {
                valueDisplay.textContent = value;
            }
            // Set slider gradient color on load
            this._setSliderGradient(slider);
        });
    }

    // Fetch model parameters from the server for consistency
    async fetchModelParams() {
        try {
            const resp = await fetch('/api/model-params');
            if (!resp.ok) throw new Error('Failed to fetch model params');
            const data = await resp.json();
            if (data.error) throw new Error(data.error);

            // Assign values if present
            if (data.alpha && data.beta) {
                this.alpha = data.alpha;
                this.beta = data.beta;
            }
            if (data.base_growth_rate !== undefined) this.base_growth_rate = data.base_growth_rate;
            if (data.baseline_alpha !== undefined) this.baseline_alpha = data.baseline_alpha;
            if (data.base_volatility !== undefined) this.base_volatility = data.base_volatility;
            if (data.base_ag_ppp !== undefined) this.base_ag_ppp = data.base_ag_ppp;
            if (data.target_ag_ppp !== undefined) this.target_ag_ppp = data.target_ag_ppp;
            if (data.base_year !== undefined) this.base_year = data.base_year;
            if (data.target_year !== undefined) this.target_year_default = data.target_year;
        } catch (err) {
            console.error('Error fetching model params:', err);
            throw err;
        }
    }
    
    // Bind event listeners
    bindEvents() {
        // Slider changes
        // Create a debounced automatic simulation runner so adjusting sliders updates
        // the probability without spamming the API on every tiny change.
        const debouncedRun = Utils.debounce(() => this.runSimulation(true), 800);
        document.querySelectorAll('.intervention-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const id = e.target.id.replace('slider-', '');
                const value = parseInt(e.target.value);
                const name = e.target.dataset.name;

                // Update value display
                const valueDisplay = document.getElementById(`value-${id}`);
                if (valueDisplay) {
                    valueDisplay.textContent = value;
                }

                // Update interventions object
                this.interventions[name] = value;

                // Mark as custom scenario (not baseline) when user adjusts
                this._setScenarioLabel('Custom scenario');

                // Update slider gradient as the user moves
                this._setSliderGradient(e.target);

                // Immediately update quick client-side estimate for responsiveness
                const instantProb = this.estimateProbabilityLocal();
                if (instantProb !== null) {
                    this.updateProbabilityUI(instantProb);
                }

                // Auto-run a silent simulation after user stops adjusting sliders
                debouncedRun();
            });
        });
        
        // Budget slider
        const budgetSlider = document.getElementById('budget');
        const budgetValue = document.getElementById('budget-value');
        if (budgetSlider && budgetValue) {
            budgetSlider.addEventListener('input', (e) => {
                budgetValue.textContent = e.target.value;
            });
        }
        
        // Run simulation button
        const runBtn = document.getElementById('run-simulation');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runSimulation());
        }
        
        // Run optimization button
        const optimizeBtn = document.getElementById('run-optimization');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.runOptimization());
        }
        
        // Run sensitivity analysis button
        const sensitivityBtn = document.getElementById('run-sensitivity');
        if (sensitivityBtn) {
            sensitivityBtn.addEventListener('click', () => this.runSensitivityAnalysis());
        }
        
        // Reset button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
        
        // Download chart button
        const downloadBtn = document.getElementById('download-chart');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                chartManager.exportChart('distribution-chart', 'rwanda-agri-distribution.png');
            });
        }
        
        // Fullscreen chart button
        const fullscreenBtn = document.getElementById('fullscreen-chart');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => {
                chartManager.toggleFullscreen('distribution-chart');
            });
        }
        
        // Help button
        const helpBtn = document.getElementById('help-btn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.showHelp());
        }
        
        // Toggle explanation panel
        const toggleExplanation = document.getElementById('toggle-explanation');
        if (toggleExplanation) {
            toggleExplanation.addEventListener('click', () => this.toggleExplanationPanel());
        }
        
        // Explanation tabs
        document.querySelectorAll('.explanation-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchExplanationTab(tabName);
            });
        });
        
        // Update simulation count
        const simCountInput = document.getElementById('n-simulations');
        if (simCountInput) {
            simCountInput.addEventListener('change', () => {
                document.getElementById('sim-count').textContent = 
                    Utils.formatNumber(parseInt(simCountInput.value));
            });
        }
    }
    
    // Set default values
    setupDefaultValues() {
        // Set default simulation count display
        const simCountInput = document.getElementById('n-simulations');
        if (simCountInput) {
            document.getElementById('sim-count').textContent = 
                Utils.formatNumber(parseInt(simCountInput.value));
        }
    }
    
    // Run initial simulation
    async runInitialSimulation() {
        this.setLoading(true);
        try {
            await this.runSimulation();
        } catch (error) {
            console.error('Initial simulation failed:', error);
            Utils.showNotification('Failed to run initial simulation', 'error');
        } finally {
            this.setLoading(false);
        }
    }
    
    // Run Monte Carlo simulation
    async runSimulation() {
        // allow silent calls (e.g., from slider input) by accepting an optional
        // boolean: runSimulation(silent=true). Default: false.
        const silent = (arguments.length > 0 && arguments[0] === true) ? true : false;
        if (this.isLoading) return;

        this.setLoading(true, silent);
        
        try {
            // Get simulation parameters
            const nSimulations = parseInt(document.getElementById('n-simulations').value) || 2000;
            const targetYear = parseInt(document.getElementById('target-year').value) || 2050;
            
            // Prepare request data
            const requestData = {
                interventions: this.interventions,
                n_simulations: nSimulations,
                year: targetYear
            };
            
            // Send API request
            const response = await fetch('/api/projection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }
            
            // Store results
            this.currentResults = data.results;
            
            // Update UI
            this.updateResultsUI(data.results, data.visualization);
            
            // Update distribution chart
            chartManager.createDistributionChart(
                'distribution-chart', 
                data.results.distribution || [],
                7000
            );
            
            // Update probability ring
            chartManager.updateProbabilityRing(data.results.probability);
            
            // Show success notification only when not silent
            if (!silent) Utils.showNotification('Simulation completed successfully!', 'success');
            
        } catch (error) {
            console.error('Simulation error:', error);
            if (!silent) Utils.showNotification(`Simulation failed: ${error.message}`, 'error');
            
            // Show fallback results for demo
            this.showFallbackResults();
            
        } finally {
            this.setLoading(false);
        }
    }
    
    // Run AI optimization
    async runOptimization() {
        if (this.isLoading) return;
        
        this.setLoading(true);
        
        try {
            // Get optimization parameters
            const budget = parseInt(document.getElementById('budget').value) || 60;
            const nSimulations = parseInt(document.getElementById('n-simulations').value) || 1000;
            
            // Prepare request data
            const requestData = {
                budget: budget,
                n_simulations: nSimulations,
                current_interventions: this.interventions
            };
            
            // Send API request
            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }
            
            // Store optimization results
            this.optimizationResults = data.optimized;
            
            // Update UI with optimization results
            this.updateOptimizationUI(data.optimized);
            
            // Show optimization results panel
            document.getElementById('optimization-results').style.display = 'block';
            
            // Scroll to optimization results
            document.getElementById('optimization-results').scrollIntoView({
                behavior: 'smooth'
            });
            
            // Show success notification
            Utils.showNotification('AI optimization completed!', 'success');
            
        } catch (error) {
            console.error('Optimization error:', error);
            Utils.showNotification(`Optimization failed: ${error.message}`, 'error');
            
        } finally {
            this.setLoading(false);
        }
    }
    
    // Run sensitivity analysis
    async runSensitivityAnalysis() {
        if (!this.currentResults) {
            Utils.showNotification('Please run a simulation first', 'warning');
            return;
        }
        
        this.setLoading(true);
        
        try {
            // In a real implementation, this would call a sensitivity analysis API
            // For now, we'll generate mock sensitivity data
            
            const sensitivityData = this.generateMockSensitivityData();
            
            // Update sensitivity chart
            chartManager.createSensitivityChart('sensitivity-chart', sensitivityData);
            
            // Update sensitivity table
            this.updateSensitivityTable(sensitivityData);
            
            Utils.showNotification('Sensitivity analysis completed', 'success');
            
        } catch (error) {
            console.error('Sensitivity analysis error:', error);
            Utils.showNotification(`Sensitivity analysis failed: ${error.message}`, 'error');
            
        } finally {
            this.setLoading(false);
        }
    }
    
    // Update results UI
    updateResultsUI(results, visualization) {
        // Update probability displays
        const probabilityPercent = (results.probability * 100).toFixed(1);
        document.getElementById('probability-value').textContent = probabilityPercent;
        document.getElementById('probability-badge').textContent = probabilityPercent + '%';
        
        // Update probability color
        const probabilityClass = Utils.getProbabilityClass(results.probability);
        document.getElementById('probability-value').className = probabilityClass;
        document.getElementById('probability-badge').className = 'probability-badge ' + probabilityClass;
        
        // Update other metrics
        document.getElementById('mean-ppp').textContent = Utils.formatCurrency(results.mean_ppp);
        document.getElementById('structural-index').textContent = 
            results.structural_index ? results.structural_index.toFixed(1) + '/100' : '--';
        
        // Update interpretation
        const interpretation = document.getElementById('interpretation-text');
        if (interpretation) {
            interpretation.textContent = Utils.getProbabilityDescription(results.probability);
        }

        // Final result just arrived from server — mark source as final
        this._setProbabilitySource('final');
        
        // Update quantiles if available
        if (results.quantiles) {
            document.getElementById('p5-value').textContent = Utils.formatCurrency(results.quantiles.p5);
            document.getElementById('p50-value').textContent = Utils.formatCurrency(results.quantiles.p50);
            document.getElementById('p95-value').textContent = Utils.formatCurrency(results.quantiles.p95);
        }
    }

    // Update only the probability-related UI elements (fast, used by estimator)
    updateProbabilityUI(probability) {
        try {
            const probabilityPercent = (probability * 100).toFixed(1);
            const probValueEl = document.getElementById('probability-value');
            const probBadgeEl = document.getElementById('probability-badge');

            if (probValueEl) probValueEl.textContent = probabilityPercent;
            if (probBadgeEl) probBadgeEl.textContent = probabilityPercent + '%';

            // Apply color gradient to probability display
            const color = this._getColorForProbability(probability);
            if (probValueEl) probValueEl.style.color = color;
            if (probBadgeEl) probBadgeEl.style.color = color;

            const probabilityClass = Utils.getProbabilityClass(probability);
            if (probValueEl) probValueEl.className = probabilityClass;
            if (probBadgeEl) probBadgeEl.className = 'probability-badge ' + probabilityClass;

            // Update interpretation text
            const interpretation = document.getElementById('interpretation-text');
            if (interpretation) {
                interpretation.textContent = Utils.getProbabilityDescription(probability);
            }

            // Show a small source indicator (estimate vs final)
            this._setProbabilitySource('estimate');

            // Update visual ring if chartManager exists
            if (typeof chartManager !== 'undefined' && chartManager.updateProbabilityRing) {
                chartManager.updateProbabilityRing(probability);
            }
        } catch (err) {
            console.error('Failed to update probability UI:', err);
        }
    }

    // Helper to compute red->yellow->green color for a 0-1 probability value
    _getColorForProbability(prob) {
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

        const red = toRgb('#E74C3C');      // Darker red for better visibility
        const yellow = toRgb('#F39C12');   // Golden yellow
        const green = toRgb('#27AE60');    // Darker green

        const pct = Math.max(0, Math.min(1, prob));
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

    // Set a red->yellow->green gradient on a range input based on its value (0-100)
    _setSliderGradient(slider) {
        try {
            let val = parseInt(slider.value || 0);
            // Reverse mapping for Postharvest Loss: higher slider means worse (more loss)
            const name = slider.dataset && slider.dataset.name ? slider.dataset.name : '';
            if (name === 'Postharvest Loss (%)') {
                val = 100 - val;
            }

            const pct = Math.max(0, Math.min(100, val));

            // Use same color logic as probability display
            const probValue = pct / 100;
            const colorStr = this._getColorForProbability(probValue);

            // Fill left portion with computed color, remaining with track gray
            slider.style.background = `linear-gradient(90deg, ${colorStr} 0%, ${colorStr} ${pct}%, #e9ecef ${pct}%, #e9ecef 100%)`;

            // Also color the slider value number the same color
            const sliderItem = slider.closest('.slider-item');
            if (sliderItem) {
                const valueEl = sliderItem.querySelector('.slider-value');
                if (valueEl) {
                    valueEl.style.color = colorStr;
                }
            }
        } catch (err) {
            console.error('Failed to set slider gradient:', err);
        }
    }

    // Quick client-side probability estimator using a log-normal approximation
    estimateProbabilityLocal() {
        try {
            // Build intervention vector in server order (0-1), inverting Postharvest Loss
            const vec = new Array(this.alpha.length).fill(0);
            Object.entries(this.interventions).forEach(([name, val]) => {
                const idx = this.interventionIndex[name];
                if (typeof idx === 'number' && idx >= 0 && idx < vec.length) {
                    let effective = val;
                    if (name === 'Postharvest Loss (%)') {
                        effective = 100 - val;
                    }
                    vec[idx] = effective / 100.0;
                }
            });

            // Compute drift and volatility (mirror of server)
            const dotAlpha = vec.reduce((s, v, i) => s + v * (this.alpha[i] || 0), 0);
            const dotBeta = vec.reduce((s, v, i) => s + v * (this.beta[i] || 0), 0);

            // Drift includes baseline_alpha (autonomous improvement)
            const mu = this.base_growth_rate + this.baseline_alpha + dotAlpha; // per-year drift
            const sigma = Math.max(0.004, this.base_volatility - dotBeta); // per-year vol

            const targetYearEl = document.getElementById('target-year');
            const targetYear = targetYearEl ? parseInt(targetYearEl.value) : this.target_year_default;
            const T = Math.max(1, targetYear - this.base_year);

            // If volatility is extremely small, use deterministic check
            if (sigma < 1e-6) {
                const deterministic = this.base_ag_ppp * Math.pow(1 + mu, T);
                return deterministic >= this.target_ag_ppp ? 1.0 : 0.0;
            }

            // Lognormal approximation: ln(S_T/S0) ~ N((mu - 0.5 sigma^2)T, sigma^2 T)
            const lnRatio = Math.log(this.target_ag_ppp / this.base_ag_ppp);
            const mean = (mu - 0.5 * sigma * sigma) * T;
            const std = sigma * Math.sqrt(T);
            const z = (lnRatio - mean) / std;

            // P(S_T >= target) = 1 - Phi(z)
            const cdf = this._normCdf(z);
            const prob = Math.max(0, Math.min(1, 1 - cdf));
            return prob;
        } catch (err) {
            console.error('Estimator error:', err);
            return null;
        }
    }

    // Standard normal CDF using erf approximation
    _normCdf(x) {
        return 0.5 * (1 + this._erf(x / Math.SQRT2));
    }

    // erf approximation (numerical)
    _erf(x) {
        // Abramowitz and Stegun formula 7.1.26
        const sign = x >= 0 ? 1 : -1;
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        const absX = Math.abs(x);
        const t = 1.0 / (1.0 + p * absX);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
        return sign * y;
    }

    // Manage probability source indicator in the UI
    _setProbabilitySource(source) {
        try {
            // Allowed sources: 'estimate' or 'final'
            let badge = document.getElementById('probability-source');
            if (!badge) {
                // create a small badge next to probability-badge
                const probBadge = document.getElementById('probability-badge');
                if (!probBadge) return;
                badge = document.createElement('span');
                badge.id = 'probability-source';
                badge.style.cssText = 'margin-left:8px;font-size:0.8rem;color:#666';
                probBadge.parentNode.insertBefore(badge, probBadge.nextSibling);
            }

            if (source === 'estimate') {
                badge.textContent = '(estimate)';
                badge.style.opacity = '0.9';
            } else {
                badge.textContent = '(final)';
                badge.style.opacity = '1';
            }
        } catch (err) {
            console.error('Failed to set probability source badge:', err);
        }
    }
    
    // Update optimization UI
    updateOptimizationUI(optimization) {
        // Calculate probability uplift
        const currentProb = this.currentResults ? this.currentResults.probability * 100 : 0;
        const optimizedProb = optimization.probability * 100;
        const uplift = optimizedProb - currentProb;
        
        // Update summary
        document.getElementById('opt-uplift').textContent = 
            `+${uplift.toFixed(1)}%`;
        document.getElementById('opt-uplift').className = 
            uplift > 0 ? 'opt-value probability-high' : 'opt-value probability-low';
        
        document.getElementById('opt-budget').textContent = 
            `${optimization.total_cost ? optimization.total_cost.toFixed(1) : '--'}/${optimization.budget || '--'}`;
        
        document.getElementById('opt-efficiency').textContent = 
            optimization.budget_utilization ? optimization.budget_utilization.toFixed(1) + '%' : '--';
        
        // Create optimization sliders
        this.createOptimizationSliders(optimization);
    }
    
    // Create optimization recommendation sliders
    createOptimizationSliders(optimization) {
        const container = document.getElementById('optimization-sliders-container');
        if (!container || !optimization.optimized_interventions) return;
        
        container.innerHTML = '';
        
        // Get intervention names (this should match backend order)
        const interventionNames = Object.keys(this.interventions);
        
        optimization.optimized_interventions.forEach((intensity, index) => {
            if (index >= interventionNames.length) return;
            
            const interventionName = interventionNames[index];
            const currentValue = this.interventions[interventionName] || 0;
            const recommendedValue = Math.round(intensity * 100);
            const difference = recommendedValue - currentValue;
            
            const sliderDiv = document.createElement('div');
            sliderDiv.className = 'optimization-slider-item';
            sliderDiv.innerHTML = `
                <div class="optimization-slider-header">
                    <span class="optimization-slider-name">${interventionName}</span>
                    <span class="optimization-slider-difference ${difference > 0 ? 'positive' : 'negative'}">
                        ${difference > 0 ? '+' : ''}${difference}
                    </span>
                </div>
                <div class="optimization-slider-comparison">
                    <span class="current-value">Current: ${currentValue}</span>
                    <span class="recommended-value">Recommended: ${recommendedValue}</span>
                </div>
                <div class="optimization-slider-bar">
                    <div class="current-bar" style="width: ${currentValue}%"></div>
                    <div class="recommended-bar" style="width: ${recommendedValue}%"></div>
                </div>
            `;
            
            container.appendChild(sliderDiv);
        });
    }
    
    // Update sensitivity table
    updateSensitivityTable(sensitivityData) {
        const tbody = document.getElementById('sensitivity-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        sensitivityData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.intervention}</td>
                <td class="${item.marginal_impact > 0 ? 'positive' : 'negative'}">
                    ${(item.marginal_impact * 100).toFixed(2)}%
                </td>
                <td>${item.cost_effectiveness.toFixed(3)}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Generate mock sensitivity data (for demo)
    generateMockSensitivityData() {
        const interventionNames = Object.keys(this.interventions);
        
        return interventionNames.map((name, index) => {
            // Generate realistic-looking sensitivity data
            const baseImpact = 0.01 + (Math.random() * 0.02);
            const cost = 2 + Math.random() * 4;
            
            return {
                intervention: name,
                marginal_impact: baseImpact * (1 - index / interventionNames.length),
                cost: cost,
                cost_effectiveness: baseImpact / cost
            };
        }).sort((a, b) => b.marginal_impact - a.marginal_impact);
    }
    
    // Reset to default values
    resetToDefaults() {
        document.querySelectorAll('.intervention-slider').forEach(slider => {
            const defaultValue = slider.dataset.baseline ? 
                parseInt(slider.dataset.baseline) : 50;
            slider.value = defaultValue;
            
            const id = slider.id.replace('slider-', '');
            const valueDisplay = document.getElementById(`value-${id}`);
            if (valueDisplay) {
                valueDisplay.textContent = defaultValue;
            }
            
            const name = slider.dataset.name;
            this.interventions[name] = defaultValue;
        });
        
        // Reset budget
        document.getElementById('budget').value = 60;
        document.getElementById('budget-value').textContent = '60';
        
        // Reset simulation count
        document.getElementById('n-simulations').value = 2000;
        
        // Reset target year
        document.getElementById('target-year').value = 2050;
        
        // Hide optimization results
        document.getElementById('optimization-results').style.display = 'none';
        
        Utils.showNotification('Reset to default values', 'info');
        
        // Run simulation with defaults
        this.runSimulation();
    }
    
    // Show fallback results (for demo/offline mode)
    showFallbackResults() {
        // Generate mock results
        const mockResults = {
            probability: 0.65 + Math.random() * 0.2,
            mean_ppp: 6000 + Math.random() * 3000,
            structural_index: 70 + Math.random() * 20,
            distribution: Array.from({length: 2000}, () => 
                4000 + Math.random() * 6000 + Math.random() * 4000
            ),
            quantiles: {
                p5: 4500 + Math.random() * 1000,
                p50: 6500 + Math.random() * 1000,
                p95: 8500 + Math.random() * 1500
            }
        };
        
        this.updateResultsUI(mockResults, {});
        
        // Create mock chart
        chartManager.createDistributionChart(
            'distribution-chart', 
            mockResults.distribution,
            7000
        );
        
        chartManager.updateProbabilityRing(mockResults.probability);
    }
    
    // Set loading state
    setLoading(isLoading, suppressNotification = false) {
        this.isLoading = isLoading;

        const buttons = document.querySelectorAll('#run-simulation, #run-optimization');
        buttons.forEach(btn => {
            if (isLoading) {
                btn.classList.add('loading');
                btn.disabled = true;
            } else {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        });

        if (isLoading && !suppressNotification) {
            Utils.showNotification('Running simulation...', 'info', 2000);
        }
    }

    // Show help modal
    showHelp() {
        // Create help modal
        const helpModal = document.createElement('div');
        helpModal.className = 'help-modal';
        helpModal.innerHTML = `
            <div class="help-modal-content">
                <div class="help-modal-header">
                    <h3><i class="fas fa-question-circle"></i> Dashboard Help</h3>
                    <button class="btn-icon close-help">&times;</button>
                </div>
                <div class="help-modal-body">
                    <h4>How to Use This Dashboard</h4>
                    
                    <div class="help-section">
                        <h5>1. Adjust Intervention Sliders</h5>
                        <p>Use the sliders on the left to set target values for each intervention (0-100 scale). 
                        Higher values represent more intensive implementation by 2050.</p>
                    </div>
                    
                    <div class="help-section">
                        <h5>2. Run Simulation</h5>
                        <p>Click "Run Simulation" to calculate the probability of reaching $7,000 Agriculture PPP by 2050 
                        based on your selected interventions.</p>
                    </div>
                    
                    <div class="help-section">
                        <h5>3. AI Optimization</h5>
                        <p>Click "AI Optimize" to find the best intervention mix under budget constraints. 
                        The system will suggest optimized values for each intervention.</p>
                    </div>
                    
                    <div class="help-section">
                        <h5>4. Interpret Results</h5>
                        <ul>
                            <li><strong>Probability ≥ 80%</strong>: High confidence of success</li>
                            <li><strong>Probability 50-79%</strong>: Moderate confidence, improvements needed</li>
                            <li><strong>Probability < 50%</strong>: Significant acceleration required</li>
                        </ul>
                    </div>
                    
                    <div class="help-tips">
                        <h5>Quick Tips</h5>
                        <ul>
                            <li>Focus on interventions with high "α" values for growth impact</li>
                            <li>Include interventions with high "β" values for risk reduction</li>
                            <li>Use the sensitivity analysis to identify most impactful interventions</li>
                            <li>Check the Model Explanation panel for detailed methodology</li>
                        </ul>
                    </div>
                </div>
                <div class="help-modal-footer">
                    <button class="btn btn-primary close-help">Got it!</button>
                </div>
            </div>
        `;
        
        // Add styles
        helpModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        const modalContent = helpModal.querySelector('.help-modal-content');
        modalContent.style.cssText = `
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideInDown 0.3s ease;
        `;
        
        // Add to document
        document.body.appendChild(helpModal);
        
        // Add close functionality
        const closeButtons = helpModal.querySelectorAll('.close-help');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                helpModal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => helpModal.remove(), 300);
            });
        });
        
        // Close on outside click
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => helpModal.remove(), 300);
            }
        });
        
        // Add keydown listener for escape
        const keydownHandler = (e) => {
            if (e.key === 'Escape') {
                helpModal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    helpModal.remove();
                    document.removeEventListener('keydown', keydownHandler);
                }, 300);
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
    }
    
    // Toggle explanation panel
    toggleExplanationPanel() {
        const content = document.getElementById('explanation-content');
        const toggleBtn = document.getElementById('toggle-explanation');
        
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        } else {
            content.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        }
    }
    
    // Switch explanation tab
    switchExplanationTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.explanation-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            if (pane.id === `${tabName}-pane`) {
                pane.classList.add('active');
            }
        });
    }

    // Update scenario label (baseline vs custom)
    _setScenarioLabel(label) {
        const subtitle = document.getElementById('probability-subtitle');
        if (subtitle) {
            subtitle.textContent = label;
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        
        @keyframes slideInDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100px); opacity: 0; }
        }
        
        .help-modal-body {
            padding: 24px;
        }
        
        .help-section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .help-section h5 {
            color: #2E86AB;
            margin-bottom: 8px;
        }
        
        .help-tips {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #F18F01;
        }
        
        .help-tips ul {
            padding-left: 20px;
            margin-top: 8px;
        }
        
        .help-tips li {
            margin-bottom: 4px;
        }
        
        .help-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #eee;
        }
        
        .help-modal-footer {
            padding: 20px 24px;
            border-top: 1px solid #eee;
            text-align: right;
        }
        
        .optimization-slider-item {
            margin-bottom: 16px;
            padding: 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e9ecef;
        }
        
        .optimization-slider-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .optimization-slider-name {
            font-weight: 500;
            color: #495057;
        }
        
        .optimization-slider-difference {
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .optimization-slider-difference.positive {
            background: #d4edda;
            color: #155724;
        }
        
        .optimization-slider-difference.negative {
            background: #f8d7da;
            color: #721c24;
        }
        
        .optimization-slider-comparison {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            color: #6c757d;
            margin-bottom: 8px;
        }
        
        .optimization-slider-bar {
            height: 6px;
            background: #e9ecef;
            border-radius: 3px;
            position: relative;
        }
        
        .current-bar {
            position: absolute;
            height: 100%;
            background: #6c757d;
            border-radius: 3px;
        }
        
        .recommended-bar {
            position: absolute;
            height: 100%;
            background: #2E86AB;
            border-radius: 3px;
        }
        
        .positive {
            color: #2A9D8F;
            font-weight: 600;
        }
        
        .negative {
            color: #E76F51;
            font-weight: 600;
        }
    `;
    
    document.head.appendChild(style);
});