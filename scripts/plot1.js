var year = [1990, 2015];
var arable_land1 = [0.33933, 0.3885];
var country1 = 'Brazil';

var trace1 = {
  x:year,
  y:arable_land1,
  mode:'lines+markers', //could also be 'markers'
  type:'scatter',
  name: country1
};

var arable_land2 = [0.1507, 0.1451];
var country2 = 'Germany';
var trace2 = {
  x:year,
  y:arable_land2,
  mode:'lines+markers',
  type:'scatter',
  name:country2
};

var data = [trace1, trace2];

var layout = {

  title:'Change in Hectares of Arable Land <br> Per Person in Brazil 1990 to 2015',
  xaxis: {
    title: 'year',
    tick0:1990,
    dtick:25
  },
  yaxis: {
    title:'hectares per person'
  }
};

Plotly.newPlot('plot1', data, layout);
