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
var ccMatText, equText, equText2, camText;

QUEUE.Push(function () {
  ccMatText = MathJax.Hub.getAllJax('ccMatText');
  equText = MathJax.Hub.getAllJax('equText');
  equText2 = MathJax.Hub.getAllJax('equText2');
  equText3 = MathJax.Hub.getAllJax('equText3');
  camText = MathJax.Hub.getAllJax('camText');
});


// https://stackoverflow.com/questions/60678586/update-x-and-y-values-of-a-trace-using-plotly-update
function updateLocus(seq1, seq2, seq3, newTitle, plot) {
  var layout_update = {
    //title: newTitle,
  };
  var data_update = {'x': [seq1], 'y': [seq2], 'z': [seq3]};

  //var plot = document.getElementById(id);
  Plotly.update(plot, data_update, layout_update, [0]);
}

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

// TODO: a quick hack here. need to support arbitrary num of traces.
function registerChartReset(buttonId, plotId, chart, canvas, num, resetData1, resetData2, resetData3) {
  $(buttonId).on('click', function(evt) {
    // reset chart.js (2d)
    // do a value copy here so that future updates to the chart won't affect the original data

    var length = resetData1[0].length;
    chart.data.datasets[0].data = Array.from(resetData1[0]);
    var traceColor = resetData1[1];
    chart.data.datasets[0].borderColor = Array(length).fill(traceColor);
    chart.data.datasets[0].pointBackgroundColor = Array(length).fill(traceColor);
    chart.data.datasets[0].pointRadius = Array(length).fill(3);
    chart.data.datasets[0].borderColor = Array(length).fill(traceColor);

    if (num > 1) {
      traceColor = resetData2[1];
      chart.data.datasets[1].data = Array.from(resetData2[0]);
      chart.data.datasets[1].borderColor = Array(length).fill(traceColor);
      chart.data.datasets[1].pointBackgroundColor = Array(length).fill(traceColor);
      chart.data.datasets[1].pointRadius = Array(length).fill(3);

      traceColor = resetData3[1];
      chart.data.datasets[2].data = Array.from(resetData3[0]);
      chart.data.datasets[2].borderColor = Array(length).fill(traceColor);
      chart.data.datasets[2].pointBackgroundColor = Array(length).fill(traceColor);
      chart.data.datasets[2].pointRadius = Array(length).fill(3);
    }

    registerDrag(canvas, chart, plotId, true, []);
    chart.update();

    // reset plotly.js (3d)
    if (plotId != undefined) updateLocus(resetData1[0], resetData2[0], resetData3[0], '', plotId);
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

// sRGB of the patches under D50
var patchColorsD50 = [
  [115,82,68],
  [195,149,128],
  [93,123,157],
  [91,108,65],
  [130,129,175],
  [99,191,171],
  [220,123,46],
  [72,92,168],
  [194,84,97],
  [91,59,104],
  [161,189,62],
  [229,161,40],
  [42,63,147],
  [72,149,72],
  [175,50,57],
  [238,200,22],
  [188,84,150],
  [0,137,166],
  [245,245,240],
  [201,202,201],
  [161,162,162],
  [120,121,121],
  [83,85,85],
  [50,50,51],
];

function formatRGB(rgb) {
  return 'rgba('+ rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + '1)';
}

var ccPatchNames;

d3.csv('ccspec.csv', function(err, rows){
  var stride = 10;

  var wlen = unpack(rows, 'Wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var patches = Object.keys(rows[0]);
  ccPatchNames = patches.slice(1);
  var firstIdx = (400 - firstW) / stride;
  var lastIdx = (720 - firstW) / stride;

  var colorCheckerSpecR = [];
  var chartTraces = [];

  var x_data = range(firstW, lastW, stride).slice(firstIdx, lastIdx + 1);

  for (var i = 1; i < patches.length; i++) {
    colorCheckerSpecR[i-1] = unpack(rows, patches[i]).slice(firstIdx, lastIdx + 1);
    var trace = {
      data: colorCheckerSpecR[i-1],
      label: patches[i],
      fill: false,
      pointHoverRadius: 10,
      pointBackgroundColor: formatRGB(patchColorsD50[i-1]),
      borderColor: 'rgba(0, 0, 0, 0.5)',
      backgroundColor: formatRGB(patchColorsD50[i-1]),
      pointRadius: 3,
      borderWidth: 1,
    }
    chartTraces.push(trace);
  }

  var ctx = document.getElementById("canvasCCSpec").getContext("2d");
  var canvas = document.getElementById("canvasCCSpec");
  window.ccSpecChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: x_data,
      datasets: chartTraces,
    },
    options: {
      animation: {
        duration: 0
      },
      responsive: true,
      interaction: {
        mode: 'nearest', // find the nearest point on one curve
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
          text: 'Spectral Reflectance of ColorChecker Classic (by BabelColor)',
          font: {
            size: 20,
            family: 'Helvetica Neue',
          },
        },
        legend: {
          position: 'left',
        },
      }
    }
  });

  registerResetZoom('#resetZoomSpecR', window.ccSpecChart);
});

function genSelectBox(values, id, preset) {
  var select = document.getElementById(id);

  for (const val of values)
  {
    if (val == 'DSLR Average' || val == 'Point and Shoot Average' || val == 'Mobile Average' || val == 'Industrial Average') {
      var id = val.indexOf("Average");
      var name = val.substring(0, id-1);
      var optgrp = document.createElement("optgroup");
      optgrp.label = name;
      select.appendChild(optgrp);
    }
    var option = document.createElement("option");
    option.value = val;
    option.text = val;
    select.appendChild(option);
    if (val == 'Average') {
      var option = document.createElement("option");
      option.value = 'Custom';
      option.text = 'Custom';
      select.appendChild(option);
    }
  }

  if (preset) select.value = preset;
}

var defaultLegendClickHandler = Chart.defaults.plugins.legend.onClick;
var newLegendClickHandler = function (e, legendItem, legend) {
};

d3.csv('camspec.csv', function(err, rows){
  var stride = 10;

  var wlen = unpack(rows, 'wavelength');
  wlen = wlen.slice(0, wlen.length/3);
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var cams = Object.keys(rows[0]); // real cams start from 1 (0 is wavelength)

  var rCamSpec = rows.slice(0, wlen.length);
  var gCamSpec = rows.slice(wlen.length, 2 * wlen.length);
  var bCamSpec = rows.slice(2 * wlen.length, 3 * wlen.length);
  var drawSpec = [Array(wlen.length).fill(0.8),
                  Array(wlen.length).fill(0.9),
                  Array(wlen.length).fill(0.6)];

  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);

  var chartTraces = [];

  var rTrace = {
    data: unpack(rCamSpec, cams[1]),
    label: 'R Filter',
    fill: false,
    pointHoverRadius: 10,
    pointBackgroundColor: redColor,
    borderColor: redColor,
    backgroundColor: oRedColor,
    pointRadius: 3,
    borderWidth: 1,
  }
  var gTrace = {
    data: unpack(gCamSpec, cams[1]),
    label: 'G Filter',
    fill: false,
    pointHoverRadius: 10,
    pointBackgroundColor: greenColor,
    borderColor: greenColor,
    backgroundColor: oGreenColor,
    pointRadius: 3,
    borderWidth: 1,
  }
  var bTrace = {
    data: unpack(bCamSpec, cams[1]),
    label: 'B Filter',
    fill: false,
    pointHoverRadius: 10,
    pointBackgroundColor: blueColor,
    borderColor: blueColor,
    backgroundColor: oBlueColor,
    pointRadius: 3,
    borderWidth: 1,
  }
  chartTraces.push(rTrace, gTrace, bTrace);

  d3.csv('linss2_10e_5.csv', function(err, rows){
    var stride = 5;

    var wlen = unpack(rows, 'wavelength');
    var firstW = wlen[0];
    var lastW = wlen[wlen.length - 1];
    var firstIdx = (400 - firstW) / stride;
    var lastIdx = (720 - firstW) / stride;

    // LMS cone fundamentals are given at 5 nm intervals
    var lCone = unpack(rows, 'l').slice(firstIdx, lastIdx + 1).filter((element, index) => {
      return index % 2 === 0;
    });
    var mCone = unpack(rows, 'm').slice(firstIdx, lastIdx + 1).filter((element, index) => {
      return index % 2 === 0;
    });
    var sCone = unpack(rows, 's').slice(firstIdx, lastIdx + 1).filter((element, index) => {
      return index % 2 === 0;
    });
    wlen = wlen.slice(firstIdx, lastIdx + 1).filter((element, index) => {
      return index % 2 === 0;
    });

    var lTrace = {
      data: lCone,
      label: 'L Cone',
      fill: false,
      pointHoverRadius: 10,
      //pointBackgroundColor: redColor,
      pointRadius: 0,
      borderColor: redColor,
      borderDash: [10, 10],
      backgroundColor: oRedColor,
      borderWidth: 1,
    }
    var mTrace = {
      data: mCone,
      label: 'M Cone',
      fill: false,
      pointHoverRadius: 10,
      //pointBackgroundColor: greenColor,
      pointRadius: 0,
      borderColor: greenColor,
      borderDash: [10, 10],
      backgroundColor: oGreenColor,
      borderWidth: 1,
    }
    var sTrace = {
      data: sCone,
      label: 'S Cone',
      fill: false,
      pointHoverRadius: 10,
      //pointBackgroundColor: blueColor,
      pointRadius: 0,
      borderColor: blueColor,
      borderDash: [10, 10],
      backgroundColor: oBlueColor,
      borderWidth: 1,
    }
    chartTraces.push(lTrace, mTrace, sTrace);

    d3.csv('ciexyz31.csv', function(err, rows){
      var stride = 5;

      var wlen = unpack(rows, 'wavelength');
      var firstW = wlen[0];
      var lastW = wlen[wlen.length - 1];
      var firstIdx = (400 - firstW) / stride;
      var lastIdx = (720 - firstW) / stride;

      // XYZ CMFs are given at 5 nm intervals
      var xbar = unpack(rows, 'x').slice(firstIdx, lastIdx + 1).filter((element, index) => {
        return index % 2 === 0;
      });
      var ybar = unpack(rows, 'y').slice(firstIdx, lastIdx + 1).filter((element, index) => {
        return index % 2 === 0;
      });
      var zbar = unpack(rows, 'z').slice(firstIdx, lastIdx + 1).filter((element, index) => {
        return index % 2 === 0;
      });
      wlen = wlen.slice(firstIdx, lastIdx + 1).filter((element, index) => {
        return index % 2 === 0;
      });

      var xTrace = {
        data: xbar,
        label: 'CMF X',
        fill: false,
        pointHoverRadius: 10,
        //pointBackgroundColor: redColor,
        pointRadius: 0,
        borderColor: redColor,
        //borderDash: [10, 10],
        backgroundColor: oRedColor,
        borderWidth: 2,
        hidden: true,
      }
      var yTrace = {
        data: ybar,
        label: 'CMF Y',
        fill: false,
        pointHoverRadius: 10,
        //pointBackgroundColor: greenColor,
        pointRadius: 0,
        borderColor: greenColor,
        //borderDash: [10, 10],
        backgroundColor: oGreenColor,
        borderWidth: 2,
        hidden: true,
      }
      var zTrace = {
        data: zbar,
        label: 'CMF Z',
        fill: false,
        pointHoverRadius: 10,
        //pointBackgroundColor: blueColor,
        pointRadius: 0,
        borderColor: blueColor,
        //borderDash: [10, 10],
        backgroundColor: oBlueColor,
        borderWidth: 2,
        hidden: true,
      }
      chartTraces.push(xTrace, yTrace, zTrace);

      var lmsLocusMarkerColors = Array(wlen.length).fill(greyColor);
      var rgbLocusMarkerColors = Array(wlen.length).fill(purpleColor);
      var xyzLocusMarkerColors = Array(wlen.length).fill(blueGreenColor);

      var canvas = document.getElementById("canvasCamSpace");
      var ctx = canvas.getContext("2d");
      window.camSenChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: x_data,
          datasets: chartTraces,
        },
        options: {
          //aspectRatio: 1.6,
          animation: {
            duration: 0,
          },
          responsive: true,
          interaction: {
            //mode: 'nearest', // find the nearest point on one curve
            mode: 'index',
            intersect: false,
          },
          scales: {
            yAxes:{
              min: 0,
              //max: 2,
              position: 'left',
            },
          },
          onHover: (event) => {
            if (event.type === 'mouseout') {
              highlightLocus(-1, 'locusDiv', []);
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
              text: 'Camera Spectral Sensitivity',
              font: {
                size: 20,
                family: 'Helvetica Neue',
              },
            },
            legend: {
              position: 'left',
              display: true,
              //onClick: newLegendClickHandler,
            },
            tooltip: {
              callbacks: {
                labelTextColor: function(context) {
                  if (context.datasetIndex == 0) {
                    highlightLocus(context.dataIndex, 'locusDiv', []);
                  }
                  return '#FFFFFF';
                }
              },
            }
          }
        }
      });

      var plot = document.getElementById('locusDiv');
      window.locusPlot = plot;
      plotSpectralLocus(plot, lCone, mCone, sCone, wlen,
          unpack(rCamSpec, cams[1]), unpack(gCamSpec, cams[1]), unpack(bCamSpec, cams[1]),
          xbar, ybar, zbar);
      registerDrawCorrectLocus('#correctLocus', plot, wlen);

      genSelectBox(cams.slice(1), "camSel");
      registerSelCam(window.camSenChart, canvas, plot, rCamSpec, gCamSpec, bCamSpec, drawSpec);
      registerChartReset('#resetChartCam', plot, window.camSenChart, canvas, 3,
          [Array(wlen.length).fill(0.8), redColor],
          [Array(wlen.length).fill(0.9), greenColor],
          [Array(wlen.length).fill(0.6), blueColor]);
    });
  });
});

function registerDrawCorrectLocus(buttonId, plot, wlen) {
  var calculated = false;
  $(buttonId).on('click', function(evt) {
    var RGBMat = [plot.data[0].x, plot.data[0].y, plot.data[0].z];

    var cXYZMat = math.multiply(window.ccMat, RGBMat);

    if (calculated) {
      var data_update = {'x': [cXYZMat[0]], 'y': [cXYZMat[1]], 'z': [cXYZMat[2]]};

      Plotly.update(plot, data_update, {}, [3]);
      return;
    }

    calculated = true;
    var locusMarkerColors = Array(wlen.length).fill(magentaColor);
    var trace = {
      x: cXYZMat[0],
      y: cXYZMat[1],
      z: cXYZMat[2],
      text: wlen,
      mode: 'lines+markers',
      type: 'scatter3d',
      name: 'XYZ (Corrected)',
      marker: {
        size: 6,
        opacity: 0.8,
        color: locusMarkerColors,
        //symbol: Array(wlen.length).fill('1'),
      },
      line: {
        color: magentaColor,
        width: 2
      },
      //hoverinfo: 'skip',
      hovertemplate: 'X: %{x}' +
        '<br>Y: %{y}' +
        '<br>Z: %{z}' +
        '<br>wavelength: %{text}<extra></extra>' ,
    };
    Plotly.addTraces(plot, [trace]);
  });
}

function plotSpectralLocus(plot, lCone, mCone, sCone, wlen, rCam, gCam, bCam, xbar, ybar, zbar) {
  var lmsLocusMarkerColors = Array(wlen.length).fill(greyColor);
  var lmsTrace = {
    x: lCone,
    y: mCone,
    z: sCone,
    text: wlen,
    visible: 'legendonly',
    mode: 'lines+markers',
    marker: {
      size: 4,
      opacity: 0.8,
      color: lmsLocusMarkerColors,
    },
    line: {
      color: greyColor,
      width: 2
    },
    // https://plotly.com/python/hover-text-and-formatting/#customizing-hover-text-with-a-hovertemplate
    // <extra> tag to suppress trace name
    hovertemplate: 'L: %{x}' +
      '<br>M: %{y}' +
      '<br>S: %{z}' +
      '<br>wavelength: %{text}<extra></extra>' ,
    type: 'scatter3d',
    name: 'Spectral Locus in LMS',
  };

  var rgbLocusMarkerColors = Array(wlen.length).fill(purpleColor);
  var rgbTrace = {
    x: rCam,
    y: gCam,
    z: bCam,
    text: wlen,
    mode: 'lines+markers',
    marker: {
      size: 4,
      opacity: 0.8,
      color: rgbLocusMarkerColors,
      symbol: Array(wlen.length).fill('diamond'),
    },
    line: {
      color: purpleColor,
      width: 2
    },
    // https://plotly.com/python/hover-text-and-formatting/#customizing-hover-text-with-a-hovertemplate
    // <extra> tag to suppress trace name
    hovertemplate: 'R: %{x}' +
      '<br>G: %{y}' +
      '<br>B: %{z}' +
      '<br>wavelength: %{text}<extra></extra>' ,
    type: 'scatter3d',
    name: 'Spectral Locus in Cam',
  };

  var xyzLocusMarkerColors = Array(wlen.length).fill(blueGreenColor);
  var xyzTrace = {
    x: xbar,
    y: ybar,
    z: zbar,
    text: wlen,
    mode: 'lines+markers',
    marker: {
      size: 4,
      opacity: 0.8,
      color: xyzLocusMarkerColors,
      //symbol: Array(wlen.length).fill('diamond'),
    },
    line: {
      color: blueGreenColor,
      width: 2
    },
    hovertemplate: 'X: %{x}' +
      '<br>Y: %{y}' +
      '<br>Z: %{z}' +
      '<br>wavelength: %{text}<extra></extra>' ,
    type: 'scatter3d',
    name: 'Spectral Locus in XYZ',
  };

  var data = [rgbTrace, lmsTrace, xyzTrace];
 
  var layout = {
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
      aspectmode: 'cube',
      xaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'L/R/X'
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
          text: 'M/G/Y'
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
          text: 'S/B/Z'
        }
      },
    }
  };

  Plotly.newPlot(plot, data, layout);
}

function registerSelCam(chart, canvas, plot, rCamSpec, gCamSpec, bCamSpec, drawSpec) {
  $('#camSel').on('change', function(evt) {
    var val = this.value;
    if (val == "Custom") {
      $('#resetChartCam').prop('disabled', false);
      chart.data.datasets[0].data = drawSpec[0];
      chart.data.datasets[1].data = drawSpec[1];
      chart.data.datasets[2].data = drawSpec[2];
      registerDrag(canvas, chart, plot, true, [0, 1, 2]);
    } else {
      $('#resetChartCam').prop('disabled', true);
      chart.data.datasets[0].data = unpack(rCamSpec, val);
      chart.data.datasets[1].data = unpack(gCamSpec, val);
      chart.data.datasets[2].data = unpack(bCamSpec, val);
      toggleDrag(canvas, false);
    }
    updateLocus(chart.data.datasets[0].data, chart.data.datasets[1].data, chart.data.datasets[2].data, '', plot);
    chart.update();
  });
}

d3.csv('ciesi.csv', function(err, rows){
  var stride = 5;

  // the CIE SIs are normalized such that SPD is 100 at 560 nm
  // https://www.image-engineering.de/library/technotes/753-cie-standard-illuminants
  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var firstIdx = (400 - firstW) / stride;
  var lastIdx = (720 - firstW) / stride;

  // SI data are given at 5 nm intervals
  var x_data = range(firstW, lastW, stride).slice(firstIdx, lastIdx + 1).filter((element, index) => {
    return index % 2 === 0;
  });

  //var e = Array(wlen.length).fill(100);
  var StdIllu = Object.keys(rows[0]); // real lluminants start from 1 (0 is wavelength)

  //var normE = Array(wlen.length).fill(1).slice(firstIdx, lastIdx + 1);
  var DrawIllu = Array(wlen.length).fill(0.5).slice(firstIdx, lastIdx + 1).filter((element, index) => {
    return index % 2 === 0;
  });
  var t = sampleSPD(unpack(rows, StdIllu[3]).slice(firstIdx, lastIdx + 1), 2);
  var y_data_1 = math.dotDivide(t, Math.max(...t));

  var canvas = document.getElementById("canvasWhite");
  var ctx = canvas.getContext("2d");
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
        duration: 0,
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

  genSelectBox(StdIllu.slice(1), "whiteSel", 'D65');

  registerSelWhite(window.whiteChart, canvas, rows, DrawIllu, firstIdx, lastIdx);
  registerResetZoom('#resetZoomWhite', window.whiteChart);
  registerChartReset('#resetWhite', undefined, window.whiteChart, canvas, 1,
      [Array(wlen.length).fill(0.5).slice(firstIdx, lastIdx + 1).filter((element, index) => {
          return index % 2 === 0;
        }), "#000000"]);

  // 3D plot; RGB trace first, LMS trace second
  var patchPlot = document.getElementById('targetDiv');
  patchPlot.plotted = false;
  registerGenLinSys('#genLinSys', patchPlot);

  // heatmap for color difference
  var colorDiffPlot = document.getElementById('colDiffDiv');
  // chromaticity plot
  var chrmPlot = document.getElementById('chrmDiv');
  registerCalcMat('#calcMatrix', patchPlot, colorDiffPlot, chrmPlot);

  registerChooseCase('#chooseCam', '#genLinSys', '#calcMatrix', '#camSel');
});

function registerChooseCase(id, genLinSys, calcMat, camSel) {
  $(id).on('click', function(evt) {
    $(camSel).val('iPhone12ProMAX').trigger('change');
    $(genLinSys).trigger('click');
    $(calcMat).trigger('click');
  });
}

function convertToMatStr(row) {
  var str = row[0].toFixed(2);
  for (var i = 1; i < row.length; i++) {
    str += "&" + row[i].toFixed(2);
  }

  return str;
}

function registerGenLinSys(buttonId, plot){
  $(buttonId).on('click', function(evt) {
    plotTargets('#plotTargets', plot);

    var RGBMat = [plot.data[0].x, plot.data[0].y, plot.data[0].z];
    var XYZMat = [plot.data[1].x, plot.data[1].y, plot.data[1].z];

    var xyz = "\\small{ \\begin{bmatrix}" +
        convertToMatStr(XYZMat[0]) + "\\\\" +
        convertToMatStr(XYZMat[1]) + "\\\\" +
        convertToMatStr(XYZMat[2]) +
        "\\end{bmatrix} }";
    QUEUE.Push(["Text", equText[0], xyz]);

    var rgb = "\\small{ \\begin{bmatrix}" +
        convertToMatStr(RGBMat[0]) + "\\\\" +
        convertToMatStr(RGBMat[1]) + "\\\\" +
        convertToMatStr(RGBMat[2]) +
        "\\end{bmatrix} }";
    QUEUE.Push(["Text", equText[2], rgb]);

    QUEUE.Push(["Text", equText2[0], $('#whiteSel').val()]);
  });
}

var ccMat;
function registerCalcMat(buttonId, patchPlot, colorDiffPlot, chrmPlot) {
  var calculated = false;
  $(buttonId).on('click', function(evt) {
    var RGBMat = [patchPlot.data[0].x, patchPlot.data[0].y, patchPlot.data[0].z];
    var XYZMat = [patchPlot.data[1].x, patchPlot.data[1].y, patchPlot.data[1].z];

    var M = math.multiply(math.multiply(XYZMat, math.transpose(RGBMat)),
                          math.inv(math.multiply(RGBMat, math.transpose(RGBMat))));
    ccMat = M;

    var cXYZMat = math.multiply(M, RGBMat);

    /* showing that the illuminant isn't perfectly corrected
    var Illu = window.whiteChart.data.datasets[0].data;
    var X = math.dot(Illu, window.camSenChart.data.datasets[6].data);
    var Y = math.dot(Illu, window.camSenChart.data.datasets[7].data);
    var Z = math.dot(Illu, window.camSenChart.data.datasets[8].data);
    var R = math.dot(Illu, window.camSenChart.data.datasets[0].data);
    var G = math.dot(Illu, window.camSenChart.data.datasets[1].data);
    var B = math.dot(Illu, window.camSenChart.data.datasets[2].data);
    var test = math.multiply(M, math.transpose([R, G, B]));
    */

    var text = "\\begin{bmatrix}" +
        M[0][0].toFixed(3) + "&" + M[0][1].toFixed(3) + "&" +  M[0][2].toFixed(3) + "\\\\" +
        M[1][0].toFixed(3) + "&" + M[1][1].toFixed(3) + "&" +  M[1][2].toFixed(3) + "\\\\" +
        M[2][0].toFixed(3) + "&" + M[2][1].toFixed(3) + "&" +  M[2][2].toFixed(3) +
        "\\end{bmatrix}";
    QUEUE.Push(["Text", ccMatText[0], text]);
    QUEUE.Push(["Text", ccMatText[1], $('#camSel').val()]);
    QUEUE.Push(["Text", ccMatText[2], $('#whiteSel').val()]);

    QUEUE.Push(["Text", equText3[2], $('#whiteSel').val()]);
    QUEUE.Push(["Text", camText[0], $('#camSel').val()]);

    if (calculated) {
      var data_update = {'x': [cXYZMat[0]], 'y': [cXYZMat[1]], 'z': [cXYZMat[2]]};

      Plotly.update(patchPlot, data_update, {}, [2]);

      plotColorDiff(colorDiffPlot, XYZMat, cXYZMat, true);
      plotChrm(patchPlot, chrmPlot, true);
      return;
    }

    calculated = true;
    var trace = {
      x: cXYZMat[0],
      y: cXYZMat[1],
      z: cXYZMat[2],
      text: window.ccPatchNames,
      mode: 'markers',
      type: 'scatter3d',
      name: 'XYZ (Corrected)',
      marker: {
        size: 4,
        opacity: 0.8,
        color: magentaColor,
        symbol: Array(window.ccPatchNames.length).fill('diamond'),
      },
      //hoverinfo: 'skip',
      hovertemplate: 'X: %{x}' +
        '<br>Y: %{y}' +
        '<br>Z: %{z}' +
        '<br>name: %{text}<extra></extra>' ,
    };
    Plotly.addTraces(patchPlot, [trace]);
    $('#correctLocus').prop('disabled', false);

    plotColorDiff(colorDiffPlot, XYZMat, cXYZMat, false);

    plotChrm(patchPlot, chrmPlot, false);
  });
}

function toChrm(Tri) {
  var sum = math.add(math.add(Tri[0], Tri[1]), Tri[2]);
  var x = math.dotDivide(Tri[0], sum);
  var y = math.dotDivide(Tri[1], sum);
  var z = math.dotDivide(Tri[2], sum);

  return [x, y, z];
}

function plotChrm(patchPlot, chrmPlot, plotted) {
  // preparing data
  var locusPlot = window.locusPlot;
  var wlen = locusPlot.data[0].text;

  var locusRGBMat = [locusPlot.data[0].x, locusPlot.data[0].y, locusPlot.data[0].z];
  var locusXYZMat = [locusPlot.data[2].x, locusPlot.data[2].y, locusPlot.data[2].z];
  var cLocusXYZMat = math.multiply(window.ccMat, locusRGBMat);

  var cLocusXYZChrm = toChrm(cLocusXYZMat);
  var locusXYZChrm = toChrm(locusXYZMat);

  var patchXYZMat = [patchPlot.data[1].x, patchPlot.data[1].y, patchPlot.data[1].z];
  var cPatchXYZMat = [patchPlot.data[2].x, patchPlot.data[2].y, patchPlot.data[2].z];
  var patchXYZChrm = toChrm(patchXYZMat);
  var cPatchXYZChrm = toChrm(cPatchXYZMat);

  var srgbx = [0.6400, 0.3000, 0.1500];
  var srgby = [0.3300, 0.6000, 0.0600];

  var camRGB = math.multiply(window.ccMat, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  var camGamutChrm = toChrm(camRGB);

  var points = math.transpose(cLocusXYZChrm.slice(0, 2));
  var hullPoints = math.transpose(hull(points, Infinity));

  function findRange(traces) {
    var X = [], Y = [];
    for (var i = 0; i < traces.length; i++) {
      X = X.concat(traces[i].x);
      Y = Y.concat(traces[i].y);
    }

    return [Math.min(0, Math.min(...X)), Math.max(1, Math.max(...X)),
            Math.min(0, Math.min(...Y)), Math.max(1, Math.max(...Y))];
  };

  function obj2Arr(obj) {
    var traces = [];

    for (var i = 0; i < obj.x.length; i++) {
      var trace = {};
      trace.x = obj.x[i];
      trace.y = obj.y[i];
      traces.push(trace);
    }

    return traces;
  };

  // plotting logic
  if (plotted) {
    var data_update = {'x': [cLocusXYZChrm[0], patchXYZChrm[0], cPatchXYZChrm[0],
                             camGamutChrm[0].concat(camGamutChrm[0][0]), hullPoints[0]],
                       'y': [cLocusXYZChrm[1], patchXYZChrm[1], cPatchXYZChrm[1],
                             camGamutChrm[1].concat(camGamutChrm[1][0]), hullPoints[1]]};
    var ranges = findRange(obj2Arr(data_update));
    var layout_update = {
      'xaxis.range': [Math.max(-1, ranges[0]-0.1), Math.min(2, ranges[1]+0.1)],
      'yaxis.range': [Math.max(-1, ranges[2]-0.1), Math.min(2, ranges[3]+0.1)],
    };

    Plotly.update(chrmPlot, data_update, layout_update, [1, 2, 3, 5, 6]);
    return;
  }

  var xyTrace = {
    x: locusXYZChrm[0],//.concat([XYZChrm[0][0]]),
    y: locusXYZChrm[1],//.concat([XYZChrm[1][0]]),
    text: wlen,
    mode: 'lines+markers',
    //mode: 'lines+markers+text',
    //textposition: 'top right',
    //fill: 'toself',
    line: {
      color: blueGreenColor,
      width: 2,
      shape: 'spline',
    },
    name: 'Spectral Locus',
    hovertemplate: 'x: %{x}' +
      '<br>y: %{y}' +
      '<br>wavelength: %{text}<extra></extra>',
  };

  var cxyTrace = {
    x: cLocusXYZChrm[0],//.concat([cXYZChrm[0][0]]),
    y: cLocusXYZChrm[1],//.concat([cXYZChrm[1][0]]),
    text: wlen,
    mode: 'lines+markers',
    //mode: 'lines+markers+text',
    //textposition: 'top right',
    //fill: 'toself',
    line: {
      color: magentaColor,
      width: 2,
      //shape: 'spline',
    },
    name: 'Corrected Spectral Locus',
    hovertemplate: 'x: %{x}' +
      '<br>y: %{y}' +
      '<br>wavelength: %{text}<extra></extra>',
  };

  var pxyTrace = {
    x: patchXYZChrm[0],//.concat([XYZChrm[0][0]]),
    y: patchXYZChrm[1],//.concat([XYZChrm[1][0]]),
    text: window.ccPatchNames,
    mode: 'markers',
    //fill: 'toself',
    marker: {
      size: 6,
      opacity: 0.8,
      color: blueGreenColor,
    },
    line: {
      color: blueGreenColor,
      width: 2,
      shape: 'spline',
    },
    name: 'Patches',
    hovertemplate: 'x: %{x}' +
      '<br>y: %{y}' +
      '<br>name: %{text}<extra></extra>',
  };

  var cpxyTrace = {
    x: cPatchXYZChrm[0],//.concat([cXYZChrm[0][0]]),
    y: cPatchXYZChrm[1],//.concat([cXYZChrm[1][0]]),
    text: window.ccPatchNames,
    mode: 'markers',
    //fill: 'toself',
    marker: {
      size: 6,
      opacity: 0.8,
      color: magentaColor,
    },
    line: {
      color: magentaColor,
      width: 2,
      shape: 'spline',
    },
    name: 'Corrected Patches',
    hovertemplate: 'x: %{x}' +
      '<br>y: %{y}' +
      '<br>name: %{text}<extra></extra>',
  };

  var srgbTrace = {
    x: srgbx.concat(srgbx[0]),
    y: srgby.concat(srgby[0]),
    text: ['sRGB-R', 'sRGB-G', 'sRGB-B', 'sRGB-R'],
    mode: 'lines+markers',
    visible: 'legendonly',
    marker: {
      size: 6,
      opacity: 0.8,
      color: orangeColor,
      symbol: Array(3).fill('diamond'),
    },
    line: {
      color: orangeColor,
      width: 2,
    },
    name: 'sRGB Gamut',
    hovertemplate: 'x: %{x}' +
      '<br>y: %{y}' +
      '<br>name: %{text}<extra></extra>',
  };

  var camGamutTrace = {
    x: camGamutChrm[0].concat(camGamutChrm[0][0]),
    y: camGamutChrm[1].concat(camGamutChrm[1][0]),
    text: ['cam-R', 'cam-G', 'cam-B', 'cam-R'],
    mode: 'lines+markers',
    visible: 'legendonly',
    marker: {
      size: 6,
      opacity: 0.8,
      color: purpleColor,
      symbol: Array(3).fill('diamond'),
    },
    line: {
      color: purpleColor,
      width: 2,
    },
    name: 'Camera RGB Gamut',
    hovertemplate: 'x: %{x}' +
      '<br>y: %{y}' +
      '<br>name: %{text}<extra></extra>',
  };

  var hullTrace = {
    x: hullPoints[0].concat(hullPoints[0][0]),
    y: hullPoints[1].concat(hullPoints[1][0]),
    //text: ['cam-R', 'cam-G', 'cam-B', 'cam-R'],
    mode: 'lines+markers',
    visible: 'legendonly',
    fill: 'toself',
    marker: {
      size: 6,
      opacity: 0.8,
      color: '#000000',
    },
    line: {
      color: '#000000',
      width: 2,
    },
    name: 'Convex Hull of Spectral Locus in Camera',
  };

  var data = [xyTrace, cxyTrace, pxyTrace, cpxyTrace, srgbTrace, camGamutTrace, hullTrace];

  var ranges = findRange(data);
 
  var layout = {
    //title: 'Spectral locus in xy-chromaticity plot',
    height: 600,
    margin: {
      l: 0,
      r: 30,
      b: 30,
      t: 30
    },
    showlegend: true,
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    legend: {
      x: 1,
      xanchor: 'right',
      y: 1,
    },
    xaxis: {
      range: [Math.max(-1, ranges[0]-0.1), Math.min(2, ranges[1]+0.1)],
      title: {
        text: 'x'
      },
      // https://community.plotly.com/t/get-mouses-position-on-click/4145/3
      constrain: 'domain',
      dtick: 0.2,
      zerolinewidth: 3,
    },
    yaxis: {
      range: [Math.max(-1, ranges[2]-0.1), Math.min(2, ranges[3]+0.1)],
      title: {
        text: 'y'
      },
      scaleanchor: 'x',
      dtick: 0.2,
      zerolinewidth: 3,
    }
  };

  var config = {
    toImageButtonOptions: {
      format: 'svg', // one of png, svg, jpeg, webp
      //scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
    }
  };
 
  Plotly.newPlot(chrmPlot, data, layout, config);

  chrmPlot.on('plotly_hover', function (eventdata){
    var point = eventdata.points[0];
    var curveNum = point.curveNumber;
    var pointNum = point.pointNumber;

    if (curveNum <= 1) {
       Plotly.Fx.hover(chrmPlot,[
           { curveNumber:0, pointNumber:pointNum },
           { curveNumber:1, pointNumber:pointNum },
       ]);
    } else if (curveNum <= 3) {
       Plotly.Fx.hover(chrmPlot,[
           { curveNumber:2, pointNumber:pointNum },
           { curveNumber:3, pointNumber:pointNum },
       ]);
    } else {
       Plotly.Fx.hover(chrmPlot,[
           { curveNumber:curveNum, pointNumber:pointNum },
       ]);
    }
  });
}

function plotColorDiff(colorDiffPlot, XYZMat, cXYZMat, plotted) {
  //var xValues = ['0', '1', '2', '3', '4', '5'];
  //var yValues = ['0', '1', '2', '3'];
  var zValues = [];
  var tValues = [];

  for (var i = 0; i < 4; i++) {
    var row = [];
    var tRow = [];
    for (var j = 0; j < 6; j++) {
      var idx = i * 6 + j;
      var gtVal = [XYZMat[0][idx], XYZMat[1][idx], XYZMat[2][idx]];
      var newVal = [cXYZMat[0][idx], cXYZMat[1][idx], cXYZMat[2][idx]];
      row.push(Math.sqrt(Math.pow((newVal[0] - gtVal[0]), 2) + Math.pow((newVal[1] - gtVal[1]), 2) + Math.pow((newVal[2] - gtVal[2]), 2)));
      tRow.push(window.ccPatchNames[idx]);
    }
    zValues.push(row);
    tValues.push(tRow);
  }

  if (plotted) {
    var data_update = {'z': [zValues]};

    Plotly.update(colorDiffPlot, data_update, {}, [0]);
    return;
  }

  var data = [{
    //x: xValues,
    //y: yValues,
    z: zValues,
    customdata: tValues,
    type: 'heatmap',
    colorscale: 'Viridis',
    //showscale: false
    hovertemplate: '%{z}' +
      '<br>name: %{customdata}<extra></extra>' ,
  }];
  
  var layout = {
    title: 'Color Difference in XYZ Space',
    annotations: [],
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    xaxis: {
      ticks: '',
      side: 'top'
    },
    yaxis: {
      ticks: '',
      ticksuffix: ' ',
    }
  };

  Plotly.newPlot(colorDiffPlot, data, layout);
}

function calcTriVal(a, b, c) {
  var s = [];
  for (var i = 0; i < a.length; s[i] = a[i] * b[i], i++);
  return math.dot(s, c);
}

function plotTargets(buttonId, plot) {
  $('#calcMatrix').prop('disabled', false);
  if (!plot.plotted) {
    plotTargetColors(window.ccSpecChart, window.camSenChart, window.whiteChart, plot, false);
    plot.plotted = true;
  } else {
    plotTargetColors(window.ccSpecChart, window.camSenChart, window.whiteChart, plot, true);
  }
}

function plotTargetColors(ccSpec, camSen, stdIllu, plot, update) {
  if (ccSpec == undefined || camSen == undefined || stdIllu == undefined) return;

  var numPatches = ccSpec.data.datasets.length;
  var patchRGB = [[], [], []];
  var patchXYZ = [[], [], []];
  for (var i = 0; i < numPatches; i++) {
    var R = calcTriVal(stdIllu.data.datasets[0].data, ccSpec.data.datasets[i].data, camSen.data.datasets[0].data);
    var G = calcTriVal(stdIllu.data.datasets[0].data, ccSpec.data.datasets[i].data, camSen.data.datasets[1].data);
    var B = calcTriVal(stdIllu.data.datasets[0].data, ccSpec.data.datasets[i].data, camSen.data.datasets[2].data);
    patchRGB[0].push(R);
    patchRGB[1].push(G);
    patchRGB[2].push(B);

    var X = calcTriVal(stdIllu.data.datasets[0].data, ccSpec.data.datasets[i].data, camSen.data.datasets[6].data);
    var Y = calcTriVal(stdIllu.data.datasets[0].data, ccSpec.data.datasets[i].data, camSen.data.datasets[7].data);
    var Z = calcTriVal(stdIllu.data.datasets[0].data, ccSpec.data.datasets[i].data, camSen.data.datasets[8].data);
    patchXYZ[0].push(X);
    patchXYZ[1].push(Y);
    patchXYZ[2].push(Z);
  }

  // update both RGB and XYZ points
  if (update) {
    var data_update = {'x': [patchRGB[0], patchXYZ[0]], 'y': [patchRGB[1], patchXYZ[1]], 'z': [patchRGB[2], patchXYZ[2]]};

    Plotly.update(plot, data_update, {}, [0, 1]);
    return;
  }

  var xyzTrace = {
    x: patchXYZ[0],
    y: patchXYZ[1],
    z: patchXYZ[2],
    text: window.ccPatchNames,
    mode: 'markers',
    marker: {
      size: 4,
      opacity: 0.8,
      color: blueGreenColor,
      //symbol: Array(window.ccPatchNames.length).fill('diamond'),
    },
    hovertemplate: 'X: %{x}' +
      '<br>Y: %{y}' +
      '<br>Z: %{z}' +
      '<br>name: %{text}<extra></extra>',
    type: 'scatter3d',
    name: 'XYZ',
  };

  var rgbTrace = {
    x: patchRGB[0],
    y: patchRGB[1],
    z: patchRGB[2],
    text: window.ccPatchNames,
    mode: 'markers',
    marker: {
      size: 4,
      opacity: 0.8,
      color: purpleColor,
      symbol: Array(window.ccPatchNames.length).fill('diamond'),
    },
    hovertemplate: 'R: %{x}' +
      '<br>G: %{y}' +
      '<br>B: %{z}' +
      '<br>name: %{text}<extra></extra>' ,
    type: 'scatter3d',
    name: 'RGB',
  };

  var data = [rgbTrace, xyzTrace];

  var layout = {
    name: 'ColorChecker',
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
        showspikes: false,
        title: {
          text: 'X/R'
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
          text: 'Y/G'
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
          text: 'Z/B'
        }
      },
    }
  };

  Plotly.newPlot(plot, data, layout);
}

function sampleSPD(spd, stride) {
  var result = [];
  var accuPower = 0;
  for (var i = 0; i < spd.length; i+=stride) {
    for (var j = 0; j < stride && (i+j) < spd.length; j++) {
      accuPower += spd[i+j]
    }
    result.push(accuPower/j);
    accuPower = 0;
  }

  return result;
}

function registerSelWhite(chart, canvas, rows, drawIllu, firstIdx, lastIdx) {
  $('#whiteSel').on('change', function(evt) {
    var val = this.value;
    if (val == "Custom") {
      $('#resetWhite').prop('disabled', false);

      chart.data.datasets[0].data = drawIllu;
      registerDrag(canvas, chart, undefined, true, []);
    } else {
      $('#resetWhite').prop('disabled', true);

      var illu = unpack(rows, val);
      var sampledIllu = sampleSPD(illu.slice(firstIdx, lastIdx + 1), 2);
      var normIllu = math.dotDivide(sampledIllu, Math.max(...sampledIllu));
      chart.data.datasets[0].data = normIllu;

      toggleDrag(canvas, false);
    }
    chart.update();
  });
}
