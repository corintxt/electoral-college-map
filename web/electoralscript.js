// Generate a D3 map of electoral college votes by state //
///////
const width = 800;
const height = 500;
const circleRadius = 2;
const circlesPerRow = 4;

const mapContainer = d3.select("#map");

const svg = mapContainer
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoAlbersUsa()
  .scale(1000)
  .translate([width / 2, height / 2]);

const path = d3.geoPath()
  .projection(projection);

d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json")
  .then(topoData => {
    const states = topojson.feature(topoData, topoData.objects.states);

    // Filter out U.S. territories
  const filteredStates = states.features.filter(state => {
    const stateName = state.properties.name;
    return stateName !== 'Puerto Rico' && stateName !== 'Guam' && stateName !== 'United States Virgin Islands' && stateName !== 'American Samoa' && stateName !== 'Commonwealth of the Northern Mariana Islands';
  });

  d3.json("electoral-college-votes.json")
  .then(electoralData => {
      filteredStates.forEach(state => {
      const stateData = electoralData.find(d => d.state === state.properties.name);
      if (stateData) {
          state.properties.electoral_votes = stateData.electoral_votes;
          state.properties.postal = stateData.postal;
      }
  });

// Add event listener to the checkbox
const showElectoralCheckbox = d3.select("#showElectoralCheckbox");
showElectoralCheckbox.on("change", function() {
  const showElectoral = this.checked;
  voteCircles.selectAll("circle").style("display", showElectoral ? null : "none");
});
  
const statesPaths = svg.selectAll(".state")
    .data(states.features)
    .enter()
    .append("path")
    .attr("class", "state")
    .attr("fill", 'white') //make explicit for download
    .attr("d", path)
    .append("title")
    .text(d => `${d.properties.name}: ${d.properties.electoral_votes} electoral votes`);

    // Add state initials
    svg.selectAll(".state-initials")
    .data(states.features)
    .enter()
    .append("text")
    .attr("class", "state-initials")
    .attr("x", d => path.centroid(d)[0])
    .attr("y", d => path.centroid(d)[1])
    .text(d => `${d.properties.postal}`);
    // .text("BB")

    const voteCircles = svg.selectAll(".vote-circle")
  .data(states.features)
  .enter()
  .append("g")
  .attr("class", "vote-circle")
  .attr("state-name", d => d.properties.name)
  .attr("transform", d => `translate(${path.centroid(d)})`);

voteCircles.selectAll(".vote-circle")
  .data(d => {
    const votes = d.properties.electoral_votes;
    const positions = [];
    const circleSpacing = circleRadius * 2.5;
    let x = -circleSpacing * 2;
    let y = -circleSpacing * 2;
    let row = 0;
    let col = 0;

    for (let i = 0; i < votes; i++) {
      positions.push([x, y]);
      col++;

      if (col === circlesPerRow) {
        col = 0;
        row++;
        x = -circleSpacing * 2;
        y += circleSpacing;
      } else {
        x += circleSpacing;
      }
    }

    return positions;
  })
  .enter()
  .append("circle")
  .attr("class", "vote-circle")
  .attr("r", circleRadius)
  .attr("cx", d => d[0])
  .attr("cy", d => d[1]);

      // Create a tooltip element
    // const tooltip = d3.select("body")
    //   .append("div")
    //   .attr("class", "tooltip")
    //   .style("opacity", 1)
    //   .style("position", "absolute")
    //   .style("pointer-events", "none");

// Add mouseover and mouseout event listeners after voteCircles is defined
statesPaths
    .on("mouseover", function(event, d) {
    // console.log("Mouseover:", d.properties.name);
    // console.log("Tooltip text:", d3.select(this).select("title").text());
    const stateName = d.properties.name;
    d3.select(this).classed("highlighted", true);
    voteCircles.selectAll("circle")
        .classed("highlighted", function() {
        return d3.select(this.parentNode).attr("state-name") === stateName;
        });
    })

    .on("mouseout", function() {
    d3.select(this).classed("highlighted", false);
    voteCircles.selectAll("circle")
        .classed("highlighted", false);

    // Hide the tooltip
    tooltip.style("opacity", 0);
    });
});

// Function to sanitize state names for use in radio button IDs
function sanitizeStateName(stateName) {
    return stateName.replace(/\s+/g, '-');
}

// Generate the state list with radio buttons
const stateList = d3.select("#stateList");
const demColor = "#467bf7"
const repColor = "#ff7575"

// Sort the states alphabetically by name
const sortedStates = filteredStates.sort((a, b) => a.properties.name.localeCompare(b.properties.name));

sortedStates.forEach(state => {
    // console.log(state.properties) //error here somewhere - it can't read property other than name
    const stateName = state.properties.name;
    const sanitizedStateName = sanitizeStateName(stateName);
    const stateRow = stateList.append("div").attr("class", "state-row");

    const radioContainer = stateRow.append("div").attr("class", "radio-container");
    
    radioContainer.append("input")
    .attr("type", "radio")
    .attr("id", `${sanitizedStateName}-d`)
    .attr("name", sanitizedStateName)
    .on("change", function() {
        if (this.checked) {
        updateStateColor(stateName, demColor);
        }
    });
    
    radioContainer.append("label")
    .attr("for", `${sanitizedStateName}-d`)
    .text("D");
    
    radioContainer.append("input")
    .attr("type", "radio")
    .attr("id", `${sanitizedStateName}-r`)
    .attr("name", sanitizedStateName)
    .on("change", function() {
        if (this.checked) {
        updateStateColor(stateName, repColor);
        }
    });
    
    radioContainer.append("label")
    .attr("for", `${sanitizedStateName}-r`)
    .text("R");
    
    stateRow.append("span").text(stateName);
});

const barChartWidth = 500;
const barChartHeight = 80;
const barChartMargin = { top: 20, right: 20, bottom: 20, left: 40 };

const barChart = d3.select("#barChart")
    .append("svg")
    .attr("width", barChartWidth)
    .attr("height", barChartHeight)
    .append("g")
    .attr("transform", `translate(${barChartMargin.left}, ${barChartMargin.top})`);

    const updateBarChart = () => {
    const dVotes = d3.sum(filteredStates, d => {
        const sanitizedStateName = sanitizeStateName(d.properties.name);
        const radio = d3.select(`#${sanitizedStateName}-d`).node();
        return radio && radio.checked ? d.properties.electoral_votes : 0;
    });

    const rVotes = d3.sum(filteredStates, d => {
        const sanitizedStateName = sanitizeStateName(d.properties.name);
        const radio = d3.select(`#${sanitizedStateName}-r`).node();
        return radio && radio.checked ? d.properties.electoral_votes : 0;
    });

const barChartData = [
    { party: "D", votes: dVotes },
    { party: "R", votes: rVotes }
];

    const xScale = d3.scaleLinear()
    .domain([0, d3.max(barChartData, d => d.votes)])
    .range([0, barChartWidth - barChartMargin.left - barChartMargin.right]);

  const yScale = d3.scaleBand()
    .domain(barChartData.map(d => d.party))
    .range([0, barChartHeight - barChartMargin.top - barChartMargin.bottom])
    .padding(0.2);

  const barGroups = barChart.selectAll(".bar-group")
    .data(barChartData);

  barGroups.enter()
    .append("g")
    .attr("class", "bar-group")
    .merge(barGroups)
    .attr("transform", d => `translate(0, ${yScale(d.party)})`);

  barGroups.selectAll("rect")
    .data(d => [d])
    .enter()
    .append("rect")
    .merge(barGroups.selectAll("rect"))
    .attr("width", d => xScale(d.votes))
    .attr("height", yScale.bandwidth())
    .attr("fill", d => d.party === "D" ? demColor : repColor)
    .attr("rx", 4)
    .attr("ry", 4);

  barGroups.selectAll("text.party-label")
    .data(d => [d])
    .enter()
    .append("text")
    .attr("class", "party-label")
    .merge(barGroups.selectAll("text.party-label"))
    .attr("x", -10)
    .attr("y", yScale.bandwidth() / 2)
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .style("font-size", "12px")
    .text(d => d.party);

  barGroups.selectAll("text.vote-count")
    .data(d => [d])
    .enter()
    .append("text")
    .attr("class", "vote-count")
    .merge(barGroups.selectAll("text.vote-count"))
    .attr("x", d => xScale(d.votes) - 10)
    .attr("y", yScale.bandwidth() / 2)
    .attr("text-anchor", "end")
    .attr("alignment-baseline", "middle")
    .style("font-size", "12px")
    .text(d => d.votes);
};


// Update the updateStateColor function to call updateBarChart
function updateStateColor(stateName, color) {
svg.selectAll(".state")
    .filter(d => d.properties.name === stateName)
    .style("fill", color);

updateBarChart();
}
});

function downloadMapSVG() {
    const svgElement = document.querySelector("#map svg");

    // Create a deep clone of the SVG element
    const clonedSvgElement = svgElement.cloneNode(true);

    // Remove the tooltip element from the cloned SVG
    const tooltipElement = clonedSvgElement.querySelector(".tooltip");
    if (tooltipElement) {
    tooltipElement.remove();
    }

    // Set the fill and stroke colors on the state paths and vote circles
    const statePaths = clonedSvgElement.querySelectorAll(".state");
    statePaths.forEach(path => {
    const fillColor = path.getAttribute("fill");
    const strokeColor = 'darkgrey';
    path.setAttribute("fill", fillColor);
    path.setAttribute("stroke", strokeColor);
    });

    const voteCircles = clonedSvgElement.querySelectorAll(".vote-circle circle");
    voteCircles.forEach(circle => {
    const fillColor = circle.getAttribute("fill");
    circle.setAttribute("fill", fillColor);
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvgElement);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "us-states-map.svg";
    link.click();

    URL.revokeObjectURL(url);
}

function downloadChartSVG() {
  const svgElement = document.querySelector("#barChart svg");

  // Create a deep clone of the SVG element
  const clonedSvgElement = svgElement.cloneNode(true);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvgElement);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "bar-chart.svg";
  link.click();

  URL.revokeObjectURL(url);
}

const downloadMapButton = document.getElementById("downloadMapButton");
downloadMapButton.addEventListener("click", downloadMapSVG);

const downloadChartButton = document.getElementById("downloadChartButton");
downloadChartButton.addEventListener("click", downloadChartSVG);