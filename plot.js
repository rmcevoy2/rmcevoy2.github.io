// Initialize parameters
var enabledCities = [],
    endYear = 2021,
    per100k = false;

// bounds on years
const startYear = 2020,
    lowerEndYear = 2021, 
    upperEndYear = 2023;

// urls for querying data through apis
const cityURLs = {
    norfolk : "https://data.norfolk.gov/resource/r7bn-2egr.csv?$select=count(offense) AS ct,date_trunc_ym(date_occu) as month&$where=date_extract_y(date_occu) >= 2020 AND date_extract_y(date_occu) <= 2023 AND offense = 'STOLEN VEHICLE'&$group=month&$order=month&$limit=50000",
    buffalo : "https://data.buffalony.gov/resource/d6g9-xbgu.csv?$select=count(parent_incident_type)%20AS%20ct,%20date_trunc_ym(incident_datetime)%20as%20month%20&$where=date_extract_y(incident_datetime)%20%3E=%202020%20 AND date_extract_y(incident_datetime) <= 2023 AND parent_incident_type%20=%20%27Theft%20of%20Vehicle%27&$group=month&$order=month&$limit=50000",
    memphis : "https://memphisinternal.data.socrata.com/resource/ybsi-jur4.csv?$select=count(agency_crimetype_id) AS ct, date_trunc_ym(offense_date) AS month&$where=date_extract_y(offense_date) >= 2020 AND date_extract_y(offense_date) <= 2023 AND agency_crimetype_id like 'MVT/%25'&$group=month&$order=month&$limit=50000"
}

// city pop estimates in 100000s, from US census 2021 estimate
const cityPops = {
    norfolk : 2.38,
    buffalo : 2.83,
    memphis: 11.70
}

// html to add option for scaling data by populations
const scaleHTML = '<input type="checkbox" name="togglePerCapita" onchange="togglePerCapita()"><label for="togglePerCapita">Scale per 100,000 population</label>'

// Declare the chart dimensions and margins.
const margin = { top: 0, right: 0, bottom: 40, left: 40 };
var width = 960 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

// Declare the x (horizontal position) scale.
const x = d3.scaleTime().range([0,width])
    .domain([new Date(startYear + "-01-01"), new Date(endYear+1+"-01-01")]);

// Declare the y (vertical position) scale.
const y = d3.scaleLinear()
    .range([height, 0]);

// Create the SVG container.
const svg = d3.select("#plot")
    .append("svg")
    .attr("viewBox", 
        `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(${margin.left},${height + margin.top})`)
    .call(d3.axisBottom(x));

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .attr("transform", `translate(${margin.left},${margin.top})`)
    .call(d3.axisLeft(y));

// add annotations
const type = d3.annotationXYThreshold
const annotations = [{
    note: {
      label: "Kia Boys Documentary (A Story of Teenage Car Theft) was released on YouTube on May 31, 2022.",
      title: "Kia Boys Documentary"
    },
    data: { date: d3.isoParse('2022-05-31T00:00:00.000'), ct:0.5 },
    dy: -height*0.2,
    dx: 0,
    subject: {
      y1: margin.top,
      y2: height
    },
    id: "kia-boys-doc-annot"
  },
  {
    note: {
      label: "A stolen Kia was crashed and left 4 teenagers dead, per AP, on October 25, 2022 in Buffalo, NY.",
      title: "Deadly Buffalo Crash"
    },
    data: { date: d3.isoParse('2022-10-25T00:00:00.000'), ct:0.5 },
    dy: -height*0.2,
    dx: 0,
    subject: {
      y1: margin.top,
      y2: height
    },
    id: "buffalo-crash-annot"
  },
  {
    note: {
      label: "An early news article reporting on \"Kia Boyz\" from August 25, 2021 in Milwaukee, WI.",
      title: "Early Article from Milwaukee on Kia Boyz"
    },
    data: { date: d3.isoParse('2021-08-25T00:00:00.000'), ct:0.5 },
    dy: -height*0.2,
    dx: 0,
    subject: {
      y1: margin.top,
      y2: height
    },
    id: "milwaukee-news-annot"
  }

]
const makeAnnotations = d3.annotation()
    .notePadding(5)
    .textWrap(80)
    .type(type)
    .accessors({
        x: d => x(d.date),
        y: d => y(d.ct)
    })
    .accessorsInverse({
        date: d => x.invert(d.x),
        ct: d => y.invert(d.y)
    })
    .on('noteclick', function (annotation) {
        if (annotation.id == "kia-boys-doc-annot"){
            window.open("https://www.youtube.com/watch?v=fbTrLyqL_nw", "_blank");
        }
        else if (annotation.id == "buffalo-crash-annot"){
            window.open("https://apnews.com/article/police-buffalo-f5c28ce63cd8a44937232696cb6c1a7e", "_blank");
        }
        else if (annotation.id == "milwaukee-news-annot"){
            window.open("https://shepherdexpress.com/news/features/kia-and-hyundai-thefts-continue-to-buzz-online/", "_blank")
        }
        })
    .annotations(annotations)

// make group for data lines and add to svg before annotations to draw first
var lineGroup = d3.select('svg').append('g').attr('id','lineGroup');

// add annotations
d3.select("svg")
  .append("g")
  .attr("transform",
  "translate("+margin.left+","+margin.top+")")
  .attr("class", "annotation-group")
  .call(makeAnnotations);

d3.select("g.annotations").selectAll("g.annotation-note").style("cursor","pointer");

async function loadData(url, population) {
// Get data from source
    const newdata = await d3.csv(url);  
    newdata.forEach((d) => {
        d.ct = +d.ct;
        d.date = d3.isoParse(d.month);
        d.ctp100k = d.ct / population;
    })
    return newdata;
}

const data = {norfolk: null, buffalo: null, memphis: null};

function init() {
    // norfolk va data, aggregated by month since start of 2020 to present
    const norfolkData = loadData(cityURLs.norfolk, cityPops.norfolk);
    norfolkData.then((v) => {data.norfolk = v; });

    // buffalo ny data, aggregated by month since start of 2020 to present
    const buffaloData = loadData(cityURLs.buffalo, cityPops.buffalo);
    buffaloData.then((v) => {data.buffalo = v; });

    // memphis tn data, aggregated by month since start of 2020 to present
    const memphisData = loadData(cityURLs.memphis, cityPops.memphis);
    memphisData.then((v) => {data.memphis = v; });

    Promise.all([norfolkData, buffaloData, memphisData]).then(vs => {document.getElementById("buffaloCb").checked = true; toggleCity("buffalo");})
}

function changeTime(change) {

    endYear = endYear + change;
    if (endYear >= upperEndYear) {
        endYear = upperEndYear;
        document.getElementById("next").disabled = true;
        document.getElementById("next").src = "img/right-disabled-dark.png"
        document.getElementById("scale").innerHTML = scaleHTML;
    }
    else {
        document.getElementById("next").disabled = false;
        document.getElementById("next").src = "img/right-dark.png"
    }
    if (endYear <= lowerEndYear) {
        endYear = lowerEndYear;
        document.getElementById("prev").disabled = true;
        document.getElementById("prev").src = "img/left-disabled-dark.png"
    }
    else {
        document.getElementById("prev").disabled = false;
        document.getElementById("prev").src = "img/left-dark.png"
    }
    
    document.getElementById("h").innerHTML = "Auto Thefts in select US Cities in " + startYear +"-"+endYear

    updatePlot();
}


function toggleCity(city) {
    let cityI = enabledCities.indexOf(city);
    if (cityI == -1) {
        enabledCities.push(city);
    }
    else {
        enabledCities.splice(cityI, 1)
    }
    
    updatePlot();
}

function togglePerCapita() {
    per100k = !per100k
    updatePlot()
}

let linePaths = {};

// calculate max value over domain
function calcYDomain() {

    let cityMaxes = Array(enabledCities.length)

    for (let i = 0; i < enabledCities.length; i++){
        cityMaxes[i] = d3.max(data[enabledCities[i]], (d,j) => {
            if(j < (endYear - startYear + 1) * 12) {
                return per100k ? d.ctp100k : d.ct;
            } else {
                return 0;
            }
        });
    }
    return d3.max(cityMaxes);
}


function updatePlot() {

    // set axis domains
    x.domain([d3.isoParse("01/01/"+startYear),d3.isoParse("12/01/"+endYear)]);
    y.domain([0, calcYDomain()]);

    svg
        .select(".x.axis") 
        .transition()
        .duration(750)
        .call(d3.axisBottom(x));
    
    svg
        .select(".y.axis") 
        .transition()
        .duration(750)
        .call(d3.axisLeft(y));

    // remove deselected cities from plot, state parameter
    Object.keys(linePaths).forEach((city) =>{
            if (enabledCities.indexOf(city) == -1){
                linePaths[city].remove();
                delete linePaths[city];
            }
    })

    // plot data
    enabledCities.forEach((city, i, arr) => {
        // for existing lines, redraw to new scales
        if (city in linePaths){
            linePaths[city].transition()
            .duration(800)
            .attr("d", d3.line(data[city])
                .x((d) => x(d.date))
                .y((d) => y(per100k? d.ctp100k : d.ct)));
        }
        // for new lines, draw from scratch
        else {
            linePaths[city] = lineGroup.append('g')
                .attr("transform",
                    "translate("+margin.left+","+margin.top+")")
                .append("path")
                .data([data[city]])
                .attr("class", "line " + city)
                .attr("d", d3.line(data[city])
                    .x((d) => x(d.date))
                    .y((d) => y(per100k? d.ctp100k : d.ct)));
        }
    })

    makeAnnotations.annotations(annotations);
    makeAnnotations.update();
}


