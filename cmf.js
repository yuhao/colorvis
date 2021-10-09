var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
  return new bootstrap.Popover(popoverTriggerEl)
})

var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var brightYellowColor = '#fcd303'; 
var oRedColor = 'rgba(218, 37, 0, 0.3)';
var oGreenColor = 'rgba(0, 143, 0, 0.3)';
var oBlueColor = 'rgba(1, 25, 147, 0.3)';

// https://docs.mathjax.org/en/v2.1-latest/typeset.html
var QUEUE = MathJax.Hub.queue; // shorthand for the queue
var text1Jax, text2Jax, text4Jax, text5Jax;
var allJax, cmfJax;

// https://stackoverflow.com/questions/60678586/update-x-and-y-values-of-a-trace-using-plotly-update
function updateLocus(seq1, seq2, seq3, newTitle, id) {
  var layout_update = {
    //title: newTitle,
  };
  var data_update = {'x': [seq1], 'y': [seq2], 'z': [seq3]};

  var plot = document.getElementById(id);
  Plotly.update(plot, data_update, layout_update, [0]);
}

// https://community.plotly.com/t/how-to-link-hover-event-in-2d-scatter-to-3d-scatter/3548/2
// Fx.hover fires only for 2d plots for now, so can't use it
function highlightLocus(index, id, excludeTraces) {
  var plot = document.getElementById(id);

  for (var i = 0; i < plot.data.length; i++) {
    if (excludeTraces.indexOf(i) != -1) continue;

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

function unpack(rows, key) {
  return rows.map(function(row) {
      return parseFloat(row[key]);
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

function registerChartReset(buttonId, plotId, chart, canvas, resetData1, resetData2, resetData3) {
  $(buttonId).on('click', function(evt) {
    // reset chart.js (2d)
    // do a value copy here so that future updates to the chart won't affect the original data
    chart.data.datasets[0].data = Array.from(resetData1);
    chart.data.datasets[1].data = Array.from(resetData2);
    chart.data.datasets[2].data = Array.from(resetData3);

    chart.data.datasets[0].borderColor = Array(resetData1.length).fill(redColor);
    chart.data.datasets[0].pointBackgroundColor = Array(resetData1.length).fill(redColor);
    chart.data.datasets[0].pointRadius = Array(resetData1.length).fill(3);
    chart.data.datasets[1].borderColor = Array(resetData1.length).fill(greenColor);
    chart.data.datasets[1].pointBackgroundColor = Array(resetData1.length).fill(greenColor);
    chart.data.datasets[1].pointRadius = Array(resetData1.length).fill(3);
    chart.data.datasets[2].borderColor = Array(resetData1.length).fill(blueColor);
    chart.data.datasets[2].pointBackgroundColor = Array(resetData1.length).fill(blueColor);
    chart.data.datasets[2].pointRadius = Array(resetData1.length).fill(3);

    registerDrag(canvas, chart, plotId);

    chart.update();
    // reset plotly.js (3d)
    var plot = document.getElementById(plotId);
    var title = (buttonId == '#resetChartLMS') ? 'Spectral locus in LMS cone space' : 'Spectral locus in RGB space';
    updateLocus(resetData1, resetData2, resetData3, title, plotId);
  });
}

function registerDrag(canvas, chart, plotId) {
  // TODO: should make these part of the chart object
  function down_handler(event) {
    // get the intersecting data point
    const points = chart.getElementsAtEventForMode(event, 'nearest', {intersect: true});
    if (points.length > 0) {
      // grab the point, start dragging
      canvas.activePoint = points[0];
      canvas.selectedTrace = canvas.activePoint.datasetIndex;
      canvas.onpointermove = move_handler;
    };
  };

  function up_handler(event) {
    // release grabbed point, stop dragging
    if (canvas.activePoint) {
      canvas.activePoint = null;
      canvas.onpointermove = null;
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
      if (plotId != '')  {
        var seq0 = chart.data.datasets[0].data;
        var seq1 = chart.data.datasets[1].data;
        var seq2 = chart.data.datasets[2].data;
        var title = (chart.canvas.id == 'canvasLMS') ?
            'Updated spectral locus in LMS cone space' :
            'Updated spectral locus in RGB space';
        // TODO: should update chromaticities if the 3d plot shows chromaticities
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

var rRad, gRad, bRad;

function registerCalcCMFScale(buttonId, wlen) {
  $(buttonId).on('click', function(evt) {
    // always disable this; more of a progress cue that we can plot now.
    $('#plotScaleCMF').prop('disabled', true);

    var unscaledR = window.cmfUnscaledChart.data.datasets[0].data;
    var unscaledG = window.cmfUnscaledChart.data.datasets[1].data;
    var unscaledB = window.cmfUnscaledChart.data.datasets[2].data;
    var whiteSPD = window.whiteChart.data.datasets[0].data;

    rRad = math.dot(unscaledR, whiteSPD).toFixed(5);
    gRad = math.dot(unscaledG, whiteSPD).toFixed(5);
    bRad = math.dot(unscaledB, whiteSPD).toFixed(5);

    QUEUE.Push(["Text", text4Jax[1], rRad]);
    QUEUE.Push(["Text", text4Jax[3], gRad]);
    QUEUE.Push(["Text", text4Jax[5], bRad]);

    QUEUE.Push(["Text", text4Jax[12], rRad]);
    QUEUE.Push(["Text", text4Jax[14], gRad]);
    QUEUE.Push(["Text", text4Jax[16], bRad]);

    QUEUE.Push(["Text", text4Jax[19], rRad]);
    QUEUE.Push(["Text", text4Jax[21], gRad]);
    QUEUE.Push(["Text", text4Jax[23], bRad]);

    QUEUE.Push(["Text", text4Jax[26], rRad]);
    QUEUE.Push(["Text", text4Jax[27], gRad]);
    QUEUE.Push(["Text", text4Jax[28], bRad]);

    QUEUE.Push(["Text", text4Jax[33], rRad]);
    QUEUE.Push(["Text", text4Jax[35], gRad]);
    QUEUE.Push(["Text", text4Jax[37], bRad]);

    var text = "\\begin{bmatrix} \\frac{1}{" + rRad + "} & 0 & 0 \\\\ 0 & \\frac{1}{" + gRad + "} & 0 \\\\ 0 & 0 & \\frac{1}{" + bRad + "} \\end{bmatrix}";
    QUEUE.Push(["Text", text4Jax[40], text]);

    var lmat1 = allJax[0];
    var lmat2 = allJax[1];
    var lmat3 = allJax[2];
    QUEUE.Push(["Text", text5Jax[2], text+"\\times"+lmat1.originalText+lmat2.originalText+lmat3.originalText]);

    QUEUE.Push(function () {
      $('#plotScaleCMF').prop('disabled', false);
    });
  });
}

var lMat = [[], [], []];
var primIdx = []; // in the BGR order since that's the order we expect users to select the primaryes
var resMat;

function registerPlotScaleCMF(buttonId, wlen) {
  var plotted = false;
  var chart, plot;

  $(buttonId).on('click', function(evt) {
    $('#showCMF').prop('disabled', false);
    $('#showChrm').prop('disabled', false);
    $('#showPrim').prop('disabled', false);

    var uCMFR = window.cmfUnscaledChart.data.datasets[0].data;
    var uCMFG = window.cmfUnscaledChart.data.datasets[1].data;
    var uCMFB = window.cmfUnscaledChart.data.datasets[2].data;

    var sCMFR = math.dotDivide(uCMFR, rRad);
    var sCMFG = math.dotDivide(uCMFG, gRad);
    var sCMFB = math.dotDivide(uCMFB, bRad);

    if (!plotted) {
      var val = plotScaledCMF(sCMFR, sCMFG, sCMFB, wlen);
      chart = val[0];
      plot = val[1];
      plotted = true;
    } else {
      updateScaledCMF(chart, plot, sCMFR, sCMFG, sCMFB, wlen);
    }
  });
}

function updateScaledCMF(chart, plot, sCMFR, sCMFG, sCMFB, wlen) {
  chart.data.datasets[0].data = sCMFR;
  chart.data.datasets[1].data = sCMFG;
  chart.data.datasets[2].data = sCMFB;
  chart.update();

  var data_update = {'x': [sCMFR], 'y': [sCMFG], 'z': [sCMFB]};
  Plotly.update(plot, data_update, {}, [0]);
  plot.mode = 'cmf';

  if (plot.data.length == 2) {
    showPrim(plot);
  }
}

function plotUnscaledCMF(wlen) {
  $('#calcCMFScale').prop('disabled', false);

  var stride = 5;
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];

  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);
  var y_data_1 = resMat[2];
  var y_data_2 = resMat[1];
  var y_data_3 = resMat[0];

  // draw a line chart on the canvas context
  var ctx = document.getElementById("canvasUnscaledCMF").getContext("2d");
  var canvas = document.getElementById("canvasUnscaledCMF");
  window.cmfUnscaledChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: x_data,
      datasets: [
        {
          data: y_data_1,
          label: "R",
          borderColor: "#da2500",
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: redColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_2,
          label: "G",
          borderColor: "#008f00",
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: greenColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_3,
          label: "B",
          borderColor: "#011993",
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
          pan: {
            enabled: true,
            modifierKey: 'shift',
            mode: 'x',
          },
        },
        title: {
          display: true,
          text: 'Unscaled RGB \"power functions\"',
          font: {
            size: 20,
            family: 'Helvetica Neue',
          },
        },
      }
    }
  });

  QUEUE.Push(["Text", text2Jax[2], window.cmfUnscaledChart.data.datasets[0].data[(500-380)/5].toFixed(3)]);
  QUEUE.Push(["Text", text2Jax[4], window.cmfUnscaledChart.data.datasets[1].data[(500-380)/5].toFixed(3)]);
  QUEUE.Push(["Text", text2Jax[6], window.cmfUnscaledChart.data.datasets[2].data[(500-380)/5].toFixed(3)]);
}

function updateUnscaledCMF(chart) {
  chart.data.datasets[0].data = resMat[2];
  chart.data.datasets[1].data = resMat[1];
  chart.data.datasets[2].data = resMat[0];
  chart.update();

  QUEUE.Push(["Text", text2Jax[3], chart.data.datasets[0].data[(500-380)/5].toFixed(3)]);
  QUEUE.Push(["Text", text2Jax[5], chart.data.datasets[1].data[(500-380)/5].toFixed(3)]);
  QUEUE.Push(["Text", text2Jax[7], chart.data.datasets[2].data[(500-380)/5].toFixed(3)]);
}

function registerSolLinSysPlot(buttonId, canvas, wlen, plotId) {
  var plotted = false;

  $(buttonId).on('click', function(evt) {
    var rMat = [window.myChart.data.datasets[0].data, window.myChart.data.datasets[1].data, window.myChart.data.datasets[2].data];
    var lMatInv = math.inv(lMat);
    resMat = math.multiply(lMatInv, rMat);

    if (!plotted) {
      plotUnscaledCMF(wlen);
      plotted = true;
    } else {
      updateUnscaledCMF(window.cmfUnscaledChart);
    }
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

function setupLinSys(chart, wlen) {
  allJax = MathJax.Hub.getAllJax('primText');

  text1Jax = MathJax.Hub.getAllJax('text1');
  text2Jax = MathJax.Hub.getAllJax('text2');
  text4Jax = MathJax.Hub.getAllJax('text4');
  text5Jax = MathJax.Hub.getAllJax('text5');

  cmfJax = MathJax.Hub.getAllJax('cmftext');

  var lmat1 = allJax[0];
  var lmat2 = allJax[1];
  var lmat3 = allJax[2];
  var mmat = allJax[3];
  var rmat = allJax[4];

  var pre = "\\begin{bmatrix}";
  var post = "\\end{bmatrix}";

  var col1, col2, col3;
  var col1 = "\\Bigg[ \\begin{matrix}\\boxed{~??~} \\\\ \\boxed{~??~} \\\\ \\boxed{~??~} \\end{matrix}"
  var col2 = "\\begin{matrix}\\boxed{~??~} \\\\ \\boxed{~??~} \\\\ \\boxed{~??~} \\end{matrix}"
  var col3 = "\\begin{matrix}\\boxed{~??~} \\\\ \\boxed{~??~} \\\\ \\boxed{~??~} \\end{matrix} \\Bigg]"
  QUEUE.Push(["Text", lmat1, col1]);
  QUEUE.Push(["Text", lmat2, col2]);
  QUEUE.Push(["Text", lmat3, col3]);

  var m1, m2, m3;
  m1 = "R_{380} & \\cdots & R_{500} & \\cdots & R_{780} \\\\";
  m2 = "G_{380} & \\cdots & G_{500} & \\cdots & G_{780} \\\\";
  m3 = "B_{380} & \\cdots & B_{500} & \\cdots & B_{780} \\\\";
  QUEUE.Push(["Text", mmat, "\\times"+pre+m1+m2+m3+post+"="]);

  var r1, r2, r3; // show first two and last two
  var idx500 = (500-380)/5;
  r1 = chart.data.datasets[0].data[0].toExponential(3) + "&&" +
       //chart.data.datasets[0].data[1].toExponential(3) + "&&" +
       "\\cdots &&" +
       chart.data.datasets[0].data[idx500].toExponential(3) + "&&" +
       "\\cdots &&" +
       //chart.data.datasets[0].data[wlen.length - 2].toExponential(3) + "&&" +
       chart.data.datasets[0].data[wlen.length - 1].toExponential(3) + "\\\\";
  r2 = chart.data.datasets[1].data[0].toExponential(3) + "&&" +
       //chart.data.datasets[1].data[1].toExponential(3) + "&&" +
       "\\cdots &&" +
       chart.data.datasets[1].data[idx500].toExponential(3) + "&&" +
       "\\cdots &&" +
       //chart.data.datasets[1].data[wlen.length - 2].toExponential(3) + "&&" +
       chart.data.datasets[1].data[wlen.length - 1].toExponential(3) + "\\\\";
  r3 = chart.data.datasets[2].data[0].toExponential(3) + "&&" +
       //chart.data.datasets[2].data[1].toExponential(3) + "&&" +
       "\\cdots &&" +
       chart.data.datasets[2].data[idx500].toExponential(3) + "&&" +
       "\\cdots &&" +
       //chart.data.datasets[2].data[wlen.length - 2].toExponential(3) + "&&" +
       chart.data.datasets[2].data[wlen.length - 1].toExponential(3) + "\\\\";
  QUEUE.Push(["Text", rmat, pre+r1+r2+r3+post]);

  QUEUE.Push(["Text", text1Jax[3], chart.data.datasets[0].data[idx500].toExponential(3)]);
}

function registerSelPrim(buttonId, canvas, chart, wlen, plotId) {
  function getWaveId(chart, wave) {
    var stride = 5;
    var wlen = chart.data.labels;
    return (wave - wlen[0]) / stride;
  };

  $('input[type=radio][name=prim]').change(function() {
    toggleDrag(canvas, false);
    if (this.value == 'selPrim') {
      selectPrims(canvas, chart, []);
    } else if (this.value == 'usePreset') {
      selectPrims(canvas, chart, [getWaveId(chart, 445), getWaveId(chart, 540), getWaveId(chart, 590)]);
    }
  });

  function selectPrims(canvas, chart, presets) {
    // dim the LMS curves
    chart.data.datasets[0].borderColor = Array(wlen.length).fill(oRedColor);
    chart.data.datasets[0].pointBackgroundColor = Array(wlen.length).fill(oRedColor);
    chart.data.datasets[0].pointRadius = Array(wlen.length).fill(3);
    chart.data.datasets[1].borderColor = Array(wlen.length).fill(oGreenColor);
    chart.data.datasets[1].pointBackgroundColor = Array(wlen.length).fill(oGreenColor);
    chart.data.datasets[1].pointRadius = Array(wlen.length).fill(3);
    chart.data.datasets[2].borderColor = Array(wlen.length).fill(oBlueColor);
    chart.data.datasets[2].pointBackgroundColor = Array(wlen.length).fill(oBlueColor);
    chart.data.datasets[2].pointRadius = Array(wlen.length).fill(3);
    chart.update();

    var lmat1 = allJax[0];
    var lmat2 = allJax[1];
    var lmat3 = allJax[2];

    function setData(numPoints, index, chart) {
      // https://stackoverflow.com/questions/28159595/chartjs-different-color-per-data-point
      chart.data.datasets[0].pointBackgroundColor[index] = redColor;
      chart.data.datasets[0].pointRadius[index] = 10;
      chart.data.datasets[1].pointBackgroundColor[index] = greenColor;
      chart.data.datasets[1].pointRadius[index] = 10;
      chart.data.datasets[2].pointBackgroundColor[index] = blueColor;
      chart.data.datasets[2].pointRadius[index] = 10;
      chart.update();

      if (numPoints == 2) {
        var col = "\\Bigg[ \\begin{matrix}" +
                  chart.data.datasets[0].data[index].toExponential(3) +
                  "\\\\" +
                  chart.data.datasets[1].data[index].toExponential(3) +
                  "\\\\" +
                  chart.data.datasets[2].data[index].toExponential(3) +
                  "\\end{matrix}";
        QUEUE.Push(["Text", lmat1, col]);

        $('#solLinSys').prop('disabled', false);
      } else if (numPoints == 1) {
        var col = "\\begin{matrix}" +
                  chart.data.datasets[0].data[index].toExponential(3) +
                  "\\\\" +
                  chart.data.datasets[1].data[index].toExponential(3) +
                  "\\\\" +
                  chart.data.datasets[2].data[index].toExponential(3) +
                  "\\end{matrix}";
        QUEUE.Push(["Text", lmat2, col]);
      } else if (numPoints == 0) {
        var col = "\\begin{matrix}" +
                  chart.data.datasets[0].data[index].toExponential(3) +
                  "\\\\" +
                  chart.data.datasets[1].data[index].toExponential(3) +
                  "\\\\" +
                  chart.data.datasets[2].data[index].toExponential(3) +
                  "\\end{matrix} \\Bigg]";
        QUEUE.Push(["Text", lmat3, col]);

        //QUEUE.Push(["Text", text1Jax[15], chart.data.labels[index]+"~nm"]);
        //QUEUE.Push(["Text", text1Jax[17], "\\begin{bmatrix}"+chart.data.datasets[0].data[index].toExponential(3)+","+chart.data.datasets[1].data[index].toExponential(3)+","+chart.data.datasets[2].data[index].toExponential(3)+"\\end{bmatrix}^T"]);
        //QUEUE.Push(["Text", text1Jax[18], chart.data.labels[index]+"~nm"]);
      } 
      lMat[0][numPoints] = chart.data.datasets[0].data[index];
      lMat[1][numPoints] = chart.data.datasets[1].data[index];
      lMat[2][numPoints] = chart.data.datasets[2].data[index];
      primIdx[numPoints] = index;
    }

    // use presets
    if (presets.length != 0) {
      for (var numPoints = 0; numPoints < presets.length; numPoints++) {
        var index = presets[numPoints];
        setData(numPoints, index, chart);
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
        var index = points[0].index;
        setData(numPoints, index, chart);

        numPoints++;
      }
    }
  }
}

d3.csv('linss2_10e_5_ext.csv', function(err, rows){
  var stride = 5;

  // points to the cone arrays that will be used to plot the chart;
  var dConeL = unpack(rows, 'l');
  var dConeM = unpack(rows, 'm');
  var dConeS = unpack(rows, 's');
  // contains the original cone data; used in reset;
  window.ConeL = [...dConeL];
  window.ConeM = [...dConeM];
  window.ConeS = [...dConeS];

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
  var ctx = document.getElementById("canvasLMS").getContext("2d");
  var canvas = document.getElementById("canvasLMS");
  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: x_data,
      datasets: [
        {
          data: y_data_1,
          label: "L Cone",
          borderColor: "#da2500",
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: redColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_2,
          label: "M Cone",
          borderColor: "#008f00",
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: greenColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_3,
          label: "S Cone",
          borderColor: "#011993",
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: blueColor,
          pointRadius: 3,
          borderWidth: 1,
        },
      ]
    },
    options: {
      //aspectRatio: 1.5,
      animation: {
        duration: 10
      },
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      onHover: (event) => {
        if (event.type === 'mouseout') {
          highlightLocus(-1, 'lmsDiv', []);
        }
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
          pan: {
            enabled: true,
            modifierKey: 'shift',
            mode: 'x',
          },
        },
        title: {
          display: true,
          text: 'Cone Fundamentals (Stockman & Sharpe, 2000)',
          font: {
            size: 20,
            family: 'Helvetica Neue',
          },
        },
        tooltip: {
          callbacks: {
            labelTextColor: function(context) {
              if (context.datasetIndex == 0) highlightLocus(context.dataIndex, 'lmsDiv', []);
              return '#FFFFFF';
            }
          },
        }
      }
    }
  });

  registerChartReset('#resetChartLMS', 'lmsDiv', window.myChart, canvas, window.ConeL, window.ConeM, window.ConeS);

  // the spectral locus
  var lmsLocusMarkerColors = Array(wlen.length).fill('#888888');
  var trace = {
    x: dConeL,
    y: dConeM,
    z: dConeS,
    text: wlen,
    mode: 'lines+markers',
    marker: {
      size: 6,
      opacity: 0.8,
      color: lmsLocusMarkerColors,
    },
    line: {
      color: '#888888',
      width: 2
    },
    // https://plotly.com/python/hover-text-and-formatting/#customizing-hover-text-with-a-hovertemplate
    // <extra> tag to suppress trace name
    hovertemplate: 'L: %{x}' +
      '<br>M: %{y}' +
      '<br>S: %{z}' +
      '<br>wavelength: %{text}<extra></extra>' ,
    type: 'scatter3d',
    name: 'Spectral locus',
  };

  var data = [trace];
 
  var layout = {
    //height: 600,
    //width: 1200,
    name: 'Spectral locus',
    showlegend: true,
    legend: {
      x: 1,
      xanchor: 'right',
      y: 0.9,
    },
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    //plot_bgcolor: 'rgba(0, 0, 0, 0)',
    //title: 'Spectral locus in LMS cone space',
    scene: {
      camera: {
        projection: {
          type: 'orthographic'
        }
      },
      // https://plotly.com/javascript/3d-axes/
      //aspectmode: 'cube',
      xaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        //constrain: 'domain',
        showspikes: false,
        title: {
          text: 'L'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        showspikes: false,
        title: {
          text: 'M'
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
          text: 'S'
        }
      },
    }
  };

  Plotly.newPlot('lmsDiv', data, layout);

  // has to push this rather than sync calling it.
  QUEUE.Push(function () {
    setupLinSys(window.myChart, wlen);
  });
  registerSelPrim('#selPrim', canvas, window.myChart, wlen, 'lmsDiv');
  registerDrawPrim('#drawPrim', canvas, window.myChart);
  registerSolLinSysPlot('#solLinSys', canvas, wlen, 'lmsDiv');
  registerCalcCMFScale('#calcCMFScale', wlen);
  registerPlotScaleCMF('#plotScaleCMF', wlen);
});

function registerDrawPrim(boxId, canvas, chart) {
  $(boxId).on('change', function(evt) {
    if($(boxId).is(":checked")) {
      registerDrag(canvas, chart, '');
    } else {
      toggleDrag(canvas, false);
    }
  });
}

function plotScaledCMF(sCMFR, sCMFG, sCMFB, wlen) {
  var stride = 5;
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];

  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);
  var y_data_1 = sCMFR;
  var y_data_2 = sCMFG;
  var y_data_3 = sCMFB;

  // draw a line chart on the canvas context
  var ctx = document.getElementById("canvasCMF").getContext("2d");
  var canvas = document.getElementById("canvasCMF");
  window.cmfChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: x_data,
      datasets: [
        {
          data: y_data_1,
          label: "r\u0305 (\u03BB)",
          borderColor: "#da2500",
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: redColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_2,
          label: "g\u0305 (\u03BB)",
          borderColor: "#008f00",
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: greenColor,
          pointRadius: 3,
          borderWidth: 1,
        },
        {
          data: y_data_3,
          label: "b\u0305 (\u03BB)",
          borderColor: "#011993",
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
      aspectRatio: 1.5,
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        //yAxes:{
        //  min: -0.1,
        //  max: 0.4,
        //  position: 'left',
        //},
      },
      onHover: (event) => {
        if (event.type === 'mouseout') {
          highlightLocus(-1, 'rgbDiv', [1]);
        }
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
          pan: {
            enabled: true,
            modifierKey: 'shift',
            mode: 'x',
          },
        },
        title: {
          display: true,
          text: 'RGB Color Matching Functions',
          font: {
            size: 20,
            family: 'Helvetica Neue',
          },
        },
        tooltip: {
          callbacks: {
            labelTextColor: function(context) {
              if (context.datasetIndex == 0) highlightLocus(context.dataIndex, 'rgbDiv', [1]);
              return '#FFFFFF';
            }
          },
        }
      }
    }
  });

  QUEUE.Push(["Text", cmfJax[0], window.cmfChart.data.labels[primIdx[0]]+"~nm"]);
  QUEUE.Push(["Text", cmfJax[1], window.cmfChart.data.datasets[0].data[primIdx[0]].toFixed(5)]);
  QUEUE.Push(["Text", cmfJax[2], window.cmfChart.data.datasets[1].data[primIdx[0]].toFixed(5)]);
  QUEUE.Push(["Text", cmfJax[3], window.cmfChart.data.datasets[2].data[primIdx[0]].toFixed(5)]);
  QUEUE.Push(["Text", cmfJax[5], window.cmfChart.data.datasets[2].data[primIdx[0]].toFixed(5)]);
  QUEUE.Push(["Text", cmfJax[6], window.cmfChart.data.labels[primIdx[0]]+"~nm"]);
  QUEUE.Push(["Text", cmfJax[8], window.cmfChart.data.labels[primIdx[0]]+"~nm"]);

  // the RGB spectral locus
  var rgbLocusMarkerColors = Array(wlen.length).fill('#888888');
  var trace = {
    x: sCMFR, y: sCMFG, z: sCMFB,
    text: wlen,
    mode: 'lines+markers',
    marker: {
      size: 6,
      opacity: 0.8,
      color: rgbLocusMarkerColors,
    },
    line: {
      color: '#888888',
      width: 2
    },
    hovertemplate: 'R: %{x}' +
      '<br>G: %{y}' +
      '<br>B: %{z}' +
      '<br>wavelength: %{text}<extra></extra>' ,
    type: 'scatter3d',
    name: 'Spectral locus',
  };

  var data = [trace];
 
  var layout = {
    //height: 800,
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    name: 'Spectral locus',
    showlegend: true,
    legend: {
      x: 1,
      xanchor: 'right',
      y: 0.5,
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
      //aspectmode: 'cube',
      xaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        //constrain: 'domain',
        //dtick: 0.2, // TODO: automatically calculate this; change when switch to rgb
        showspikes: false,
        title: {
          text: 'R'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.2,
        showspikes: false,
        title: {
          text: 'G'
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'y',
        //dtick: 0.2,
        showspikes: false,
        title: {
          text: 'B'
        }
      },
    }
  };
 
  var rgbPlot = document.getElementById('rgbDiv');
  Plotly.newPlot(rgbPlot, data, layout);

  rgbPlot.mode = 'cmf';
  registerToggleChrm(window.cmfChart, rgbPlot, wlen, rgbLocusMarkerColors);

  // show lines from the original; all points on the same line have the same chromaticity
  //registerShowChrmLine('#showChrmLine', window.cmfChart, 'rgbDiv');

  // show the selected primaries
  registerShowPrim('#showPrim', rgbPlot);

  return [window.cmfChart, rgbPlot];
}

function registerToggleChrm(chart, rgbPlot, wlen, rgbLocusMarkerColors) {
  $('input[type=radio][name=chrm]').change(function() {
    if (this.id == 'showChrm') {
      RGB2rgb(chart, rgbPlot, wlen, rgbLocusMarkerColors);
    } else {
      rgb2RGB(chart, rgbPlot, wlen, rgbLocusMarkerColors);
    }
  });
}

// TODO: draw three lines rather than a triangle
function showPrim(plot, hide) {
  if (hide) {
    Plotly.deleteTraces(plot, [1]);
    return;
  }

  // calculate RGB for reference white (should be [1, 1, 1])
  //var chart = window.cmfChart;
  //var sCMFR = chart.data.datasets[0].data;
  //var sCMFG = chart.data.datasets[1].data;
  //var sCMFB = chart.data.datasets[2].data;
  //var whiteSPD = window.whiteChart.data.datasets[0].data;
  //wR = math.multiply(whiteSPD, sCMFR);
  //wG = math.multiply(whiteSPD, sCMFG);
  //wB = math.multiply(whiteSPD, sCMFB);

  var prims = []; // in the RGB order (different from primIdx!)
  if (plot.mode == 'cmf') {
    var bPrim = [+plot.data[0].x[primIdx[0]].toFixed(6),
                 +plot.data[0].y[primIdx[0]].toFixed(6),
                 +plot.data[0].z[primIdx[0]].toFixed(6)];
    var gPrim = [+plot.data[0].x[primIdx[1]].toFixed(6),
                 +plot.data[0].y[primIdx[1]].toFixed(6),
                 +plot.data[0].z[primIdx[1]].toFixed(6)];
    var rPrim = [+plot.data[0].x[primIdx[2]].toFixed(6),
                 +plot.data[0].y[primIdx[2]].toFixed(6),
                 +plot.data[0].z[primIdx[2]].toFixed(6)];
    prims = [rPrim, gPrim, bPrim];
  } else {
    prims = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }

  if (plot.data.length == 1) {
    var trace = {
      x: [prims[0][0], prims[1][0], prims[2][0], prims[0][0]],
      y: [prims[0][1], prims[1][1], prims[2][1], prims[0][1]],
      z: [prims[0][2], prims[1][2], prims[2][2], prims[0][2]],
      text: [plot.data[0].text[primIdx[2]], plot.data[0].text[primIdx[1]], plot.data[0].text[primIdx[0]], plot.data[0].text[primIdx[2]]],
      mode: 'lines+markers',
      type: 'scatter3d',
      name: 'Primaries',
      line: {
        color: '#fc8c03',
        width: 2,
      },
      marker: {
        size: 8,
        opacity: 0.8,
        color: '#fc8c03',
      },
      //hoverinfo: 'skip',
      hovertemplate: 'R: %{x}' +
        '<br>G: %{y}' +
        '<br>B: %{z}' +
        '<br>wavelength: %{text}<extra></extra>' ,
    };
    Plotly.addTraces(plot, [trace]);
  } else {
    // have to get an array of arrays
    var data_update = {'x': [[prims[0][0], prims[1][0], prims[2][0], prims[0][0]]],
                       'y': [[prims[0][1], prims[1][1], prims[2][1], prims[0][1]]],
                       'z': [[prims[0][2], prims[1][2], prims[2][2], prims[0][2]]],
                       'text': [[plot.data[0].text[primIdx[2]], plot.data[0].text[primIdx[1]], plot.data[0].text[primIdx[0]], plot.data[0].text[primIdx[2]]]],
                      };
    Plotly.update(plot, data_update, {}, [1]);
  }

  //showGamut(plot);
}

function registerShowPrim(id, plot) {
  $(id).on('change', function(evt) {
    if($(id).is(":checked")) {
      showPrim(plot, false);
    } else {
      showPrim(plot, true);
    }
  });

  //$(id).on('click', function(evt) {
  //  if ($(id).text() == 'Show Primaries') {
  //    //if (plot.data.length > 1) return; // prim trace has been added
  //    showPrim(plot, false);
  //    $(id).text('Hide Primaries');
  //  } else {
  //    showPrim(plot, true);
  //    $(id).text('Show Primaries');
  //  }
  //});
}

function showGamut(plot) {
  var bPrim = [+plot.data[0].x[primIdx[0]].toFixed(6),
               +plot.data[0].y[primIdx[0]].toFixed(6),
               +plot.data[0].z[primIdx[0]].toFixed(6)];
  var gPrim = [+plot.data[0].x[primIdx[1]].toFixed(6),
               +plot.data[0].y[primIdx[1]].toFixed(6),
               +plot.data[0].z[primIdx[1]].toFixed(6)];
  var rPrim = [+plot.data[0].x[primIdx[2]].toFixed(6),
               +plot.data[0].y[primIdx[2]].toFixed(6),
               +plot.data[0].z[primIdx[2]].toFixed(6)];

  var otherPointsX = [rPrim[0] + gPrim[0], // r+g
                      rPrim[0] + bPrim[0], // r+b
                      gPrim[0] + bPrim[0], // g+b
                      rPrim[0] + gPrim[0] + bPrim[0]]; // r+g+b
  var otherPointsY = [rPrim[1] + gPrim[1], // r+g
                      rPrim[1] + bPrim[1], // r+b
                      gPrim[1] + bPrim[1], // g+b
                      rPrim[1] + gPrim[1] + bPrim[1]]; // r+g+b
  var otherPointsZ = [rPrim[2] + gPrim[2], // r+g
                      rPrim[2] + bPrim[2], // r+b
                      gPrim[2] + bPrim[2], // g+b
                      rPrim[2] + gPrim[2] + bPrim[2]]; // r+g+b
  var allPointsX = [0].concat([rPrim[0], gPrim[0], bPrim[0]].concat(otherPointsX));
  var allPointsY = [0].concat([rPrim[1], gPrim[1], bPrim[1]].concat(otherPointsY));
  var allPointsZ = [0].concat([rPrim[2], gPrim[2], bPrim[2]].concat(otherPointsZ));

  // add all the lines of the parallelogram
  var traces = [];
  // O: 0; R: 1; G: 2: B: 3
  // RG: 4; RB: 5; GB: 6; RGB: 7
  var indices = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]]
  for (var i = 0; i < indices.length; i++) {
    var start = indices[i][0];
    var end = indices[i][1];
    var line = {
      x: [allPointsX[start], allPointsX[end]],
      y: [allPointsY[start], allPointsY[end]],
      z: [allPointsZ[start], allPointsZ[end]],
      mode: 'lines+markers',
      type: 'scatter3d',
      line: {
        color: '#32a852',
      },
      // TODO: customize the tooltip
      marker: {
        size: 6,
        opacity: 0.8,
        color: '#32a852',
      },
      //hoverinfo: 'skip',
    };
    traces.push(line);
  }
  // https://github.com/plotly/plotly.js/issues/1467
  // addTraces would trigger click infinitely so add it only once in the end instead of incrementally
  Plotly.addTraces('rgbDiv', traces);
}

function rgb2RGB(chart, plot, wlen, rgbLocusMarkerColors) {
  plot.mode = 'cmf';

  var data_update = {'x': [chart.data.datasets[0].data],
                     'y': [chart.data.datasets[1].data],
                     'z': [chart.data.datasets[2].data]};
  var layout_update = {
                       //'title': 'Spectral locus in RGB color space',
                       'scene.xaxis.title.text': 'R',
                       'scene.yaxis.title.text': 'G',
                       'scene.zaxis.title.text': 'B',
                      };
  Plotly.update(plot, data_update, layout_update, [0]);

  if (plot.data.length == 2) {
    showPrim(plot);
  }
}

// will be a nop when in the chromaticity mode, which is good.
// take whatever CMFs are in |chart|, even if it's adjusted, which is good.
//function registerRGB2rgb(id, chart, plot, wlen, rgbLocusMarkerColors) {
function RGB2rgb(chart, plot, wlen, rgbLocusMarkerColors) {
  plot.mode = 'chrm';

  var tCMFR = chart.data.datasets[0].data;
  var tCMFG = chart.data.datasets[1].data;
  var tCMFB = chart.data.datasets[2].data;

  var sumRGB = math.add(math.add(tCMFR, tCMFG), tCMFB);
  var cR = math.dotDivide(tCMFR, sumRGB);
  var cG = math.dotDivide(tCMFG, sumRGB);
  var cB = math.dotDivide(tCMFB, sumRGB);

  var data_update = {'x': [cR],
                     'y': [cG],
                     'z': [cB]};
  var layout_update = {
                       //'title': 'Spectral locus in rgb chromaticity plot',
                       'scene.xaxis.title.text': 'r',
                       'scene.yaxis.title.text': 'g',
                       'scene.zaxis.title.text': 'b',
                      };
  Plotly.update(plot, data_update, layout_update, [0]);

  if (plot.data.length == 2) {
    showPrim(plot);
  }
}

function registerShowChrmLine(id, chart, plot) {
  $(id).on('click', function(evt) {
    var len = chart.data.datasets[0].data.length;
    var traces = [];

    for (i = 0; i < len; i++) {
      var trace = {
        x: [0, chart.data.datasets[0].data[i]],
        y: [0, chart.data.datasets[1].data[i]],
        z: [0, chart.data.datasets[2].data[i]],
        mode: 'lines',
        type: 'scatter3d',
        line: {
          color: '#32a852',
        },
        hoverinfo: 'skip',
      };
      traces.push(trace);
    }
    Plotly.addTraces(plot, traces);
  });
}

d3.csv('ciesi.csv', function(err, rows){
  var stride = 5;

  // the CIE SIs are normalized such that SPD is 100 at 560 nm
  // https://www.image-engineering.de/library/technotes/753-cie-standard-illuminants
  var wlen = unpack(rows, 'wavelength');
  var d65 = unpack(rows, 'D65');
  var a = unpack(rows, 'A');
  var e = Array(wlen.length).fill(100);

  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var firstIdx = (380 - firstW) / stride;
  var lastIdx = (780 - firstW) / stride;

  var x_data = range(firstW, lastW, stride).slice(firstIdx, lastIdx + 1);
  var normD65 = math.dotDivide(d65, Math.max(...d65)).slice(firstIdx, lastIdx + 1); // requires ES6 support
  var normA = math.dotDivide(a, Math.max(...a)).slice(firstIdx, lastIdx + 1);
  var normE = Array(wlen.length).fill(1).slice(firstIdx, lastIdx + 1);
  var normDraw = Array(wlen.length).fill(0.5).slice(firstIdx, lastIdx + 1);
  var y_data_1 = normD65;

  var ctx = document.getElementById("canvasWhite").getContext("2d");
  var canvas = document.getElementById("canvasWhite");
  window.whiteChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: x_data,
      datasets: [
        {
          data: y_data_1,
          label: "W",
          borderColor: "#000000",
          pointBackgroundColor: "#000000",
          fill: false,
          pointHoverRadius: 10,
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
          min: 1.0,
          max: 0.0,
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
          pan: {
            enabled: true,
            modifierKey: 'shift',
            mode: 'x',
          },
        },
        title: {
          //display: true,
          text: 'White light',
          fontSize: 24,
        },
        legend: {
          display: false,
        },
      }
    }
  });

  registerResetZoom('#resetZoomWhite', window.whiteChart);
  registerSelWhite(window.whiteChart, canvas, normD65, normA, normE, normDraw);
});

function registerSelWhite(chart, canvas, d65, a, e, draw) {
  $('#whiteSel').on('change', function(evt) {
    var val = this.value;
    if (val == "Custom") {
      registerDrag(canvas, chart, '');
      chart.data.datasets[0].data = draw;
    } else {
      toggleDrag(canvas, false);
      if (val == "D65") {
        chart.data.datasets[0].data = d65;
      } else if (val == "A") {
        chart.data.datasets[0].data = a;
      } else if (val == "E") {
        chart.data.datasets[0].data = e;
      }
    }
    chart.update();
  });
}

