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
        return row[key];
      });
  }

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
    //x: Cx.map(function(item) {return item/(Cx.reduce((a, b) => a + b, 0))}),
    //y: Cx.map(function(item) {return item/(Cy.reduce((a, b) => a + b, 0))}),
    //z: Cx.map(function(item) {return item/(Cz.reduce((a, b) => a + b, 0))}),
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
    height: 800,
    width: 1200,
    showlegend: true,
    margin: {
      l: 150,
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

  Plotly.newPlot('myDiv', data, layout);

  var myPlot = document.getElementById('myDiv');
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
      Plotly.addTraces('myDiv', trianglePoints);
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
  Plotly.animate('myDiv', {
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
  Plotly.addTraces('myDiv', [xyzPoints])
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

  Plotly.addTraces('myDiv', point);
}

// SPD plot
var x_data = range(380, 780, 5);
var y_data_1 = Array.apply(0, Array(81)).map(function() { return 0; });
//var y_data_2 = Array.apply(0, Array(81)).map(function() { return 1.1; });

function range(start, end, stride) {
  return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*5)
}

// globals
var activePoint = null;
var canvas = null;
//var myChart;

// draw a line chart on the canvas context
window.onload = function () {
    // Draw a line chart with two data sets
    var ctx = document.getElementById("canvas").getContext("2d");
    canvas = document.getElementById("canvas");
    window.myChart = Chart.Line(ctx, {
    //myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: x_data,
            datasets: [
                {
                    data: y_data_1,
                    label: "Data 1",
                    borderColor: "#3e95cd",
                    fill: false
                },
                //{
                //    data: y_data_2,
                //    label: "Data 2",
                //    borderColor: "#cd953e",
                //    fill: false
                //}
            ]
        },
        options: {
          animation: {
            duration: 0
          },
          tooltips: {
            mode: 'nearest'
          },
          scales: {
            yAxes: [{
              ticks: {
                min: 0,
                max: 1
              }
            }]
          }
        }
    });

    // set pointer event handlers for canvas element
    canvas.onpointerdown = down_handler;
    canvas.onpointerup = up_handler;
    canvas.onpointermove = null;
};

function down_handler(event) {
    // check for data point near event location
    const points = window.myChart.getElementAtEvent(event, {intersect: false});
    if (points.length > 0) {
        // grab nearest point, start dragging
        activePoint = points[0];
        canvas.onpointermove = move_handler;
    };
};

function up_handler(event) {
    // release grabbed point, stop dragging
    activePoint = null;
    canvas.onpointermove = null;
    //rgb2xyz();
    calcTriVals();
};

function move_handler(event)
{
    // locate grabbed point in chart data
    if (activePoint != null) {
        var data = activePoint._chart.data;
        var datasetIndex = activePoint._datasetIndex;

        // read mouse position
        const helpers = Chart.helpers;
        var position = helpers.getRelativePosition(event, myChart);

        // convert mouse position to chart y axis value 
        var chartArea = window.myChart.chartArea;
        var yAxis = window.myChart.scales["y-axis-0"];
        var yValue = map(position.y, chartArea.bottom, chartArea.top, yAxis.min, yAxis.max);

        // update y value of active data point
        data.datasets[datasetIndex].data[activePoint._index] = yValue;
        window.myChart.update();
    };
};

// map value to other coordinate system
function map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))
};
