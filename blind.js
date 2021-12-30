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
var ccMatText, equText, equText2;

QUEUE.Push(function () {
  ccMatText = MathJax.Hub.getAllJax('ccMatText');
  equText = MathJax.Hub.getAllJax('equText');
  equText2 = MathJax.Hub.getAllJax('equText2');
  equText3 = MathJax.Hub.getAllJax('equText3');
});

function unpack(rows, key, toNum) {
  return rows.map(function(row) {
      if (toNum == false) return row[key];
      else return parseFloat(row[key]);
    });
}

function range(start, end, stride) {
  return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride);
}

var hpe_xyz2lms = [[0.3897,0.689,-0.0787], [-0.2298,1.1834,0.0464], [0,0,1]];
var hpe_xyz2lms_d65 = [[0.40,0.71,-0.08], [-0.23,1.17,0.05], [0.00,0.00,0.92]]; // D65 adapted
// this is XYZ of sRGB primaries (not xyz)
var sRGB_xyz = [[0.4123151515,0.21,0.01932727273], [0.3576,0.72,0.1192], [0.1805,0.07,0.9506333333]];
var sRGB_lms = math.transpose(math.multiply(hpe_xyz2lms, math.transpose(sRGB_xyz)))

// read hpe_d65_5.csv for d65-adapted hpe lms, and then use hpe_xyz2lms_d65 matrix
d3.csv('hpe_5.csv', function(err, rows){
  var stride = 5;

  // points to the cone arrays that will be used to plot the chart;
  var dConeL = unpack(rows, 'l');
  var dConeM = unpack(rows, 'm');
  var dConeS = unpack(rows, 's');

  var wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];

  var wL = dConeL.reduce((a, b) => a+b, 0);
  var wM = dConeM.reduce((a, b) => a+b, 0);
  var wS = dConeS.reduce((a, b) => a+b, 0);

  var a475 = [dConeL[(475-firstW)/stride]*1.8, dConeM[(475-firstW)/stride]*1.8, dConeS[(475-firstW)/stride]*1.8];
  var a575 = [dConeL[(575-firstW)/stride]*1.8, dConeM[(575-firstW)/stride]*1.8, dConeS[(575-firstW)/stride]*1.8];
  var aWhite = math.multiply([wL, wM, wS], 0.1); // this is EEW
  aOrig = math.multiply(aWhite, -0.2);
  var normal1 = math.cross(a475, aWhite);
  var normal2 = math.cross(aWhite, a575);

  // this is to make sure when projecting to the ms-plane the triangles are square
  a475[1] = aOrig[1];
  a475[2] = aWhite[2];
  a475[0] = -((normal1[1] * a475[1] + normal1[2] * a475[2]) / normal1[0]);
  a575[1] = aWhite[1];
  a575[2] = aOrig[2];
  a575[0] = -((normal2[1] * a575[1] + normal2[2] * a575[2]) / normal2[0]);

  var plane1 = {
    x: [aOrig[0], a475[0], aWhite[0]],
    y: [aOrig[1], a475[1], aWhite[1]],
    z: [aOrig[2], a475[2], aWhite[2]],
    i: [0],
    j: [1],
    k: [2],
    type: 'mesh3d',
    opacity: 0.3,
    color: orangeColor,
    hoverinfo: 'skip',
    visible: 'legendonly',
  };

  var plane2 = {
    x: [aOrig[0], a575[0], aWhite[0]],
    y: [aOrig[1], a575[1], aWhite[1]],
    z: [aOrig[2], a575[2], aWhite[2]],
    i: [0],
    j: [1],
    k: [2],
    type: 'mesh3d',
    opacity: 0.3,
    color: purpleColor,
    hoverinfo: 'skip',
    visible: 'legendonly',
  };

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
    name: 'Spectral locus',
  };

  // projected locus
  function project(normal, m, s) {
    return - (normal[1] * m + normal[2] * dConeS[i]) / normal[0];
  };

  var projConeL = [];
  for (var i = 0; i < dConeL.length; i++) {
    var l = dConeL[i];
    var m = dConeM[i];
    var s = dConeS[i];

    var normal;
    if ((m == 0) || (s/m < aWhite[2]/aWhite[1]))
      normal = normal2;
    else normal = normal1;
    var lPrime = project(normal, m, s);
    projConeL.push(lPrime);
  }

  lmsLocusMarkerColors = Array(wlen.length).fill('#000000');
  var newTrace = {
    x: projConeL,
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
      color: '#000000',
      width: 2
    },
    visible: 'legendonly',
    // https://plotly.com/python/hover-text-and-formatting/#customizing-hover-text-with-a-hovertemplate
    // <extra> tag to suppress trace name
    hovertemplate: 'L: %{x}' +
      '<br>M: %{y}' +
      '<br>S: %{z}' +
      '<br>wavelength: %{text}<extra></extra>' ,
    type: 'scatter3d',
    name: 'Protaonpia spectral locus',
  };

  // the sRGB gamut
  var traces = [];
  // O: 0; R: 1; G: 2: B: 3
  // RG: 4; RB: 5; GB: 6; RGB: 7
  var allPoints = [[0, 0, 0], sRGB_lms[0], sRGB_lms[1], sRGB_lms[2],
                   math.add(sRGB_lms[0], sRGB_lms[1]), math.add(sRGB_lms[0], sRGB_lms[2]), math.add(sRGB_lms[1], sRGB_lms[2]),
                   math.add(math.add(sRGB_lms[0], sRGB_lms[1]), sRGB_lms[2])];
  var indices = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]];
  var names = ['O', 'R', 'G', 'B', 'R+G', 'R+B', 'G+B', 'R+G+B (W)'];
  var hoverInfo = [true, true, true, 'skip', 'skip', 'skip', 'skip', 'skip', 'skip', true, true, true];
  var colors = ['#000000', redColor, greenColor, blueColor, yellowColor, cyanColor, magentaColor, '#000000'];
  var modes = Array(3).fill('lines+markers+text').concat(Array(6).fill('lines')).concat(Array(3).fill('lines+markers+text'));

  for (var i = 0; i < indices.length; i++) {
    var start = indices[i][0];
    var end = indices[i][1];
    var line = {
      x: [allPoints[start][0], allPoints[end][0]],
      y: [allPoints[start][1], allPoints[end][1]],
      z: [allPoints[start][2], allPoints[end][2]],
      text: [names[start], names[end]],
      mode: modes[i],
      type: 'scatter3d',
      showlegend: false,
      visible: 'legendonly',
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
      line.hovertemplate = '%{text}<br>X: %{x}' +
        '<br>Y: %{y}' +
        '<br>Z: %{z}<extra></extra>';
    }
    traces.push(line);
  }

  var data = [trace, newTrace, plane1, plane2].concat(traces);
 
  var layout = {
    height: 800,
    //width: 1200,
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
        //constrain: 'domain',
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
        scaleanchor: 'x',
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

  var locusPlot = document.getElementById('lmsDiv');
  Plotly.newPlot(locusPlot, data, layout);

  registerPlanes('#showPlanes', locusPlot);
  registerProjLocus('#showProjLocus', locusPlot);
  registersRGB('#showsRGB', locusPlot);
});

function showPlanes(id, plot) {
  if($(id).is(":checked")) {
    var data_update = {'visible': true};
    Plotly.restyle(plot, data_update, [2, 3]);
  } else {
    var data_update = {'visible': 'legendonly'};
    Plotly.restyle(plot, data_update, [2, 3]);
  }
}

function showProjLocus(id, plot) {
  if($(id).is(":checked")) {
    var data_update = {'visible': true};
    Plotly.restyle(plot, data_update, [1]);
  } else {
    var data_update = {'visible': 'legendonly'};
    Plotly.restyle(plot, data_update, [1]);
  }
}

function showsRGB(id, plot) {
  var numWaves = plot.data[0].x.length;

  if($(id).is(":checked")) {
    var data_update = {'visible': true};
    Plotly.restyle(plot, data_update, [...Array(numWaves+4).keys()].slice(4));
  } else {
    var data_update = {'visible': 'legendonly'};
    Plotly.restyle(plot, data_update, [...Array(numWaves+4).keys()].slice(4));
  }
}

function registerPlanes(id, plot) {
  $(id).on('change', function(evt) {
    showPlanes(id, plot);
  });
}

function registerProjLocus(id, plot) {
  $(id).on('change', function(evt) {
    showProjLocus(id, plot);
  });
}

function registersRGB(id, plot) {
  $(id).on('change', function(evt) {
    showsRGB(id, plot);
  });
}

