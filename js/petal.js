//function to draw petals
function petalPath(d, i) {
  //console.log(weights);
  //console.log(sumOfUserWeights);

  //console.log(totalWeightedScore);
  // d is a pie segment object
  const petalLength = radiusScale(d.data.score); // Length from score
  const angularWidth = d.endAngle - d.startAngle; // Angular width from userWeight via pie

  // Draw a symmetrical wedge (e.g., centered around the positive Y-axis if to be rotated)
  // For d3.arc, startAngle is typically from the positive X-axis counter-clockwise.
  // If your 'r()' transform rotates from a base position (e.g. petal pointing right or up),
  // draw the petal relative to that base. Example for petal pointing up before rotation:
  /*const arcGenerator = d3
    .arc()
    .innerRadius(0) // Or a small value for the flower's center
    .outerRadius(petalLength)
    .startAngle(-angularWidth / 2) // Symmetrically distribute width
    .endAngle(angularWidth / 2);

  return arcGenerator(); */ // Generates the SVG path string for this wedge
  // This wedge itself is not rotated by startAngle/endAngle here;
  // it *has* an angularWidth. The main transform on the path element handles positioning.
  return (
    "M0,0C0,0" +
    ",-" +
    (2.25 *
      (radiusScale(d.data.score) * petalWeightScale(weights[d.data.dim]))) /
      sumOfUserWeights +
    "," +
    (8 * radiusScale(d.data.score)) / 10 +
    ",0," +
    radiusScale(d.data.score) +
    "C0," +
    radiusScale(d.data.score) +
    "," +
    (2.25 *
      (radiusScale(d.data.score) * petalWeightScale(weights[d.data.dim]))) /
      sumOfUserWeights +
    "," +
    (8 * radiusScale(d.data.score)) / 10 +
    ",0,0"
  );
}

function petalFill(d, i) {
  // d is a pie segment
  if (weights[d.data.dim] == 0) return "white";
  else return d3.rgb(colorScale(d.data.dim)); // Color based on dimension and weighting
}

function petalOpacity(d, i) {
  // d is a pie segment
  return opacityScale(weights[d.data.dim] / (sumOfUserWeights / 11) / 10); // Color based on dimension and weighting 10 corresponds to highest weight
}

function petalStroke(d, i) {
  // d is a pie segment
  return d3.rgb(colorScale(d.data.dim)).darker(2);
}
function flowerSum(d) {
  return d3.sum(d.petals, function (d) {
    return d.size;
  });
}

function r(angle) {
  return "rotate(" + (angle / Math.PI) * 180 + ")";
}

function polarToCartesian(angle, radius) {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
