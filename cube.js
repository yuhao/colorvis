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

    // convert mouse position to chart x/y axis value 
    const helpers = Chart.helpers;
    var position = helpers.getRelativePosition(event, chart);
 
    var chartArea = chart.chartArea;
    var yAxis = chart.scales.yAxes; // TODO: shouldn't it be chart.options.scales?
    var yValue = colorPicker.map(position.y, chartArea.bottom, chartArea.top, yAxis.min, yAxis.max);
    var xAxis = chart.scales.xAxes;
    var xValue = colorPicker.map(position.x, chartArea.left, chartArea.right, xAxis.min, xAxis.max);

    var trace = canvas.chart.data.datasets[canvas.primId];
    if (canvas.count == 0) {
      trace.data.push({x: xValue, y: yValue});
      trace.backgroundColor.push(redColor);
      trace.borderColor.push(redColor);
    } else if (canvas.count == 1) {
      trace.data.push({x: xValue, y: yValue});
      trace.backgroundColor.push(greenColor);
      trace.borderColor.push(greenColor);
    } else if (canvas.count == 2) {
      trace.data.push({x: xValue, y: yValue});
      trace.backgroundColor.push(blueColor);
      trace.borderColor.push(blueColor);
    } else if (canvas.count == 3) {
      trace.data.push({x: xValue, y: yValue});
      trace.backgroundColor.push('#FFFFFF');
      trace.borderColor.push('#000000');
    }
    canvas.count++;

    if (canvas.disableTT == true) {
      chart.options.plugins.tooltip.enabled = false;
    }
    chart.update();
  },

  up_handler: function(event) {
    var canvas = event.currentTarget;
    var chart = canvas.chart;

    // release grabbed point
    if (canvas.disableTT == true) {
      chart.options.plugins.tooltip.enabled = true;
      chart.update();
    }
  },
}

function registerClick(canvas, plotId, disableTT) {
  canvas.disableTT = disableTT;
  canvas.plotId = plotId;
  canvas.count = 0;
  var trace = {
    type: 'scatter',
    labels: ['R', 'G', 'B', 'W'],
    data: [],
    radius: 6,
    backgroundColor: [],
    borderColor: [],
  };
  canvas.chart.data.datasets.push(trace);
  canvas.primId = canvas.chart.data.datasets.length - 1;
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
    data: {
      datasets: [
        {
          type: 'scatter',
          label: 'Spectral Color',
          labels: x_data,
          data: arr2Obj(points),
          showLine: true,
        },
        {
          type: 'scatter',
          label: 'XYZ Primaries',
          labels: ['Z', 'Y', 'X', 'Z'],
          data: [{x: 0, y: 0}, {x: 0, y: 1}, {x: 1, y: 0}, {x: 0, y: 0}],
          showLine: true,
          pointRadius: 0,
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
        },
        xAxes:{
          min: 0,
          max: 1,
        },
      },
      plugins: {
        legend: {
          display: true,
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
              if (context.datasetIndex == 0) {
                var data = context.dataset.labels[context.dataIndex];
                return data + ': (' + context.parsed.x.toFixed(3) + ', ' + context.parsed.y.toFixed(3) + ')';
              } else if (context.datasetIndex == 1) {
                var data = context.dataset.labels[context.dataIndex];
                return data + ': (' + context.parsed.x.toFixed(3) + ', ' + context.parsed.y.toFixed(3) + ')';
              } else if (context.datasetIndex == 2) {
                var data = context.dataset.labels[context.dataIndex];
                return data + ': (' + context.parsed.x.toFixed(3) + ', ' + context.parsed.y.toFixed(3) + ')';
              }
            }
          },
        }
      }
    }
  });
  window.xyCanvas.chart = window.xyChart;
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

  registerClick(window.xyCanvas, undefined, true);
});










