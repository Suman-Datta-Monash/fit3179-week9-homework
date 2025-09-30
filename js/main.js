// State name normalization mapping
const STATE_NORMALIZE = {
    // From CSV to TopoJSON format
    "W.P. Kuala Lumpur": "Kuala Lumpur",
    "WP Kuala Lumpur": "Kuala Lumpur",
    "W.P. Labuan": "Labuan",
    "WP Labuan": "Labuan",
    "W.P. Putrajaya": "Putrajaya",
    "WP Putrajaya": "Putrajaya",
    "Pulau Pinang": "Penang",
    // Keep other states as-is
    "Johor": "Johor",
    "Kedah": "Kedah",
    "Kelantan": "Kelantan",
    "Melaka": "Melaka",
    "Negeri Sembilan": "Negeri Sembilan",
    "Pahang": "Pahang",
    "Perak": "Perak",
    "Perlis": "Perlis",
    "Sabah": "Sabah",
    "Sarawak": "Sarawak",
    "Selangor": "Selangor",
    "Terengganu": "Terengganu"
};

function normalizeState(state) {
    return STATE_NORMALIZE[state] || state;
}

// Load and process data
async function loadData() {
    try {
        // Load CPI inflation data
        const cpiData = await d3.csv('./data/cpi_2d_state_inflation.csv');

        // Load household income data
        const incomeData = await d3.csv('./data/hh_income_state.csv');

        // Filter CPI data for Food & Non-Alcoholic Beverages (division 01)
        // and get the latest date (2025-08-01)
        const foodInflation = cpiData
            .filter(d => d.division === '01' && d.date === '2025-08-01')
            .map(d => ({
                state: normalizeState(d.state),
                yoy_inflation: +d.inflation_yoy
            }));

        // Get latest income data (2022) for each state
        const latestIncome = {};
        incomeData.forEach(d => {
            const year = new Date(d.date).getFullYear();
            const state = normalizeState(d.state);

            if (year === 2022 && d.income_median) {
                latestIncome[state] = +d.income_median;
            }
        });

        // Join inflation and income data
        const joinedData = foodInflation.map(d => ({
            state: d.state,
            yoy_inflation: d.yoy_inflation,
            median_income: latestIncome[d.state] || null
        }));

        console.log('Processed data:', joinedData);

        return joinedData;

    } catch (error) {
        console.error('Error loading data:', error);
        return [];
    }
}

// Create Vega-Lite specification
function createVegaSpec(data) {
    return {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "title": {
            "text": "Food & Non-Alcoholic Beverages Inflation by State, Malaysia (August 2025)",
            "fontSize": 18,
            "anchor": "middle"
        },
        "width": 800,
        "height": 500,
        "projection": {
            "type": "mercator",
            "center": [109.5, 4],
            "scale": 2400
        },
        "layer": [
            {
                // Main choropleth layer
                "data": {
                    "url": "./data/malaysia-states.topojson",
                    "format": {
                        "type": "topojson",
                        "feature": "states"
                    }
                },
                "transform": [
                    {
                        "lookup": "properties.Name",
                        "from": {
                            "data": {
                                "values": data
                            },
                            "key": "state",
                            "fields": ["yoy_inflation", "median_income"]
                        }
                    }
                ],
                "mark": {
                    "type": "geoshape",
                    "stroke": "white",
                    "strokeWidth": 1
                },
                "encoding": {
                    "color": {
                        "field": "yoy_inflation",
                        "type": "quantitative",
                        "scale": {
                            "scheme": "viridis",
                            "domain": [0, 4]
                        },
                        "legend": {
                            "title": "YoY Inflation (%)",
                            "orient": "right",
                            "format": ".1f"
                        }
                    },
                    "tooltip": [
                        {
                            "field": "properties.Name",
                            "type": "nominal",
                            "title": "State"
                        },
                        {
                            "field": "yoy_inflation",
                            "type": "quantitative",
                            "title": "Food Inflation (%)",
                            "format": ".1f"
                        },
                        {
                            "field": "median_income",
                            "type": "quantitative",
                            "title": "Median Income (RM)",
                            "format": ",.0f"
                        }
                    ]
                }
            },
            {
                // Graticule layer - grid lines for geographic reference
                "data": {
                    "graticule": {
                        "step": [5, 5]
                    }
                },
                "mark": {
                    "type": "geoshape",
                    "stroke": "#999999",
                    "strokeWidth": 0.8,
                    "strokeDash": [2, 2],
                    "filled": false,
                    "opacity": 0.5
                }
            }
        ]
    };
}

// Main function to render the visualization
async function renderVisualization() {
    // Load and process data
    const data = await loadData();

    // Create Vega-Lite specification
    const spec = createVegaSpec(data);

    // Embed the visualization
    vegaEmbed('#vis', spec, {
        actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false
        }
    }).then(result => {
        console.log('Visualization rendered successfully');
    }).catch(error => {
        console.error('Error rendering visualization:', error);
    });
}

// Run the visualization when the page loads
renderVisualization();