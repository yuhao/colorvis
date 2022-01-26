var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var greyColor = '#BBBBBB';
var purpleColor = '#5c32a8';
var magentaColor = '#fc0377';
var brightYellowColor = '#fcd303'; 
var orangeColor = '#DC7B2E';
var blueGreenColor = '#63BFAB'; 
var oGreyColor = 'rgba(187, 187, 187, 0.5)';
var oRedColor = 'rgba(218, 37, 0, 0.3)';
var oGreenColor = 'rgba(0, 143, 0, 0.3)';
var oBlueColor = 'rgba(1, 25, 147, 0.5)';

// https://docs.mathjax.org/en/v2.1-latest/typeset.html
var QUEUE = MathJax.Hub.queue; // shorthand for the queue

function unpack(rows, key, toNum) {
  return rows.map(function(row) {
      if (toNum == false) return row[key];
      else return parseFloat(row[key]);
    });
}

function range(start, end, stride) {
  return Array((end - start) / stride + 1).fill().map((_, idx) => start + idx*stride)
}

function arrayRotate(arr, reverse) {
  if (reverse) arr.unshift(arr.pop());
  else arr.push(arr.shift());
  return arr;
}

function genSeq(len) {
  var allSeqs = [];
  for (var width = 1; width <= len; width++) {
    var inGamut = [[], [], [], []];
    var spd = Array(len).fill(0);
    spd.fill(1, 0, width);
    //if (width<3) continue;
    //spd.fill(1, 0, width-3);
    //spd.fill(1, width-2, width+1);

    for (var i = 1; i <= len; i++) {
      inGamut[0].push(math.dot(sCMFR, spd));
      inGamut[1].push(math.dot(sCMFG, spd));
      inGamut[2].push(math.dot(sCMFB, spd));
      var waves = [];
      for (var j = 0; j < wlen.length; j++) {
        if (spd[j] != 0) waves.push(wlen[j]);
      }
      inGamut[3].push(waves);
      arrayRotate(spd, true);
    }

    allSeqs.push(inGamut);
  }

  return allSeqs;
}

// The canonical way of drawing the boundary. See: http://www.brucelindbloom.com/index.html?LabGamutDisplayHelp.html
function drawGamutPointsContBand(plot, cPlot, vis) {
  var len = plot.data[0].x.length;

  var allSeqs = genSeq(len);

  var i = 0;
  var tid = setInterval(function(){
    var seq = allSeqs[i];

    var data_update = {'marker.color': greyColor, 'line.color': greyColor};
    Plotly.restyle(plot, data_update, [plot.data.length-1]);
    Plotly.addTraces(plot, {
      x: seq[0],
      y: seq[1],
      z: seq[2],
      text: seq[3],
      mode: 'lines+markers',
      type: 'scatter3d',
      showlegend: false,
      visible: vis,
      opacity: 0.8,
      marker: {
        color: redColor,
        size: 3,
        symbol: 'circle',
      },
      line: {
        color: redColor,
        width: 2,
        shape: 'spline',
      },
      hovertemplate: 'R: %{x}' +
        '<br>G: %{y}' +
        '<br>B: %{z}<extra></extra>',
    });

    var chrmSeq = getChrm(seq[0], seq[1], seq[2]);
    var data_update_chrm = {'marker.color': greyColor, 'line.color': greyColor};
    Plotly.restyle(cPlot, data_update_chrm, [cPlot.data.length-1]);
    Plotly.addTraces(cPlot, {
      x: chrmSeq[0],
      y: chrmSeq[1],
      text: seq[3],
      mode: 'lines+markers',
      //fill: 'toself',
      opacity: 0.8,
      marker: {
        size: 6,
        color: redColor,
      },
      line: {
        color: redColor,
        width: 1,
        shape: 'spline',
      },
      hovertemplate: 'x: %{x}' +
        '<br>y: %{y}<extra></extra>',
    });

    i++;
    //if (i == allSeqs.length) {
    if (i == 50) {
      Plotly.restyle(plot, data_update, [plot.data.length-1]);
      Plotly.restyle(cPlot, data_update_chrm, [cPlot.data.length-1]);
      clearTimeout(tid);
    }
  }, 200);
}

function getChrm(R, G, B) {
  var sumRGB = math.add(math.add(R, G), B);
  cR = math.dotDivide(R, sumRGB);
  cG = math.dotDivide(G, sumRGB);
  cB = math.dotDivide(B, sumRGB);

  return [cR, cG, cB];
}

function plotInRGB() {
  var trace = {
    x: sCMFR.map(element => element.toFixed(5)),
    y: sCMFG.map(element => element.toFixed(5)),
    z: sCMFB.map(element => element.toFixed(5)),
    text: wlen,
    mode: 'lines+markers',
    opacity: 0.8,
    marker: {
      size: 3,
      color: greyColor,
    },
    line: {
      color: greyColor,
      width: 2,
      shape: 'spline',
    },
    //hoverinfo: 'skip',
    hovertemplate: 'L: %{x}' +
      '<br>M: %{y}' +
      '<br>S: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    type: 'scatter3d',
    showlegend: false,
  };

  var data = [trace];
 
  var layout = {
    height: 500,
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 50,
    },
    legend: {
      x: 1,
      xanchor: 'right',
      y: 0.9,
    },
    title: 'Spectral locus in XYZ',
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    scene: {
      camera: {
        projection: {
          type: 'orthographic'
        },
        eye: {
          x: 1,
          y: 0.5,
          z: 0.5
        },
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
        //dtick: 0.2,
        showspikes: false,
        title: {
          text: 'X'
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 5,
        //scaleanchor: 'x',
        //dtick: 0.2,
        showspikes: false,
        title: {
          text: 'Y'
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
          text: 'Z'
        }
      },
    }
  };

  var plotId = "locusDiv";
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function plotInChrm() {
  var trace = {
    x: cR,
    y: cG,
    text: wlen,
    mode: 'lines+markers',
    //fill: 'toself',
    opacity: 0.8,
    marker: {
      size: 6,
      color: greyColor,
    },
    line: {
      color: greyColor,
      width: 1,
      shape: 'spline',
    },
    hovertemplate: 'x: %{x}' +
      '<br>y: %{y}' +
      '<br>spd: %{text}<extra></extra>',
  };

  var data = [trace];

  var layout = {
    height: 500,
    margin: {
      l: 0,
      r: 0,
      b: 50,
      t: 50
    },
    showlegend: false,
    title: 'xy-chromaticity Diagram',
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    xaxis: {
      range: [0, 0.8],
      title: {
        text: 'x',
      },
      // https://community.plotly.com/t/get-mouses-position-on-click/4145/3
      constrain: 'domain',
      dtick: 0.2,
      zerolinewidth: 3,
    },
    yaxis: {
      range: [0, 0.9],
      title: {
        text: 'y',
      },
      scaleanchor: 'x',
      dtick: 0.2,
      zerolinewidth: 3,
    }
  };

  var plotId = "chrmLocusDiv";
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function plotStimulus(x_data) {
  var trace = {
    x: x_data,
    y: Array(x_data.length).fill(1),
    type: 'lines',
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    line: {
      color: redColor,
    },
  };

  var data = [trace];

  var layout = {
    height: 400,
    title:'Stimulus SPD',
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    yaxis: {
      range: [0, 1],
      title: {
        text: 'y'
      },
      // https://community.plotly.com/t/get-mouses-position-on-click/4145/3
      constrain: 'domain',
      dtick: 0.2,
    },
  };

  var plotId = "stimulusDiv";
  
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

var prevCurve = -1;
var prevPoint = -1;
//d3.csv('linss2_10e_5_ext.csv').then(function(rows){
//d3.csv('cie1931rgbcmf.csv').then(function(rows){
d3.csv('ciexyz31.csv').then(function(rows){
  var stride = 5;

  wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var x_data = range(firstW, lastW, stride);
  sCMFR = unpack(rows, 'x');
  sCMFG = unpack(rows, 'y');
  sCMFB = unpack(rows, 'z');

  var res = getChrm(sCMFR, sCMFG, sCMFB);
  cR = res[0];
  cG = res[1];
  cB = res[2];

  var plot = plotInRGB();
  var cPlot = plotInChrm();
  var sPlot = plotStimulus(x_data);

  $('#start').on('click', function(evt) {
    drawGamutPointsContBand(plot, cPlot, true);
  });

  $('#reset').on('click', function(evt) {
    var data_update = {'marker.color': greyColor,
                       'opacity': 0.8,
                       'line.color': greyColor,
                      };
    Plotly.restyle(plot, data_update);
    Plotly.restyle(cPlot, data_update);

    var spd = Array(wlen.length).fill(0);
    data_update = {'y': [spd]};
    Plotly.restyle(sPlot, data_update, [0]);
  });

  function findPrevHit(plot) {
    for (var i = 0; i < plot.data.length; i++) {
      if (plot.data[i].marker.color == brightYellowColor) return i;
    }

    return -1;
  }

  cPlot.on('plotly_click', function (eventdata){
    var point = eventdata.points[0];
    var curveNum = point.curveNumber;
    var pointNum = point.pointNumber;

    // update sPlot
    var waves = cPlot.data[curveNum].text[pointNum];
    var spd = Array(wlen.length).fill(0);
    for (var i = 0; i < waves.length; i++) {
      var wave = waves[i];
      spd[(wave-firstW)/stride] = 1;
    }
    var data_update = {'y': [spd]};
    Plotly.restyle(sPlot, data_update, [0]);

    // highlight locus
    if (prevCurve == curveNum) {
      // just highlight the clicked point
      var colors = Array(wlen.length).fill(brightYellowColor);
      colors[pointNum] = redColor;
      data_update = {'marker.color': [colors],
                     'opacity': 1,
                     'line.color': brightYellowColor,
                    };
      Plotly.restyle(plot, data_update, [curveNum]);
      Plotly.restyle(cPlot, data_update, [curveNum]);
    } else {
      if (prevCurve == -1) {
        // hasn't clicked before
        var data_update = {'marker.color': greyColor,
                           'opacity': 0.3,
                           'line.color': greyColor,
                          };
        Plotly.restyle(plot, data_update);
        Plotly.restyle(cPlot, data_update);
      }

      // highlight the clicked curve and point
      var colors = Array(wlen.length).fill(brightYellowColor);
      colors[pointNum] = redColor;
      data_update = {'marker.color': [colors, Array(wlen.length).fill(greyColor)],
                     'opacity': [1, 0.3],
                     'line.color': [brightYellowColor, greyColor],
                    };
      Plotly.restyle(plot, data_update, [curveNum, prevCurve]); // prevCurve can be -1 here, but restyle can deal with that
      Plotly.restyle(cPlot, data_update, [curveNum, prevCurve]);
    }

    prevCurve = curveNum;
    prevPoint = pointNum;
  });
});
























