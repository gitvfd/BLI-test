function updateVis() {
  updateDynamicFlowerHeightDomain(); // Set initial dynamic domain

  const transitionDuration = 750; // Duration for smooth transitions in milliseconds

  drawOrUpdateYAxis(transitionDuration); // Draw/update the axis with the new domain

  // Access global variables defined in your index.html script block:
  // weights, dimensions, scores, svg, angleScale, flowerHeight, radiusScale, colorScale
  // Also, petalPath, petalStroke, petalFill functions (expected from petal.js)

  // Iterate over each flower (each country)
  svg.selectAll(".flower").each(function (countryFlowerData) {
    // countryFlowerData is one item from 'scores'
    // e.g., { country: "Australia", data: [{ dim: "housing", value: 7 }, ...] }
    const flowerGroup = d3.select(this);

    // --- 1. Update Flower Height ---
    // Calculate the new average score for the country based on user weights
    let totalWeightedScore = 0;
    sumOfUserWeights = 0;

    countryFlowerData.data.forEach((dimensionScore) => {
      // e.g., { dim: "housing", value: 10 }
      const userWeight = parseFloat(weights[dimensionScore.dim]); // Get weight from the global 'weights' object

      if (!isNaN(userWeight) && userWeight > 0) {
        // Consider only dimensions with a positive weight
        totalWeightedScore += dimensionScore.value * userWeight;
        sumOfUserWeights += userWeight;
      }
    });

    const averageScore =
      sumOfUserWeights > 0 ? totalWeightedScore / sumOfUserWeights : 0;
    const newFlowerY = flowerHeight(averageScore);

    flowerGroup
      .transition()
      .duration(transitionDuration)
      .attr(
        "transform",
        `translate(${angleScale(countryFlowerData.country)}, ${newFlowerY})`
      );

    flowerGroup
      .select(".stem")
      .transition()
      .duration(transitionDuration)
      .attr("y2", svgHeight - marginText - newFlowerY);

    // --- 2. Update Petals ---
    // Prepare data for d3.pie.
    // - 'userWeight' will determine the angular width of the petal via d3.pie.
    // - 'score' (the original dimension score) will determine the length of the petal via petalPath.
    const dataForPieLayout = countryFlowerData.data.map((dimScore) => ({
      dim: dimScore.dim, // Dimension name (e.g., "housing")
      score: dimScore.value, // Original score for this dimension (for petal length)
      userWeight: parseFloat(weights[dimScore.dim]) || 0, // User-assigned weight (for petal angular width)
    }));

    // Configure d3.pie to use 'userWeight' for calculating arc angles
    const currentPie = d3
      .pie()
      .sort(null) // Preserve the original order of dimensions
      .value((d) => d.userWeight); // This makes the angular width of the petal proportional to its user weight

    const pieSegmentData = currentPie(dataForPieLayout);
    // Each item in pieSegmentData is like:
    // {
    //   data: { dim: "housing", score: 7, userWeight: 5 }, // score for length, userWeight for width source
    //   value: 5,                                          // userWeight, used by pie for angles
    //   startAngle: /*_calculated_*/,
    //   endAngle:   /*_calculated_*/,
    //   ...
    // }

    const petals = flowerGroup
      .selectAll(".petal")
      .data(pieSegmentData, (d) => d.data.dim); // Key function for object constancy

    petals
      .transition()
      .duration(transitionDuration)
      .attrTween("d", function (pieSlice, i) {
        // pieSlice is the target data for the petal after update.
        // this._currentData holds the petal's data from before this update.
        let oldData = this._currentData;
        if (!oldData) {
          // For the very first update or if element is new (though not expected here)
          // Create a "zero" state for entering petals (all angles/values are 0 or minimal)
          // This ensures a smooth "growing" animation from the center.
          oldData = {
            ...pieSlice,
            startAngle: pieSlice.startAngle,
            endAngle: pieSlice.startAngle,
            value: 0,
            data: { ...pieSlice.data, score: 0 },
          };
        }
        const interpolator = d3.interpolate(oldData, pieSlice);
        this._currentData = pieSlice; // Store the new data for the next transition cycle

        return function (t) {
          // petalPath (from js/petal.js) is called at each step of the transition.
          // It receives an interpolated pieSlice object.
          // petalPath MUST use:
          //   - interpolator(t).data.score for the petal's length (e.g., via radiusScale).
          //   - interpolator(t).startAngle and .endAngle for the petal's angular width.
          return petalPath(interpolator(t), i);
        };
      })
      .style("fill", (d, i) => petalFill(d, i))
      .style("opacity", (d, i) => petalOpacity(d, i))
      .style("stroke", (d, i) => petalStroke(d, i));

    // The existing 'transform' attribute on your petals in index.html:
    // .attr("transform", function (d, i) { return r((weight[i].cumul * 2 * Math.PI) / ...); })
    // This transform rotates each petal into its fixed angular slot using the *static* 'weight' array.
    // This is fine. It means your petalPath function should draw a petal shape (a wedge)
    // that is canonically oriented (e.g., pointing upwards or along the x-axis), and this transform
    // then rotates that shape. The angular width of the wedge drawn by petalPath should be
    // (pieSlice.endAngle - pieSlice.startAngle).
  });
}

/** 
function updateVis() {
  // Calcul des moyennes pondérées
  console.log(weights);
  data.forEach((country) => {
    country.mean =
      d3.sum(country.scores.map((s, i) => s * weights[i])) /
      d3.sum(Object.values(weights));
  });
  console.log("prout)");
  // Tri des pays
  data.sort((a, b) => b.mean - a.mean);

  // Échelles
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.mean)])
    .range([height - margin.bottom, margin.top]);

  const x = d3
    .scalePoint()
    .domain(data.map((d) => d.country))
    .range([margin.left, width - margin.right])
    .padding(0.5);

  // Conteneur SVG
  const svg = d3.select("#vis").attr("width", width).attr("height", height);

  // Flowers
  const flowers = svg
    .selectAll(".flower")
    .data(data, (d) => d.country)
    .join(
      (enter) => enter.append("g").attr("class", "flower"),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr("transform", (d) => `translate(${x(d.country)},${y(d.mean)})`);

  // Tiges
  flowers.selectAll(".stem").remove();
  flowers
    .append("line")
    .attr("class", "stem")
    .attr("y2", (d) => y(0) - y(d.mean))
    .attr("stroke", "#555")
    .attr("stroke-width", 2);

  // Pétales
  const petalAngle = d3
    .scaleLinear()
    .domain([0, numDimensions])
    .range([0, Math.PI * 2]);

  flowers.selectAll(".petal").remove();
  flowers.each(function (d) {
    const country = d3.select(this);
    d.scores.forEach((score, i) => {
      const angle = petalAngle(i);
      const petalLength = score * 5;
      const petalWidth = weights[i] * 4;

      country
        .append("path")
        .attr("class", "petal")
        .attr("d", petalShape(angle, petalLength, petalWidth))
        .attr("fill", colors[i])
        .attr("opacity", 0.7);
    });
  });
}
*/
