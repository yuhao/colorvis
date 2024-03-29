var redColor = '#FF0000';
var greenColor = '#00FF00';
var blueColor = '#0000FF';
var magentaColor = '#FF00FF';
var cyanColor = '#00FFFF';
var yellowColor = '#FFFF00';

var greyColor = '#888888';
var purpleColor = '#5c32a8';
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

var hpe_xyz2lms = [[0.3897,0.689,-0.0787], [-0.2298,1.1834,0.0464], [0,0,1]]; // EEW normalized
var hpe_xyz2lms_d65 = [[0.40,0.71,-0.08], [-0.23,1.17,0.05], [0.00,0.00,0.92]]; // D65 adapted
var jv_xyz2lms = [[0.15514, 0.54312, -0.03286], [-0.15514, 0.45684, 0.03286], [0, 0, 0.01608]];
// this is XYZ of sRGB primaries (not xyz)
var sRGB_xyz = [[0.4123151515,0.21,0.01932727273], [0.3576,0.72,0.1192], [0.1805,0.07,0.9506333333]];
var sRGB_lms = math.transpose(math.multiply(jv_xyz2lms, math.transpose(sRGB_xyz)))

// read hpe_d65_5.csv for d65-adapted hpe lms and then use hpe_xyz2lms_d65 matrix
d3.csv('sp.csv', function(err, rows){
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

  var aOrig = [0, 0, 0];
  var a475 = [dConeL[(475-firstW)/stride], dConeM[(475-firstW)/stride], dConeS[(475-firstW)/stride]];
  var a575 = [dConeL[(575-firstW)/stride], dConeM[(575-firstW)/stride], dConeS[(575-firstW)/stride]];
  var aWhite = math.multiply([wL, wM, wS], 0.1); // this is EEW
  //var a475 = sRGB_lms[2];
  //var a575 = math.add(sRGB_lms[0], sRGB_lms[1]);
  //var aWhite = math.multiply(math.add(math.add(sRGB_lms[0], sRGB_lms[1]), sRGB_lms[2]), 1.8);
  var normal1 = math.cross(a475, aWhite);
  var normal2 = math.cross(aWhite, a575);

  // anchor annotations
  var anchor = {
    x: [aOrig[0], a475[0], a575[0], aWhite[0]],
    y: [aOrig[1], a475[1], a575[1], aWhite[1]],
    z: [aOrig[2], a475[2], a575[2], aWhite[2]],
    text: ['O', '475 nm', '575 nm', 'EEW'],
    textposition: 'bottom',
    mode: 'markers+text',
    type: 'scatter3d',
    showlegend: false,
    //visible: 'legendonly',
    marker: {
      color: '#000000',
      size: 6,
      symbol: 'circle',
      //opacity: 1,
    },
    textfont: {
      family: 'Helvetica Neue',
      size: 15,
    },
    hovertemplate: 'L: %{x}' +
      '<br>M: %{y}' +
      '<br>S: %{z}<extra></extra>',
    hoverinfo: 'skip',
  };

  // this is to make sure when projecting to the ms-plane the triangles are square
  aOrig = math.multiply(aWhite, -0.2);
  a475 = math.multiply(a475, 1.8);
  a575 = math.multiply(a575, 1.8);
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

  lmsLocusMarkerColors = Array(wlen.length).fill(redColor);
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
      color: redColor,
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
    name: 'Protanopia spectral locus',
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
  var colors = ['#000000', redColor, greenColor, blueColor, yellowColor, magentaColor, cyanColor, '#000000'];
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
      line.hovertemplate = '%{text}<br>L: %{x}' +
        '<br>M: %{y}' +
        '<br>S: %{z}<extra></extra>';
    }
    traces.push(line);
  }

  var data = [trace, newTrace, plane1, plane2, anchor].concat(traces);
 
  // add lines of confusions
  var loc_traces = [];
  for (var i = 0; i < projConeL.length; i++) {
    var start = projConeL[i][0];
    var end = projConeL[i][1];
    var line = {
      //x: [dConeL[i], projConeL[i]],
      x: [1, 0],
      y: [dConeM[i], dConeM[i]],
      z: [dConeS[i], dConeS[i]],
      type: 'scatter3d',
      showlegend: false,
      visible: 'legendonly',
      line: {
        width: 1,
        color: greenColor,
      },
      marker: {
        size: 0,
        opacity: 1,
        //color: [colors[start], colors[end]],
      },
      hoverinfo: 'skip',
    };
    // hovertemplate overwrites hoverinfo, so add it later
    loc_traces.push(line);
  }
  data = data.concat(loc_traces);



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
  registerLoC('#showLoC', locusPlot);
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

function showsLoC(id, plot) {
  var numWaves = plot.data.length;

  if($(id).is(":checked")) {
    var data_update = {'visible': true};
    Plotly.restyle(plot, data_update, [...Array(numWaves).keys()].slice(18));
  } else {
    var data_update = {'visible': 'legendonly'};
    Plotly.restyle(plot, data_update, [...Array(numWaves).keys()].slice(18));
  }
}

function showsRGB(id, plot) {
  var numWaves = plot.data.length;

  if($(id).is(":checked")) {
    var data_update = {'visible': true};
    Plotly.restyle(plot, data_update, [...Array(numWaves).keys()].slice(5, 17));
  } else {
    var data_update = {'visible': 'legendonly'};
    Plotly.restyle(plot, data_update, [...Array(numWaves).keys()].slice(5, 17));
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

function registerLoC(id, plot) {
  $(id).on('change', function(evt) {
    showsLoC(id, plot);
  });
}

function registersRGB(id, plot) {
  $(id).on('change', function(evt) {
    showsRGB(id, plot);
  });
}

