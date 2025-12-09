// --- 20 Intervention Sliders ---
const interventions = [
    "Land Consolidation", "Land Use Productivity", "Irrigation Efficiency",
    "Climate Adaptation", "Staple Crop Productivity", "Cash Crop Productivity",
    "Livestock Productivity", "Inputs Efficiency", "Soil Health",
    "Mechanization", "Digital Agriculture", "R&D Extension",
    "Digital Twin Usage", "Postharvest Loss", "Value Addition",
    "Access to Finance", "Insurance Penetration", "Market Integration",
    "Export Competitiveness", "Supply–Demand Stability"
];

const container = document.getElementById("slider-container");

interventions.forEach((name, i) => {
    const block = document.createElement("div");
    block.className = "slider-block";
    block.innerHTML = `
        <label>${i+1}. ${name}</label>
        <input type="range" min="0" max="100" value="70" class="int-slider" data-id="${i}">
    `;
    container.appendChild(block);
});


// --- Send Slider Values to Backend ---
function updateModel() {
    const values = [...document.querySelectorAll(".int-slider")].map(s => Number(s.value));

    fetch("/compute", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({values})
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("probability").innerText =
            `Probability: ${data.probability}%`;

        document.getElementById("projection-chart").src =
            "data:image/png;base64," + data.img;
    });
}

document.querySelectorAll(".int-slider").forEach(slider => {
    slider.addEventListener("input", updateModel);
});

updateModel(); // Load baseline
