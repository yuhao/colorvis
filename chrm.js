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
var oBlueColor = 'rgba(1, 25, 147, 0.3)';

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

function highlightLocus(index, id) {
  var plot = document.getElementById(id);

  for (var i = 0; i < plot.data.length; i++) {
    var prevHlId = plot.data[i].marker.color.indexOf(brightYellowColor);
    if (prevHlId != -1) {
      plot.data[i].marker.color[prevHlId] =
          plot.data[i].marker.color[(prevHlId + 1) % plot.data[i].x.length];
    }

    var colors = Array.from(plot.data[i].marker.color);
    if (index != -1) {
      colors[index] = brightYellowColor;
    }
    var update = {'marker.color': [colors]};
    Plotly.restyle(plot, update, [i]);
  }
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

function registerResetZoom(id, chart) {
  $(id).on('click', function(evt) {
      chart.resetZoom();
  });
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

function registerDrag(canvas, chart, plotId, disableTT, targetTraces) {
  function down_handler(event) {
    // get the intersecting data point
    const points = chart.getElementsAtEventForMode(event, 'nearest', {intersect: true});
    if (points.length > 0) {
      // only drag draggable curves
      if ((targetTraces.length != 0) && (targetTraces.indexOf(points[0].datasetIndex) == -1)) {
        return;
      }
      // grab the point, start dragging
      canvas.activePoint = points[0];
      canvas.selectedTrace = canvas.activePoint.datasetIndex;
      canvas.onpointermove = move_handler;
    };

    if (disableTT == true) {
      chart.options.plugins.tooltip.enabled = false;
      chart.update();
    }
  };

  function up_handler(event) {
    // release grabbed point, stop dragging
    if (canvas.activePoint) {
      canvas.activePoint = null;
      canvas.onpointermove = null;
    }

    if (disableTT == true) {
      chart.options.plugins.tooltip.enabled = true;
      chart.update();
    }
  };

  function move_handler(event)
  {
    // if an intersecting data point is grabbed
    if (canvas.activePoint) {
      // then get the points on the selectedTrace
      const points = chart.getElementsAtEventForMode(event, 'index', {intersect: false});
      for (var i = 0; i < points.length; i++) {
        if (points[i].datasetIndex == canvas.selectedTrace) {
          var point = points[i];
          var data = chart.data;
          
          var datasetIndex = point.datasetIndex;
  
          // read mouse position
          const helpers = Chart.helpers;
          var position = helpers.getRelativePosition(event, chart);
  
          // convert mouse position to chart y axis value 
          var chartArea = chart.chartArea;
          var yAxis = chart.scales.yAxes;
          var yValue = map(position.y, chartArea.bottom, chartArea.top, yAxis.min, yAxis.max);
  
          // update y value of active data point; do not go beyond [0, 1]
          data.datasets[datasetIndex].data[point.index] = Math.min(Math.max(0, yValue), 1);
          chart.update();
        }
      }

      // TODO: support any number of data sequences
      // update 3d plot dynamically; do not update 3d plot if none is present
      if (plotId != undefined)  {
        var seq0 = chart.data.datasets[0].data;
        var seq1 = chart.data.datasets[1].data;
        var seq2 = chart.data.datasets[2].data;
        var title = (chart.canvas.id == 'canvasLMS') ?
            'Updated spectral locus in LMS cone space' :
            'Updated spectral locus in RGB space';
        // TODO: should update chromaticities if the 3d plot shows chromaticities
        //var plot = document.getElementById(plotId);
        updateLocus(seq0, seq1, seq2, title, plotId);
      }
    }
  };

  // map value to other coordinate system
  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
  };

  // set pointer event handlers for canvas element
  canvas.onpointerdown = down_handler;
  canvas.onpointerup = up_handler;
  canvas.onpointermove = null;
}

function registerChartReset(buttonId, plotId, chart, canvas, traces, resetData) {
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
  });
}

// sRGB of the patches under D50
function formatRGB(rgb) {
  return 'rgba('+ rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + '1)';
}

d3.csv('linss2_10e_5_ext.csv', function(err, rows){
  var stride = 5;

  // points to the cone arrays that will be used to plot the chart;
  var dConeL = unpack(rows, 'l');
  var dConeM = unpack(rows, 'm');
  var dConeS = unpack(rows, 's');

  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];

  // LMS plot
  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);
  var y_data_1 = dConeL;
  var y_data_2 = dConeM;
  var y_data_3 = dConeS;

  // draw a line chart on the canvas context
  window.lmsCanvas = document.getElementById("canvasLMS");
  var ctx = window.lmsCanvas.getContext("2d");
  window.lmsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: x_data,
      datasets: [
        {
          data: y_data_1,
          label: "L Cone",
          borderColor: redColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: redColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_2,
          label: "M Cone",
          borderColor: greenColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: greenColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_3,
          label: "S Cone",
          borderColor: blueColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: blueColor,
          pointRadius: 3,
          borderWidth: 1,
        },
      ]
    },
    options: {
      animation: {
        duration: 10
      },
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        yAxes:{
          min: 0,
          max: 1,
          position: 'left',
        },
      },
      plugins: {
        // https://www.chartjs.org/chartjs-plugin-zoom/guide/options.html#wheel-options
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            mode: 'x',
          },
        },
        title: {
          display: true,
          text: 'Cone Fundamentals (Stockman & Sharpe, 2000)',
          font: {
            size: 18,
            family: 'Helvetica Neue',
          },
        },
      }
    }
  });

  // sets window.rgbPrimCanvas and window.rgbPrimChart
  plotCustomPrims(x_data);

  registerSelPrim('#selPrimForm', window.lmsChart, window.lmsCanvas, window.rgbPrimChart, window.rgbPrimCanvas);
  registerChartReset('#resetPrim', undefined, window.rgbPrimChart, window.rgbPrimCanvas, [0, 1, 2],
      [[Array(wlen.length).fill(0.8), redColor],
       [Array(wlen.length).fill(0.9), greenColor],
       [Array(wlen.length).fill(0.6), blueColor]]);
});

function plotCustomPrims(label) {
  var len = label.length;
  var r_data = Array(len).fill(0.8);
  var g_data = Array(len).fill(0.9) ;
  var b_data = Array(len).fill(0.6) ;

  // draw a line chart on the canvas context
  window.rgbPrimCanvas = document.getElementById("canvasRGBPrim");
  var ctx = window.rgbPrimCanvas.getContext("2d");
  window.rgbPrimChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: label,
      datasets: [
        {
          data: r_data,
          label: "R Primary",
          borderColor: redColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: redColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: g_data,
          label: "G Primary",
          borderColor: greenColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: greenColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: b_data,
          label: "B Primary",
          borderColor: blueColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: blueColor,
          pointRadius: 3,
          borderWidth: 1,
        },
      ]
    },
    options: {
      animation: {
        duration: 10
      },
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        yAxes:{
          min: 0,
          max: 1,
          position: 'left',
        },
      },
      plugins: {
        // https://www.chartjs.org/chartjs-plugin-zoom/guide/options.html#wheel-options
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
            },
            mode: 'x',
          },
        },
        title: {
          display: true,
          text: 'Custom RGB Primaries',
          font: {
            size: 18,
            family: 'Helvetica Neue',
          },
        },
      }
    }
  });

  toggleDrag(window.rgbPrimCanvas, false);
}

function drawPrims(chart, canvas) {
  toggleDrag(canvas, true);
  $('#resetPrim').prop('disabled', false);

  var len = chart.data.datasets[0].data.length;
  registerDrag(window.rgbPrimCanvas, window.rgbPrimChart, undefined, true, [0, 1, 2]);
}

function registerSelPrim(formId, lmsChart, lmsCanvas, rgbChart, rgbCanvas) {
  function getWaveId(chart, wave) {
    var stride = 5;
    var wlen = chart.data.labels;
    return (wave - wlen[0]) / stride;
  };

  $('input[type=radio][name=prim]').change(function() {
    if (this.value == 'selPrim') {
      toggleDrag(rgbCanvas, false);
      $('#resetPrim').prop('disabled', true);
      selectPrims(lmsCanvas, lmsChart, []);
    } else if (this.value == 'usePreset') {
      toggleDrag(rgbCanvas, false);
      $('#resetPrim').prop('disabled', true);
      selectPrims(lmsCanvas, lmsChart, [getWaveId(lmsChart, 445), getWaveId(lmsChart, 540), getWaveId(lmsChart, 590)]);
    } else if (this.value == 'drawPrim') {
      drawPrims(rgbChart, rgbCanvas);
    }
  });
}

function selectPrims(canvas, chart, presets) {
    // dim the LMS curves
    // TODO: read the rgb value and change the opacity
    var len = chart.data.datasets[0].data.length;
    chart.data.datasets[0].borderColor = Array(len).fill(oRedColor);
    chart.data.datasets[0].pointBackgroundColor = Array(len).fill(oRedColor);
    chart.data.datasets[0].pointRadius = Array(len).fill(3);
    chart.data.datasets[1].borderColor = Array(len).fill(oGreenColor);
    chart.data.datasets[1].pointBackgroundColor = Array(len).fill(oGreenColor);
    chart.data.datasets[1].pointRadius = Array(len).fill(3);
    chart.data.datasets[2].borderColor = Array(len).fill(oBlueColor);
    chart.data.datasets[2].pointBackgroundColor = Array(len).fill(oBlueColor);
    chart.data.datasets[2].pointRadius = Array(len).fill(3);
    chart.update();

    if (presets.length != 0) {
      for (var i = 0; i < presets.length; i++) {
        var index = presets[i];
        chart.data.datasets[0].pointBackgroundColor[index] = redColor;
        chart.data.datasets[0].pointRadius[index] = 10;
        chart.data.datasets[1].pointBackgroundColor[index] = greenColor;
        chart.data.datasets[1].pointRadius[index] = 10;
        chart.data.datasets[2].pointBackgroundColor[index] = blueColor;
        chart.data.datasets[2].pointRadius[index] = 10;
        chart.update();
      }
      return;
    }

    // https://www.chartjs.org/docs/latest/configuration/interactions.html
    var numPoints = 0;
    chart.options.onClick = function(event) {
      if (numPoints == 3) {
        return;
      }

      const points = chart.getElementsAtEventForMode(event, 'nearest', {intersect: true});
      if (points.length > 0) {
        var point = points[0];

        // https://stackoverflow.com/questions/28159595/chartjs-different-color-per-data-point
        chart.data.datasets[0].pointBackgroundColor[point.index] = redColor;
        chart.data.datasets[0].pointRadius[point.index] = 10;
        chart.data.datasets[1].pointBackgroundColor[point.index] = greenColor;
        chart.data.datasets[1].pointRadius[point.index] = 10;
        chart.data.datasets[2].pointBackgroundColor[point.index] = blueColor;
        chart.data.datasets[2].pointRadius[point.index] = 10;
        chart.update();

        numPoints++;
      }
    }
}

