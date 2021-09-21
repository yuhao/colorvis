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

QUEUE.Push(function () {
  var allJax = MathJax.Hub.getAllJax('primText');
  lmat1 = allJax[0];
  lmat2 = allJax[1];
  lmat3 = allJax[2];
  mmat = allJax[3];
  rmat = allJax[4];
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

function registerChartReset(buttonId, plotId, chart, resetData1, resetData2, resetData3) {
  $(buttonId).on('click', function(evt) {
    // reset chart.js (2d)
    // do a value copy here so that future updates to the chart won't affect the original data
    chart.data.datasets[0].data = Array.from(resetData1);
    chart.data.datasets[1].data = Array.from(resetData2);
    chart.data.datasets[2].data = Array.from(resetData3);
    chart.update();
    // reset plotly.js (3d)
    var plot = document.getElementById(plotId);
    removeXYZChrm(plot);
    var title = (buttonId == '#resetChartLMS') ? 'Spectral locus in LMS cone space' : 'Spectral locus in RGB space';
    updateLocus(resetData1, resetData2, resetData3, title, plotId);
  });
}

function registerDrag(canvas, chart, id) {
  var activePoint = null;

  // set pointer event handlers for canvas element
  canvas.onpointerdown = down_handler;
  canvas.onpointerup = up_handler;
  canvas.onpointermove = null;

  var selectedTrace;

  function down_handler(event) {
    // get the intersecting data point
    const points = chart.getElementsAtEventForMode(event, 'nearest', {intersect: true});
    if (points.length > 0) {
      // grab the point, start dragging
      activePoint = points[0];
      selectedTrace = activePoint.datasetIndex;
      canvas.onpointermove = move_handler;
    };
  };

  function up_handler(event) {
    // release grabbed point, stop dragging
    if (activePoint) {
      activePoint = null;
      canvas.onpointermove = null;
      // TODO: support any number of data sequences
      var seq0 = chart.data.datasets[0].data;
      var seq1 = chart.data.datasets[1].data;
      var seq2 = chart.data.datasets[2].data;
      var title = (chart.canvas.id == 'canvasLMS') ?
          'Updated spectral locus in LMS cone space' :
          'Updated spectral locus in RGB space';
      // TODO: should update chromaticities if the 3d plot shows chromaticities
      updateLocus(seq0, seq1, seq2, title, id);
    }
  };

  // TODO: sometimes for first drag the spectral locus won't update dynamically until released
  function move_handler(event)
  {
    // if an intersecting data point is grabbed
    if (activePoint != null) {
      // then get the points on the selectedTrace
      const points = chart.getElementsAtEventForMode(event, 'index', {intersect: false});
      for (var i = 0; i < points.length; i++) {
        if (points[i].datasetIndex == selectedTrace) {
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
  
          // update y value of active data point
          data.datasets[datasetIndex].data[point.index] = yValue;
          chart.update();
        }
      }
    }
  };

  // map value to other coordinate system
  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
  };
}

var lMat = [[], [], []];
var resMat;

function registerScaleCMF(buttonId, wlen) {
  $(buttonId).on('click', function(evt) {
    var uCMFR = resMat[0];
    var uCMFG = resMat[1];
    var uCMFB = resMat[2];
    var sumR = uCMFR.reduce((a, b) => a + b, 0);
    var sumG = uCMFG.reduce((a, b) => a + b, 0);
    var sumB = uCMFB.reduce((a, b) => a + b, 0);

    var sCMFR = math.dotDivide(uCMFR, sumR);
    var sCMFG = math.dotDivide(uCMFG, sumG);
    var sCMFB = math.dotDivide(uCMFB, sumB);

    plotScaledCMF(sCMFR, sCMFG, sCMFB, wlen);
  });
}

function registerPlotUnscaledCMF(buttonId, wlen) {
  $(buttonId).on('click', function(evt) {
    $("#scaleCMF").show();

    var dCMFR = resMat[0];
    var dCMFG = resMat[1];
    var dCMFB = resMat[2];

    var stride = 5;
    var firstW = wlen[0];
    var lastW = wlen[wlen.length - 1];

    // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
    var x_data = range(firstW, lastW, stride);
    var y_data_1 = dCMFR;
    var y_data_2 = dCMFG;
    var y_data_3 = dCMFB;

    // draw a line chart on the canvas context
    var ctx = document.getElementById("canvasUnscaledCMF").getContext("2d");
    var canvas = document.getElementById("canvasUnscaledCMF");
    window.cmfChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: x_data,
        datasets: [
          {
            data: y_data_1,
            label: "B",
            borderColor: "#011993",
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
            label: "R",
            borderColor: "#da2500",
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
            text: 'Unscaled RGB Color Matching Functions; y-axis denotes radiance.',
            fontSize: 24,
          },
        }
      }
    });
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

function registerSelPrim(buttonId, canvas, chart, wlen, plotId) {
  $(buttonId).on('click', function(evt) {
    canvas.onpointerdown = null;
    canvas.onpointerup = null;
    canvas.onpointermove = null;

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
    m1 = "380_{\\alpha} & 385_{\\alpha} & \\cdots & 775_{\\alpha} & 780_{\\alpha} \\\\";
    m2 = "380_{\\beta} & 385_{\\beta} & \\cdots & 775_{\\beta} & 780_{\\beta} \\\\";
    m3 = "380_{\\gamma} & 385_{\\gamma} & \\cdots & 775_{\\gamma} & 780_{\\gamma} \\\\";
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
      if (numPoints == 3) return;

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
  registerChartReset('#resetChartLMS', 'lmsDiv', window.myChart, window.ConeL, window.ConeM, window.ConeS);

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
  registerScaleCMF('#scaleCMF', wlen);
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
          label: "B",
          borderColor: "#011993",
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
          label: "R",
          borderColor: "#da2500",
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
    x: sCMFB, y: sCMFG, z: sCMFR,
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

  var myPlot = document.getElementById('rgbDiv');
  myPlot.on('plotly_click', function(data){
    plotGamut(data);
  });

  // RGB to rgb chromaticity plot
  registerRGB2rgb('#RGB2rgb', window.cmfChart, wlen, rgbLocusMarkerColors);

  // show lines from the original; all points on the same line have the same chromaticity
  //registerShowChrmLine('#showChrmLine', window.cmfChart, 'rgbDiv');

  // show the gamut under the current primaries
  //registerGenGamut('#genGamut', window.cmfChart, 'rgbDiv');

  // rgb to RGB plot
  registerrgb2RGB('#rgb2RGB', window.cmfChart, myPlot, wlen, rgbLocusMarkerColors);

  // add/remove XYZ primaries in chromaticities to the rgb chromaticity plot
  //registerToggleXYZChrm('#addXYZChrm', myPlot);

  // RGB to XYZ
  // all below always show variants of the original RGB CMFs, since not any arbitrary CMF would work
  //registerRGB2XYZ('#RGB2XYZ', myPlot, dCMFR, dCMFG, dCMFB, wlen, rgbLocusMarkerColors);
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

function registerToggleXYZChrm(id, plot) {
  var cX = [1.27, -1.74, -0.74, 1.27];
  var cY = [-0.28, 2.77, 0.14, -0.28];
  var cZ = [0.0028, -0.028, 1.60, 0.0028];

  var xyzPoints = {
    x: cX,
    y: cY,
    z: cZ,
    mode: 'lines+markers',
    marker: {
      size: 8,
      line: {
        color: '#000000',
        width: 1
      },
      opacity: 0.8
    },
    type: 'scatter3d',
    name: 'XYZ primaries',
  };

  $(id).on('click', function(evt) {
    if($(id).prop('checked') == false) {
      Plotly.deleteTraces(plot, [1]);
    } else {
      Plotly.addTraces(plot, [xyzPoints]);
    }
  });
}

