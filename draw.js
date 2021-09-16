// https://stackoverflow.com/questions/60678586/update-x-and-y-values-of-a-trace-using-plotly-update
function updateLocus(ConeL, ConeM, ConeS) {
  var layout_update = {
    title: (ConeL == window.dConeL) ? 'Updated spectral locus in LMS cone space' : 'Spectral locus in LMS cone space',
  };
  var data_update = {'x': [ConeL], 'y': [ConeM], 'z': [ConeS]};

  var lmsPlot = document.getElementById('lmsDiv');
  Plotly.update(lmsPlot, data_update, layout_update, [0]);
}

d3.csv('linss2_10e_5.csv', function(err, rows){
  var stride = 5;
  function unpack(rows, key) {
    return rows.map(function(row) {
        return parseFloat(row[key]);
      });
  }

  function calcTriVals() {
    var triR = math.dot(y_data_1, CMFR);
    var triG = math.dot(y_data_1, CMFG);
    var triB = math.dot(y_data_1, CMFB);
  
    var point = {
      x: [triR],
      y: [triG],
      z: [triB],
      mode: 'markers',
      marker: {
        size: 4,
        opacity: 0.8
      },
      type: 'scatter3d',
      name: 'color',
    };
  
    Plotly.addTraces('lmsDiv', point);
  }

  // points to the cone arrays that will be used to plot the chart;
  window.dConeL = unpack(rows, 'l');
  window.dConeM = unpack(rows, 'm');
  window.dConeS = unpack(rows, 's');
  // contains the original cone data; used in reset;
  window.ConeL = [...window.dConeL];
  window.ConeM = [...window.dConeM];
  window.ConeS = [...window.dConeS];

  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var nWavelen = (lastW - firstW)/stride + 1;

  // LMS plot
  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);
  var y_data_1 = window.dConeL;
  var y_data_2 = window.dConeM;
  var y_data_3 = window.dConeS;
  //var y_data_2 = Array.apply(0, Array(81)).map(function() { return 1.1; });

  function range(start, end, stride) {
    return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
  }

  // globals
  var activePoint = null;
  var canvas = null;
 
  // draw a line chart on the canvas context
  var ctx = document.getElementById("canvasLMS").getContext("2d");
  canvas = document.getElementById("canvasLMS");
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
      }
    }
  });
  
  // set pointer event handlers for canvas element
  canvas.onpointerdown = down_handler;
  canvas.onpointerup = up_handler;
  canvas.onpointermove = null;
  //canvas.onpointermove = move_handler;

  var selectedTrace;

  function down_handler(event) {
    // get the intersecting data point
    const points = window.myChart.getElementsAtEventForMode(event, 'nearest', {intersect: true});
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
      updateLocus(window.dConeL, window.dConeM, window.dConeS);
    }
  };
 
  function move_handler(event)
  {
    // if an intersecting data point is grabbed
    if (activePoint != null) {
      // then get the points on the selectedTrace
      const points = window.myChart.getElementsAtEventForMode(event, 'index', {intersect: false});
      for (var i = 0; i < points.length; i++) {
        if (points[i].datasetIndex == selectedTrace) {
          var point = points[i];
          var data = window.myChart.data;
          
          var datasetIndex = point.datasetIndex;
  
          // read mouse position
          const helpers = Chart.helpers;
          var position = helpers.getRelativePosition(event, window.myChart);
  
          // convert mouse position to chart y axis value 
          var chartArea = window.myChart.chartArea;
          var yAxis = window.myChart.scales.yAxes;
          var yValue = map(position.y, chartArea.bottom, chartArea.top, yAxis.min, yAxis.max);
  
          // update y value of active data point
          data.datasets[datasetIndex].data[point.index] = yValue;
          window.myChart.update();
        }
      }
    } else {
      //const points = window.myChart.getElementsAtEventForMode(event, 'index', {intersect: true});
      //if (points.length > 0) {
      //  var activePoint = points[0];
      //  x = activePoint.element.x;
      //  topY = window.myChart.legend.bottom;
      //  bottomY = window.myChart.chartArea.bottom;
      //  // draw line
      //  //ctx.save();
      //  ctx.beginPath();
      //  ctx.moveTo(x, topY);
      //  ctx.lineTo(x, bottomY);
      //  ctx.lineWidth = 2;
      //  ctx.strokeStyle = '#07C';
      //  ctx.stroke();
      //  //ctx.restore();
      //};
    }
  };

  // map value to other coordinate system
  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
  };

  // the spectral locus
  trace = {
    x: window.dConeL,
    y: window.dConeM,
    z: window.dConeS,
    text: wlen,
    mode: 'lines+markers',
    marker: {
      size: 4,
      opacity: 0.8,
      color: '#888888'
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
    //height: 600,
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


function lmsReset() {
  // do a value copy here!
  window.myChart.data.datasets[0].data = Array.from(window.ConeL);
  window.myChart.data.datasets[1].data = Array.from(window.ConeM);
  window.myChart.data.datasets[2].data = Array.from(window.ConeS);
  window.myChart.update();
  updateLocus(window.ConeL, window.ConeM, window.ConeS);
  // the window.dXXX arrays have to be sharing the same reference as the chart's data arrays
  window.dConeL = window.myChart.data.datasets[0].data;
  window.dConeM = window.myChart.data.datasets[1].data;
  window.dConeS = window.myChart.data.datasets[2].data;
}

function resetZoom() {
  window.myChart.resetZoom();
}



var trace;
var cTrace;
var transRgTrace;
var transXyPoints;
var xyzPoints;

var CMFR = [];
var CMFG = [];
var CMFB = [];

var selectX = [];
var selectY = [];
var selectZ = [];
var count = 0;

//d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/3d-scatter.csv', function(err, rows){
d3.csv('cie1931rgbcmf.csv', function(err, rows){
  function unpack(rows, key) {
    return rows.map(function(row) {
        return parseFloat(row[key]);
      });
  }

  // the RGB CMF
  // points to the cone arrays that will be used to plot the chart;
  window.dCMFR = unpack(rows, 'r');
  window.dCMFG = unpack(rows, 'g');
  window.dCMFB = unpack(rows, 'b');
  // contains the original cone data; used in reset;
  window.CMFR = [...window.dCMFR];
  window.CMFG = [...window.dCMFG];
  window.CMFB = [...window.dCMFB];

  var stride = 5;
  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var nWavelen = (lastW - firstW)/stride + 1;

  // https://stackoverflow.com/questions/43757979/chart-js-drag-points-on-linear-chart/48062137
  var x_data = range(firstW, lastW, stride);
  var y_data_1 = window.dCMFR;
  var y_data_2 = window.dCMFG;
  var y_data_3 = window.dCMFB;

  function range(start, end, stride) {
    return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
  }

  // globals
  var activePoint = null;
  var canvas = null;
 
  // draw a line chart on the canvas context
  var ctx = document.getElementById("canvasCMF").getContext("2d");
  canvas = document.getElementById("canvasCMF");
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
      }
    }
  });
  //Chart.defaults.plugins.title.display = true;
  //Chart.defaults.plugins.title.text = 'asdf';
  
  // set pointer event handlers for canvas element
  canvas.onpointerdown = down_handler;
  canvas.onpointerup = up_handler;
  canvas.onpointermove = null;
  //canvas.onpointermove = move_handler;

  var selectedTrace;

  function down_handler(event) {
    // get the intersecting data point
    const points = window.cmfChart.getElementsAtEventForMode(event, 'nearest', {intersect: true});
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
      updateLocus(window.dConeL, window.dConeM, window.dConeS);
    }
  };
 
  function move_handler(event)
  {
    // if an intersecting data point is grabbed
    if (activePoint != null) {
      // then get the points on the selectedTrace
      const points = window.cmfChart.getElementsAtEventForMode(event, 'index', {intersect: false});
      for (var i = 0; i < points.length; i++) {
        if (points[i].datasetIndex == selectedTrace) {
          var point = points[i];
          var data = window.cmfChart.data;
          
          var datasetIndex = point.datasetIndex;
  
          // read mouse position
          const helpers = Chart.helpers;
          var position = helpers.getRelativePosition(event, cmfChart);
  
          // convert mouse position to chart y axis value 
          var chartArea = window.cmfChart.chartArea;
          var yAxis = window.cmfChart.scales.yAxes;
          var yValue = map(position.y, chartArea.bottom, chartArea.top, yAxis.min, yAxis.max);
  
          // update y value of active data point
          data.datasets[datasetIndex].data[point.index] = yValue;
          window.cmfChart.update();
        }
      }
    }
  };

  // map value to other coordinate system
  function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
  };


  // the RGB spectral locus
  CMFR = unpack(rows, 'r');
  CMFG = unpack(rows, 'g');
  CMFB = unpack(rows, 'b');
  
  var dict = {};
  var cR = []; // chromaticity
  var cG = [];
  var cB = [];

  for (var i = 0; i < rows.length; i++) {
    dict[rows[i].wavelength] = i;
    var r = parseFloat(rows[i].r);
    var g = parseFloat(rows[i].g);
    var b = parseFloat(rows[i].b);
  
    cR[i] = r / (r + g + b);
    cG[i] = g / (r + g + b);
    cB[i] = b / (r + g + b);
  }
 
  trace = {
    x:unpack(rows, 'r'), y: unpack(rows, 'g'), z: unpack(rows, 'b'),
    text:unpack(rows, 'wavelength'),
    mode: 'lines+markers',
    marker: {
      size: 4,
      opacity: 0.8
    },
    type: 'scatter3d',
    name: 'spectral locus',
  };
  
  cTrace = {
    x: cR,
    y: cG,
    z: cB,
    text: unpack(rows, 'wavelength'),
    mode: 'lines+markers',
    marker: {
      size: 4,
      //line: {
      //  color: 'rgba(120, 120, 120, 0.4)',
      //  width: 0.5
      //},
      opacity: 0.8
    },
    type: 'scatter3d',
    name: 'spectral locus',
  };

  var Cx = [1.27, -1.74, -0.74, 1.27];
  var Cy = [-0.28, 2.77, 0.14, -0.28];
  var Cz = [0.0028, -0.028, 1.60, 0.0028];
  var transM = [[2.767979095, 1.751171684, 1.129776839],
                [0.9978469789, 4.589269432, 0.05917362973],
                [-0.00002643740975, 0.05648972672, 5.594123569]];
  var transRGB = math.multiply(transM, [unpack(rows, 'r'), unpack(rows, 'g'), unpack(rows, 'b')]);
  var sumTransRGB = math.add(math.add(transRGB[0], transRGB[1]), transRGB[2]);

  xyzPoints = {
    x: Cx,
    y: Cy,
    z: Cz,
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
 
  var data = [trace];
 
  var layout = {
    //height: 800,
    //width: 1200,
    showlegend: true,
    margin: {
      l: 100,
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
  
  var triangle = {
    type: 'mesh3d',
    x:unpack(rows, 'r'), y: unpack(rows, 'g'), z: unpack(rows, 'b'),
    i: [dict[425]],
    j: [dict[510]],
    k: [dict[590]],
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

  // the rg-chromaticity plot
  var rgTrace = {
    x: cR,
    y: cG,
    text:unpack(rows, 'wavelength'),
    mode: 'lines+markers',
    connectgaps: true,
    line: {simplify: false},
    name: 'spectral locus',
  };
 
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

// will be instantaneous, since animation applies to 2d plots.
function RGB2rgb() {
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
}
 
function addXYZPrimaries() {
  Plotly.addTraces('rgbDiv', [xyzPoints])
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

