//  return average of an array
function calculateMean(arr) {
  if (arr.length === 0) {
    return null; // Handle the case of an empty array
  }
  const total = arr.reduce((acc, dim) => acc + dim.value, 0);
  const mean = total / arr.length;
  return mean;
}

// get screen width
function getWidth() {
  if (self.innerWidth) {
    return self.innerWidth;
  }

  if (document.documentElement && document.documentElement.clientWidth) {
    return document.documentElement.clientWidth;
  }

  if (document.body) {
    return document.body.clientWidth;
  }
}

//get screen height
function getHeight() {
  if (self.innerHeight) {
    return self.innerHeight;
  }

  if (document.documentElement && document.documentElement.clientHeight) {
    return document.documentElement.clientHeight;
  }

  if (document.body) {
    return document.body.clientHeight;
  }
}

// Ensure this function is defined after svg, scores, angleScale, weights, flowerHeight are initialized.
// This could be at the end of your d3.tsv().then(...) callback in index.html,
// or in js/script.js if those variables are truly global.

function sortFlowers(sortType) {
  if (
    !scores ||
    scores.length === 0 ||
    !angleScale ||
    !svg ||
    !weights ||
    !flowerHeight
  ) {
    console.warn(
      "Sorting cannot proceed: essential D3 elements or data not ready."
    );
    return;
  }

  // 1. Create a copy of the scores data to sort, and calculate sort keys
  let dataToSort = JSON.parse(JSON.stringify(scores)); // Deep copy to avoid mutating original scores array structure

  dataToSort.forEach((country) => {
    // Calculate the current weighted score for each country (used for "performance" sort)
    let weightedSum = 0;
    let sumOfUserWeights = 0;
    country.data.forEach((dimScore) => {
      const userWeight = parseFloat(weights[dimScore.dim]) || 0;
      // Only include dimensions with weight in the average score calculation
      if (userWeight > 0) {
        weightedSum += dimScore.value * userWeight;
        sumOfUserWeights += userWeight;
      }
    });
    country.currentWeightedScore =
      sumOfUserWeights > 0 ? weightedSum / sumOfUserWeights : 0;
  });

  // 2. Sort the data based on sortType
  if (sortType === "performance_desc") {
    dataToSort.sort((a, b) => b.currentWeightedScore - a.currentWeightedScore);
  } else if (sortType === "performance_asc") {
    dataToSort.sort((a, b) => a.currentWeightedScore - b.currentWeightedScore);
  } else if (sortType === "alphabetical_asc") {
    dataToSort.sort((a, b) => a.country.localeCompare(b.country));
  } else if (sortType === "alphabetical_desc") {
    dataToSort.sort((a, b) => b.country.localeCompare(a.country));
  } else if (sortType === "default") {
    // Revert to the original 'scores' array order.
    // We need to map the original scores array to ensure we have the attached 'currentWeightedScore'
    // if other parts of the transition rely on it, or ensure the y-position logic below is robust.
    // For simplicity, we'll re-create dataToSort from the original `scores` order.
    let originalOrderData = JSON.parse(JSON.stringify(scores));
    originalOrderData.forEach((country) => {
      let weightedSum = 0;
      let sumOfUserWeights = 0;
      country.data.forEach((dimScore) => {
        const userWeight = parseFloat(weights[dimScore.dim]) || 0;
        if (userWeight > 0) {
          weightedSum += dimScore.value * userWeight;
          sumOfUserWeights += userWeight;
        }
      });
      country.currentWeightedScore =
        sumOfUserWeights > 0 ? weightedSum / sumOfUserWeights : 0;
    });
    dataToSort = originalOrderData; // This is already in the original order from the TSV
  }
  // Add more sort types here if needed

  drawOrUpdateYAxis(750); // Then update the axis

  // 3. Update the domain of the angleScale with the new order of country names
  angleScale.domain(dataToSort.map((d) => d.country));

  // 4. Select all flower groups and transition them to their new positions
  const flowerSelection = svg
    .selectAll(".flower")
    .data(dataToSort, (d) => d.country); // IMPORTANT: Re-bind data with a key function

  flowerSelection
    .transition("sort_transition") // Optional: name the transition
    .duration(1200) // Duration of the sort animation
    .delay((d, i) => i * 25) // Stagger the animation for a nicer effect
    .attr("transform", (d) => {
      // The Y position (height) is based on its currentWeightedScore.
      // The X position comes from the updated angleScale.
      const xPos = angleScale(d.country);
      const yPos = flowerHeight(d.currentWeightedScore); // Using the score calculated and attached above
      return `translate(${xPos}, ${yPos})`;
    });
}

// 3. Attach Event Listener to the Dropdown
// This should also be placed where it can access sortFlowers, likely after its definition.
// If in index.html, place it at the end of the main <script> block.
document.addEventListener("DOMContentLoaded", (event) => {
  const sortSelectElement = document.getElementById("sort-select");
  if (sortSelectElement) {
    sortSelectElement.addEventListener("change", function () {
      sortFlowers(this.value);
    });
  } else {
    // This might run before the d3.tsv().then() if sortFlowers relies on d3 elements.
    // It's safer to set this up *after* the D3 elements are ready if sortFlowers accesses them immediately.
    // However, sortFlowers itself has checks.
    // Let's assume it's fine here, or move it inside the .then() if issues arise.
    console.warn(
      "Sorting select element not found immediately on DOMContentLoaded."
    );
  }
});

function drawOrUpdateYAxis(duration = 750) {
  if (!flowerHeight || !yAxisGroup) {
    // console.warn("Cannot draw or update Y-axis: scale or group element not ready.");
    return;
  }

  // Define the D3 axis generator for the left axis
  const yAxisGenerator = d3
    .axisLeft(flowerHeight)
    // Dynamically suggest a number of ticks based on available height
    //.ticks(Math.max(2, Math.round(svgHeight / 60)))
    //Alternatively  set a fix number of ticks
    .ticks(5)
    .tickSizeOuter(0) // Hide the outer ticks if you prefer
    .tickFormat((d) => {
      // Smart tick formatting
      if (Math.abs(d) >= 1000 || (Math.abs(d) < 0.01 && d !== 0)) {
        return d3.format(".2s")(d); // Use SI prefix for large/very small numbers
      }
      if (Math.abs(d) < 1 && d !== 0) {
        return d3.format(".2f")(d); // Two decimal places for numbers between -1 and 1
      }
      if (Math.abs(d) < 10) {
        return d3.format(".0f")(d); // One decimal place
      }
      return d3.format(".0f")(d); // No decimal places for integers or larger numbers
    });

  // Apply the generator to the yAxisGroup with a transition
  yAxisGroup.transition().duration(duration).call(yAxisGenerator);

  // Optional: Style ticks and domain line if default D3 styles aren't sufficient
  yAxisGroup.selectAll(".tick line").style("stroke", "#ccc"); // Lighten tick marks
  yAxisGroup.select(".domain").style("stroke", "#333"); // Ensure domain line is visible
  yAxisGroup
    .selectAll(".tick text")
    .style("font-size", "9px") // Adjust tick font size
    .attr("x", -6); // Adjust position of tick labels from the axis line
}

function updateDynamicFlowerHeightDomain() {
  if (!scores || scores.length === 0 || !weights || !flowerHeight) {
    console.warn(
      "Cannot update flowerHeight domain: essential data or scale not ready."
    );
    if (flowerHeight) flowerHeight.domain([0, 10]); // Fallback to a default if scale exists
    return;
  }

  const allWeightedScores = scores.map((country) => {
    let weightedSum = 0;
    let sumOfUserWeights = 0;
    country.data.forEach((dimScore) => {
      const userWeight = parseFloat(weights[dimScore.dim]) || 0;
      if (userWeight > 0) {
        // Only consider dimensions with actual weight
        weightedSum += dimScore.value * userWeight;
        sumOfUserWeights += userWeight;
      }
    });
    return sumOfUserWeights > 0 ? weightedSum / sumOfUserWeights : 0;
  });

  if (allWeightedScores.length === 0) {
    flowerHeight.domain([0, 10]); // Fallback
    return;
  }

  let minScore = d3.min(allWeightedScores);
  let maxScore = d3.max(allWeightedScores);

  // Handle edge cases: all scores are the same, or only one country, or undefined scores
  if (typeof minScore === "undefined" || typeof maxScore === "undefined") {
    minScore = 0;
    maxScore = 10; // Fallback to a default domain
  } else if (minScore === maxScore) {
    // If all scores are identical, create a small domain around that score
    const buffer = Math.max(0.5, Math.abs(minScore * 0.1)); // Ensure buffer is at least 0.5
    minScore = minScore - buffer;
    maxScore = maxScore + buffer;
    if (minScore >= maxScore) {
      // Safety if initial score was 0 and buffer became 0 or negative
      minScore = (maxScore || 0) - 1; // Ensure min is less than max
      maxScore = (maxScore || 0) + 1;
    }
  } else if (maxScore - minScore < 0.1) {
    // If scores are very close but not identical
    // Prevent an extremely compressed scale by ensuring a minimum visual range
    const midPoint = (minScore + maxScore) / 2;
    const tinyBuffer = 0.5; // Ensure at least a 1-unit span in the domain
    minScore = midPoint - tinyBuffer;
    maxScore = midPoint + tinyBuffer;
  }
  // Optional: Add a small padding to the domain so min/max values aren't exactly at the screen edges
  // else {
  //    const padding = (maxScore - minScore) * 0.05; // 5% padding
  //    minScore -= padding;
  //    maxScore += padding;
  // }
  flowerHeight.domain([0, maxScore * 1.1]); //scale always start at 0
  //flowerHeight.domain([0.9 * minScore, maxScore * 1.1]);
  // console.log("Updated flowerHeight domain to:", flowerHeight.domain());
}
