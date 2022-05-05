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

var rgb2dkl = [[0.14376143, 0.16556473, 0.00228754], [-0.21244303, -0.7142423, -0.06559153], [ 0.2125915, 0.71517139, 0.07219711]];
var dkl2rgb = math.inv(rgb2dkl);

function getVertices() {
  var o = [0, 0, 0];
  var r = math.multiply(rgb2dkl, math.transpose([1, 0, 0]));
  var g = math.multiply(rgb2dkl, math.transpose([0, 1, 0]));
  var b = math.multiply(rgb2dkl, math.transpose([0, 0, 1]));

  var rg = math.add(r, g);
  var rb = math.add(r, b);
  var gb = math.add(g, b);

  var rgb = math.add(math.add(r, g), b);

  return math.transpose([o,r,g,b,rg,rb,gb,rgb]);
}

function plotDKL(plotId) {
  var allPoints = getVertices();

  var traces = [];
  // O: 0; R: 1; G: 2: B: 3
  // RG: 4; RB: 5; GB: 6; RGB: 7
  var indices = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]];
  var names = ['O', 'R', 'G', 'B', 'R+G', 'R+B', 'G+B', 'R+G+B (W)'];
  var hoverInfo = [true, true, true, 'skip', 'skip', 'skip', 'skip', 'skip', 'skip', true, true, true];
  var colors = ['#000000', redColor, greenColor, blueColor, yellowColor, cyanColor, magentaColor, '#000000'];
  var modes = Array(3).fill('lines+markers+text').concat(Array(6).fill('lines')).concat(Array(3).fill('lines+markers+text'));

  for (var i = 0; i < indices.length; i++) {
    var start = indices[i][0];
    var end = indices[i][1];
    var line = {
      x: [allPoints[0][start], allPoints[0][end]],
      y: [allPoints[1][start], allPoints[1][end]],
      z: [allPoints[2][start], allPoints[2][end]],
      text: [names[start], names[end]],
      mode: modes[i],
      type: 'scatter3d',
      showlegend: false,
      line: {
        width: 2,
        color: '#000000',
      },
      marker: {
        size: 6,
        opacity: 1,
        color: [colors[start], colors[end]],
      },
      hoverinfo: hoverInfo[i],
    };
    // hovertemplate overwrites hoverinfo, so add it later
    if (hoverInfo[i] == true) {
      line.hovertemplate = '%{text}<br>L-M: %{x}' +
        '<br>S-(L+M): %{y}' +
        '<br>L+M: %{z}<extra></extra>';
    }
    traces.push(line);
  }

  //var points = {
  //  x: d,
  //  y: k,
  //  z: l,
  //  mode: 'markers',
  //  type: 'scatter3d',
  //  showlegend: false,
  //  //line: {
  //  //  width: 2,
  //  //  color: '#000000',
  //  //},
  //  marker: {
  //    size: 2,
  //    opacity: 1,
  //    //color: [colors[start], colors[end]],
  //  },
  //  //hoverinfo: hoverInfo[i],
  //};

  var ellipsoid = {
    x: d,
    y: k,
    z: l,
    type: 'mesh3d',
    //color:'rgb(300,100,200)',
    alphahull: 0,
    showlegend: false,
    opacity:0.8,
    hovertemplate: 'L-M: %{x}' +
      '<br>S-(L+M): %{y}' +
      '<br>L+M: %{z}<extra></extra>',
  };

  //var data = traces;
  //var data = [ellipsoid];
  var data = traces.concat([ellipsoid]);
  //var data = traces.concat([points]);

  var layout = {
    height: 600,
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
        //range: [0, 1.5],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        //constrain: 'domain',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'L-M'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1.5],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'S-(L+M)'
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 2],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'y',
        //dtick: 0.1,
        showspikes: false,
        title: {
          text: 'L+M'
        }
      },
    }
  };
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function plotRGB(plotId) {
  var allPoints = math.transpose([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]]);

  var traces = [];

  // O: 0; R: 1; G: 2: B: 3
  // RG: 4; RB: 5; GB: 6; RGB: 7
  var indices = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]];
  var names = ['O', 'R', 'G', 'B', 'R+G', 'R+B', 'G+B', 'R+G+B (W)'];
  var hoverInfo = [true, true, true, 'skip', 'skip', 'skip', 'skip', 'skip', 'skip', true, true, true];
  var colors = ['#000000', redColor, greenColor, blueColor, yellowColor, cyanColor, magentaColor, '#000000'];
  var modes = Array(3).fill('lines+markers+text').concat(Array(6).fill('lines')).concat(Array(3).fill('lines+markers+text'));

  for (var i = 0; i < indices.length; i++) {
    var start = indices[i][0];
    var end = indices[i][1];
    var line = {
      x: [allPoints[0][start], allPoints[0][end]],
      y: [allPoints[1][start], allPoints[1][end]],
      z: [allPoints[2][start], allPoints[2][end]],
      text: [names[start], names[end]],
      mode: modes[i],
      type: 'scatter3d',
      showlegend: false,
      line: {
        width: 2,
        color: '#000000',
      },
      marker: {
        size: 6,
        opacity: 1,
        color: [colors[start], colors[end]],
      },
      hoverinfo: hoverInfo[i],
    };
    // hovertemplate overwrites hoverinfo, so add it later
    if (hoverInfo[i] == true) {
      line.hovertemplate = '%{text}<br>L-M: %{x}' +
        '<br>S-(L+M): %{y}' +
        '<br>L+M: %{z}<extra></extra>';
    }
    traces.push(line);
  }

  for (var i = 0; i < eD.length; i++) {
    var eRGB = math.multiply(dkl2rgb, [eD[i], eK[i], eL[i]]);

    var ellipsoid = {
      x: eRGB[0],
      y: eRGB[1],
      z: eRGB[2],
      //type: 'mesh3d',
      //alphahull: 0,
      type: 'scatter3d',
      marker: {
        size: 1,
        opacity: 1,
      },
      //color:'rgb(300,100,200)',
      showlegend: false,
      opacity:0.8,
      hovertemplate: 'R: %{x}' +
        '<br>G: %{y}' +
        '<br>B: %{z}<extra></extra>',
    };

    traces.push(ellipsoid);
  }

  var data = traces;
  //var data = [ellipsoid];
  //var data = traces.concat([ellipsoid]);
  //var data = traces.concat([points]);

  var layout = {
    height: 600,
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
      aspectmode: 'auto',
      xaxis: {
        autorange: true,
        //range: [0, 1.5],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        //constrain: 'domain',
        //dtick: 0.02,
        showspikes: false,
        title: {
          text: 'R'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1.5],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //scaleratio: 1,
        //dtick: 0.02,
        showspikes: false,
        title: {
          text: 'G'
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 2],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        scaleanchor: 'x',
        //dtick: 0.02,
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

//var a = 6.36363972e-04;
//var b = 5.94582369e-05;
//var c = 8.37127813e-05;

//var a = 0.00719133;
//var b = 0.00024922;
//var c = 0.00034638;

//var d0 = 0.03100912, k0 = -0.09396279, l0 = 0.09475283;

var PI = Math.PI;
var NS = 20;

//plotDKL('dklDiv');

var eD = [], eK = [], eL = [];
d3.csv('data.csv', function(err, rows){
  dd = unpack(rows, 'd');
  kk = unpack(rows, 'k');
  ll = unpack(rows, 'l');
  aa = unpack(rows, 'a');
  bb = unpack(rows, 'b');
  cc = unpack(rows, 'c');

  for (var x = 0; x < dd.length; x++) {
    var d0 = dd[x];
    var k0 = kk[x];
    var l0 = ll[x];
    var a = aa[x];
    var b = bb[x];
    var c = cc[x];

    var d = [], k = [], l = [];
    for (var i = 0; i <= NS; i++) {
      for (var j = 0; j <= NS; j++) {
        var theta = i / NS * PI;
        var phi = j / NS * 2 * PI;
        d.push(a * math.sin(theta) * math.cos(phi) + d0);
        k.push(b * math.sin(theta) * math.sin(phi) + k0);
        l.push(c * math.cos(theta) + l0);
      }
    }

    eD.push(d);
    eK.push(k);
    eL.push(l);
  }

  plotRGB('rgbDiv');
});









