var redColor = '#da2500';
var greenColor = '#008f00';
var blueColor = '#011993';
var greyColor = '#BBBBBB';
var purpleColor = '#5c32a8';
var magentaColor = '#fc0377';
var brightYellowColor = '#fcd303'; 
var orangeColor = '#DC7B2E';
var blueGreenColor = '#63BFAB'; 
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

// The canonical way of drawing the boundary. See: http://www.brucelindbloom.com/index.html?LabGamutDisplayHelp.html
function drawGamutPointsContBand(plot, vis) {
  var len = plot.data[0].x.length;

  function arrayRotate(arr, reverse) {
    if (reverse) arr.unshift(arr.pop());
    else arr.push(arr.shift());
    return arr;
  }

  var width = 0;
  function draw() {
    width++;
    var inGamut = [[], [], [], []];
    var spd = Array(len).fill(0);
    // TODO: cycling through a discontinuous wave
    //if (width<3) return;
    //spd.fill(0.3, 0, width-3);
    //spd.fill(0.3, width-2, width+1);

    spd.fill(0.3, 0, width);
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

    var data_update = {'marker.color': greyColor};
    Plotly.restyle(plot, data_update, [plot.data.length-1]);
    var trace = {
      x: inGamut[0],
      y: inGamut[1],
      z: inGamut[2],
      text: inGamut[3],
      mode: 'lines+markers',
      type: 'scatter3d',
      showlegend: false,
      visible: vis,
      marker: {
        color: '#222222',
        size: 3,
        symbol: 'circle',
        //opacity: 1,
      },
      textfont: {
        family: 'Helvetica Neue',
        size: 15,
      },
      hovertemplate: 'R: %{x}' +
        '<br>G: %{y}' +
        '<br>B: %{z}' +
        '<br>spd: %{text}<extra></extra>',
      //hoverinfo: 'skip',
    };
    Plotly.addTraces(plot, trace);

    if (width == len) clearTimeout(tid);
  }

  var tid = setInterval(draw, 200);
}

var wlen;
d3.csv('linss2_10e_5_ext.csv').then(function(rows){
//d3.csv('cie1931rgbcmf.csv').then(function(rows){
  var stride = 5;

  wlen = unpack(rows, 'wavelength');
  var firstW = wlen[0];
  var lastW = wlen[wlen.length - 1];
  var x_data = range(firstW, lastW, stride);
  sCMFR = unpack(rows, 'l');
  sCMFG = unpack(rows, 'm');
  sCMFB = unpack(rows, 's');

  var trace = {
    x: sCMFR.map(element => element.toFixed(5)),
    y: sCMFG.map(element => element.toFixed(5)),
    z: sCMFB.map(element => element.toFixed(5)),
    text: wlen,
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
    hovertemplate: 'L: %{x}' +
      '<br>M: %{y}' +
      '<br>S: %{z}' +
      '<br>wavelength: %{text}<extra></extra>',
    type: 'scatter3d',
    showlegend: false,
    //name: 'Spectral locus in RGB',
  };

  var data = [trace];
 
  var layout = {
    height: 800,
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    legend: {
      x: 1,
      xanchor: 'right',
      y: 0.9,
    },
    //title: 'Spectral locus in RGB color space',
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
          text: 'L'
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

  var plotId = "chrmLocusDiv";
 
  var plot = document.getElementById(plotId);
  Plotly.newPlot(plot, data, layout);

  $('#start').on('click', function(evt) {
    drawGamutPointsContBand(plot, true);
  });
});
