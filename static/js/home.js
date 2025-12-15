/**
 * Interactive Home Page JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize
    initHomePage();
    
    // Navbar scroll effect
    window.addEventListener('scroll', handleNavbarScroll);
    
    // Navbar toggler
    document.getElementById('navbar-toggler').addEventListener('click', toggleNavbar);
    
    // Pathway visualization
    setupPathwayVisualization();
    
    // Demo simulation
    setupDemoSimulation();
    
    // Animation on scroll
    setupScrollAnimations();
    
    // Smooth scrolling for anchor links
    setupSmoothScrolling();
});

function initHomePage() {
    // Set current year in copyright
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
    
    // Animate hero stats with counting effect
    animateHeroStats();
}

function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

function toggleNavbar() {
    const menu = document.getElementById('navbar-menu');
    menu.classList.toggle('active');
    
    const toggler = document.getElementById('navbar-toggler');
    const icon = toggler.querySelector('i');
    if (menu.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}

function animateHeroStats() {
    const stats = [
        { element: document.getElementById('current-ppp'), target: 803, prefix: '$' },
        // Other stats will be animated when they come into view
    ];
    
    stats.forEach(stat => {
        if (stat.element) {
            animateCounter(stat.element, stat.target, 1500, stat.prefix || '');
        }
    });
}

function animateCounter(element, target, duration, prefix = '') {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    
    let current = start;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = prefix + Math.round(current).toLocaleString();
    }, 16);
}

function setupPathwayVisualization() {
    const currentBtn = document.querySelector('[data-path="current"]');
    const targetBtn = document.querySelector('[data-path="target"]');
    const pathwayFill = document.getElementById('pathway-fill');
    const subsPercent = document.getElementById('subsistence-percent');
    const advPercent = document.getElementById('advanced-percent');
    
    const pathways = {
        current: {
            subsistence: 51,
            advanced: 0.5,
            fillWidth: '48%'
        },
        target: {
            subsistence:0,
            advanced: 20,
            fillWidth: '40%'
        }
    };
    
    function updatePathway(path) {
        const data = pathways[path];
        
        // Animate fill width
        pathwayFill.style.width = data.fillWidth;
        
        // Animate percentages
        animateCounter(subsPercent, data.subsistence, 1000);
        animateCounter(advPercent, data.advanced, 1000);
        
        // Update button states
        document.querySelectorAll('.visual-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    currentBtn.addEventListener('click', (e) => updatePathway('current'));
    targetBtn.addEventListener('click', (e) => updatePathway('target'));
    
    // Hover effects on stages
    document.querySelectorAll('.stage').forEach(stage => {
        stage.addEventListener('mouseenter', function() {
            const stageType = this.dataset.stage;
            highlightStage(stageType);
        });
        
        stage.addEventListener('mouseleave', function() {
            resetStageHighlights();
        });
    });
}

function highlightStage(stageType) {
    // Add visual feedback for hovered stage
    document.querySelectorAll('.stage').forEach(stage => {
        if (stage.dataset.stage === stageType) {
            stage.style.transform = 'scale(1.05)';
            stage.style.background = 'rgba(255, 255, 255, 0.15)';
        }
    });
}

function resetStageHighlights() {
    document.querySelectorAll('.stage').forEach(stage => {
        stage.style.transform = '';
        stage.style.background = '';
    });
}

function setupDemoSimulation() {
    const growthSlider = document.getElementById('demo-growth');
    const volatilitySlider = document.getElementById('demo-volatility');
    const simulateBtn = document.getElementById('demo-simulate');
    const growthValue = document.getElementById('demo-growth-value');
    const volatilityValue = document.getElementById('demo-volatility-value');
    const probabilityBadge = document.getElementById('demo-probability');
    const probabilityValue = document.getElementById('demo-prob-value');
    const meanValue = document.getElementById('demo-mean');
    const confidenceValue = document.getElementById('demo-confidence');
    
    let demoChart = null;
    
    // Update slider values in real-time
    growthSlider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        growthValue.textContent = value >= 0 ? `+${value}%` : `${value}%`;
        growthValue.style.color = value >= 0 ? '#2A9D8F' : '#E76F51';
    });
    
    volatilitySlider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        volatilityValue.textContent = `-${value}%`;
    });
    
    // Run demo simulation
    simulateBtn.addEventListener('click', runDemoSimulation);
    
    // Run initial simulation
    setTimeout(runDemoSimulation, 1000);
    
    function runDemoSimulation() {
        simulateBtn.classList.add('loading');
        
        // Get slider values
        const growth = parseFloat(growthSlider.value) / 100; // Convert to decimal
        const volatility = parseFloat(volatilitySlider.value) / 100;
        
        // Simulate Monte Carlo
        setTimeout(() => {
            const results = simulateMonteCarlo(growth, volatility);
            updateDemoResults(results);
            simulateBtn.classList.remove('loading');
        }, 500);
    }
    
    function simulateMonteCarlo(growth, volatility) {
        const basePPP = 803;
        const targetPPP = 7000;
        const years = 25;
        const nSimulations = 1000;
        
        // Base parameters
        const baseGrowth = 0.055;
        const baseVolatility = 0.02;
        
        // Adjusted parameters based on sliders
        const adjustedGrowth = baseGrowth + growth;
        const adjustedVolatility = Math.max(0.004, baseVolatility - volatility);
        
        // Run simulations
        const results = [];
        for (let i = 0; i < nSimulations; i++) {
            let ppp = basePPP;
            for (let year = 0; year < years; year++) {
                const shock = (Math.random() - 0.5) * 2 * adjustedVolatility;
                ppp *= (1 + adjustedGrowth + shock);
            }
            results.push(ppp);
        }
        
        // Calculate statistics
        const mean = results.reduce((a, b) => a + b, 0) / results.length;
        const successes = results.filter(p => p >= targetPPP).length;
        const probability = (successes / nSimulations) * 100;
        
        // Determine confidence level
        let confidence = 'Low';
        if (probability >= 80) confidence = 'Very High';
        else if (probability >= 60) confidence = 'High';
        else if (probability >= 40) confidence = 'Medium';
        
        return {
            results,
            mean,
            probability,
            confidence,
            nSimulations
        };
    }
    
    function updateDemoResults(data) {
        // Update UI
        probabilityBadge.textContent = `${data.probability.toFixed(1)}%`;
        probabilityValue.textContent = `${data.probability.toFixed(1)}%`;
        meanValue.textContent = `$${Math.round(data.mean).toLocaleString()}`;
        confidenceValue.textContent = data.confidence;
        
        // Color code probability badge
        if (data.probability >= 80) {
            probabilityBadge.style.background = 'linear-gradient(135deg, #2A9D8F, #1D7873)';
        } else if (data.probability >= 50) {
            probabilityBadge.style.background = 'linear-gradient(135deg, #E9C46A, #D4B152)';
        } else {
            probabilityBadge.style.background = 'linear-gradient(135deg, #E76F51, #D45A3D)';
        }
        
        // Update chart
        updateDemoChart(data.results);
    }
    
    function updateDemoChart(results) {
        const ctx = document.getElementById('demo-chart').getContext('2d');
        
        // Destroy existing chart
        if (demoChart) {
            demoChart.destroy();
        }
        
        // Create histogram data
        const binCount = 20;
        const min = Math.min(...results);
        const max = Math.max(...results);
        const binSize = (max - min) / binCount;
        
        const bins = new Array(binCount).fill(0);
        const labels = new Array(binCount).fill('').map((_, i) => {
            const value = min + i * binSize;
            return `$${Math.round(value).toLocaleString()}`;
        });
        
        results.forEach(value => {
            const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binSize));
            bins[binIndex]++;
        });
        
        // Create chart
        demoChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequency',
                    data: bins,
                    backgroundColor: 'rgba(46, 134, 171, 0.7)',
                    borderColor: 'rgba(46, 134, 171, 1)',
                    borderWidth: 1
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
                                const start = parseInt(tooltipItems[0].label.replace(/[$,]/g, ''));
                                const end = Math.round(start + binSize);
                                return `$${start.toLocaleString()} - $${end.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: false
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

function setupScrollAnimations() {
    // Animate elements when they come into view
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add animation class
                if (entry.target.classList.contains('animate__animated')) {
                    const delay = entry.target.dataset.delay || '0s';
                    entry.target.style.animationDelay = delay;
                    entry.target.classList.add('animate__fadeInUp');
                }
                
                // Animate stats if needed
                if (entry.target.classList.contains('stat-card')) {
                    const statNumber = entry.target.querySelector('.stat-number');
                    if (statNumber && !statNumber.dataset.animated) {
                        const value = parseInt(statNumber.textContent.replace(/[$,]/g, ''));
                        const prefix = statNumber.textContent.includes('$') ? '$' : '';
                        animateCounter(statNumber, value, 1500, prefix);
                        statNumber.dataset.animated = 'true';
                    }
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all animate-on-scroll elements
    document.querySelectorAll('.animate__animated').forEach(el => {
        observer.observe(el);
    });
}

function setupSmoothScrolling() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Close mobile menu if open
                const menu = document.getElementById('navbar-menu');
                const toggler = document.getElementById('navbar-toggler');
                const icon = toggler.querySelector('i');
                if (menu.classList.contains('active')) {
                    menu.classList.remove('active');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
                
                // Smooth scroll
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Utility function for number formatting
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}