var RGB2XYZ = [[2.767979095, 1.751171684, 1.129776839],
              [0.9978469789, 4.589269432, 0.05917362973],
              [-0.00002643740975, 0.05648972672, 5.594123569]];

var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var oRedColor = 'rgba(218, 37, 0, 0.3)';
var oGreenColor = 'rgba(0, 143, 0, 0.3)';
var oBlueColor = 'rgba(1, 25, 147, 0.3)';

// https://docs.mathjax.org/en/v2.1-latest/typeset.html
var QUEUE = MathJax.Hub.queue; // shorthand for the queue
var lmat, rmat; // the element jax for the math output.
var text1Jax, text2Jax, text4Jax;

QUEUE.Push(function () {
  var allJax = MathJax.Hub.getAllJax('primText');
  lmat1 = allJax[0];
  lmat2 = allJax[1];
  lmat3 = allJax[2];
  mmat = allJax[3];
  rmat = allJax[4];

  text1Jax = MathJax.Hub.getAllJax('text1');
  text2Jax = MathJax.Hub.getAllJax('text2');
  text4Jax = MathJax.Hub.getAllJax('text4');
});

// https://stackoverflow.com/questions/60678586/update-x-and-y-values-of-a-trace-using-plotly-update
function updateLocus(seq1, seq2, seq3, newTitle, id) {
  var layout_update = {
    title: newTitle,
  };
  var data_update = {'x': [seq1], 'y': [seq2], 'z': [seq3]};

  var plot = document.getElementById(id);
  Plotly.update(plot, data_update, layout_update, [0]);
}

function highlightLocus(index, id, baseColors) {
  // https://community.plotly.com/t/how-to-link-hover-event-in-2d-scatter-to-3d-scatter/3548/2
  // Fx.hover fires only for 2d plots for now, so can't use it
  var myPlot = document.getElementById(id);
  var colors = Array.from(baseColors);
  colors[index] = '#fcd303';
  // rather than 'marker': {color: colors}, which uses defaults for all other parameters
  var update = {'marker.color': [colors]};
  Plotly.restyle(myPlot, update, [0]);
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
    removeXYZChrm(plot);
    var title = (buttonId == '#resetChartLMS') ? 'Spectral locus in LMS cone space' : 'Spectral locus in RGB space';
    updateLocus(resetData1, resetData2, resetData3, title, plotId);
  });
}

function registerDrag(canvas, chart, plotId) {
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
    $('#plotScaleCMF').prop('disabled', false);

    var unscaledB = window.cmfUnscaledChart.data.datasets[0].data;
    var unscaledG = window.cmfUnscaledChart.data.datasets[1].data;
    var unscaledR = window.cmfUnscaledChart.data.datasets[2].data;
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

    QUEUE.Push(["Text", text4Jax[25], rRad]);
    QUEUE.Push(["Text", text4Jax[26], gRad]);
    QUEUE.Push(["Text", text4Jax[27], bRad]);

    QUEUE.Push(["Text", text4Jax[30], rRad]);
    QUEUE.Push(["Text", text4Jax[33], gRad]);
    QUEUE.Push(["Text", text4Jax[36], bRad]);
  });
}

var lMat = [[], [], []];
var resMat;

function registerPlotScaleCMF(buttonId, wlen) {
  var plotted = false;
  var chart, plot;

  $(buttonId).on('click', function(evt) {
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
      //TODO: update the chart and the plot
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
        },
        {
          data: y_data_2,
          label: "G",
          borderColor: "#008f00",
          fill: false,
          pointHoverRadius: 10,
        },
        {
          data: y_data_3,
          label: "B",
          borderColor: "#011993",
          fill: false,
          pointHoverRadius: 10,
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
          text: 'Unscaled RGB \"radiance functions\"; y-axis denotes radiance.',
          fontSize: 24,
        },
      }
    }
  });

  QUEUE.Push(["Text", text2Jax[3], window.cmfUnscaledChart.data.datasets[0].data[(500-380)/5].toFixed(3)]);
  QUEUE.Push(["Text", text2Jax[5], window.cmfUnscaledChart.data.datasets[1].data[(500-380)/5].toFixed(3)]);
  QUEUE.Push(["Text", text2Jax[7], window.cmfUnscaledChart.data.datasets[2].data[(500-380)/5].toFixed(3)]);

  return window.cmfUnscaledChart;
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

function registerPlotUnscaledCMF(buttonId, wlen) {
  var plotted = false;
  var chart;

  $(buttonId).on('click', function(evt) {
    if (!plotted) {
      chart = plotUnscaledCMF(wlen);
      plotted = true;
    } else {
      updateUnscaledCMF(chart, wlen);
    }
  });
}

function registerSolLinSys(buttonId, canvas, chart, wlen, plotId) {
  $(buttonId).on('click', function(evt) {
    var rMat = [chart.data.datasets[0].data, chart.data.datasets[1].data, chart.data.datasets[2].data];
    var lMatInv = math.inv(lMat);
    resMat = math.multiply(lMatInv, rMat);
    $('#plotUnscaledCMF').prop('disabled', false);
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

function registerSelPrim(buttonId, canvas, chart, wlen, plotId) {
  $(buttonId).on('click', function(evt) {
    toggleDrag(canvas, false);

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

    // setup the equation
    var pre = "\\begin{bmatrix}";
    var post = "\\end{bmatrix}";

    var col1, col2, col3;
    var col1 = "\\Bigg[ \\begin{matrix}?? \\\\ ?? \\\\ ??\\end{matrix}"
    QUEUE.Push(["Text", lmat1, col1]);
    var col2 = "\\begin{matrix}?? \\\\ ?? \\\\ ??\\end{matrix}"
    QUEUE.Push(["Text", lmat2, col2]);
    var col3 = "\\begin{matrix}?? \\\\ ?? \\\\ ??\\end{matrix} \\Bigg]"
    QUEUE.Push(["Text", lmat3, col3]);

    var m1, m2, m3;
    m1 = "380_{b} & 385_{b} & \\cdots & 775_{b} & 780_{b} \\\\";
    m2 = "380_{g} & 385_{g} & \\cdots & 775_{g} & 780_{g} \\\\";
    m3 = "380_{r} & 385_{r} & \\cdots & 775_{r} & 780_{r} \\\\";
    QUEUE.Push(["Text", mmat, "\\times"+pre+m1+m2+m3+post+"="]);

    // TODO: use the correct LMS csv file and fix the indices
    var r1, r2, r3; // show first two and last two
    r1 = chart.data.datasets[0].data[0].toExponential(3) + "&&" +
         chart.data.datasets[0].data[1].toExponential(3) + "&&" + "\\cdots &&" +
         chart.data.datasets[0].data[wlen.length - 2].toExponential(3) + "&&" +
         chart.data.datasets[0].data[wlen.length - 1].toExponential(3) + "\\\\";
    r2 = chart.data.datasets[1].data[0].toExponential(3) + "&&" +
         chart.data.datasets[1].data[1].toExponential(3) + "&&" + "\\cdots &&" +
         chart.data.datasets[1].data[wlen.length - 2].toExponential(3) + "&&" +
         chart.data.datasets[1].data[wlen.length - 1].toExponential(3) + "\\\\";
    r3 = chart.data.datasets[2].data[0].toExponential(3) + "&&" +
         chart.data.datasets[2].data[1].toExponential(3) + "&&" + "\\cdots &&" +
         chart.data.datasets[2].data[wlen.length - 2].toExponential(3) + "&&" +
         chart.data.datasets[2].data[wlen.length - 1].toExponential(3) + "\\\\";
    QUEUE.Push(["Text", rmat, pre+r1+r2+r3+post]);

    // https://www.chartjs.org/docs/latest/configuration/interactions.html
    var numPoints = 0;
    var row1 = "", row2 = "", row3 = "";
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

        if (numPoints == 0) {
          var col = "\\Bigg[ \\begin{matrix}" +
                    "\\mathbf{" + chart.data.datasets[0].data[point.index].toExponential(3) + "}" +
                    "\\\\" +
                    "\\mathbf{" + chart.data.datasets[1].data[point.index].toExponential(3) + "}" +
                    "\\\\" +
                    "\\mathbf{" + chart.data.datasets[2].data[point.index].toExponential(3) + "}" +
                    "\\end{matrix}";
          QUEUE.Push(["Text", lmat1, col]);
          QUEUE.Push(["Text", text1Jax[4], chart.data.labels[point.index]+"~nm"]);
          QUEUE.Push(["Text", text1Jax[6], "\\begin{bmatrix}"+chart.data.datasets[0].data[point.index].toExponential(3)+","+chart.data.datasets[1].data[point.index].toExponential(3)+","+chart.data.datasets[2].data[point.index].toExponential(3)+"\\end{bmatrix}^T"]);
          QUEUE.Push(["Text", text1Jax[7], chart.data.labels[point.index]+"~nm"]);
        } else if (numPoints == 1) {
          var col = "\\begin{matrix}" +
                    "\\mathbf{" + chart.data.datasets[0].data[point.index].toExponential(3) + "}" +
                    "\\\\" +
                    "\\mathbf{" + chart.data.datasets[1].data[point.index].toExponential(3) + "}" +
                    "\\\\" +
                    "\\mathbf{" + chart.data.datasets[2].data[point.index].toExponential(3) + "}" +
                    "\\end{matrix}";
          QUEUE.Push(["Text", lmat2, col]);
        } else if (numPoints == 2) {
          var col = "\\begin{matrix}" +
                    "\\mathbf{" + chart.data.datasets[0].data[point.index].toExponential(3) + "}" +
                    "\\\\" +
                    "\\mathbf{" + chart.data.datasets[1].data[point.index].toExponential(3) + "}" +
                    "\\\\" +
                    "\\mathbf{" + chart.data.datasets[2].data[point.index].toExponential(3) + "}" +
                    "\\end{matrix} \\Bigg]";
          QUEUE.Push(["Text", lmat3, col]);
          $('#solLinSys').prop('disabled', false);
        } 
        lMat[0][numPoints] = chart.data.datasets[0].data[point.index];
        lMat[1][numPoints] = chart.data.datasets[1].data[point.index];
        lMat[2][numPoints] = chart.data.datasets[2].data[point.index];

        numPoints++;
      }
    }
  });
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
          pan: {
            enabled: true,
            modifierKey: 'shift',
            mode: 'x',
          },
        },
        title: {
          display: true,
          text: '2-deg fundamentals based on the Stiles & Burch 10-deg CMFs (Stockman & Sharpe (2000); [380, 780])',
          fontSize: 24,
        },
        tooltip: {
          callbacks: {
            labelTextColor: function(context) {
              if (context.datasetIndex == 0) highlightLocus(context.dataIndex, 'lmsDiv', lmsLocusMarkerColors);
              return '#FFFFFF';
            }
          },
        }
      }
    }
  });

  registerDrag(canvas, window.myChart, 'lmsDiv');
  registerResetZoom('#resetZoomLMS', window.myChart);
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
    name: 'spectral locus',
  };

  var data = [trace];
 
  var layout = {
    height: 800,
    //width: 1200,
    //showlegend: true,
    margin: {
      l: 100,
      r: 0,
      b: 0,
      t: 100
    },
    title: 'Spectral locus in LMS cone space',
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
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'L'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'M'
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'S'
        }
      },
    }
  };

  Plotly.newPlot('lmsDiv', data, layout);

  registerSelPrim('#selPrim', canvas, window.myChart, wlen, 'lmsDiv');
  registerSolLinSys('#solLinSys', canvas, window.myChart, wlen, 'lmsDiv');
  registerPlotUnscaledCMF('#plotUnscaledCMF', wlen);
  registerCalcCMFScale('#calcCMFScale', wlen);
  registerPlotScaleCMF('#plotScaleCMF', wlen);
});


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
          label: "R",
          borderColor: "#da2500",
          fill: false,
          pointHoverRadius: 10,
        },
        {
          data: y_data_2,
          label: "G",
          borderColor: "#008f00",
          fill: false,
          pointHoverRadius: 10,
        },
        {
          data: y_data_3,
          label: "B",
          borderColor: "#011993",
          fill: false,
          pointHoverRadius: 10,
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
        //yAxes:{
        //  min: -0.1,
        //  max: 0.4,
        //  position: 'left',
        //},
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
          fontSize: 24,
        },
        tooltip: {
          callbacks: {
            labelTextColor: function(context) {
              if (context.datasetIndex == 0) highlightLocus(context.dataIndex, 'rgbDiv', rgbLocusMarkerColors);
              return '#FFFFFF';
            }
          },
        }
      }
    }
  });

  registerResetZoom('#resetZoomRGB', window.cmfChart);

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
    name: 'spectral locus',
  };

  var data = [trace];
 
  var layout = {
    height: 800,
    showlegend: false,
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 100
    },
    title: 'Spectral locus in RGB color space',
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
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'R'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'G'
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'B'
        }
      },
    }
  };
 
  Plotly.newPlot('rgbDiv', data, layout);

  var rgbPlot = document.getElementById('rgbDiv');
  rgbPlot.on('plotly_click', function(data){
    plotGamut(data);
  });

  // RGB to rgb chromaticity plot
  registerRGB2rgb('#RGB2rgb', window.cmfChart, wlen, rgbLocusMarkerColors);

  // show lines from the original; all points on the same line have the same chromaticity
  //registerShowChrmLine('#showChrmLine', window.cmfChart, 'rgbDiv');

  // show the gamut under the current primaries
  //registerGenGamut('#genGamut', window.cmfChart, 'rgbDiv');

  // rgb to RGB plot
  registerrgb2RGB('#rgb2RGB', window.cmfChart, rgbPlot, wlen, rgbLocusMarkerColors);

  // RGB to XYZ
  // all below always show variants of the original RGB CMFs, since not any arbitrary CMF would work
  //registerRGB2XYZ('#RGB2XYZ', rgbPlot, dCMFR, dCMFG, dCMFB, wlen, rgbLocusMarkerColors);

  return [window.cmfChart, rgbPlot];
}

function registerRGB2XYZ(id, plot, dCMFR, dCMFG, dCMFB, wlen, rgbLocusMarkerColors) {
  // TODO: some values are negative; most likely a numerical precision issue
  var transRGB = math.multiply(window.RGB2XYZ, [dCMFR, dCMFG, dCMFB]);

  $(id).on('click', function(evt) {
    removeXYZChrm(plot);

    var trace = {
      x: transRGB[0],
      y: transRGB[1],
      z: transRGB[2],
      text: wlen,
      mode: 'lines+markers',
      marker: {
        size: 6,
        opacity: 0.8,
        color: rgbLocusMarkerColors,
      },
      type: 'scatter3d',
      name: 'spectral locus in XYZ',
    };

    // will be instantaneous, since animation applies to 2d plots.
    // TODO: keep this or switch to update?
    Plotly.animate('rgbDiv', {
      data: [trace],
      traces: [0],
      layout: {
        title: 'Spectral locus in CIE XYZ color space',
        scene: {
          xaxis: {
            title: {
              text: 'X'
            }
          },
          yaxis: {
            title: {
              text: 'Y'
            }
          },
          zaxis: {
            title: {
              text: 'Z'
            }
          },
        }
      }
    }, {
      transition: {
        duration: 500,
        easing: 'linear'
      },
    })
  });
}

function registerrgb2RGB(id, chart, plot, wlen, rgbLocusMarkerColors) {
  $(id).on('click', function(evt) {
    removeXYZChrm(plot);

    var trace = {
      x: chart.data.datasets[0].data,
      y: chart.data.datasets[1].data,
      z: chart.data.datasets[2].data,
      text: wlen,
      mode: 'lines+markers',
      marker: {
        size: 6,
        opacity: 0.8,
        color: rgbLocusMarkerColors,
      },
      type: 'scatter3d',
      name: 'spectral locus in RGB',
    };

    // will be instantaneous, since animation applies to 2d plots.
    // TODO: keep this or switch to update?
    Plotly.animate('rgbDiv', {
      data: [trace],
      traces: [0],
      layout: {
        title: 'Spectral locus in RGB color space',
        scene: {
          xaxis: {
            title: {
              text: 'R'
            }
          },
          yaxis: {
            title: {
              text: 'G'
            }
          },
          zaxis: {
            title: {
              text: 'B'
            }
          },
        }
      }
    }, {
      transition: {
        duration: 500,
        easing: 'linear'
      },
    })
  });
}

// will be a nop when in the chromaticity mode, which is good.
// take whatever CMFs are in |chart|, even if it's adjusted, which is good.
function registerRGB2rgb(id, chart, wlen, rgbLocusMarkerColors) {
  $(id).on('click', function(evt) {
    $('#addXYZChrm').prop('disabled', false);
    var tCMFR = chart.data.datasets[0].data;
    var tCMFG = chart.data.datasets[1].data;
    var tCMFB = chart.data.datasets[2].data;

    var sumRGB = math.add(math.add(tCMFR, tCMFG), tCMFB);
    var cR = math.dotDivide(tCMFR, sumRGB);
    var cG = math.dotDivide(tCMFG, sumRGB);
    var cB = math.dotDivide(tCMFB, sumRGB);

    var cTrace = {
      x: cR,
      y: cG,
      z: cB,
      text: wlen,
      mode: 'lines+markers',
      marker: {
        size: 6,
        opacity: 0.8,
        color: rgbLocusMarkerColors,
      },
      type: 'scatter3d',
      name: 'spectral locus in rgb',
    };

    // will be instantaneous, since animation applies to 2d plots.
    // TODO: keep this or switch to update?
    Plotly.animate('rgbDiv', {
      data: [cTrace],
      traces: [0],
      layout: {
        title: 'Spectral locus in rgb chromaticity plot',
        scene: {
          xaxis: {
            title: {
              text: 'r'
            }
          },
          yaxis: {
            title: {
              text: 'g'
            }
          },
          zaxis: {
            title: {
              text: 'b'
            }
          },
        }
      }
    }, {
      transition: {
        duration: 500,
        easing: 'linear'
      },
    })
  });
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

function plotGamut(data) {
  // prevent the additional click firing from addTraces and also effectively disable click after the gamut is drawn.
  if (count == 3) return;

  var pn = data.points[0].pointNumber;
  selectX[count] = data.points[0].data.x[pn];
  selectY[count] = data.points[0].data.y[pn];
  selectZ[count] = data.points[0].data.z[pn];
  count++;
  if (count == 3) {
    var otherPointsX = [selectX[0] + selectX[1], // r+g
                        selectX[0] + selectX[2], // r+b
                        selectX[1] + selectX[2], // g+b
                        selectX[0] + selectX[1] + selectX[2]]; // r+g+b
    var otherPointsY = [selectY[0] + selectY[1],
                        selectY[0] + selectY[2],
                        selectY[1] + selectY[2],
                        selectY[0] + selectY[1] + selectY[2]];
    var otherPointsZ = [selectZ[0] + selectZ[1],
                        selectZ[0] + selectZ[2],
                        selectZ[1] + selectZ[2],
                        selectZ[0] + selectZ[1] + selectZ[2]];
    var allPointsX = [0].concat(selectX.concat(otherPointsX));
    var allPointsY = [0].concat(selectY.concat(otherPointsY));
    var allPointsZ = [0].concat(selectZ.concat(otherPointsZ));

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
}

function registerGenGamut(id, chart, plot) {
  $(id).on('click', function(evt) {
    var len = selectX.length; // should be 3
    var traces = [];

    for (i = 0; i < len; i++) {
      var trace = {
        x: [0, selectX[i]],
        y: [0, selectY[i]],
        z: [0, selectZ[i]],
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

function removeXYZChrm(plot) {
  $('#addXYZChrm').prop('disabled', true);
  if (plot.data.length == 1) return;
  else {
    Plotly.deleteTraces(plot, [1]);
  }
  $('#addXYZChrm').prop('checked', false);
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
  registerSelWhite(window.whiteChart, canvas, normD65, normA, normE);
});

function registerSelWhite(chart, canvas, d65, a, e) {
  $('#whiteSel').on('change', function(evt) {
    var val = this.value;
    if (val == "Draw") {
      registerDrag(canvas, chart, '');
    } else {
      toggleDrag(canvas, false);
      if (val == "D65") {
        chart.data.datasets[0].data = d65;
      } else if (val == "A") {
        chart.data.datasets[0].data = a;
      } else if (val == "E") {
        chart.data.datasets[0].data = e;
      }
      chart.update();
    }
  });
}
