//Plotly.newPlot('myDiv', [{
//  x: [1, 2, 3],
//  y: [0, 0.5, 1],
//  line: {simplify: false},
//}]);
//
//function randomize() {
//  Plotly.animate('myDiv', {
//    data: [{y: [Math.random(), Math.random(), Math.random()]}],
//    traces: [0],
//    layout: {}
//  }, {
//    transition: {
//      duration: 500,
//      easing: 'cubic-in-out'
//    },
//    frame: {
//      duration: 500
//    }
//  })
//}



var cTrace;

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
  		width: 0.5},
  		opacity: 0.8},
  	type: 'scatter3d'
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
  	type: 'scatter3d'
  };
  
  var newColor = {
    x: [1],
    y: [1],
    z: [1],
    mode: 'markers',
    marker: {
      size: 8,
      line: {
        color: '#000000',
        width: 1
      },
      opacity: 0.8
    },
    type: 'scatter3d'
  };
  
  //var data = [trace, newColor];
  var data = [trace];

  var layout = {
    //height: 800,
    margin: {
  	  l: 100,
  	  r: 0,
  	  b: 0,
  	  t: 0
    },
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
      },
      yaxis: {
        autorange: true,
        //range: [-1, 2],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
      },
      zaxis: {
        autorange: true,
        //range: [-1, 2],
        zeroline: true,
        zerolinecolor: '#DA2500',
        zerolinewidth: 5,
        showspikes: false,
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
  //  	  Plotly.addTraces('myDiv', [triangle]);
  //    });
  Plotly.newPlot('myDiv', data, layout);
  
});

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
    //frame: {
    //  duration: 500
    //}
  })
}

