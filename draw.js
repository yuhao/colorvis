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
 
function test() {
}

function unpack(rows, key) {
  return rows.map(function(row) {
      return parseFloat(row[key]);
    });
}

//function calcTriVals() {
//  var triR = math.dot(y_data_1, CMFR);
//  var triG = math.dot(y_data_1, CMFG);
//  var triB = math.dot(y_data_1, CMFB);
//
//  var point = {
//    x: [triR],
//    y: [triG],
//    z: [triB],
//    mode: 'markers',
//    marker: {
//      size: 4,
//      opacity: 0.8
//    },
//    type: 'scatter3d',
//    name: 'color',
//  };
//
//  Plotly.addTraces('lmsDiv', point);
//}

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
    var title = (buttonId == '#resetChartLMS') ? 'Spectral locus in LMS cone space' : 'Spectral locus in CIE 1931 RGB space';
    updateLocus(resetData1, resetData2, resetData3, title, plotId);
  });
}

function registerDrag(canvas, chart, id) {
  var activePoint = null;

  // set pointer event handlers for canvas element
  canvas.onpointerdown = down_handler;
  canvas.onpointerup = up_handler;
  canvas.onpointermove = null;
  //canvas.onpointermove = move_handler;

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
          'Updated spectral locus in CIE 1931 RGB space';
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
    } else {
      //const points = chart.getElementsAtEventForMode(event, 'index', {intersect: false}, true);
      ////const points = chart.getElementsAtEventForMode(event, 'nearest', {intersect: false}, true);
      //if (points.length > 0) {
      //  var activePoint = points[0];
      //  x = activePoint.element.x;
      //  topY = chart.legend.bottom;
      //  bottomY = chart.chartArea.bottom;
      //  // draw line
      //  ctx.save();
      //  ctx.beginPath();
      //  ctx.moveTo(x, topY);
      //  ctx.lineTo(x, bottomY);
      //  ctx.lineWidth = 2;
      //  ctx.strokeStyle = '#07C';
      //  ctx.stroke();
      //  ctx.restore();
      //};
    }
  };

  // map value to other coordinate system
  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
  };
}

d3.csv('linss2_10e_5.csv', function(err, rows){
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

  d3.csv('ciesi.csv', function(err_sidata, sidata){
    // LMS plot
    // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
    var x_data = range(firstW, lastW, stride);
    var y_data_1 = dConeL;
    var y_data_2 = dConeM;
    var y_data_3 = dConeS;

    function range(start, end, stride) {
      return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
    }

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
            //yAxisID: 'rightYAxis',
            label: "L Cone",
            borderColor: "#da2500",
            fill: false,
            pointHoverRadius: 10,
          },
          {
            data: y_data_2,
            //yAxisID: 'rightYAxis',
            label: "M Cone",
            borderColor: "#008f00",
            fill: false,
            pointHoverRadius: 10,
          },
          {
            data: y_data_3,
            //yAxisID: 'rightYAxis',
            label: "S Cone",
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
          yAxes:{
            min: 0,
            max: 1,
            position: 'left',
          },
          rightYAxis: {
            min: 0,
            max: 0.5,
            position: 'right',
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
            text: '2-deg fundamentals based on the Stiles & Burch 10-deg CMFs (adjusted to 2-deg; Stockman & Sharpe (2000); normalized)',
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
  });

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
    showlegend: true,
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
});






var transRgTrace;
var transXyPoints;

var selectX = [];
var selectY = [];
var selectZ = [];
var count = 0;

d3.csv('cie1931rgbcmf.csv', function(err, rows){
  // the RGB CMF
  // points to the cmf arrays that will be used to plot the chart;
  dCMFR = unpack(rows, 'r');
  dCMFG = unpack(rows, 'g');
  dCMFB = unpack(rows, 'b');
  // contains the original cmf data; used in reset;
  window.CMFR = [...dCMFR];
  window.CMFG = [...dCMFG];
  window.CMFB = [...dCMFB];

  var stride = 5;
  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];

  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);
  var y_data_1 = dCMFR;
  var y_data_2 = dCMFG;
  var y_data_3 = dCMFB;

  function range(start, end, stride) {
    return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
  }

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
          //yAxisID: 'rightYAxis',
          label: "R",
          borderColor: "#da2500",
          fill: false,
          pointHoverRadius: 10,
        },
        {
          data: y_data_2,
          //yAxisID: 'rightYAxis',
          label: "G",
          borderColor: "#008f00",
          fill: false,
          pointHoverRadius: 10,
        },
        {
          data: y_data_3,
          //yAxisID: 'rightYAxis',
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
        yAxes:{
          min: -0.1,
          max: 0.4,
          position: 'left',
        },
        rightYAxis: {
          min: 0,
          max: 0.5,
          position: 'right',
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
          text: 'CIE 1931 RGB Color Matching Functions',
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

  registerDrag(canvas, window.cmfChart, 'rgbDiv');
  registerResetZoom('#resetZoomRGB', window.cmfChart);
  registerChartReset('#resetChartRGB', 'rgbDiv', window.cmfChart, window.CMFR, window.CMFG, window.CMFB);

  // the RGB spectral locus
  var rgbLocusMarkerColors = Array(wlen.length).fill('#888888');
  var trace = {
    x: dCMFR, y: dCMFG, z: dCMFB,
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
    //showlegend: true,
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 100
    },
    title: 'Spectral locus in CIE 1931 RGB color space',
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
    var pn = data.points[0].pointNumber;
    selectX[count] = data.points[0].data.x[pn];
    selectY[count] = data.points[0].data.y[pn];
    selectZ[count] = data.points[0].data.z[pn];
    count++;
    if (count == 3) {
      var trianglePoints = {
        x: selectX.concat([selectX[0]]),
        y: selectY.concat([selectY[0]]),
        z: selectZ.concat([selectZ[0]]),
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
      Plotly.addTraces('rgbDiv', trianglePoints);
    }
  });

  // RGB to rgb chromaticity plot
  registerRGB2rgb('#RGB2rgb', window.cmfChart, wlen, rgbLocusMarkerColors);

  // rgb to RGB plot
  registerrgb2RGB('#rgb2RGB', window.cmfChart, wlen, rgbLocusMarkerColors);

  // add XYZ primaries in chromaticities to the rgb chromaticity plot
  registerAddXYZChrm('#addXYZChrm');




  // rg-chromaticity plot
  var rgTrace = {
    x: cR,
    y: cG,
    text:unpack(rows, 'wavelength'),
    mode: 'lines+markers',
    connectgaps: true,
    line: {simplify: false},
    name: 'spectral locus in rg',
  };
 
  var transM = [[2.767979095, 1.751171684, 1.129776839],
                [0.9978469789, 4.589269432, 0.05917362973],
                [-0.00002643740975, 0.05648972672, 5.594123569]];
  var transRGB = math.multiply(transM, [unpack(rows, 'r'), unpack(rows, 'g'), unpack(rows, 'b')]);
  var sumTransRGB = math.add(math.add(transRGB[0], transRGB[1]), transRGB[2]);

  transRgTrace = {
    x: math.dotDivide(transRGB[0], sumTransRGB),
    y: math.dotDivide(transRGB[1], sumTransRGB),
    mode: 'lines+markers',
    connectgaps: true,
    line: {simplify: false},
  };
 
  var xyPoints = {
    x: Cx,
    y: Cy,
    mode: 'lines+markers',
    marker: {
      size: 8,
      line: {
        color: '#000000',
        width: 1
      },
      opacity: 0.8
    },
    name: 'XYZ primaries',
  };
 
  transXyPoints = {
    x: [1, 0, 0, 1],
    y: [0, 1, 0, 0],
    mode: 'lines+markers',
    marker: {
      size: 8,
      line: {
        color: '#000000',
        width: 1
      },
      opacity: 0.8
    },
  };
 
  data = [rgTrace, xyPoints];
 
  var layout = {
    width: 600,
    height: 600,
    title: 'Spectral locus in CIE 1931 rg-chromaticity plot',
    showlegend: true,
    xaxis: {
      title: {
        text: 'r'
      }
    },
    yaxis: {
      title: {
        text: 'g'
      }
    }
  };

  Plotly.newPlot('2dDiv', data, layout);
  
});

function registerrgb2RGB(id, chart, wlen, rgbLocusMarkerColors) {
  $(id).on('click', function(evt) {
    $('#addXYZChrm').prop('disabled', true);

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
        title: 'Spectral locus in CIE 1931 RGB color space',
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
        title: 'Spectral locus in CIE 1931 rgb chromaticity plot',
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

function registerAddXYZChrm(id) {
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
    // TODO: more general?
    Plotly.addTraces('rgbDiv', [xyzPoints]);
    // don't keep adding points
    $(id).prop('disabled', true);
  });
}

function rgb2xyz() {
  Plotly.animate('2dDiv', {
    data: [transRgTrace, transXyPoints],
    traces: [0, 1],
    layout: {
      title: 'Spectral locus in CIE 1931 xy-chromaticity plot',
      xaxis: {
        title: {
          text: 'x'
        }
      },
      yaxis: {
        title: {
          text: 'y'
        }
      }
    }
  }, {
    transition: {
      duration: 500,
      easing: 'cubic-in-out'
    },
  });
}

function zoom() {
  Plotly.animate('2dDiv', {
    layout: {
      xaxis: {range: [0, 1]},
      yaxis: {range: [0, 1]},
    }
  }, {
    transition: {
      duration: 500,
      easing: 'cubic-in-out'
    },
  })
}

//Vertical line
//$(document).ready(function(){
//    $("#canvasLMS").on("mousemove", function(evt) {
//        var element = $("#cursor"), 
//        //var element = $("#canvasLMS"), 
//        offsetLeft = element.offset().left,
//        domElement = element.get(0),
//        clientX = parseInt(evt.clientX - offsetLeft),
//        ctx = element.get(0).getContext('2d');
//
//        ctx.clearRect(0, 0, domElement.width, domElement.height),
//        ctx.beginPath(),
//        ctx.moveTo(clientX, 0),
//        ctx.lineTo(clientX, domElement.height),
//        //ctx.lineWidth = 1;
//        //ctx.strokeStyle = 'blue';
//        ctx.stroke()
//    });
//});
