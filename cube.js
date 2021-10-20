var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var greyColor = '#888888';
var purpleColor = '#5c32a8';
var magentaColor = '#fc0377';
var brightYellowColor = '#fcd303'; 
var orangeColor = '#DC7B2E';
var blueGreenColor = '#63BFAB'; 
var oRedColor = 'rgba(218, 37, 0, 0.3)';
var oGreenColor = 'rgba(0, 143, 0, 0.3)';
var oBlueColor = 'rgba(1, 25, 147, 0.5)';

// https://docs.mathjax.org/en/v2.1-latest/typeset.html
var QUEUE = MathJax.Hub.queue; // shorthand for the queue

// https://stackoverflow.com/questions/60678586/update-x-and-y-values-of-a-trace-using-plotly-update
function updateLocus(seq1, seq2, seq3, newTitle, plot) {
  var layout_update = {
    //title: newTitle,
  };
  var data_update = {'x': [seq1], 'y': [seq2], 'z': [seq3]};

  //var plot = document.getElementById(id);
  Plotly.update(plot, data_update, layout_update, [0]);
}

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

          // update y value of active data point; do not go beyond [0, 1]
          //var minVal = 0, maxVal = 1;
          //if (bounds != undefined) {
          //  minVal = bounds[0];
          //  maxVal = bounds[1];
          //}
          data.datasets[datasetIndex].data[point.index].x = xValue;
          data.datasets[datasetIndex].data[point.index].y = yValue;
          //data.datasets[datasetIndex].data[point.index] = Math.min(Math.max(0, yValue), 1);
          //data.datasets[datasetIndex].data[point.index] = Math.min(Math.max(minVal, yValue), maxVal);
          chart.update();
        }
      }

      // TODO: support any number of data sequences
      // update 3d plot dynamically; do not update 3d plot if none is present
      if (canvas.plot != undefined)  {
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
        Plotly.restyle(canvas.plot, data_update, [...Array(13).keys()].slice(1));
      }
    }
  },
}

function registerDraw(canvas, plot, disableTT) {
  canvas.disableTT = disableTT;
  canvas.plot = plot;
  canvas.targetTraces = [2];
  canvas.onpointerdown = colorPicker.down_handler;
  canvas.onpointerup = colorPicker.up_handler;
}

function registerChartReset(buttonId, plotId, chart, canvas, traces, resetData, fn) {
  $(buttonId).on('click', function(evt) {
    // reset chart.js (2d)
    // do a value copy here so that future updates to the chart won't affect the original data

    for (var i = 0; i < traces.length; i++) {
      var traceId = traces[i];
      var newData = resetData[i];
      var length = newData[0].length;
      chart.data.datasets[traceId].data = Array.from(newData[0]);
      var traceColor = newData[1];
      chart.data.datasets[traceId].borderColor = Array(length).fill(traceColor);
      chart.data.datasets[traceId].pointBackgroundColor = Array(length).fill(traceColor);
      chart.data.datasets[traceId].pointRadius = Array(length).fill(3);
    }

    //registerDrag(canvas, chart, plotId, false, []);
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
  var rg = math.add(r, g);
  var rb = math.add(r, b);
  var gb = math.add(g, b);
  var rgb = math.add(math.add(r, g), b);

  var scale = math.dotDivide(w, rgb);
  return math.transpose([math.dotMultiply(o, scale),
                         math.dotMultiply(r, scale),
                         math.dotMultiply(g, scale),
                         math.dotMultiply(b, scale),
                         math.dotMultiply(rg, scale),
                         math.dotMultiply(rb, scale),
                         math.dotMultiply(gb, scale),
                         math.dotMultiply(rgb, scale)]);
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
  var hoverSkip = [true, true, true, 'skip', 'skip', 'skip', 'skip', 'skip', 'skip', true, true, true];
  for (var i = 0; i < indices.length; i++) {
    var start = indices[i][0];
    var end = indices[i][1];
    var line = {
      x: [allPoints[0][start], allPoints[0][end]],
      y: [allPoints[1][start], allPoints[1][end]],
      z: [allPoints[2][start], allPoints[2][end]],
      text: [names[start], names[end]],
      mode: 'lines+markers',
      type: 'scatter3d',
      showlegend: false,
      line: {
        width: 2,
        color: '#000000',
      },
      // TODO: customize the tooltip
      marker: {
        size: 6,
        opacity: 1,
        color: '#000000',
      },
      hoverinfo: hoverSkip[i],
      hovertemplate: '%{text}<br>X: %{x}' +
        '<br>Y: %{y}' +
        '<br>Z: %{z}<extra></extra>',
    };
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
        //dtick: 0.2,
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
        //scaleanchor: 'x',
        //dtick: 0.2,
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
  var plot = plotRGB('spaceDiv', wlen);

  registerDraw(window.xyCanvas, plot, false);
});










