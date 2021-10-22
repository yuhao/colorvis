var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var greyColor = '#888888';
var purpleColor = '#5c32a8';
var magentaColor = '#fc0377';
var cyanColor = '#42f5e6';
var yellowColor = '#f5d442';
var brightYellowColor = '#fcd303'; 
var orangeColor = '#DC7B2E';
var blueGreenColor = '#63BFAB'; 
var oRedColor = 'rgba(218, 37, 0, 0.3)';
var oGreenColor = 'rgba(0, 143, 0, 0.3)';
var oBlueColor = 'rgba(1, 25, 147, 0.5)';

// https://docs.mathjax.org/en/v2.1-latest/typeset.html
var QUEUE = MathJax.Hub.queue; // shorthand for the queue
var transMatText;
QUEUE.Push(function () {
  transMatText = MathJax.Hub.getAllJax('mat');
});

function unpack(rows, key, toNum) {
  return rows.map(function(row) {
      if (toNum == false) return row[key];
      else return parseFloat(row[key]);
    });
}

function range(start, end, stride) {
  return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
}

function registerChartReset(buttonId, plotId, chart, canvas, traces, resetData, fn) {
  $(buttonId).on('click', function(evt) {
    // reset chart.js (2d)
    // do a value copy here so that future updates to the chart won't affect the original data

    for (var i = 0; i < traces.length; i++) {
      var traceId = traces[i];
      var newData = resetData[i];
      var length = newData[0].length;
      // https://stackoverflow.com/questions/597588/how-do-you-clone-an-array-of-objects-in-javascript
      chart.data.datasets[traceId].data = newData[0].map(a => ({...a}));
      var traceColor = newData[1];
      chart.data.datasets[traceId].pointBackgroundColor = newData[1];
      chart.data.datasets[traceId].borderColor = newData[2];
    }

    chart.update();

    if (fn != undefined) fn();
  });
}

function plotRGB(plotId, wlen) {
  var locus = {
    x: CMFR,
    y: CMFG,
    z: CMFB,
    text: wlen,
    type: 'scatter3d',
    mode: 'lines+markers',
    marker: {
      size: 4,
      opacity: 0.8,
      color: Array(wlen.length).fill(greyColor),
    },
    line: {
      color: greyColor,
      width: 2,
      shape: 'spline',
    },
    //hoverinfo: 'skip',
    hovertemplate: 'R: %{x}' +
      '<br>G: %{y}' +
      '<br>B: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    name: 'Spectral locus',
  };

  var data = [locus];

  var layout = {
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    showlegend: true,
    legend: {
      x: 0.1,
      xanchor: 'left',
      y: 1,
    },
    //title: 'Spectral locus in RGB color space',
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    scene: {
      camera: {
        projection: {
          type: 'orthographic'
        }
      },
      // https://plotly.com/javascript/3d-axes/
      aspectmode: 'cube',
      xaxis: {
        autorange: true,
        //range: [0, 1.5],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        //constrain: 'domain',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'R'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1.5],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'G'
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 2],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'y',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'B'
        }
      },
    }
  };
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function plotXYZPrims(plot, prims) {
  var X = prims[0];
  var Y = prims[1];
  var Z = prims[2];
  var XY = math.add(X, Y);
  var XZ = math.add(X, Z);
  var YZ = math.add(Y, Z);

  var points = {
    x: [0, X[0], Y[0], Z[0], XY[0], XZ[0], YZ[0]],
    y: [0, X[1], Y[1], Z[1], XY[1], XZ[1], YZ[1]],
    z: [0, X[2], Y[2], Z[2], XY[2], XZ[2], YZ[2]],
    //i: [0, 1, 0, 2, 0, 1],
    //j: [1, 2, 2, 3, 1, 3],
    //k: [2, 4, 3, 6, 3, 5],
    i: [0, 0, 0],
    j: [1, 2, 1],
    k: [2, 3, 3],
    //text: wlen,
    type: 'mesh3d',
    opacity: 1,
    color: [redColor, greenColor, blueColor],
    //marker: {
    //  size: 4,
    //  opacity: 0.8,
    //  color: Array(wlen.length).fill(greyColor),
    //},
    //line: {
    //  color: greyColor,
    //  width: 2,
    //  shape: 'spline',
    //},
    //hoverinfo: 'skip',
    //hovertemplate: 'R: %{x}' +
    //  '<br>G: %{y}' +
    //  '<br>B: %{z}' +
    //  '<br>wavelength: %{text}<extra></extra>',
    //name: 'Spectral locus',
  };

  Plotly.addTraces(plot, [points]);
}

var CMFX = [], CMFY = [], CMFZ = [], cX = [], cY = [], cZ = [];
var CMFR = [], CMFG = [], CMFB = [];
var XYZ2RGBMat = [[0.41847, -0.15866, -0.082835], [-0.091169, 0.25243, 0.015708], [0.00092090, -0.0025498, 0.17860]];

d3.csv('ciexyz31.csv', function(err, rows){
  var stride = 5;

  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var x_data = range(firstW, lastW, stride);

  CMFX = unpack(rows, 'x');
  CMFY = unpack(rows, 'y');
  CMFZ = unpack(rows, 'z');

  var sumXYZ = math.add(math.add(CMFX, CMFY), CMFZ);
  var cX = math.dotDivide(CMFX, sumXYZ);
  var cY = math.dotDivide(CMFY, sumXYZ);
  var cZ = math.dotDivide(CMFZ, sumXYZ);

  var RGB = math.multiply(XYZ2RGBMat, [CMFX, CMFY, CMFZ]);
  CMFR = RGB[0];
  CMFG = RGB[1];
  CMFB = RGB[2];

  var X = math.multiply(XYZ2RGBMat, [1, 0, 0]);
  var Y = math.multiply(XYZ2RGBMat, [0, 1, 0]);
  var Z = math.multiply(XYZ2RGBMat, [0, 0, 1]);

  window.spacePlot = plotRGB('spaceDiv', wlen);
  plotXYZPrims(window.spacePlot, [X, Y, Z]);

  //var locus = math.transpose([cX, cY, cZ]);
  //plotxyChrm('canvas2d', locus, x_data);

});










