const canvas = document.getElementById("canvas");
const canvasAfter = document.getElementById("canvasafter");
const simulateBtn = document.getElementById("simulate");
const fileInput = document.getElementById("fileinput")

const R_OFFSET = 0;
const G_OFFSET = 1;
const B_OFFSET = 2;
const DISPLAY_POINTS = 3000;

const img = new Image;

// D65 adapted LMS values
//const white = [1.027,0.9847,0.9182];
//const invariant1 = [0.05235866, 0.14667038, 0.95667258];
//const invariant2 = [0.9847601, 0.87614013, 0.00165276];

// LMS values without D65 adaptation
const white = [1,1,1];
const invariant1 = [0.05096024, 0.14894042, 1.0419];
const invariant2 = [0.95889119, 0.88976138, 0.0018];

if (img.src === '') {
    img.src = 'ishihara.jpg'
}

fileInput.onchange = (e) => {
    if (e.target.files && e.target.files.item(0)) {
        img.src = URL.createObjectURL(e.target.files[0]);
    }
}

img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.canvas.height = img.height;
    ctx.canvas.width = img.width;
    ctx.drawImage(img, 0, 0);

    const h = img.height;
    const w = img.width;
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const res = convertRGBToLMS(imgData);
    const L = res[1];
    const M = res[2];
    const S = res[3];
    
    const [data, layout, config] = configFor3DScatterPlot([L],[M],[S],["Original"])
    Plotly.newPlot("visualize-simulation", data, layout, config);
}

simulateBtn.onclick = () => {
    let ctx = canvas.getContext('2d');
    const h = img.height;
    const w = img.width;

    const normal1 = calculatePlane(white, invariant1);
    const normal2 = calculatePlane(white, invariant2);
    let [updatedImage, L, M, S] = convertRGBToLMS(ctx.getImageData(0, 0, w, h).data)
    const res = simulateProtanopia(updatedImage, normal1, normal2, white);
    updatedImage = res[0];
    const lConverted = res[1];
    const mConverted = res[2];
    const sConverted = res[3];
    updatedImage = convertLMSToRGB(updatedImage, h, w);
    updatedImage = convertToRGB(updatedImage, h, w);

    ctx = canvasAfter.getContext('2d');
    ctx.canvas.height = img.height;
    ctx.canvas.width = img.width;
    const simulatedImage = new ImageData(Uint8ClampedArray.from(updatedImage), w, h);

    ctx.putImageData(simulatedImage, 0, 0);
    
    const [data, layout, config] = configFor3DScatterPlot([L, lConverted], [M, mConverted], [S, sConverted], ["Original", "Simulated"], ['rgb(188,195,113)','rgb(87,128,161)']);
    Plotly.newPlot("visualize-simulation", data, layout, config);
}

const calculatePlane = (neutralWhite, invariant) => {
    return math.cross(invariant, neutralWhite);
}

const projectColorOnNormalForProtanopia = (plane1, plane2, neutralWhite, color) => {
    const normal = getNormalForProtanopia(plane1, plane2, neutralWhite, color)
    color[0] = -(normal[1] * color[1] + normal[2] * color[2]) / normal[0];
    return color;
}

const getNormalForProtanopia = (plane1, plane2, neutralWhite, color) => {
    if (color[1] !== 0 && color[2]/color[1] < neutralWhite[2]/neutralWhite[1]) return plane2;
    return plane1;
}

const convertRGBToLMS = (imgData, isGraphDataRequired = true) => {
    // this is using HPE matrix for XYZ2LMS and d65-adapted
    //const RGB2LMS = [[0.31399022, 0.63951294, 0.04649755],
    //                 [0.15537241, 0.75789446, 0.08670142],
    //                 [0.01775239, 0.10944209, 0.87256922]]

    // this is using HPE matrix for XYZ2LMS without d65 adaption
    const RGB2LMS = [[0.3057443093, 0.6227068616, 0.04525613608],
                     [0.1577917221, 0.7696706345, 0.08804146774],
                     [0.0193339, 0.119192, 0.9503041]]
    const workingCopy = Array.from(imgData)

    const L = []
    const M = []
    const S = []

    // Converts RGB to LMS
    const l = workingCopy.length;
    const SAMPLING_SIZE = (l / (DISPLAY_POINTS * 4)).toFixed();

    let i = 0;
    while (i < l) {
        const locationInArray = i;
        const r = removeGamma(workingCopy[locationInArray + R_OFFSET]);
        const g = removeGamma(workingCopy[locationInArray + G_OFFSET]);
        const b = removeGamma(workingCopy[locationInArray + B_OFFSET]);
        const l = RGB2LMS[0][0] * r + RGB2LMS[0][1] * g + RGB2LMS[0][2] * b;
        const m = RGB2LMS[1][0] * r + RGB2LMS[1][1] * g + RGB2LMS[1][2] * b;
        const s = RGB2LMS[2][0] * r + RGB2LMS[2][1] * g + RGB2LMS[2][2] * b;
        workingCopy[locationInArray + R_OFFSET] = l;
        workingCopy[locationInArray + G_OFFSET] = m;
        workingCopy[locationInArray + B_OFFSET] = s;
        if (isGraphDataRequired === true && i % SAMPLING_SIZE === 0) {
            L.push(l);
            M.push(m);
            S.push(s);
        }
        i += 4;
    }
    if (isGraphDataRequired === true)
        return [workingCopy, L, M, S];
    return workingCopy;
}

const convertLMSToRGB = (imgData) => {
    // this is using HPE matrix for XYZ2LMS and d65-adapted
    //const LMS2RGB = [[5.47221206, -4.6419601, 0.16963708],
    //                 [-1.1252419, 2.29317094, -0.1678952],
    //                 [0.02980165, -0.19318073, 1.16364789]]

    // this is using HPE matrix for XYZ2LMS without d65 adaption
    const LMS2RGB = [[5.619857747, -4.570915022, 0.1558417148],
                     [-1.155639805, 2.258109477, -0.1541690501],
                     [0.03061046668, -0.1902285498, 1.068460811]]

    const workingCopy = Array.from(imgData);
    let i = 0;
    const l = imgData.length;
    while (i < l) {
        const l = workingCopy[i + R_OFFSET]
        const m = workingCopy[i + G_OFFSET]
        const s = workingCopy[i + B_OFFSET]
        workingCopy[i + R_OFFSET] = multiplyRowCol(LMS2RGB[0], [l, m, s])
        workingCopy[i + G_OFFSET] = multiplyRowCol(LMS2RGB[1], [l, m, s])
        workingCopy[i + B_OFFSET] = multiplyRowCol(LMS2RGB[2], [l, m, s])
        i += 4;
    }
    return workingCopy

}

const convertToRGB = (imgData) => {
    const workingCopy = Array.from(imgData);
    let i = 0;
    const l = imgData.length;
    while (i < l) {
        workingCopy[i + R_OFFSET] = clamp(addGamma(workingCopy[i + R_OFFSET]));
        workingCopy[i + G_OFFSET] = clamp(addGamma(workingCopy[i + G_OFFSET]));
        workingCopy[i + B_OFFSET] = clamp(addGamma(workingCopy[i + B_OFFSET]));
        i += 4;
    }
    return workingCopy;
}

const clamp = (v) => {
    if (v > 255) return 255;
    if (v < 0) return 0;
    return v;
}

const multiplyRowCol = (row, col) => {
    return math.dot(row, col);
}

const removeGamma = (c) => {
    // will convert to a value between 0 and 1
    if (c <= 0.04045 * 255) {
        return c / (255 * 12.92);
    }
    return math.pow((((c / 255) + 0.055) / 1.055), 2.4)
}

const addGamma = (c) => {
    // will convert to a value between 0 and 255
    if (c <= 0.0031308) {
        return 255 * (12.92 * c)
    }
    return 255 * (1.055 * math.pow(c, 0.4167) - 0.055)
}

const simulateProtanopia = (imgData, plane1, plane2, neutralWhite, isGraphDataRequired=true) => {
    const workingCopy = Array.from(imgData)

    const L = [];
    const M = [];
    const S = [];
    const l = workingCopy.length;
    const SAMPLING_SIZE = (l / (DISPLAY_POINTS * 4)).toFixed();

    let i = 0;
    while (i < l) {
        const l = workingCopy[i + R_OFFSET];
        const m = workingCopy[i + G_OFFSET];
        const s = workingCopy[i + B_OFFSET];
        const res = projectColorOnNormalForProtanopia(plane1, plane2, neutralWhite, [l, m, s]);
        workingCopy[i + R_OFFSET] = res[0]
        workingCopy[i + G_OFFSET] = res[1]
        workingCopy[i + B_OFFSET] = res[2]
        if (isGraphDataRequired === true && i % SAMPLING_SIZE === 0) {
            L.push(res[0]);
            M.push(res[1]);
            S.push(res[2]);
        }
        i += 4;
    }
    if (isGraphDataRequired === true)
        return [workingCopy, L, M, S];
    return workingCopy;
}

const configFor3DScatterPlot = (xData, yData, zData, legends, colors=['rgb(188,195,113)'], xAxisLabel = "L", yAxisLabel = "M", zAxisLabel = "S") => {
    const data = []
    for (let i=0;i<xData.length;i++) {
        const trace = {
            x: xData[i],
            y: yData[i],
            z: zData[i],
            type: "scatter3d",
            mode: "markers",
            marker: {
                size: 3,
                color: colors[i],
                symbol: 'circle',
            },
            name: legends[i],
            hovertemplate: 'L: %{x}' +
              '<br>M: %{y}' +
              '<br>S: %{z}<extra></extra>' ,
        };
        data.push(trace);
    }
    
    const layout = {
        height: 800,
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
                showspikes: false,
                title: {
                    text: xAxisLabel
                }
            },
            yaxis: {
                autorange: true,
                zeroline: true,
                zerolinecolor: '#000000',
                zerolinewidth: 5,
                scaleanchor: 'x',
                showspikes: false,
                title: {
                    text: yAxisLabel
                }
            },
            zaxis: {
                autorange: true,
                zeroline: true,
                zerolinecolor: '#000000',
                zerolinewidth: 5,
                showspikes: false,
                title: {
                    text: zAxisLabel
                }
            },
        }
    };
    const config = {responsive: true};
    return [data,layout, config]
}
