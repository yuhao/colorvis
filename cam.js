var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var greyColor = '#888888';
var brightYellowColor = '#fcd303'; 
var oRedColor = 'rgba(218, 37, 0, 0.3)';
var oGreenColor = 'rgba(0, 143, 0, 0.3)';
var oBlueColor = 'rgba(1, 25, 147, 0.3)';

// https://docs.mathjax.org/en/v2.1-latest/typeset.html
var QUEUE = MathJax.Hub.queue; // shorthand for the queue
var text1Jax, text2Jax, text4Jax;
var allJax, cmfJax;

// https://stackoverflow.com/questions/60678586/update-x-and-y-values-of-a-trace-using-plotly-update
function updateLocus(seq1, seq2, seq3, newTitle, plot) {
  var layout_update = {
    //title: newTitle,
  };
  var data_update = {'x': [seq1], 'y': [seq2], 'z': [seq3]};

  //var plot = document.getElementById(id);
  Plotly.update(plot, data_update, layout_update, [0]);
}

function highlightLocus(index, id, baseColors, baseColors2) {
  // https://community.plotly.com/t/how-to-link-hover-event-in-2d-scatter-to-3d-scatter/3548/2
  // Fx.hover fires only for 2d plots for now, so can't use it
  var plot = document.getElementById(id);
  var colors = Array.from(baseColors);
  colors[index] = brightYellowColor;
  // rather than 'marker': {color: colors}, which uses defaults for all other parameters
  var update = {'marker.color': [colors]};
  Plotly.restyle(plot, update, [1]);

  colors = Array.from(baseColors2);
  colors[index] = brightYellowColor;
  // rather than 'marker': {color: colors}, which uses defaults for all other parameters
  var update = {'marker.color': [colors]};
  Plotly.restyle(plot, update, [0]);
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
    var plot = document.getElementById(plotId);
    updateLocus(resetData1, resetData2, resetData3, title, plotId);
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
        var plot = document.getElementById(plotId);
        updateLocus(seq0, seq1, seq2, title, plot);
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

d3.csv('ccspec.csv', function(err, rows){
  var stride = 10;

  var wlen = unpack(rows, 'Wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var patches = Object.keys(rows[0]);

  var specR = [];
  var chartTraces = [];

  var x_data = range(firstW, lastW, stride);

  for (var i = 1; i < patches.length; i++) {
    specR[i-1] = unpack(rows, patches[i]);
    var trace = {
      data: specR[i-1],
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
        duration: 10
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
        tooltip: {
          //callbacks: {
          //  labelTextColor: function(context) {
          //    if (context.datasetIndex == 0) highlightLocus(context.dataIndex, 'lmsDiv', lmsLocusMarkerColors);
          //    return '#FFFFFF';
          //  }
          //},
        }
      }
    }
  });

  registerResetZoom('#resetZoomSpecR', window.ccSpecChart);
});

function genSelectBox(values) {
  var select = document.getElementById("camSel");

  for (const val of values)
  {
    var option = document.createElement("option");
    option.value = val;
    option.text = val;
    select.appendChild(option);
  }
}

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

  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);

  var chartTraces = [];

  var rTrace = {
    data: unpack(rCamSpec, cams[1]),
    label: 'R Filter',
    fill: false,
    pointHoverRadius: 10,
    pointBackgroundColor: redColor,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    backgroundColor: oRedColor,
    pointRadius: 5,
    borderWidth: 1,
  }
  var gTrace = {
    data: unpack(gCamSpec, cams[1]),
    label: 'G Filter',
    fill: false,
    pointHoverRadius: 10,
    pointBackgroundColor: greenColor,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    backgroundColor: oGreenColor,
    pointRadius: 5,
    borderWidth: 1,
  }
  var bTrace = {
    data: unpack(bCamSpec, cams[1]),
    label: 'B Filter',
    fill: false,
    pointHoverRadius: 10,
    pointBackgroundColor: blueColor,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    backgroundColor: oBlueColor,
    pointRadius: 5,
    borderWidth: 1,
  }
  chartTraces.push(rTrace, gTrace, bTrace);

  d3.csv('linss2_10e_5.csv', function(err, rows){
    var stride = 5;

    var wlen = unpack(rows, 'wavelength');
    var firstW = wlen[0];
    var lastW = wlen[wlen.length - 1];

    var lCone = unpack(rows, 'l').slice((400-firstW)/stride, (720-firstW)/stride+1).filter((element, index) => {
      return index % 2 === 0;
    });
    var mCone = unpack(rows, 'm').slice((400-firstW)/stride, (720-firstW)/stride+1).filter((element, index) => {
      return index % 2 === 0;
    });
    var sCone = unpack(rows, 's').slice((400-firstW)/stride, (720-firstW)/stride+1).filter((element, index) => {
      return index % 2 === 0;
    });
    wlen = wlen.slice((400-firstW)/stride, (720-firstW)/stride+1).filter((element, index) => {
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

    var lmsLocusMarkerColors = Array(wlen.length).fill(greyColor);
    var rgbLocusMarkerColors = Array(wlen.length).fill(redColor);

    var canvas = document.getElementById("canvasCamSpace");
    var ctx = canvas.getContext("2d");
    window.camSenChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: x_data,
        datasets: chartTraces,
      },
      options: {
        animation: {
          duration: 10
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
            text: 'Camera Spectral Sensitivity',
            font: {
              size: 20,
              family: 'Helvetica Neue',
            },
          },
          legend: {
            position: 'top',
            display: false,
          },
          tooltip: {
            callbacks: {
              labelTextColor: function(context) {
                if (context.datasetIndex == 0) {
                  highlightLocus(context.dataIndex, 'locusDiv', lmsLocusMarkerColors, rgbLocusMarkerColors);
                }
                return '#FFFFFF';
              }
            },
          }
        }
      }
    });

    var plot = plotSpectralLocus(lCone, mCone, sCone, wlen,
        unpack(rCamSpec, cams[1]), unpack(gCamSpec, cams[1]), unpack(bCamSpec, cams[1]));

    genSelectBox(cams.slice(1));
    registerSelCam(window.camSenChart, canvas, plot, rCamSpec, gCamSpec, bCamSpec);

  });
});

function plotSpectralLocus(lCone, mCone, sCone, wlen, rCam, gCam, bCam) {
  var lmsLocusMarkerColors = Array(wlen.length).fill(greyColor);
  var lmsTrace = {
    x: lCone,
    y: mCone,
    z: sCone,
    text: wlen,
    mode: 'lines+markers',
    marker: {
      size: 6,
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

  var rgbLocusMarkerColors = Array(wlen.length).fill(redColor);
  var rgbTrace = {
    x: rCam,
    y: gCam,
    z: bCam,
    text: wlen,
    mode: 'lines+markers',
    marker: {
      size: 6,
      opacity: 0.8,
      color: rgbLocusMarkerColors,
      symbol: Array(wlen.length).fill('diamond'),
    },
    line: {
      color: redColor,
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

  var data = [rgbTrace, lmsTrace];
 
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
      //aspectmode: 'cube',
      xaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
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
        zerolinecolor: '#000000',
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
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'S'
        }
      },
    }
  };

  var plot = document.getElementById('locusDiv');
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function registerSelCam(chart, canvas, plot, rCamSpec, gCamSpec, bCamSpec) {
  $('#camSel').on('change', function(evt) {
    var val = this.value;
    if (val == "Draw") {
      registerDrag(canvas, chart, '');
      chart.data.datasets[0].data = draw;
    } else {
      toggleDrag(canvas, false);
      chart.data.datasets[0].data = unpack(rCamSpec, val);
      chart.data.datasets[1].data = unpack(gCamSpec, val);
      chart.data.datasets[2].data = unpack(bCamSpec, val);

      updateLocus(chart.data.datasets[0].data, chart.data.datasets[1].data, chart.data.datasets[2].data, '', plot);
    }
    chart.update();
  });
}
