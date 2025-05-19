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
