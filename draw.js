var cTrace;
var transRgTrace;
var transXyPoints;

//d3.csv('https://raw.githubusercontent.com/plotly/datasets/master/3d-scatter.csv', function(err, rows){
d3.csv('cie1931rgbcmf.csv', function(err, rows){
  function unpack(rows, key) {
    return rows.map(function(row) {
        return row[key];
      });
  }
  
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
 
  var trace = {
    x:unpack(rows, 'r'), y: unpack(rows, 'g'), z: unpack(rows, 'b'),
    text:unpack(rows, 'wavelength'),
    mode: 'lines+markers',
    marker: {
      size: 4,
      line: {
        color: 'rgba(217, 217, 217, 0.14)',
        width: 0.5
      },
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

  var xyzPoints = {
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
 
  var data = [cTrace, xyzPoints];
  //var data = [trace];
  
  var layout = {
    height: 800,
    width: 1200,
    margin: {
      l: 150,
      r: 0,
      b: 0,
      t: 100
    },
    title: 'Spectral locus in CIE 1931 chromaticity plot (3D)',
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
        //range: [-1, 2],
        //showgrid: true,
        zeroline: true,
        //showline: true,
        //mirror: 'ticks',
        //gridcolor: '#000000',
        //gridwidth: 0,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        //linecolor: '#636363',
        //linewidth: 6,
        showspikes: false,
        title: {
          text: 'r'
        }
      },
      yaxis: {
        autorange: true,
        //range: [-1, 2],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'g'
        }
      },
      zaxis: {
        autorange: true,
        //range: [-1, 2],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
        title: {
          text: 'b'
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
  
  //https://stackoverflow.com/questions/35846210/plotly-js-gd-data-must-be-an-array
  //Plotly.newPlot('myDiv', data, layout).then(
  //    () => {
  //      Plotly.addTraces('myDiv', [triangle]);
  //    });
  Plotly.newPlot('myDiv', data, layout);
  
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
  //.then(function() {
  //  Plotly.addFrames('2dDiv', [
  //  {
  //    data: [transRgTrace, transXyPoints],
  //    traces: [0, 1],
  //    name: 'frame1',
  //    layout: {
  //        title: 'CIE 1931 xy-chromaticity plot',
  //    }
  //  },
  //  {
  //    name: 'frame2',
  //    layout: {
  //      xaxis: {range: [0, 1]},
  //      yaxis: {range: [0, 1]},
  //    },
  //  }
  //  ]);
  //});
  
});

// will be instantaneous, since animation applies to 2d plots.
function randomize() {
  Plotly.animate('myDiv', {
    data: [cTrace],
    traces: [0],
    layout: {}
  }, {
    transition: {
      duration: 500,
      easing: 'linear'
    },
  })
}
  
//function transform() {
//  Plotly.animate('2dDiv', ['frame1', 'frame2'], {
//    //frame: [
//    //  {duration: 100},
//    //  {duration: 100},
//    //],
//    transition: [
//      {duration: 500, easing: 'cubic-in-out'},
//      {duration: 1000, easing: 'linear'},
//    ],
//    mode: 'afterall'
//  });
//}

function transform() {
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
