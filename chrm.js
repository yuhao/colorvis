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

  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];

  var x_data = range(firstW, lastW, stride);

  // LMS plot; sets window.lmsChart, window.lmsCanvas
  plotCones(rows, x_data);

  // sets window.rgbPrimCanvas and window.rgbPrimChart
  plotCustomPrims(x_data);

  registerSelPrim('#selPrimForm', window.lmsChart, window.lmsCanvas, window.rgbPrimChart, window.rgbPrimCanvas);
  registerChartReset('#resetPrim', undefined, window.rgbPrimChart, window.rgbPrimCanvas, [0, 1, 2],
      [[Array(wlen.length).fill(0.8), redColor],
       [Array(wlen.length).fill(0.9), greenColor],
       [Array(wlen.length).fill(0.6), blueColor]]);

  registerPlotLocus('#plotLocus', window.lmsChart);
  registerShowChrm('#showChrm');
});

function registerShowChrm(id) {
  $(id).on('change', function(evt) {
    var plot = window.locusPlot;
    var len = plot.data[0].x.length;
    if($(id).is(":checked")) {
      if (plot.data.length != 1) {
        var data_update = {'visible': true};
        Plotly.restyle(plot, data_update, [...Array(len+2).keys()].slice(1));
        return;
      }

      var traces = [];

      var sumRGB = math.add(math.add(sCMFR, sCMFG), sCMFB);
      var cR = math.dotDivide(sCMFR, sumRGB);
      var cG = math.dotDivide(sCMFG, sumRGB);
      var cB = math.dotDivide(sCMFB, sumRGB);

      var ratios = [];
      for (var i = 0; i < len; i++) {
        var ratio;
        if (cR[i].toFixed(5) == 0 || cG[i].toFixed(5) == 0 || cB[i].toFixed(5) == 0)
          ratio = cR[i].toFixed(3) + ":" + cG[i].toFixed(3) + ":" + cB[i].toFixed(3);
        else ratio = "1:" + (cG[i]/cR[i]).toFixed(3) + ":" + (cB[i]/cR[i]).toFixed(3);
        ratios.push(ratio);
      }

      var trace = {
        x: cR.map(element => element.toFixed(5)),
        y: cG.map(element => element.toFixed(5)),
        z: cB.map(element => element.toFixed(5)),
        text: plot.data[0].text,
        mode: 'lines+markers',
        type: 'scatter3d',
        line: {
          color: '#32a852',
          shape: 'spline',
        },
        marker: {
          size: 4,
          opacity: 0.8,
        },
        customdata: ratios,
        hovertemplate: 'r: %{x}' +
          '<br>g: %{y}' +
          '<br>b: %{z}' +
          '<br>wavelength: %{text}' +
          '<br>ratio: %{customdata}<extra></extra>',
          //hoverinfo: 'skip',
      };
      traces.push(trace);

      for (i = 0; i < len; i++) {
        var trace = {
          x: [0, cR[i]],
          y: [0, cG[i]],
          z: [0, cB[i]],
          mode: 'lines',
          type: 'scatter3d',
          line: {
            color: greyColor,
            width: 1,
          },
          hoverinfo: 'skip',
        };
        traces.push(trace);
      }

      Plotly.addTraces(plot, traces);
    } else {
      var data_update = {'visible': 'legendonly'};

      Plotly.restyle(plot, data_update, [...Array(len+2).keys()].slice(1));
    }
  });
}

var lMat = [[], [], []];
var sCMFR = [], sCMFG = [], sCMFB = []; // these are precise values without rounding
function registerPlotLocus(buttonId, chart) {
  $(buttonId).on('click', function(evt) {
    var val = $('input[type=radio][name=prim]:checked').val();
    var rMat = [chart.data.datasets[0].data, chart.data.datasets[1].data, chart.data.datasets[2].data];
    var lMatInv = math.inv(lMat);
    resMat = math.multiply(lMatInv, rMat);

    var unscaledR = resMat[2];
    var unscaledG = resMat[1];
    var unscaledB = resMat[0];

    var whiteSPD = Array(unscaledR.length).fill(1.0);

    rRad = math.dot(unscaledR, whiteSPD);
    gRad = math.dot(unscaledG, whiteSPD);
    bRad = math.dot(unscaledB, whiteSPD);

    // *10 just so that the RGB andd rgb are comparable in magnitude and can shown in the same plot
    sCMFR = math.dotDivide(unscaledR, rRad).map(element => element * 10);
    sCMFG = math.dotDivide(unscaledG, gRad).map(element => element * 10);
    sCMFB = math.dotDivide(unscaledB, bRad).map(element => element * 10);

    plotLocus(chart.data.labels);

    $('#showChrm').prop('disabled', false);
  });
}

function plotLocus(wlen) {
  var ratios = [];
  for (var i = 0; i < sCMFR.length; i++) {
    var ratio;
    if (sCMFR[i].toFixed(5) == 0 || sCMFG[i].toFixed(5) == 0 || sCMFB[i].toFixed(5) == 0)
      ratio = sCMFR[i].toFixed(3) + ":" + sCMFG[i].toFixed(3) + ":" + sCMFB[i].toFixed(3);
    else ratio = "1:" + (sCMFG[i]/sCMFR[i]).toFixed(3) + ":" + (sCMFB[i]/sCMFR[i]).toFixed(3);
    ratios.push(ratio);
  }

  var trace = {
    x: sCMFR.map(element => element.toFixed(5)),
    y: sCMFG.map(element => element.toFixed(5)),
    z: sCMFB.map(element => element.toFixed(5)),
    text: wlen,
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
    customdata: ratios,
    hovertemplate: 'R: %{x}' +
      '<br>G: %{y}' +
      '<br>B: %{z}' +
      '<br>wavelength: %{text}' +
      '<br>ratio: %{customdata}<extra></extra>',
      //hoverinfo: 'skip',
    type: 'scatter3d',
    name: 'Spectral locus',
  };

  var data = [trace];
 
  var layout = {
    height: 600,
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    name: 'Spectral locus',
    showlegend: false,
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
        showspikes: false,
        title: {
          text: 'B'
        }
      },
    }
  };
 
  window.locusPlot = document.getElementById('rgbLocusDiv');
  Plotly.newPlot(window.locusPlot, data, layout);
}

function plotCones(rows, x_data) {
  // points to the cone arrays that will be used to plot the chart;
  var coneL = unpack(rows, 'l');
  var coneM = unpack(rows, 'm');
  var coneS = unpack(rows, 's');

  var y_data_1 = coneL;
  var y_data_2 = coneM;
  var y_data_3 = coneS;

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
}

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
    $('#plotLocus').prop('disabled', false);
    if (this.value == 'selPrim') {
      toggleDrag(rgbCanvas, false);
      $('#resetPrim').prop('disabled', true);
      selectPrims(lmsCanvas, lmsChart, []);
    } else if (this.value == 'usePreset') {
      toggleDrag(rgbCanvas, false);
      $('#resetPrim').prop('disabled', true);
      selectPrims(lmsCanvas, lmsChart, [getWaveId(lmsChart, 435), getWaveId(lmsChart, 545), getWaveId(lmsChart, 700)]);
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

        lMat[0][i] = chart.data.datasets[0].data[index];
        lMat[1][i] = chart.data.datasets[1].data[index];
        lMat[2][i] = chart.data.datasets[2].data[index];

      }
      chart.update();
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

        lMat[0][numPoints] = chart.data.datasets[0].data[point.index];
        lMat[1][numPoints] = chart.data.datasets[1].data[point.index];
        lMat[2][numPoints] = chart.data.datasets[2].data[point.index];

        numPoints++;
      }
    }
}

