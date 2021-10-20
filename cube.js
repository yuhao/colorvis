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

function unpack(rows, key, toNum) {
  return rows.map(function(row) {
      if (toNum == false) return row[key];
      else return parseFloat(row[key]);
    });
}

function range(start, end, stride) {
  return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
}

function toggleDrag(canvas, enable) {
  if (enable) {
    canvas.onpointerdown = canvas.down_handler;
    canvas.onpointerup = canvas.up_handler;
    canvas.onpointermove = null;
  } else{
    canvas.onpointerdown = null;
    canvas.onpointerup = null;
    canvas.onpointermove = null;
  }
}

var colorPicker = {
  // map value to other coordinate system
  map: function(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
  },

  down_handler: function(event) {
    var canvas = event.currentTarget;
    var chart = canvas.chart;

    // get the intersecting data point
    const points = chart.getElementsAtEventForMode(event, 'nearest', {intersect: true});
    if (points.length > 0) {
      // only drag draggable curves
      if ((canvas.targetTraces.length != 0) && (canvas.targetTraces.indexOf(points[0].datasetIndex) == -1)) {
        return;
      }
      // grab the point, start dragging
      canvas.activePoint = points[0];
      canvas.selectedTrace = canvas.activePoint.datasetIndex;
      canvas.onpointermove = colorPicker.move_handler;
    };

    if (canvas.disableTT == true) {
      chart.options.plugins.tooltip.enabled = false;
      chart.update();
    }
  },

  up_handler: function(event) {
    var canvas = event.currentTarget;
    var chart = canvas.chart;

    // release grabbed point, stop dragging
    if (canvas.activePoint) {
      canvas.activePoint = null;
      canvas.onpointermove = null;
    }

    if (canvas.disableTT == true) {
      chart.options.plugins.tooltip.enabled = true;
      chart.update();
    }
  },

  move_handler: function(event)
  {
    var canvas = event.currentTarget;
    var chart = canvas.chart;

    // if an intersecting data point is grabbed
    if (canvas.activePoint) {
      // then get the points on the selectedTrace
      const points = chart.getElementsAtEventForMode(event, 'nearest', {intersect: false});
      for (var i = 0; i < points.length; i++) {
        if (points[i].datasetIndex == canvas.selectedTrace) {
          var point = points[i];
          var data = chart.data;
          
          var datasetIndex = point.datasetIndex;
  
          // convert mouse position to chart x/y axis value 
          const helpers = Chart.helpers;
          var position = helpers.getRelativePosition(event, chart);
 
          var chartArea = chart.chartArea;
          var yAxis = chart.scales.yAxes; // TODO: shouldn't it be chart.options.scales?
          var yValue = colorPicker.map(position.y, chartArea.bottom, chartArea.top, yAxis.min, yAxis.max);
          var xAxis = chart.scales.xAxes;
          var xValue = colorPicker.map(position.x, chartArea.left, chartArea.right, xAxis.min, xAxis.max);

          data.datasets[datasetIndex].data[point.index].x = xValue;
          data.datasets[datasetIndex].data[point.index].y = yValue;
          chart.update();
        }
      }

      // TODO: support any number of data sequences
      // update 3d plot dynamically; do not update 3d plot if none is present
      if (canvas.plot != undefined)  {
        updateSpacePlot(canvas.plot);
      }
    }
  },
}

function updateSpacePlot(plot) {
  var allPoints = getVertices();

  var xUpdate = [], yUpdate = [], zUpdate = [];
  var indices = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]];
  for (var i = 0; i < indices.length; i++) {
    var start = indices[i][0];
    var end = indices[i][1];
    xUpdate.push([allPoints[0][start], allPoints[0][end]]);
    yUpdate.push([allPoints[1][start], allPoints[1][end]]);
    zUpdate.push([allPoints[2][start], allPoints[2][end]]);
  }
  var data_update = {'x': xUpdate, 'y': yUpdate, 'z': zUpdate};
  Plotly.restyle(plot, data_update, [...Array(13).keys()].slice(1));
}

function toggleDraw(toggle, canvas, plot, disableTT) {
  if (toggle) {
    canvas.disableTT = disableTT;
    canvas.plot = plot;
    canvas.targetTraces = [2];
    canvas.onpointerdown = colorPicker.down_handler;
    canvas.onpointerup = colorPicker.up_handler;
  } else {
    canvas.onpointerdown = null;
    canvas.onpointerup = null;
  }
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

function arr2Obj(arr) {
  var traces = [];

  for (var i = 0; i < arr.length; i++) {
    var obj = {};
    obj.x = arr[i][0];
    obj.y = arr[i][1];

    traces.push(obj);
  }

  return traces;
};

function plotxyChrm(id, points, x_data) {
  window.xyCanvas = document.getElementById(id);
  var ctx = window.xyCanvas.getContext("2d");

  window.xyChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Spectral Color',
          labels: x_data,
          data: arr2Obj(points),
          showLine: true,
          // could apply to individual trace if needed
          //tooltip: {
          //}
        },
        {
          label: 'XYZ Primaries',
          labels: ['z', 'y', 'x', 'z'],
          data: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 0}, {x: 0, y: 0}],
          showLine: true,
          pointRadius: 0,
        },
        {
          label: 'sRGB Primaries',
          labels: ['R', 'G', 'B', 'W'],
          data: [{x: 0.6400, y: 0.3300}, {x: 0.3000, y: 0.6000}, {x: 0.1500, y: 0.0600}, {x: 0.3333, y: 0.3333}],
          pointBackgroundColor: [redColor, greenColor, blueColor, '#FFFFFF'],
          borderColor: [redColor, greenColor, blueColor, '#000000'],
          pointRadius: 6,
        },
      ]
    },
    options: {
      aspectRatio: 1,
      animation: {
        duration: 10
      },
      responsive: true,
      interaction: {
        mode: 'nearest',
        intersect: false,
        //mode: 'index',
        //intersect: true,
      },
      elements: {
        point: {
          backgroundColor: '#000000',
          radius: 3,
          hoverRadius: 8,
        },
        line: {
          borderColor: '#000000',
          borderWidth: 1,
        },
      },
      scales: {
        yAxes:{
          min: 0,
          max: 1,
          position: 'left',
          title: {
            display: true,
            text: 'y',
          },
        },
        xAxes:{
          min: 0,
          max: 1,
          title: {
            display: true,
            text: 'x',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        // https://www.chartjs.org/chartjs-plugin-zoom/guide/options.html#wheel-options
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            mode: 'x',
          },
          limits: {
            x: {min: 0, max: 1},
          },
        },
        title: {
          display: true,
          text: 'CIE 1931 xy-Chromaticity Diagram',
          font: {
            size: 18,
            family: 'Helvetica Neue',
          },
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.datasetIndex == 1 && context.dataIndex == 3) return;

              var data = context.dataset.labels[context.dataIndex];
              return data + ': (' + context.parsed.x.toFixed(3) + ', ' + context.parsed.y.toFixed(3) + ')';
            }
          },
        }
      }
    }
  });
  window.xyCanvas.chart = window.xyChart;
}

function getVertices() {
  var o = [0, 0, 0];
  var r = [window.xyChart.data.datasets[2].data[0].x,
           window.xyChart.data.datasets[2].data[0].y,
           (1 - window.xyChart.data.datasets[2].data[0].x - window.xyChart.data.datasets[2].data[0].y)];
  var g = [window.xyChart.data.datasets[2].data[1].x,
           window.xyChart.data.datasets[2].data[1].y,
           (1 - window.xyChart.data.datasets[2].data[1].x - window.xyChart.data.datasets[2].data[1].y)];
  var b = [window.xyChart.data.datasets[2].data[1].x,
           window.xyChart.data.datasets[2].data[2].y,
           (1 - window.xyChart.data.datasets[2].data[2].x - window.xyChart.data.datasets[2].data[2].y)];
  var w = [window.xyChart.data.datasets[2].data[3].x,
           window.xyChart.data.datasets[2].data[3].y,
           (1 - window.xyChart.data.datasets[2].data[3].x - window.xyChart.data.datasets[2].data[3].y)];
  var scaleW = 1/w[1]; // scale so that Y of w is 1.
  w = math.dotMultiply(scaleW, w);

  // scale R, G, B so that the chromaticity of R+G+B is the same as W
  /*
     Rx, Gx, Bx      alpha     Wx 
    [Ry, Gy, By] * [ beta ] = [Wy]
     Rz, Gz, Bz      gamma     Wz 
  */
  var invPrims = math.inv(math.transpose([r, g, b]));
  var scale = math.multiply(invPrims, math.transpose(w));

  r = math.dotMultiply(scale[0], r);
  g = math.dotMultiply(scale[1], g);
  b = math.dotMultiply(scale[2], b);
  var rg = math.add(r, g);
  var rb = math.add(r, b);
  var gb = math.add(g, b);

  var rgb = math.add(math.add(r, g), b);

  return math.transpose([o,r,g,b,rg,rb,gb,w]);
}

function plotRGB(plotId, wlen) {
  var locus = {
    x: CMFX,
    y: CMFY,
    z: CMFZ,
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
    hovertemplate: 'X: %{x}' +
      '<br>Y: %{y}' +
      '<br>Z: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    name: 'Spectral locus in XYZ',
  };

  var allPoints = getVertices();

  var traces = [];
  // O: 0; R: 1; G: 2: B: 3
  // RG: 4; RB: 5; GB: 6; RGB: 7
  var indices = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]];
  var names = ['O', 'R', 'G', 'B', 'R+G', 'R+B', 'G+B', 'R+G+B'];
  var hoverInfo = [true, true, true, 'skip', 'skip', 'skip', 'skip', 'skip', 'skip', true, true, true];
  var colors = ['#000000', redColor, greenColor, blueColor, yellowColor, cyanColor, magentaColor, '#000000'];
  var modes = Array(3).fill('lines+markers').concat(Array(6).fill('lines')).concat(Array(3).fill('lines+markers'));

  for (var i = 0; i < indices.length; i++) {
    var start = indices[i][0];
    var end = indices[i][1];
    var line = {
      x: [allPoints[0][start], allPoints[0][end]],
      y: [allPoints[1][start], allPoints[1][end]],
      z: [allPoints[2][start], allPoints[2][end]],
      text: [names[start], names[end]],
      mode: modes[i],
      type: 'scatter3d',
      showlegend: false,
      line: {
        width: 2,
        color: '#000000',
      },
      marker: {
        size: 6,
        opacity: 1,
        color: [colors[start], colors[end]],
      },
      hoverinfo: hoverInfo[i],
    };
    // hovertemplate overwrites hoverinfo, so add it later
    if (hoverInfo[i] == true) {
      line.hovertemplate = '%{text}<br>X: %{x}' +
        '<br>Y: %{y}' +
        '<br>Z: %{z}<extra></extra>';
    }
    traces.push(line);
  }

  var data = [locus].concat(traces);

  var layout = {
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    showlegend: true,
    legend: {
      x: 1,
      xanchor: 'right',
      y: 0.9,
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
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        //constrain: 'domain',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'X'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'Y'
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'y',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'Z'
        }
      },
    }
  };
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function registerPickColor(id) {
  $(id).on('change', function(evt) {
    var plot = window.spacePlot;
    if($(id).is(":checked")) {
      toggleDraw(true, window.xyCanvas, plot, false);
    } else {
      toggleDraw(false, window.xyCanvas);
    }
  });
}

function registerResetColor(id) {
  registerChartReset(id, undefined, window.xyChart, window.xyCanvas, [2],
      [[[{x: 0.6400, y: 0.3300}, {x: 0.3000, y: 0.6000}, {x: 0.1500, y: 0.0600}, {x: 1/3, y: 1/3}], [redColor, greenColor, blueColor, '#FFFFFF'], [redColor, greenColor, blueColor, '#000000']]],
      function() {
        updateSpacePlot(window.xyCanvas.plot);
      });
}

var CMFX = [], CMFY = [], CMFZ = [], cX = [], cY = [], cZ = [];
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

  var locus = math.transpose([cX, cY, cZ]);
  plotxyChrm('canvas2d', locus, x_data);
  window.spacePlot = plotRGB('spaceDiv', wlen);

  registerPickColor('#pickColor');
  registerResetColor('#resetColor');
});










