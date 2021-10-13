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

function showChrmLine(id) {
  var plot = window.locusPlot;
  var numWaves = plot.data[0].x.length;

  if($(id).is(":checked")) {
    var data_update = {'visible': true};
    Plotly.restyle(plot, data_update, [...Array(numWaves+2).keys()].slice(2));
  } else {
    var data_update = {'visible': 'legendonly'};
    Plotly.restyle(plot, data_update, [...Array(numWaves+2).keys()].slice(2));
  }
}

function registerShowChrmLine(id) {
  $(id).on('change', function(evt) {
    showChrmLine(id);
  });
}

function registerShowChrm(id) {
  $(id).on('change', function(evt) {
    var plot = window.locusPlot;
    var numWaves = plot.data[0].x.length;

    if($(id).is(":checked")) {
      var data_update = {'visible': true};
      //Plotly.restyle(plot, data_update, [...Array(numWaves+2).keys()].slice(1));
      Plotly.restyle(plot, data_update, [1]);
      //Plotly.restyle(plot, data_update, [plot.data.length - 1]);
      $('#showChrmLine').prop('disabled', false);
    } else {
      var data_update = {'visible': 'legendonly'};
      //Plotly.restyle(plot, data_update, [...Array(numWaves+2).keys()].slice(1));
      Plotly.restyle(plot, data_update, [1]);
      //Plotly.restyle(plot, data_update, [plot.data.length - 1]);

      // disable equi-rgb-ratio lines in RGB plot
      $('#showChrmLine').prop('disabled', true);
      if($('#showChrmLine').is(":checked")) {
        $('#showChrmLine').prop('checked', false);
        showChrmLine('#showChrmLine');
      }
    }
  });
}

function registerShowChrm2(id) {
  $(id).on('change', function(evt) {
    var plot = window.chrmPlot;
    var numWaves = plot.data[0].x.length;

    if($(id).is(":checked")) {
      var data_update = {'visible': true};
      Plotly.restyle(plot, data_update, [1]);
    } else {
      var data_update = {'visible': 'legendonly'};
      Plotly.restyle(plot, data_update, [1]);
    }
  });
}

var lMat = [[], [], []];
var primIdx = [];
var sCMFR = [], sCMFG = [], sCMFB = []; // these are precise values without rounding
function registerPlotLocus(buttonId, lmsChart, primChart) {
  $(buttonId).on('click', function(evt) {
    var val = $('input[type=radio][name=prim]:checked').val();
    if (val == 'drawPrim') {
      // B
      lMat[0][0] = math.dot(lmsChart.data.datasets[0].data, primChart.data.datasets[0].data);
      lMat[1][0] = math.dot(lmsChart.data.datasets[1].data, primChart.data.datasets[0].data);
      lMat[2][0] = math.dot(lmsChart.data.datasets[2].data, primChart.data.datasets[0].data);

      // G
      lMat[0][1] = math.dot(lmsChart.data.datasets[0].data, primChart.data.datasets[1].data);
      lMat[1][1] = math.dot(lmsChart.data.datasets[1].data, primChart.data.datasets[1].data);
      lMat[2][1] = math.dot(lmsChart.data.datasets[2].data, primChart.data.datasets[1].data);

      // R
      lMat[0][2] = math.dot(lmsChart.data.datasets[0].data, primChart.data.datasets[2].data);
      lMat[1][2] = math.dot(lmsChart.data.datasets[1].data, primChart.data.datasets[2].data);
      lMat[2][2] = math.dot(lmsChart.data.datasets[2].data, primChart.data.datasets[2].data);
    }

    var rMat = [lmsChart.data.datasets[0].data, lmsChart.data.datasets[1].data, lmsChart.data.datasets[2].data];
    var lMatInv = math.inv(lMat);
    resMat = math.multiply(lMatInv, rMat);

    var unscaledR = resMat[2];
    var unscaledG = resMat[1];
    var unscaledB = resMat[0];

    // assuming EEW
    var whiteSPD = Array(unscaledR.length).fill(1.0);

    rRad = math.dot(unscaledR, whiteSPD);
    gRad = math.dot(unscaledG, whiteSPD);
    bRad = math.dot(unscaledB, whiteSPD);

    // *10 just so that the RGB and rgb are comparable in magnitude and can shown in the same plot
    // TODO: automatically calculate this scaling factor
    sCMFR = math.dotDivide(unscaledR, rRad).map(element => element * 10);
    sCMFG = math.dotDivide(unscaledG, gRad).map(element => element * 10);
    sCMFB = math.dotDivide(unscaledB, bRad).map(element => element * 10);

    window.locusPlot = plotLocus(lmsChart.data.labels, 'rgbLocusDiv');
    plotChrm(window.locusPlot, true);
    plotPlane();
    //plotPrims();

    window.chrmPlot = plotLocus(lmsChart.data.labels, 'chrmLocusDiv');
    plotChrm(window.chrmPlot, false);
    plotHVSGamut(window.chrmPlot);

    $('#showChrm').prop('disabled', false);
    $('#showPlane').prop('disabled', false);
    $('#projChrm').prop('disabled', false);

    $('#showChrm2').prop('disabled', false);
  });
}

// TODO: should generate convex hull first
function plotHVSGamut(plot) {
  var points = math.transpose([plot.data[1].x, plot.data[1].y, plot.data[1].z]);
  var hullPoints = math.transpose(hull(points, Infinity));

  var len = hullPoints[0].length; 
  var midx = math.mean(hullPoints[0]);
  var midy = math.mean(hullPoints[1]);
  var midz = math.mean(hullPoints[2]);

  var trace = {
    x: [midx].concat(hullPoints[0]),
    y: [midy].concat(hullPoints[1]),
    z: [midz].concat(hullPoints[2]),
    i: Array(len).fill(0),
    j: [...Array(len+1).keys()].slice(1),
    k: [...Array(len+1).keys()].slice(2).concat([1]),
    type: 'mesh3d',
    visible: 'legendonly',
    opacity:0.8,
    color: greenColor,
    hoverinfo: 'skip',
  };
  Plotly.addTraces(plot, [trace]);
}

function plotPrims() {
  var plot = window.locusPlot;
  var RGBTrace = {
    x: [sCMFR[primIdx[0]], sCMFR[primIdx[1]], sCMFR[primIdx[2]]],
    y: [sCMFG[primIdx[0]], sCMFG[primIdx[1]], sCMFG[primIdx[2]]],
    z: [sCMFB[primIdx[0]], sCMFB[primIdx[1]], sCMFB[primIdx[2]]],
    text: [plot.data[0].text[primIdx[0]], plot.data[0].text[primIdx[1]], plot.data[0].text[primIdx[2]]],
    mode: 'markers',
    type: 'scatter3d',
    //visible: 'legendonly',
    marker: {
      color: '#000000',
      size: 6,
      symbol: 'circle',
      //opacity: 1,
    },
    hovertemplate: 'r: %{x}' +
      '<br>g: %{y}' +
      '<br>b: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    //hoverinfo: 'skip',
  };
  var rgbTrace = {
    x: [0, 0, 1],
    y: [0, 1, 0],
    z: [1, 0, 0],
    text: [plot.data[0].text[primIdx[0]], plot.data[0].text[primIdx[1]], plot.data[0].text[primIdx[2]]],
    mode: 'markers',
    type: 'scatter3d',
    visible: 'legendonly',
    marker: {
      color: blueColor,
      size: 6,
      symbol: 'circle',
      //opacity: 1,
    },
    hovertemplate: 'r: %{x}' +
      '<br>g: %{y}' +
      '<br>b: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    //hoverinfo: 'skip',
  };
  Plotly.addTraces(plot, [RGBTrace, rgbTrace]);
}

function plotPlane() {
  var plot = window.locusPlot;
  var trace = {
    x: [0, 0, 1],
    y: [0, 1, 0],
    z: [1, 0, 0],
    i: [0],
    j: [1],
    k: [2],
    //text: [],
    //mode: 'lines',
    type: 'mesh3d',
    visible: 'legendonly',
    opacity:0.8,
    color: '#000000',
    //name: 'Primaries',
    hoverinfo: 'skip',
    //hovertemplate: 'R: %{x}' +
    //  '<br>G: %{y}' +
    //  '<br>B: %{z}' +
    //  '<br>wavelength: %{text}<extra></extra>' ,
  };
  Plotly.addTraces(plot, [trace]);
}

function plotChrm(plot, lines) {
  var numWaves = plot.data[0].x.length;

  var sumRGB = math.add(math.add(sCMFR, sCMFG), sCMFB);
  var cR = math.dotDivide(sCMFR, sumRGB);
  var cG = math.dotDivide(sCMFG, sumRGB);
  var cB = math.dotDivide(sCMFB, sumRGB);

  var ratios = [];
  for (var i = 0; i < numWaves; i++) {
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
    visible: 'legendonly',
    line: {
      //color: '#32a852',
      color: greenColor,
      shape: 'spline',
    },
    marker: {
      size: 4,
      //opacity: 0.8,
    },
    customdata: ratios,
    hovertemplate: 'r: %{x}' +
      '<br>g: %{y}' +
      '<br>b: %{z}' +
      '<br>wavelength: %{text}' +
      '<br>ratio: %{customdata}<extra></extra>',
    //hoverinfo: 'skip',
  };

  var traces = [];
  traces.push(trace);

  if (lines) {
    for (i = 0; i < numWaves; i++) {
      var trace = {
        x: [0, cR[i]],
        y: [0, cG[i]],
        z: [0, cB[i]],
        mode: 'lines',
        type: 'scatter3d',
        visible: 'legendonly',
        line: {
          color: greyColor,
          width: 1,
        },
        hoverinfo: 'skip',
      };
      traces.push(trace);
    }
  }

  Plotly.addTraces(plot, traces);
}

function plotLocus(wlen, plotId) {
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
        //constrain: 'domain',
        //dtick: 0.2,
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
        //scaleanchor: 'x',
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
        showspikes: false,
        title: {
          text: 'B'
        }
      },
    }
  };
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot
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
          data: b_data,
          label: "B Primary",
          borderColor: blueColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: blueColor,
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
          data: r_data,
          label: "R Primary",
          borderColor: redColor,
          fill: false,
          pointHoverRadius: 10,
          pointBackgroundColor: redColor,
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
      //selectPrims(lmsCanvas, lmsChart, [getWaveId(lmsChart, 435), getWaveId(lmsChart, 545), getWaveId(lmsChart, 700)]);
      selectPrims(lmsCanvas, lmsChart, [getWaveId(lmsChart, 445), getWaveId(lmsChart, 540), getWaveId(lmsChart, 590)]);
    } else if (this.value == 'drawPrim') {
      drawPrims(rgbChart, rgbCanvas);
    }
  });
}

function selectPrims(canvas, chart, presets) {
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

        primIdx[i] = index;
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

        primIdx[numPoints] = point.index;

        numPoints++;
      }
    }
}

function registerProjChrm(id) {
  $(id).on('change', function(evt) {
    var plot = window.locusPlot;
    if($(id).is(":checked")) {
      var layout_update = {
        'scene.camera.center': {x: 0, y: 0, z: 0},
        'scene.camera.eye': {x:1.250652682833936e-19, y:-1.5308079880497813e-16, z:0.5},
        'scene.camera.up': {x: 0, y: 0, z: 1},
      };

      Plotly.relayout(plot, layout_update);
    } else {
      var layout_update = {
        'scene.camera.center': {x: 0, y: 0, z: 0},
        'scene.camera.eye': {x:1.25, y:1.25, z:1.25},
        'scene.camera.up': {x: 0, y: 0, z: 1},
      };

      Plotly.relayout(plot, layout_update);
    }
  });
}

function registerShowPlane(id) {
  $(id).on('change', function(evt) {
    var plot = window.locusPlot;
    var numWaves = plot.data[0].x.length;
    if($(id).is(":checked")) {
      var data_update = {'visible': true};
      Plotly.restyle(plot, data_update, [numWaves+2]);
    } else {
      var data_update = {'visible': 'legendonly'};
      Plotly.restyle(plot, data_update, [numWaves+2]);
    }
  });
}

function registerShowPrims(id) {
  $(id).on('change', function(evt) {
    var plot = window.locusPlot;
    var traceId;
    if($('#showChrm').is(":checked")) {
      traceId = plot.data.length - 1;
    } else {
      traceId = plot.data.length - 2;
    }

    if($(id).is(":checked")) {
      var data_update = {'visible': true};
      Plotly.restyle(plot, data_update, [traceId]);
    } else {
      var data_update = {'visible': 'legendonly'};
      Plotly.restyle(plot, data_update, [traceId]);
    }
  });
}

function plotGamut(plot, data, count) {
  var pn = data.points[0].pointNumber;
  selectX[count] = data.points[0].data.x[pn];
  selectY[count] = data.points[0].data.y[pn];
  selectZ[count] = data.points[0].data.z[pn];
  count++;
  if (count == 3) {
    //var otherPointsX = [selectX[0] + selectX[1], // r+g
    //                    selectX[0] + selectX[2], // r+b
    //                    selectX[1] + selectX[2], // g+b
    //                    selectX[0] + selectX[1] + selectX[2]]; // r+g+b
    //var otherPointsY = [selectY[0] + selectY[1],
    //                    selectY[0] + selectY[2],
    //                    selectY[1] + selectY[2],
    //                    selectY[0] + selectY[1] + selectY[2]];
    //var otherPointsZ = [selectZ[0] + selectZ[1],
    //                    selectZ[0] + selectZ[2],
    //                    selectZ[1] + selectZ[2],
    //                    selectZ[0] + selectZ[1] + selectZ[2]];
    //var allPointsX = [0].concat(selectX.concat(otherPointsX));
    //var allPointsY = [0].concat(selectY.concat(otherPointsY));
    //var allPointsZ = [0].concat(selectZ.concat(otherPointsZ));

    var trace = {
      x: [selectX[0], selectX[1], selectX[2], selectX[0]],
      y: [selectY[0], selectY[1], selectY[2], selectY[0]],
      z: [selectZ[0], selectZ[1], selectZ[2], selectZ[0]],

      //text: plot.data[0].text,
      mode: 'lines+markers',
      type: 'scatter3d',
      visible: 'legendonly',
      line: {
        color: '#32a852',
        //color: oBlueColor,
        //shape: 'spline',
      },
      marker: {
        size: 4,
        //opacity: 0.8,
      },
      //customdata: ratios,
      //hovertemplate: 'r: %{x}' +
      //  '<br>g: %{y}' +
      //  '<br>b: %{z}' +
      //  '<br>wavelength: %{text}' +
      //  '<br>ratio: %{customdata}<extra></extra>',
      //hoverinfo: 'skip',
    };

    // https://github.com/plotly/plotly.js/issues/1467
    // addTraces would trigger click infinitely so add it only once in the end instead of incrementally
    Plotly.addTraces(plot, [trace]);
  }
}

function registerPickColors() {
  var traceIdx;

  $('input[type=radio][name=pick]').change(function() {
    var plot = window.chrmPlot;

    if (traceIdx != undefined && traceIdx.length != 0) Plotly.deleteTraces(plot, traceIdx);
    traceIdx = [];

    var count = 0;
    var traces = [];
    var selectX = [];
    var selectY = [];
    var selectZ = [];
    var chrmSelectX = [];
    var chrmSelectY = [];
    var chrmSelectZ = [];

    function add2(data) {
      if (data.points[0].curveNumber != 0) return;

      var pn = data.points[0].pointNumber;
      selectX[count] = data.points[0].data.x[pn];
      selectY[count] = data.points[0].data.y[pn];
      selectZ[count] = data.points[0].data.z[pn];
      chrmSelectX[count] = plot.data[1].x[pn];
      chrmSelectY[count] = plot.data[1].y[pn];
      chrmSelectZ[count] = plot.data[1].z[pn];

      count++;
      if (count == 2) {
        plot.removeListener('plotly_click', add2);

        var trace = {
          x: [selectX[0], selectX[1]],
          y: [selectY[0], selectY[1]],
          z: [selectZ[0], selectZ[1]],
          mode: 'lines',
          type: 'scatter3d',
          line: {
            color: '#000000',
            width: 2,
          },
          hoverinfo: 'skip',
        };
        traces.push(trace);

        var chrmTrace = {
          x: [chrmSelectX[0], chrmSelectX[1]],
          y: [chrmSelectY[0], chrmSelectY[1]],
          z: [chrmSelectZ[0], chrmSelectZ[1]],
          mode: 'lines',
          type: 'scatter3d',
          line: {
            color: greenColor,
            width: 2,
          },
          hoverinfo: 'skip',
        };
        traces.push(chrmTrace);

        for (var i = 0; i < 2; i++) {
          var trace = {
            x: [0, chrmSelectX[i]],
            y: [0, chrmSelectY[i]],
            z: [0, chrmSelectZ[i]],
            mode: 'lines',
            type: 'scatter3d',
            line: {
              color: redColor,
              width: 2,
            },
            hoverinfo: 'skip',
          };
          traces.push(trace);
        }

        Plotly.addTraces(plot, traces);
        traceIdx.push(plot.data.length - 4, plot.data.length - 3, plot.data.length - 2, plot.data.length - 1);
      }
    }

    function add3(data) {
      if (data.points[0].curveNumber != 0) return;

      var pn = data.points[0].pointNumber;
      selectX[count] = data.points[0].data.x[pn];
      selectY[count] = data.points[0].data.y[pn];
      selectZ[count] = data.points[0].data.z[pn];
      chrmSelectX[count] = plot.data[1].x[pn];
      chrmSelectY[count] = plot.data[1].y[pn];
      chrmSelectZ[count] = plot.data[1].z[pn];

      count++;
      if (count == 3) {
        plot.removeListener('plotly_click', add3);

        var trace = {
          x: [selectX[0], selectX[1], selectX[2]],
          y: [selectY[0], selectY[1], selectY[2]],
          z: [selectZ[0], selectZ[1], selectZ[2]],
          i: [0],
          j: [1],
          k: [2],
          type: 'mesh3d',
          //opacity:0.8,
          color: orangeColor,
          hoverinfo: 'skip',
        };
        traces.push(trace);

        var chrmTrace = {
          x: [chrmSelectX[0], chrmSelectX[1], chrmSelectX[2]],
          y: [chrmSelectY[0], chrmSelectY[1], chrmSelectY[2]],
          z: [chrmSelectZ[0], chrmSelectZ[1], chrmSelectZ[2]],
          i: [0],
          j: [1],
          k: [2],
          type: 'mesh3d',
          opacity:0.8,
          color: greenColor,
          hoverinfo: 'skip',
        };
        traces.push(chrmTrace);

        for (var i = 0; i < 3; i++) {
          var trace = {
            x: [0, chrmSelectX[i]],
            y: [0, chrmSelectY[i]],
            z: [0, chrmSelectZ[i]],
            mode: 'lines',
            type: 'scatter3d',
            line: {
              color: redColor,
              width: 2,
            },
            hoverinfo: 'skip',
          };
          traces.push(trace);
        }

        // https://github.com/plotly/plotly.js/issues/1467
        Plotly.addTraces(plot, traces);
        traceIdx.push(plot.data.length - 5, plot.data.length - 4, plot.data.length - 3, plot.data.length - 2, plot.data.length - 1);
      }
    }

    function add4(data) {
      if (data.points[0].curveNumber != 0) return;

      var pn = data.points[0].pointNumber;
      selectX[count] = data.points[0].data.x[pn];
      selectY[count] = data.points[0].data.y[pn];
      selectZ[count] = data.points[0].data.z[pn];
      chrmSelectX[count] = plot.data[1].x[pn];
      chrmSelectY[count] = plot.data[1].y[pn];
      chrmSelectZ[count] = plot.data[1].z[pn];
      colors.push({id: count, value: pn});

      count++;
      if (count == 4) {
        // to avoid the weird bug in plotly where addtraces trigger click
        plot.removeListener('plotly_click', add4);

        var trace = {
          x: [selectX[0], selectX[1], selectX[2], selectX[3]],
          y: [selectY[0], selectY[1], selectY[2], selectY[3]],
          z: [selectZ[0], selectZ[1], selectZ[2], selectZ[3]],
          i: [0, 0, 1, 0],
          j: [1, 1, 2, 2],
          k: [2, 3, 3, 3],
          type: 'mesh3d',
          intensity: [0.2, 0.4, 0.6, 0.8],
          intensitymode: 'cell',
          showscale: false,
          cmax: 1.0,
          cmin: 0.0,
          //color: purpleColor,
          hoverinfo: 'skip',
        };
        traces.push(trace);

        colors.sort(function (a, b) {
          return a.value - b.value;
        });
        var chrmTrace = {
          x: [chrmSelectX[colors[0].id], chrmSelectX[colors[1].id], chrmSelectX[colors[2].id], chrmSelectX[colors[3].id]],
          y: [chrmSelectY[colors[0].id], chrmSelectY[colors[1].id], chrmSelectY[colors[2].id], chrmSelectY[colors[3].id]],
          z: [chrmSelectZ[colors[0].id], chrmSelectZ[colors[1].id], chrmSelectZ[colors[2].id], chrmSelectZ[colors[3].id]],
          i: [0, 0],
          j: [1, 2],
          k: [2, 3],
          type: 'mesh3d',
          opacity:0.8,
          color: greenColor,
          hoverinfo: 'skip',
        };
        traces.push(chrmTrace);

        for (var i = 0; i < 4; i++) {
          var trace = {
            x: [0, chrmSelectX[i]],
            y: [0, chrmSelectY[i]],
            z: [0, chrmSelectZ[i]],
            mode: 'lines',
            type: 'scatter3d',
            line: {
              color: redColor,
              width: 2,
            },
            hoverinfo: 'skip',
          };
          traces.push(trace);
        }

        Plotly.addTraces(plot, traces);
        traceIdx.push(plot.data.length - 6, plot.data.length - 5, plot.data.length - 4, plot.data.length - 3, plot.data.length - 2, plot.data.length - 1);
      }
    }

    // https://github.com/plotly/plotly.js/issues/107#issuecomment-279716312
    // remove all event listerners so that no callbacks are accidently fired. must if we click a pick button without doing anything and then click another pick button.
    plot.removeAllListeners("plotly_click");
    if (this.id == 'pick3') {
      plot.on('plotly_click', add3);
    } else if (this.id == 'pick2') {
      plot.on('plotly_click', add2);
    } else if (this.id == 'pick4') {
      var colors = [];
      plot.on('plotly_click', add4);
    } else if (this.id == 'pick0') {
    }
  });
}

function registerShowHVS(id) {
  $(id).on('change', function(evt) {
    var plot = window.chrmPlot;

    if($(id).is(":checked")) {
      var data_update = {'visible': true};
      Plotly.restyle(plot, data_update, [2]);
    } else {
      var data_update = {'visible': 'legendonly'};
      Plotly.restyle(plot, data_update, [2]);
    }
  });
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
      [[Array(wlen.length).fill(0.6), blueColor],
       [Array(wlen.length).fill(0.9), greenColor],
       [Array(wlen.length).fill(0.8), redColor]]);

  // Step 1
  // will calculate everything but hide them except the RGB locus
  // order: RGB locus, rgb locus, all chrm lines, r+g+b=1 plane(, RGB prims, rgb prims)
  registerPlotLocus('#plotLocus', window.lmsChart, window.rgbPrimChart);

  registerShowChrm('#showChrm');
  registerShowChrmLine('#showChrmLine');
  registerShowPlane('#showPlane');
  registerProjChrm('#projChrm');

  // Step 2 (the locus plot is plotted in |registerPlotLocus|)
  // order: RGB locus, rgb locus, hvs gamut
  registerShowChrm2('#showChrm2');
  registerPickColors();
  registerShowHVS('#showhvs');
});

