// global variables
var restaurantData; // array with csv data
var columns; // store columns in csv

var sentimentMatrixSvg;
var sWidth;
var sHeight;
var sInnerWidth;
var sInnerHeight;

var timeSeriesSvg;
var tWidth;
var tHeight;
var tInnerWidth;
var tInnerHeight;

var keywordsRadarSvg;
var kWidth;
var kHeight;
var kInnerWidth;
var kInnerHeight;

var cognitiveViewSvg;
var cWidth;
var cHeight;
var cInnerWidth;
var cInnerHeight;

var barsSvg;
var bWidth;
var bHeight;
var bInnerWidth;
var bInnerHeight;

var scatterSvg;
var scWidth;
var scHeight;
var scInnerWidth;
var scInnerHeight;

var wordCount;
var topWords;
var reviews;

// 'location' or 'cuisine'
var selectedCategory = '';
var selectedFilter = '';
var uniqueLocations = new Set();
var uniqueCuisines = new Set();
var attributes;

const green_color = "#69b3a2";

//import * as sentimentMatrix from './sentimentMatrix.js';

// runs once HTML page is loaded on browser
document.addEventListener('DOMContentLoaded', function () {
    margin = { top:20, bottom: 20, right: 20, left: 20 };
    
    // reference sentiment matrix svg and get its dimensions
    sentimentMatrixSvg = d3.select('#sentimentMatrix_svg');
    sWidth = +sentimentMatrixSvg.style('width').replace('px','');
    sHeight = +sentimentMatrixSvg.style('height').replace('px',''); 

    // margins for padding (sentiment matrix)
    sInnerWidth = sWidth - margin.left - margin.right;
    sInnerHeight = sHeight - margin.top - margin.bottom;

    // reference time series svg and get its dimensions
    timeSeriesSvg = d3.select('#timeSeries_svg');
    tWidth = +timeSeriesSvg.style('width').replace('px','');
    tHeight = +timeSeriesSvg.style('height').replace('px',''); 

    // margins for padding (time series)
    tInnerWidth = tWidth - margin.left - margin.right;
    tInnerHeight = tHeight - margin.top - margin.bottom;

    // reference keywords radar svg and get its dimensions
    keywordsRadarSvg = d3.select('#keywordsRadar_svg');
    kWidth = +keywordsRadarSvg.style('width').replace('px','');
    kHeight = +keywordsRadarSvg.style('height').replace('px',''); 

    // margins for padding (keywords radar)
    kInnerWidth = kWidth - margin.left - margin.right;
    kInnerHeight = kHeight - margin.top - margin.bottom;

    // reference cognitive view svg and get its dimensions
    cognitiveViewSvg = d3.select('#cognitiveView_svg');
    cWidth = +cognitiveViewSvg.style('width').replace('px','');
    cHeight = +cognitiveViewSvg.style('height').replace('px',''); 

    // margins for padding (cognitive view)
    cInnerWidth = cWidth - margin.left - margin.right;
    cInnerHeight = cHeight - margin.top - margin.bottom;

    // reference scatter plot svg and get its dimensions
    scatterSvg = d3.select('#scatter_svg');
    scWidth = +scatterSvg.style('width').replace('px','');
    scHeight = +scatterSvg.style('height').replace('px',''); 

    // margins for padding (scatter plot)
    scInnerWidth = scWidth - margin.left - margin.right;
    scInnerHeight = scHeight - margin.top - margin.bottom;

    // reference bars svg and get its dimensions
    barsSvg = d3.select('#bars_svg');
    bWidth = +barsSvg.style('width').replace('px','');
    bHeight = +barsSvg.style('height').replace('px',''); 

    // margins for padding (bars)
    bInnerWidth = bWidth - margin.left - margin.right;
    bInnerHeight = bHeight - margin.top - margin.bottom;

    // load the csv and store it in an array
    Promise.all([d3.csv('data/modified_final.csv')])
        .then(function (values) {
            //console.log('Loaded the output.csv');
            restaurantData = values[0];
            
        //create matrix_data: database that only contains our necessary attributes
            attributes = ['name','food_score_pos','ambience_score_pos','service_score_pos',
                'comfort_score_pos','food_score_neg','ambience_score_neg','service_score_neg'
                ,'comfort_score_neg','food_count_pos','ambience_count_pos','service_count_pos'
                ,'comfort_count_pos','food_count_neg','ambience_count_neg','service_count_neg'
                ,'comfort_count_neg','food_emotional_count','food_non_emotional_count','ambience_emotional_count',
                'ambience_non_emotional_count','service_emotional_count',
                'service_non_emotional_count','comfort_emotional_count',
                'comfort_non_emotional_count', 'average_positive','average_negative']; //need to add emotional and non emotional entity distributions
            // ,'emotional_keyword_count', 'non-emotional_keyword_count', 'average_positive', 'average_negative'
            //,
            
            matrix_data = restaurantData.map(item => {
                const matrixItem = {};
                attributes.forEach(attr => {
                    matrixItem[attr] = item[attr];
                });
                return matrixItem;
            });
            generateSentimentMatrixView(matrix_data);
            //console.log(matrix_data)

            // print out all column names
            columns = Object.keys(restaurantData[0]);
            //console.log("Columns:", columns);

            restaurantData.forEach(function(restaurant) {
                uniqueLocations.add(restaurant.location);
                var cuisines = restaurant.cuisines.split(',').map(cuisine => cuisine.trim());
                cuisines.forEach(cuisine => uniqueCuisines.add(cuisine));
            });

            // data wrangling
            restaurantData.forEach(function(d) {
                // Parse "approx_cost(for two people)" to a number
                d["approx_cost(for two people)"] = +d["approx_cost(for two people)"];
            });

            // calls function to generate time series
            generateTimeSeries(restaurantData);

            // calls function to generate keywords radar
            generateKeywordsRadar(restaurantData);

            // calls function to generate cognitive view
            generateCognitiveView(restaurantData);

            // calls function to generate scatter plot
            generateScatterPlot(restaurantData);

            reviews = getReviews(restaurantData); // reviews with restaurant

            // calls function to generate UCG
            generateUCG(restaurantData);
            
            changeCategory("No Selected Category");
            
        });

});

function generateUCG(data) {
    // function to get words and corresponding word count for reviews in 'reviews_list'
    const wordCount = {};

    // column holding all the reviews
    const columnName = 'reviews_list';

    // get the entire column in data set holding the reviews
    const specificColumn = data.map(row => row[columnName]);

    //console.log(specificColumn);

    // structure of reviews_list (match[0] holds rating and match[1] holds reviews)
    const regex = /\('Rated [\d.]+', 'RATED\\n\s+(.*?)'\)/g;

    // let reviews = getReviews(data)

    let review_data = []

    let i = 0
    specificColumn.forEach(reviews => {
        while ((match = regex.exec(reviews)) !== null) {
            const review = match[1];
            // remove symbols (potentially emojis)
            const editedReview = review.replace(/x8|x8b|x8bn|x8c|x8d|x8dn|x8e|x8f|x8fn|x80|x81|x82|x83|x84|x89|x9|x9c|x91|x92|x94|x98|x9f|\\n/g, ' ');
            let review_temp = {'restaurant':data[i]['name'],'rating': match[0].substring(8,11),'review':editedReview}
            review_data.push(review_temp)
        }
        i++
    })
    // console.log('UGC',review_data)

    let shuffled = review_data
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)

    review_data = shuffled
    if(review_data.length > 100){
        review_data = review_data.slice(0,99)
    }
   
    // console.log(shuffled)

    var ugc = d3.select("#reviews")
    ugc.selectAll('*').remove()

    ugc.selectAll('g')
        .data(review_data)
        .enter()
        .append('g')
        .attr("class","review-rating")
        .attr("id",function(_,i){return "review-" + i})
        .html(function(d){return "<br>" + d['restaurant'] + ': ' + d['rating'] + '<br>'})
        .append('g')
        .attr('class','review-text')
        .html(function(d){return d['review'] + '<br>'})
}


function generateTimeSeries(data) {

}

function generateKeywordsRadar(data) {

    //manual setting location until filtering
    // let location = selectedFilter

    let categories = ["Food", "Ambience", "Service", "Comfort"]

    let restaurant_count = 0
    let food = 0
    let ambience = 0
    let service = 0
    let comfort = 0

    let food_max = data[0]
    let ambience_max = data[0]
    let service_max = data[0]
    let comfort_max = data[0]
    
    for (var i = 0; i < data.length; i++){
        restaurant_count++

        if(parseFloat(data[i]["food_score_pos"]) > food_max["food_score_pos"]){food_max = data[i]}
        if(parseFloat(data[i]["ambience_score_pos"]) > ambience_max["ambience_score_pos"]){ambience_max = data[i]}
        if(parseFloat(data[i]["service_score_pos"]) > service_max["service_score_pos"]){service_max = data[i]}
        if(parseFloat(data[i]["comfort_score_pos"]) > comfort_max["comfort_score_pos"]){comfort_max = data[i]}

        food += parseFloat(data[i]["food_score_pos"])
        ambience += parseFloat(data[i]["ambience_score_pos"])
        service += parseFloat(data[i]["service_score_pos"])
        comfort += parseFloat(data[i]["comfort_score_pos"])
    }

    let radar_data = [{
        "Food": food/restaurant_count,
        "Ambience": ambience/restaurant_count,
        "Service": service/restaurant_count,
        "Comfort": comfort/restaurant_count,
        count: restaurant_count
    }]

    var radarSVG = d3.select('#keywordsRadar_svg')

    radarSVG.selectAll("*").remove()

    let rWidth = parseFloat(radarSVG.style("width"))
    let rHeight = parseFloat(radarSVG.style("height"))

    let radialScale = d3.scaleLinear()
        .domain([0,0.13])
        .range([0,rWidth/5])
    let ticks = [0.02, 0.04, 0.06, 0.08, 0.1,0.12]

    radarSVG.selectAll("circle")
        .data(ticks)
        .join(
            enter => enter.append("circle")
                .attr("cx", rWidth/2)
                .attr("cy", rHeight/2)
                .attr("fill","none")
                .attr("stroke","gray")
                .attr("r", d => radialScale(d))
        )
    radarSVG.selectAll(".ticklabel")
        .data(ticks)
        .join(
            enter => enter.append("text")
                .attr("class", "ticklabel")
                .attr("x", rWidth / 2 + 5)
                .attr("y", d => rHeight / 2 - radialScale(d))
                .text(d => d.toString())
                .style("font-size","8")
                .style('text-anchor','middle')
        )

    function angleToCoordinate(angle, value){
        let x = Math.cos(angle) * radialScale(value);
        let y = Math.sin(angle) * radialScale(value);
        return {"x": rWidth/2 + x, "y": rHeight/2 - y}
    }

    let categoryData = categories.map((f,i) => {
        let angle = (Math.PI/4) + (2*Math.PI*i / categories.length)
        return{
            "name": f,
            "angle": angle,
            "line_coord": angleToCoordinate(angle, 0.135),
            "label_coord": angleToCoordinate(angle,0.14)
        }
    })

    radarSVG.selectAll("line")
        .data(categoryData)
        .join(
            enter => enter.append("line")
                .attr("x1",rWidth/2)
                .attr("y1",rHeight/2)
                .attr("x2", d => d.line_coord.x)
                .attr("y2", d => d.line_coord.y)
                .attr("stroke","black")
        )

    radarSVG.selectAll(".axislabel")
        .data(categoryData)
        .join(
            enter => enter.append("text")
                .attr("x", d => d.label_coord.x)
                .attr("y", d => d.label_coord.y)
                .style("text-anchor",function(d,i){let x = ["start","end","end","start"]; return x[i]})
                .text(d => d.name)
        )

    let line = d3.line()
        .x(d => d.x)
        .y(d => d.y)
    
    function getPathCoords(data_point){
        let coords = []
        for(var i = 0; i <categories.length; i++){
            let cat_name = categories[i]
            let angle = (Math.PI/4) + (2*Math.PI*i/categories.length)
            coords.push(angleToCoordinate(angle,data_point[cat_name]))
        }
        return coords
    }

    radarSVG.selectAll("path")
        .data(radar_data)
        .join(
            enter => enter.append("path")
            .datum(d => getPathCoords(d))
            .attr("d", line)
            .attr("stroke-width",3)
            .attr("stroke", green_color)  //was "green" changed to match other colors theme
            .attr("fill", green_color)    //was "green" changed to match other colors theme
            .attr("stroke-opacity",1)
            .attr("opacity",0.7)        //was ".6" changed to darken color
        )

    let wordCount = getWordCount([food_max])
    let topWords = getTopWords(wordCount)

    var maxSize = d3.max(topWords, function(d){return d.size})
    specificSize = 0.005*(20000/maxSize)

    var layout1 = d3.layout.cloud()
        .size([rWidth/2,rHeight/4])
        .words(topWords.map(function(d){
            return{text: d.word, size: d.size * specificSize};}))
        .padding(5)
        .rotate(function(){return ~~(Math.random()*2)*90})
        .fontSize(function(d){return d.size})
        .on("end",draw1);
    layout1.start()

    function draw1(words){

        radarSVG.append('g')
            .attr('transform','translate(' + 3*rWidth/4+','+rHeight/5+')')
            .selectAll('text')
            .data(words)
            .enter()
            .append('text')
            .style('font-size', d=> d.size+'px')
            .style("fill", green_color)
            .attr("text-anchor", "middle")
            .style("font-family", "Impact")
            .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
            
    }

    wordCount = getWordCount([ambience_max])
    topWords = getTopWords(wordCount)

    maxSize = d3.max(topWords, function(d){return d.size})
    specificSize = 0.005*(20000/maxSize)

    var layout2 = d3.layout.cloud()
        .size([rWidth/2,rHeight/4])
        .words(topWords.map(function(d){
            return{text: d.word, size: d.size * specificSize};}))
        .padding(5)
        .rotate(function(){return ~~(Math.random()*2)*90})
        .fontSize(function(d){return d.size})
        .on("end",draw2);
    layout2.start()

    function draw2(words){
        
        radarSVG.append('g')
            .attr('transform','translate(' + rWidth/4 + ',' + rHeight/5 + ')')
            .selectAll('text')
            .data(words)
            .enter()
            .append('text')
            .style('font-size', d=> d.size+'px')
            .style("fill",green_color)
            .attr("text-anchor", "middle")
            .style("font-family", "Impact")
            .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
            
    }

    wordCount = getWordCount([service_max])
    topWords = getTopWords(wordCount)

    maxSize = d3.max(topWords, function(d){return d.size})
    specificSize = 0.005*(20000/maxSize)

    var layout3 = d3.layout.cloud()
        .size([rWidth/2,rHeight/4])
        .words(topWords.map(function(d){
            return{text: d.word, size: d.size * specificSize};}))
        .padding(5)
        .rotate(function(){return ~~(Math.random()*2)*90})
        .fontSize(function(d){return d.size})
        .on("end",draw3);
    layout3.start()

    function draw3(words){

        radarSVG.append('g')
            .attr('transform','translate(' + rWidth/4+','+3.15*rHeight/4+')')
            .selectAll('text')
            .data(words)
            .enter()
            .append('text')
            .style('font-size', d=> d.size+'px')
            .style('fill',green_color)
            .attr("text-anchor", "middle")
            .style("font-family", "Impact")
            .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
            
    }

    wordCount = getWordCount([comfort_max])
    topWords = getTopWords(wordCount)

    maxSize = d3.max(topWords, function(d){return d.size})
    specificSize = 0.005*(20000/maxSize)

    var layout4 = d3.layout.cloud()
        .size([rWidth/2,rHeight/4])
        .words(topWords.map(function(d){
            return{text: d.word, size: d.size * specificSize};}))
        .padding(5)
        .rotate(function(){return ~~(Math.random()*2)*90})
        .fontSize(function(d){return d.size})
        .on("end",draw4);
    layout4.start()

    function draw4(words){
        
        radarSVG.append('g')
            .attr('transform','translate(' + 3*rWidth/4+','+3.15*rHeight/4+')')
            .selectAll('text')
            .data(words)
            .enter()
            .append('text')
            .style('font-size', d=> d.size+'px')
            .style('fill',green_color)
            .attr("text-anchor", "middle")
            .style("font-family", "Impact")
            .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
            
    }
    
}

function generateCognitiveView(data) {
    d3.select("#cognitiveView_svg").selectAll('*').remove();

    // generate the bars above the word cloud
    generateBars(data);
    
    //calculating words for word cloud
    wordCount = getWordCount(data);
    topWords = getTopWords(wordCount);

    var maxSize = d3.max(topWords, function(d) { return d.size; });
    specificSize = 0.002 * (20000 / maxSize);

    // generate word cloud based off dictionary
    var layout = d3.layout.cloud()
        .size([cWidth, cHeight])
        .words(topWords.map(function(d) { 
            return {text: d.word, size: d.size * specificSize}; }))
        .padding(5)
        .rotate(function() { return ~~(Math.random() * 2) * 90; })
        .fontSize(function(d) { 
            return d.size; }) // font size of words
        .on("end", draw);
    layout.start();

    function draw(words) {
        //console.log(words);

        var maxCount = d3.max(words, function(d) {
            return d.size;
        });

        // create scale based off max
        var fontSizeScale = d3.scaleLog()
            .domain([0, maxCount])
            .range([10, 60]);

        cognitiveViewSvg
            .append("g")
            .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", function(d) { 
                return d.size + "px"; })
            .style("fill", "#d5a773")
            .attr("text-anchor", "middle")
            .style("font-family", "Impact")
            .attr("transform", function(d) {
              return "translate(" + d.x + "," + d.y + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
    }
}



function scatterFilter(data) {
    return data.filter(d => {
        // Check if "approx_cost(for two people)" is not NaN
        const cost = parseFloat(d["approx_cost(for two people)"]);
        if (isNaN(cost)) {
            return false;
        }

        // Check if votes is greater than 0
        const votes = parseFloat(d.votes);
        if (!(votes > 0)) {
            return false;
        }

        return true;
    });
}

function generateScatterPlot(data) {
    //console.log("scatter plot")

    // Remove any existing elements from the scatter plot SVG
    scatterSvg.selectAll("*").remove();

    //console.log(data)

    //filter out data that cannot be used/will throw errors
    const filteredData = scatterFilter(data);

    // Create scales for the scatter plot
    const xMin = d3.min(filteredData, d => d["approx_cost(for two people)"]);
    const xMax = d3.max(filteredData, d => d["approx_cost(for two people)"]);
    const yMin = d3.min(filteredData, d => parseFloat(d["comfort_emotional_count"]) + parseFloat(d["service_emotional_count"]) + parseFloat(d["food_emotional_count"]));
    const yMax = d3.max(filteredData, d => parseFloat(d["comfort_emotional_count"]) + parseFloat(d["service_emotional_count"]) + parseFloat(d["food_emotional_count"]));

    // Add some padding to the domain ranges
    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.1;

    const xScale = d3.scaleLinear()
        .domain([xMin - xPadding, xMax + xPadding])
        .range([margin.left, scInnerWidth - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([yMin - yPadding, yMax + yPadding])
        .range([scInnerHeight - margin.bottom, margin.top + 40]);

    // Create Exponential scale for the circle radius based on the number of reviews
    const radiusScale = d3.scalePow()
        .exponent(2)
        .domain(d3.extent(filteredData, d => Math.abs(d.votes)))
        .range([1.4, 30]);

    // Define x and y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    // Add x and y axes to the scatter plot SVG
    scatterSvg.append("g")
        .attr("transform", `translate(20, ${scInnerHeight - margin.bottom - 40})`)
        .call(xAxis);

    scatterSvg.append("g")
        .attr("transform", `translate(${margin.left + 20}, -40)`)
        .call(yAxis);

    // Add x and y axis labels
    scatterSvg.append("text")
        .attr("x", scInnerWidth / 2)
        .attr("y", scInnerHeight - margin.bottom / 2)
        .attr("text-anchor", "middle")
        .text("Approximate Cost (for two people)");

    scatterSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -scInnerHeight / 2)
        .attr("y", margin.left / 2 + 1)
        .attr("text-anchor", "middle")
        .text("Emotional Score");

    // Add the actual scatter plot points
    const dots = scatterSvg.selectAll("circle")
        .data(filteredData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d["approx_cost(for two people)"]))
        .attr("cy", d => yScale(parseFloat(d["comfort_emotional_count"]) + parseFloat(d["service_emotional_count"]) + parseFloat(d["food_emotional_count"])))
        .attr("r", d => radiusScale(Math.abs(d.votes)))
        .style("fill", green_color);


    //CREATING THE LEGEND

    //Adding a seperate group for the legend
    const legendGroup = scatterSvg.append("g")
        //Setting it in the top left corner
        .attr("transform", `translate(${70}, ${margin.top  + 20})`);

    
    // Define the legend data
    const legendData = [
        { label: "High Popularity", radius: radiusScale.range()[1] / 2 },
        { label: "Medium Popularity", radius: (radiusScale.range()[0] + radiusScale.range()[1]) / 4.5 },
        { label: "Low Popularity", radius: radiusScale.range()[0] * 1.5}
    ];

    // Add legend circles
    legendGroup.selectAll("circle")
        .data(legendData)
        .enter()
        .append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 30)
        .attr("r", d => d.radius)
        .style("fill", green_color);

    // Add legend labels
    legendGroup.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 30 + 5)
        .text(d => d.label);
    
    //console.log("end of scatter plot")
 }


function getWordCount(data) {
    // function to get words and corresponding word count for reviews in 'reviews_list'
    const wordCount = {};

    // column holding all the reviews
    const columnName = 'reviews_list';

    // get the entire column in data set holding the reviews
    const specificColumn = data.map(row => row[columnName]);

    //console.log(specificColumn);

    // structure of reviews_list (match[0] holds rating and match[1] holds reviews)
    const regex = /\('Rated [\d.]+', 'RATED\\n\s+(.*?)'\)/g;

    specificColumn.forEach(reviews => {
        while ((match = regex.exec(reviews)) !== null) {
            const review = match[1];
            // remove symbols (potentially emojis)
            const editedReview = review.replace(/x8|x8b|x8bn|x8c|x8d|x8dn|x8e|x8f|x8fn|x80|x81|x82|x83|x84|x89|x9|x9c|x91|x92|x94|x98|x9f/g, ' ');
            // split review into indivual words, take out punctuation and turn to lowercase
            const words = editedReview.replace(/[^\w\s]/g, '').toLowerCase().split(/\s+/);
    
            const editedWords = filterWords(words);

            for (const word of editedWords) {
                // if word exists and is not a number
                if (word && isNaN(word)) {
                    if (wordCount[word] != undefined) {
                        // word entry in dictionary already, increment count
                        wordCount[word] = wordCount[word] + 1;
                    } else {
                        // word entry not in dictionary, create new and set count to 1
                        wordCount[word] = 1;
                    }
                }
            }
        }
    });

    return wordCount;
}

function filterWords(words) {
    // take out stop/filler words
    const commonWords = ['2s', 'a', 'about', 'after', 'again', 'all', 'also', 'an', 'any', 'and', 'am', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'even', 'for', 'from', 'get', 'go', 'got', 'had', 'has', 'have', 'here', 'i', 'if', 'in', 'is', 'it', 'its', 'just', 'made', 'me', 'must', 'my', 'n', 'not', 'of', 'on', 'or', 'other', 'our', 'out', 'place', 'so', 'some', 'take', 'that', 'the', 'their', 'there', 'them', 'they', 'this', 'to', 'too', 'u', 'us', 'very', 'was', 'we', 'well', 'went', 'were', 'what', 'when', 'which', 'who', 'will', 'with', 'would', 'you', 'your'];

    const filteredWords = words.filter(word => !commonWords.includes(word));

    return filteredWords;
}

function getTopWords(wordCount) {
    // convert the dictionary into an array of [word, count] pairs for sorting purposes
    const wordCountArray = Object.entries(wordCount);

    // sort the array by count in descending order
    wordCountArray.sort((a, b) => b[1] - a[1]);

    // get the top 80 words (by word count)
    const topWords = wordCountArray.slice(0, 80);

    var formattedWords = topWords.map(function(item) {
        return { word: item[0], size: item[1].toString() };
    });

    //console.log(topWords);

    return formattedWords;

}

function getReviews(data) {
    // get restaurant and its corresponding reviews for UCG
    const reviewColumn = 'reviews_list';
    // form is an array of objects
    // where object is restaurant: string, review: array
    const restaurantReview = data.map(function(d) { return {restaurant: d.name, reviews: d.reviews_list} });
    //console.log(restaurantReview);

    return restaurantReview;
}

function changeCategory(selected) {
    selectedCategory = selected;
    
    if (selectedCategory == 'Location') {
        document.getElementById('search').disabled = false;
        populateOptions('search', Array.from(uniqueLocations));
        filter(Array.from(uniqueLocations)[0]);
    } else if (selectedCategory == 'Cuisine') {
        document.getElementById('search').disabled = false;
        populateOptions('search', Array.from(uniqueCuisines));
        filter(Array.from(uniqueCuisines)[0]);
    } else if (selectedCategory == 'No Selected Category') {
        document.getElementById('search').disabled = true;
        // no filter applied and all restaurant data is shown
        const emptyArray = [];
        populateOptions('search', emptyArray);

        matrix_data = restaurantData.map(item => {
            const matrixItem = {};
            attributes.forEach(attr => {
                matrixItem[attr] = item[attr];
            });
            return matrixItem;
        });
        (matrix_data);

        generateSentimentMatrixView(matrix_data);
        generateTimeSeries(restaurantData);
        generateKeywordsRadar(restaurantData);
        generateCognitiveView(restaurantData);
        generateScatterPlot(restaurantData);
        reviews = getReviews(restaurantData);
        generateUCG(restaurantData);
    }
}

function filter(selected) {
    selectedFilter = selected;
    //console.log(selectedFilter);
    var data;
    var sizing;
    // apply logic when specific location or cuisine is selected
    if (selectedCategory == 'Location') {
        data = restaurantData.filter(function(restaurant) {
            return restaurant.location == selectedFilter;
        });
    } else if (selectedCategory == 'Cuisine') {
        data = restaurantData.filter(function(restaurant) {
            // Split the cuisines string and trim each cuisine
            var cuisines = restaurant.cuisines.split(',').map(cuisine => cuisine.trim());
            // Check if the selected cuisine exists in the list of cuisines for this restaurant
            return cuisines.includes(selectedFilter);
        });
    }

    matrixData = data.map(item => {
        const matrixItem = {};
        attributes.forEach(attr => {
            matrixItem[attr] = item[attr];
        });
        return matrixItem;
    });
    generateSentimentMatrixView(matrixData);

    generateTimeSeries(data);
    generateKeywordsRadar(data);
    generateCognitiveView(data);
    generateScatterPlot(data);
    reviews = getReviews(data);
    generateUCG(data);
}

function populateOptions(select, array) {
    const selectElement = document.getElementById(select);
    // clear all current options
    selectElement.innerHTML = '';
    // populate options
    array.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        selectElement.appendChild(optionElement);
    });
}

function generateBars(data) {
    let foodCount = 0;
    let serviceCount = 0;
    let ambienceCount = 0;
    let comfortCount = 0;
    
    data.forEach(row => {
        foodCount += parseInt(row.food_count_pos) + parseInt(row.food_count_neg) + parseInt(row.food_non_emotional_count);
        serviceCount += parseInt(row.service_count_pos) + parseInt(row.service_count_neg) + parseInt(row.service_non_emotional_count);
        ambienceCount += parseInt(row.ambience_count_pos) + parseInt(row.ambience_count_neg) + parseInt(row.ambience_non_emotional_count);
        comfortCount += parseInt(row.comfort_count_pos) + parseInt(row.comfort_count_neg) + parseInt(row.comfort_non_emotional_count);
    });

    const total = foodCount + serviceCount + ambienceCount + comfortCount;
    const foodPercentage = (foodCount / total) * 100;
    const servicePercentage = (serviceCount / total) * 100;
    const ambiencePercentage = (ambienceCount / total) * 100;
    const comfortPercentage = (comfortCount / total) * 100;

    //console.log("food", foodPercentage);
    //console.log("service", servicePercentage);
    //console.log("ambience", ambiencePercentage);
    //console.log("comfortPercentage", comfortPercentage);

    d3.select('#bars_svg').selectAll("*").remove();

    const svg = d3.select('#bars_svg');

    const labels = ["Food", "Service", "Ambience", "Comfort"];

    // gray rectangles
    svg.selectAll(".gray-rect")
      .data(labels)
      .enter()
      .append("rect")
      .attr("class", "gray-rect")
      .attr("x", 90)
      .attr("y", (d, i) => 7 + i * 30)
      .attr("width", 270)
      .attr("height", 7)
      .attr("fill", "#ebeef5")
      .attr("rx", 6)
      .attr("ry", 6);
    
    // colored rectangles on top based off percentage (multiplied by 2.7 because the gray bars are 270px)
    svg.append("rect")
      .attr("x", 90)
      .attr("y", 8)
      .attr("width", foodPercentage * 2.7)
      .attr("height", 6)
      .attr("fill", "#d2a36e")
      .attr("rx", 6)
      .attr("ry", 6);
    
    svg.append("rect")
      .attr("x", 90)
      .attr("y", 37)
      .attr("width", servicePercentage * 2.7)
      .attr("height", 7)
      .attr("fill", "#c1c19d")
      .attr("rx", 6)
      .attr("ry", 6);
    
    svg.append("rect")
      .attr("x", 90)
      .attr("y", 67)
      .attr("width", ambiencePercentage * 2.7)
      .attr("height", 7)
      .attr("fill", "#a4aab4")
      .attr("rx", 6)
      .attr("ry", 6);
    
    svg.append("rect")
      .attr("x", 90)
      .attr("y", 97)
      .attr("width", comfortPercentage * 2.7)
      .attr("height", 7)
      .attr("fill", "#535b66")
      .attr("rx", 6)
      .attr("ry", 6);
    
    // text labels for each bar
    svg.selectAll(".category")
      .data(labels)
      .enter()
      .append("text")
      .attr("class", "category")
      .attr("x", 25)
      .attr("y", (d, i) => 15 + i * 30)
      .attr("fill", "gray")
      .attr("font-size", "12px")
      .text(d => d);

}
