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
    var val = $('input[type=radio][name=mode]:checked').val();
    var fillVal = (val == "epe") ? 1 : 1/width;
    spd.fill(fillVal, 0, width);
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
function drawGamutPoints(plot, cPlot, vis) {
  var numPoints = plot.data[0].x.length;
  var numSeqs = plot.data.length;
  if (numSeqs > 1) {
    Plotly.deleteTraces(plot, [...Array(numSeqs).keys()].slice(1));
    Plotly.deleteTraces(cPlot, [...Array(numSeqs).keys()].slice(1));
  }

  var allSeqs = genSeq(numPoints);

  var i = 0;
  var dist = Array(numPoints).fill(1);
  var tid = setInterval(function(){
    var seq = allSeqs[i];
    var val = $('input[type=radio][name=mode]:checked').val();
    if (val == "edist") {
      dist = math.sqrt(math.add(math.add(math.dotMultiply(seq[0], seq[0]),
          math.dotMultiply(seq[1], seq[1])), math.dotMultiply(seq[2], seq[2])));
    }

    var data_update = {'marker.color': greyColor, 'line.color': greyColor};
    Plotly.restyle(plot, data_update, [plot.data.length-1]);
    Plotly.addTraces(plot, {
      x: math.dotDivide(seq[0], dist),
      y: math.dotDivide(seq[1], dist),
      z: math.dotDivide(seq[2], dist),
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
      hovertemplate: spaceTexts[space][0]+': %{x}<br>' +
        spaceTexts[space][1]+': %{y}<br>' +
        spaceTexts[space][2]+': %{z}<extra></extra>',
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
      hovertemplate: spaceTexts[space][3]+': %{x}<br>' +
        spaceTexts[space][4]+': %{y}<extra></extra>',
    });

    i++;
    if (i == allSeqs.length) {
    //if (i == 10) {
      Plotly.restyle(plot, data_update, [plot.data.length-1]);
      Plotly.restyle(cPlot, data_update_chrm, [cPlot.data.length-1]);
      clearTimeout(tid);
      $('#start').prop('disabled', false);
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
    hovertemplate: spaceTexts[space][0]+': %{x}<br>' +
      spaceTexts[space][1]+': %{y}<br>' +
      spaceTexts[space][2]+': %{z}<br>' +
      'wavelength: %{text}<extra></extra>',
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
    title: spaceTexts[space][5],
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
      aspectmode: 'cube',
      xaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 2,
        //constrain: 'domain',
        //dtick: 0.2,
        showspikes: false,
        title: {
          text: spaceTexts[space][0]
        }
      },
      yaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 2,
        //scaleanchor: 'x',
        //dtick: 0.2,
        showspikes: false,
        title: {
          text: spaceTexts[space][1]
        }
      },
      zaxis: {
        autorange: true,
        //range: [0, 1],
        zeroline: true,
        zerolinecolor: '#000000',
        zerolinewidth: 2,
        showspikes: false,
        title: {
          text: spaceTexts[space][2]
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
    hovertemplate: spaceTexts[space][3]+': %{x}<br>' +
      spaceTexts[space][4]+': %{y}<br>' +
      'wavelength: %{text}<extra></extra>',
  };

  var data = [trace];

  var layout = {
    height: 500,
    margin: {
      l: 50,
      r: 50,
      b: 50,
      t: 50
    },
    showlegend: false,
    title: spaceTexts[space][6],
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    xaxis: {
      //autorange: true,
      range: [Math.min(...cR)-0.1, Math.max(...cR)+0.1],
      title: {
        text: spaceTexts[space][3],
      },
      constrain: 'range',
      //dtick: 0.2,
      tickwidth: 4,
      zerolinewidth: 1,
    },
    yaxis: {
      //autorange: true,
      range: [Math.min(...cG)-0.1, Math.max(...cG)+0.1],
      title: {
        text: spaceTexts[space][4],
      },
      scaleanchor: 'x',
      //dtick: 0.1,
      tickwidth: 4,
      zerolinewidth: 1,
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
    y: Array(x_data.length).fill(0),
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
      //range: [0, 1],
      rangemode: 'nonnegative',
      title: {
        text: 'watt/nm'
      },
      constrain: 'domain',
      //dtick: 0.2,
    },
  };

  var plotId = "stimulusDiv";
  
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  return plot;
}

function genSelectBox(values, id, preset) {
  var select = document.getElementById(id);

  for (const val of values)
  {
    var option = document.createElement("option");
    option.value = val;
    option.text = val;
    select.appendChild(option);
  }

  if (preset) select.value = preset;
}

function highlight(eventdata) {
  var point = eventdata.points[0];
  var curveNum = point.curveNumber;
  var pointNum = point.pointNumber;

  // update sPlot
  var waves = cPlot.data[curveNum].text[pointNum];
  var spd = Array(wlen.length).fill(0);
  for (var i = 0; i < waves.length; i++) {
    var wave = waves[i];
    spd[(wave-firstW)/stride] = 1/waves.length;
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
}

function regEvts() {
  if (!start) start = 1;
  else return;

  $('#start').on('click', function(evt) {
    $('#start').prop('disabled', true);
    drawGamutPoints(plot, cPlot, true);
  });

  $('#clear').on('click', function(evt) {
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

  $('#space').on('change', function(evt) {
    var val = this.value;
    if (val == "LMS") {
      space = "lms";
      d3.csv('linss2_10e_5_ext.csv').then(init);
    } else if (val == "CIE 1931 XYZ") {
      space = "xyz";
      d3.csv('ciexyz31.csv').then(init);
    } else {
      space = "rgb";
      d3.csv('cie1931rgbcmf.csv').then(init);
    }
  });
}

var start = 0;
var spaceTexts = {'xyz': ['X', 'Y', 'Z', 'x', 'y', 'XYZ Space', 'xy-Chromaticity Diagram'],
                  'lms': ['L', 'M', 'S', 'l', 'm', 'LMS Space', 'lm-Chromaticity Diagram'],
                  'rgb': ['R', 'G', 'B', 'r', 'g', 'RGB Space', 'rg-Chromaticity Diagram']
                 };
space = "xyz";
function init(rows) {
  stride = 5;
  var keys = Object.keys(rows[0]);

  wlen = unpack(rows, 'wavelength');
  firstW = wlen[0];
  lastW = wlen[wlen.length - 1];
  x_data = range(firstW, lastW, stride);
  sCMFR = unpack(rows, keys[1]);
  sCMFG = unpack(rows, keys[2]);
  sCMFB = unpack(rows, keys[3]);

  var res = getChrm(sCMFR, sCMFG, sCMFB);
  cR = res[0];
  cG = res[1];
  cB = res[2];

  plot = plotInRGB();
  cPlot = plotInChrm();
  sPlot = plotStimulus(x_data);

  prevCurve = -1;
  prevPoint = -1;
  cPlot.on('plotly_click', highlight);

  regEvts();
  $('#start').prop('disabled', false);
}

genSelectBox(["LMS", "CIE 1931 XYZ", "CIE 1931RGB"], "space", "CIE 1931 XYZ");
d3.csv('ciexyz31.csv').then(init);























