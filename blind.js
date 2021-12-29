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
  return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
}

var colMat = [[0,1.082189751,-0.09295193697], [0,0.9892162074,0.0008488072668], [0,-0.00690805202,1.000542994]]
var hpe_xyz2lms = [[0.40,0.71,-0.08], [-0.23,1.17,0.05], [0.00,0.00,0.92]]
var sRGB_xyz = [[0.6400, 0.3300, 0.0300], [0.3000, 0.6000, 0.1000], [0.1500, 0.0600, 0.7900]]
var sRGB_lms = math.transpose(math.multiply(hpe_xyz2lms, math.transpose(sRGB_xyz)))

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

  var a475 = [dConeL[(475-firstW)/stride], dConeM[(475-firstW)/stride], dConeS[(475-firstW)/stride]]
  var a575 = [dConeL[(575-firstW)/stride], dConeM[(575-firstW)/stride], dConeS[(575-firstW)/stride]]
  var aWhite = [1, 1, 1]

  var plane1 = {
    x: [0, a475[0], aWhite[0]],
    y: [0, a475[1], aWhite[1]],
    z: [0, a475[2], aWhite[2]],
    i: [0],
    j: [1],
    k: [2],
    type: 'mesh3d',
    opacity: 0.3,
    color: orangeColor,
    hoverinfo: 'skip',
    //visible: 'legendonly',
  };

  var plane2 = {
    x: [0, a575[0], aWhite[0]],
    y: [0, a575[1], aWhite[1]],
    z: [0, a575[2], aWhite[2]],
    i: [0],
    j: [1],
    k: [2],
    type: 'mesh3d',
    opacity: 0.3,
    color: purpleColor,
    hoverinfo: 'skip',
    //visible: 'legendonly',
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

  var data = [trace, plane1, plane2].concat(traces);
 
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

  Plotly.newPlot('lmsDiv', data, layout);

});
