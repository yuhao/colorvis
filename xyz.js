var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var greyColor = '#888888';
var purpleColor = '#5c32a8';
var magentaColor = '#fc0377';
var cyanColor = '#42f5e6';
var yellowColor = '#f5d442';
var brightYellowColor = '#fcd303'; 
var orangeColor = '#DC7B2E';
var blueGreenColor = '#63BFAB'; 
var oRedColor = 'rgba(218, 37, 0, 0.3)';
var oGreenColor = 'rgba(0, 143, 0, 0.3)';
var oBlueColor = 'rgba(1, 25, 147, 0.5)';

// https://docs.mathjax.org/en/v2.1-latest/typeset.html
var QUEUE = MathJax.Hub.queue; // shorthand for the queue
var transMatText;
QUEUE.Push(function () {
  transMatText = MathJax.Hub.getAllJax('mat');
});

function unpack(rows, key, toNum) {
  return rows.map(function(row) {
      if (toNum == false) return row[key];
      else return parseFloat(row[key]);
    });
}

function range(start, end, stride) {
  return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
}

function registerChartReset(buttonId, plotId, chart, canvas, traces, resetData, fn) {
  $(buttonId).on('click', function(evt) {
    // reset chart.js (2d)
    // do a value copy here so that future updates to the chart won't affect the original data

    for (var i = 0; i < traces.length; i++) {
      var traceId = traces[i];
      var newData = resetData[i];
      var length = newData[0].length;
      // https://stackoverflow.com/questions/597588/how-do-you-clone-an-array-of-objects-in-javascript
      chart.data.datasets[traceId].data = newData[0].map(a => ({...a}));
      var traceColor = newData[1];
      chart.data.datasets[traceId].pointBackgroundColor = newData[1];
      chart.data.datasets[traceId].borderColor = newData[2];
    }

    chart.update();

    if (fn != undefined) fn();
  });
}

function plotRGB(plotId, wlen) {
  var locus = {
    x: CMFR,
    y: CMFG,
    z: CMFB,
    text: wlen,
    type: 'scatter3d',
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
    //hoverinfo: 'skip',
    hovertemplate: 'R: %{x}' +
      '<br>G: %{y}' +
      '<br>B: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    name: 'Spectral locus',
  };

  var data = [locus];

  var layout = {
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 40
    },
    showlegend: true,
    legend: {
      x: 0.1,
      xanchor: 'left',
      y: 1,
    },
    title: 'CIE 1931 RGB color space',
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
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        constrain: 'domain',
        dtick: 0.1,
        showspikes: false,
        title: {
          text: 'R'
        }
      },
      yaxis: {
        autorange: true,
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'G'
        }
      },
      zaxis: {
        autorange: true,
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'B'
        }
      },
    }
  };
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function plotXYZPrims(plot, prims) {
  var X = prims[0];
  var Y = prims[1];
  var Z = prims[2];
  var XY = math.add(X, Y);
  var XZ = math.add(X, Z);
  var YZ = math.add(Y, Z);

  var points = [X, Y, Z];
  var traces = [];

  var span = {
    x: [0, X[0], Y[0], Z[0], XY[0], XZ[0], YZ[0]],
    y: [0, X[1], Y[1], Z[1], XY[1], XZ[1], YZ[1]],
    z: [0, X[2], Y[2], Z[2], XY[2], XZ[2], YZ[2]],
    //i: [0, 1, 0, 2, 0, 1],
    //j: [1, 2, 2, 3, 1, 3],
    //k: [2, 4, 3, 6, 3, 5],
    i: [0, 0, 0],
    j: [1, 2, 1],
    k: [2, 3, 3],
    //text: wlen,
    type: 'mesh3d',
    opacity: 1,
    color: redColor,
    hoverinfo: 'skip',
  };
  traces.push(span);

  var texts = ['Cr', 'Cg', 'Cb'];
  for (var i = 0; i < 3; i++) {
    var line = {
      x: [0, points[i][0]],
      y: [0, points[i][1]],
      z: [0, points[i][2]],
      text: ['O', texts[i]],
      type: 'scatter3d',
      showlegend: false,
      mode: 'lines+markers',
      marker: {
        size: 4,
        opacity: 0.8,
        color: '#000000',
      },
      line: {
        color: '#000000',
        width: 2,
      },
      //hoverinfo: 'skip',
      hovertemplate: '%{text}' +
        '<br>R: %{x}' +
        '<br>G: %{y}' +
        '<br>B: %{z}<extra></extra>',
    }

    traces.push(line);
  }

  Plotly.addTraces(plot, traces);
}

function registerRGB2XYZ(plot, prims) {
  $('input[type=radio][name=3dmode]').change(function() {
    // TODO: seems like we need to reset camera after transformation
    if (this.id == 'showRGB') {
      var RGB = math.multiply(XYZ2RGBMat, [plot.data[0].x, plot.data[0].y, plot.data[0].z]);
      var span = math.multiply(XYZ2RGBMat, [plot.data[1].x, plot.data[1].y, plot.data[1].z]);
      var lines = [];
      for (var i = 0; i < 3; i++) {
        var line = math.multiply(XYZ2RGBMat, [plot.data[i+2].x, plot.data[i+2].y, plot.data[i+2].z]);
        lines.push(line);
      }

      var data_update = {'x': [RGB[0], span[0], lines[0][0], lines[1][0], lines[2][0]],
                         'y': [RGB[1], span[1], lines[0][1], lines[1][1], lines[2][1]],
                         'z': [RGB[2], span[2], lines[0][2], lines[1][2], lines[2][2]],
          'hovertemplate': ['R: %{x}'+'<br>G: %{y}'+'<br>B: %{z}'+'<br>wavelength: %{text}<extra></extra>', '',
                            '%{text}<br>R: %{x}'+'<br>G: %{y}'+'<br>B: %{z}'+'<extra></extra>',
                            '%{text}<br>R: %{x}'+'<br>G: %{y}'+'<br>B: %{z}'+'<extra></extra>',
                            '%{text}<br>R: %{x}'+'<br>G: %{y}'+'<br>B: %{z}'+'<extra></extra>',
                           ]};

      var layout_update = {
        'scene.xaxis.title.text': 'R',
        'scene.yaxis.title.text': 'G',
        'scene.zaxis.title.text': 'B',
        //'scene.yaxis.scaleanchor': 'x',
        //'scene.zaxis.scaleanchor': 'x',
        'title': 'CIE 1931 RGB color space',
        'scene.camera.center': {x: 0, y: 0, z: 0},
        'scene.camera.eye': {x:1.25, y:1.25, z:1.25},
        'scene.camera.up': {x: 0, y: 0, z: 1},
      };

      Plotly.update(plot, data_update, layout_update, [0, 1, 2, 3, 4]);
    } else if (this.id == 'showXYZ') {
      // or we can just read from CMFX, CMFY, CMFZ
      var XYZ = math.multiply(RGB2XYZMat, [plot.data[0].x, plot.data[0].y, plot.data[0].z]);
      var span = math.multiply(RGB2XYZMat, [plot.data[1].x, plot.data[1].y, plot.data[1].z]);
      var lines = [];
      for (var i = 0; i < 3; i++) {
        var line = math.multiply(RGB2XYZMat, [plot.data[i+2].x, plot.data[i+2].y, plot.data[i+2].z]);
        lines.push(line);
      }

      var data_update = {'x': [XYZ[0], span[0], lines[0][0], lines[1][0], lines[2][0]],
                         'y': [XYZ[1], span[1], lines[0][1], lines[1][1], lines[2][1]],
                         'z': [XYZ[2], span[2], lines[0][2], lines[1][2], lines[2][2]],
          'hovertemplate': ['X: %{x}'+'<br>Y: %{y}'+'<br>Z: %{z}'+'<br>wavelength: %{text}<extra></extra>', '',
                            '%{text}<br>X: %{x}'+'<br>Y: %{y}'+'<br>Z: %{z}'+'<extra></extra>',
                            '%{text}<br>X: %{x}'+'<br>Y: %{y}'+'<br>Z: %{z}'+'<extra></extra>',
                            '%{text}<br>X: %{x}'+'<br>Y: %{y}'+'<br>Z: %{z}'+'<extra></extra>',
                           ]};

      var layout_update = {
        'scene.xaxis.title.text': 'X',
        'scene.yaxis.title.text': 'Y',
        'scene.zaxis.title.text': 'Z',
        //'scene.yaxis.scaleanchor': 'x',
        //'scene.zaxis.scaleanchor': 'x',
        //'scene.xaxis.constrain': 'domain',
        //'scene.xaxis.dtick': 0.1,
        'title': 'CIE 1931 XYZ color space',
        'scene.camera.center': {x: 0, y: 0, z: 0},
        'scene.camera.eye': {x:1.25, y:1.25, z:1.25},
        'scene.camera.up': {x: 0, y: 0, z: 1},
      };

      Plotly.update(plot, data_update, layout_update, [0, 1, 2, 3, 4]);
    }
  });
}

var chrmX = [1.27, -1.74, -0.74, 1.27];
var chrmY = [-0.28, 2.77, 0.14, -0.28];

function plotChrm(plotId, wlen, cR, cG) {
  var rgTrace = {
    x: cR,
    y: cG,
    text: wlen,
    mode: 'lines+markers',
    connectgaps: true,
    line: {simplify: false},
    name: 'Spectral locus',
  };
 
  var xyPoints = {
    x: chrmX,
    y: chrmY,
    mode: 'lines+markers',
    marker: {
      size: 8,
      line: {
        color: '#000000',
        width: 1
      },
      opacity: 0.8
    },
    name: 'XYZ gamut',
  };
 
  data = [rgTrace, xyPoints];
 
  var layout = {
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50
    },
    title: 'CIE 1931 rg-chromaticity plot',
    showlegend: true,
    legend: {
      x: 1,
      xanchor: 'right',
      y: 1,
    },
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    xaxis: {
      title: {
        text: 'r'
      },
      constrain: 'domain',
      dtick: 0.2,
    },
    yaxis: {
      title: {
        text: 'g'
      },
      scaleanchor: 'x',
      dtick: 0.2,
    }
  };

  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function rg2xy(plot, traces, mode) {
  Plotly.animate(plot, {
    data: traces,
    traces: [0, 1],
    layout: {
      title: 'CIE 1931 '+mode+'-chromaticity plot',
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
  }).then(function() {
    // using frames in plotly has hiccups
    setTimeout(function() {
      Plotly.animate(plot, {
        layout: {
          xaxis: {range: [Math.min(...traces[0].x, ...traces[1].x, 0)-0.1, Math.max(...traces[0].x, ...traces[1].x, 1)+0.1]},
          yaxis: {range: [Math.min(...traces[0].y, ...traces[1].y, 0)-0.1, Math.max(...traces[0].y, ...traces[1].y, 1)+0.1]},
        }
      }, {
        transition: {
          duration: 500,
          easing: 'cubic-in-out'
        },
      });
    }, 50);
  });
}


function registerrgb2xyz(plot, cX, cY, cR, cG) {
  $('input[type=radio][name=2dmode]').change(function() {
    if (this.id == 'showrg') {
      rgChrm = {
        x: cR,
        y: cG,
        mode: 'lines+markers',
        connectgaps: true,
        line: {simplify: false},
      };
 
      rgPoints = {
        x: chrmX,
        y: chrmY,
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

      rg2xy(plot, [rgChrm, rgPoints], 'rg');
    } else {
      xyChrm = {
        x: cX,
        y: cY,
        mode: 'lines+markers',
        connectgaps: true,
        line: {simplify: false},
      };
 
      xyPoints = {
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

      rg2xy(plot, [xyChrm, xyPoints], 'xy');
    }
  });
}

function plotxyY(plotId, wlen, cX, cY, CMFY) {
  var locus = {
    x: cX,
    y: cY,
    z: CMFY,
    text: wlen,
    type: 'scatter3d',
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
    //hoverinfo: 'skip',
    hovertemplate: 'R: %{x}' +
      '<br>G: %{y}' +
      '<br>B: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    name: 'Spectral locus',
  };

  var data = [locus];

  var layout = {
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    showlegend: true,
    legend: {
      x: 0.1,
      xanchor: 'left',
      y: 1,
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
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        constrain: 'domain',
        dtick: 0.1,
        showspikes: false,
        title: {
          text: 'x'
        }
      },
      yaxis: {
        autorange: true,
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'y'
        }
      },
      zaxis: {
        autorange: true,
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'Y'
        }
      },
    }
  };
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

var CMFX = [], CMFY = [], CMFZ = [], cX = [], cY = [], cZ = [];
var CMFR = [], CMFG = [], CMFB = [];
var XYZ2RGBMat = [[0.41847, -0.15866, -0.082835], [-0.091169, 0.25243, 0.015708], [0.00092090, -0.0025498, 0.17860]];
var RGB2XYZMat = math.inv(XYZ2RGBMat);

d3.csv('ciexyz31.csv', function(err, rows){
  var stride = 5;

  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var x_data = range(firstW, lastW, stride);

  CMFX = unpack(rows, 'x');
  CMFY = unpack(rows, 'y');
  CMFZ = unpack(rows, 'z');

  var sumXYZ = math.add(math.add(CMFX, CMFY), CMFZ);
  var cX = math.dotDivide(CMFX, sumXYZ);
  var cY = math.dotDivide(CMFY, sumXYZ);
  var cZ = math.dotDivide(CMFZ, sumXYZ);

  var RGB = math.multiply(XYZ2RGBMat, [CMFX, CMFY, CMFZ]);
  CMFR = RGB[0];
  CMFG = RGB[1];
  CMFB = RGB[2];

  var sumRGB = math.add(math.add(CMFR, CMFG), CMFB);
  var cR = math.dotDivide(CMFR, sumRGB);
  var cG = math.dotDivide(CMFG, sumRGB);
  var cB = math.dotDivide(CMFB, sumRGB);

  var X = math.multiply(XYZ2RGBMat, [1, 0, 0]);
  var Y = math.multiply(XYZ2RGBMat, [0, 1, 0]);
  var Z = math.multiply(XYZ2RGBMat, [0, 0, 1]);

  window.spacePlot = plotRGB('spaceDiv', wlen);
  plotXYZPrims(window.spacePlot, [X, Y, Z]);
  registerRGB2XYZ(window.spacePlot, [X, Y, Z]);

  window.chrmPlot = plotChrm('chrmDiv', wlen, cR, cG);
  registerrgb2xyz(window.chrmPlot, cX, cY, cR, cG);

  window.xyYPlot = plotxyY('xyYDiv', wlen, cX, cY, CMFY);
});










