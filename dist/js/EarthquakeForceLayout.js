/**
 * Force layout to show the relative energy release of earthquakes
 */

function EarthquakeForceLayout(options)
{
    var self = this;
    
    self.options = options;
    
    // main update method to expose API
    function chart()
    {
    }
    
    chart.hideChart = function()
    {
        self.svg
            .attr('width',0)
            .attr('height',0);
        
        return chart;
    };
    
    chart.showChart = function()
    {
        chart.onWindowResize();
        
        return chart;
    };
    
    chart.velocityDecay = function(d)
    {
        if( !arguments.length )
        {
            return self.velocityDecay;
        }
        self.velocityDecay = d;
        self.simulation.velocityDecay(self.velocityDecay)
        
        return chart;
    };
    
    
    chart.clearNodes = function(d)
    {
        self.simulation.stop();
        
        self.svg.selectAll('.bubble').remove();
        self.nodes = [];
        
        updateRadiusScale(2);
        
        return chart;
    };
    
    chart.updateDepthScale = function(min, max)
    {
        if(min === undefined)
        {
            min = d3.min(self.nodes, function(d)
            {
                return d.depth;
            });
            return;
        }
        if(max === undefined)
        {
            max = d3.max(self.nodes, function(d)
            {
                return d.depth;
            });
            return;
        }
        
        var baseAxis = self.height * 0.94;
        var scaleHeight = (baseAxis - self.yTarget) * 2;
        self.depthAxisTop = baseAxis - scaleHeight;
        
        self.eqDepthScale = d3.scaleLinear()
            .domain([min, max])
            .range([self.depthAxisTop, baseAxis]);
        
        var leftAxis = self.width * 0.06;
        var fontsize = self.width * 0.10; // percent
        
        self.svg.selectAll(".depth-scale").remove();
        
        var depthScaleG = self.svg.append("g")
            .attr("class", "depth-scale");
        
        // Add the y Axis
        depthScaleG.append("g")
            .attr('class', 'depth-scale-labels')
            .style('font-size', fontsize + '%')
            .call(d3.axisLeft(self.eqDepthScale).ticks(3, 's').tickFormat(function(d)
            {
                return d + " km";
            }))
            .attr("transform",
                "translate(" + leftAxis + "," + 0 + ")");
        
        // text label for the y axis
        depthScaleG.append("text")
            .attr('class', 'depth-scale-labels')
            .style('font-size', fontsize + '%')
            .attr("transform", "translate(" + (leftAxis - fontsize / 5 ) + "," + (self.depthAxisTop - fontsize / 4) + ")")
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Depth");
        
        return chart;
    };
    
    chart.updateTimeScale = function(min, max)
    {
        if(min === undefined)
        {
            min = d3.min(self.nodes, function(d)
            {
                return d.time;
            });
        }
        if(max === undefined)
        {
            max = d3.max(self.nodes, function(d)
            {
                return d.time;
            });
        }
        
        self.eqTimeScale = d3.scaleLinear()
            .domain([min, max])
            .range([self.width * 0.06, self.width * 0.93]);
        
        var minD = new Date(min);
        var maxD = new Date(max);
        if(minD.toLocaleDateString() === "Invalid Date"
            || maxD.toLocaleDateString() === "Invalid Date")
        {
            return chart;
        }
        
        self.svg.selectAll(".date-labels").remove();
        
        self.svg.selectAll(".time-scale").remove();
        
        var fontsize = self.width * 0.10; // percent
        var baseAxis = self.height * 0.94;
        var timeScaleG = self.svg.append("g")
            .attr("class", "time-scale");
        
        // Add the y Axis
        timeScaleG.append("g")
            .attr('class', 'time-scale-labels')
            .style('font-size', fontsize + '%')
            .call(d3.axisBottom(self.eqTimeScale)
                    .tickFormat(function(d,i){
                        // use mean as chart label to conserve height
                        if( i == 1 )
                        {
                            return "Time Scale";
                        }
                        var D = new Date(d);
                        return D.toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric' } );
                    })
                .tickValues([min, (min + max) * 0.5, max])
            )
            .attr("transform",
                "translate(" + 0 + "," + baseAxis + ")");
        
        return chart;
    };
    
    chart.onWindowResize = function()
    {
        if(d3.select("#" + self.options.divId) === undefined)
        {
            self.width = 200;
            self.height = 200;
        }
        else
        {
            self.width = d3.select("#" + self.options.divId).node().getBoundingClientRect().width;
            self.height = d3.select("#" + self.options.divId).node().getBoundingClientRect().height;
        }

        self.yTarget = 0.85 * self.height;

        self.svg.attr("width", self.width)
            .attr("height", self.height)
        ;

        updateRadiusScale(self.maxEarthquakeMagnitude);

        chart.updateDepthScale();
    };
    
    chart.onStartRender = function(eqlist)
    {
        chart.clearNodes();
        
        updateRadiusScale(self.maxEarthquakeMagnitude);
        
        var minD = d3.min(eqlist, function(d){ return d.geometry.coordinates[2]; });
        var maxD = d3.max(eqlist, function(d){ return d.geometry.coordinates[2]; });
        // force 100 km depth for short sequences with few deep earthquakes
        if( maxD < 100 )
            maxD = 100;
        chart.updateDepthScale(minD,maxD);
        
        var min = d3.min(eqlist, function(d){ return d.properties.time; });
        var max = d3.max(eqlist, function(d){ return d.properties.time; });
        chart.updateTimeScale(min,max);
        
        return chart;
    };
    
    chart.addEarthquakeBubble = function(d) {
        
        var newbub = bubbleData(d);
        
        if( newbub.magnitude > self.maxEarthquakeMagnitude )
        {
            self.maxEarthquakeMagnitude = newbub.magnitude;
            updateRadiusScale(newbub.magnitude);
        }
        self.nodes.push(newbub);
        
        // keep array sorted by magnitude to ensure that big circles don't occlude smaller ones
        self.nodes.sort(function(a,b){return b.magnitude - a.magnitude; });
        
        // Bind nodes data to what will become DOM elements to represent them.
        self.bubbles = self.svg.selectAll('.bubble')
            .data(self.nodes, function(d){ return d.id; });
        
        // Create new circle elements each with class `bubble`.
        // There will be one circle.bubble for each object in the nodes array.
        // Initially, their radius (r attribute) will be 0.
        // @v4 Selections are immutable, so lets capture the
        //  enter selection to apply our transtition to below.
        var bubblesE = self.bubbles.enter().append('g')
            .classed('bubble', true)
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            ;
        
        bubblesE
        // append an <a> to provide a link upon click to the USGS url
            .append("a")
            // add the usgs link as an attribute
            .attr("xlink:href", function(d) { return d.url; })
            // open link in new window
            .attr("target","_blank")
            .append('circle')
            .attr('class','bubble-circle')
            .attr('fill', d.fill )
            .attr('r', d.startRadius )
            .on("mouseover", function(d) { onMouseOverBubble(d,this); })
            .on("mouseout", function(d) { onMouseOutBubble(d,this); })
        ;
        
        bubblesE.append("text")
            .attr('class','bubble-text')
            .style("font-size", "0px" )
            .text("H")
            .attr("dy", function(d) { return "." + Math.round(d.radius/3.5) + "em"; });
        
        // @v4 Merge the original empty selection and the enter selection
        self.bubbles = self.bubbles.merge(bubblesE);
        
        // Set the simulation's nodes to our newly created nodes array.
        // @v4 Once we set the nodes, the simulation will start running automatically!
        self.simulation.nodes(self.nodes);
        
        self.simulation.alphaTarget(1).restart();
    };
    
    // PRIVATE
    
    // gets only the data we need from the earthquake object
    // and returns as a new object
    function bubbleData(d) {
        var newbub = {
            id: d.id,
            url: d.properties.url,
            time: d.properties.time,
            depth: +d.geometry.coordinates[2],
            magnitude: +d.properties.mag,
            startRadius: d.startRadius,
            radius: d.startRadius,
            place: d.properties.place,
            startX: d.startX,
            startY: d.startY,
            x: d.startX,
            y: d.startY
        };
        return newbub;
    }
    
    function onMouseOverBubble(d,circle)
    {
        d3.select(circle).style('stroke-width',2);
        self.popupDiv.transition()
            .duration(200)
            .style("opacity", .9);
        var placeSplit = d.place.split(" of ");
        var date = new Date(d.time);
        self.popupDiv.html("<strong>M" + d.magnitude + "</strong> at <strong>"
                + Math.round(d.depth) + "km </strong> depth<br/>"
                + placeSplit.join(" of <br/>")
                + "<br/>" + date.toLocaleDateString()+ " "
                + date.toLocaleTimeString()
            )
            .style("overflow","hidden")
            .style("left", (d.x+5) + "px")
            .style("top", (d.y-50) + "px");
        d3.select(circle.parentNode)
            .append("line")
            .attr("class","bubble-connector-line")
            .attr("x1",d.startX-d.x)
            .attr("y1",d.startY-d.y)
            .attr("x2",0)
            .attr("y2",0);
    }
    
    function onMouseOutBubble(d,circle)
    {
        d3.select(circle).style('stroke-width',0.5);
    
        d3.select(circle.parentNode).selectAll("line").remove();
    
        self.popupDiv.transition()
            .duration(500)
            .style("opacity", 0);
    }
    
    // converts an earthquake magnitude to energy in joules
    function magToEnergy(mag) {
        
        // E = 10 ^ (11.8 + 1.5M) -> https://earthquake.usgs.gov/learn/topics/measure.php
        var e = Math.pow(10, 11.8 + 1.5 * mag);
        // convert to joules and return
        // (ergs to joules: 1 erg = 10-7 Joules)
        return e * 1e-7;
    }
    
    // convenience method to convert magnitude to radius directly
    function magToRadius(mag) {
        
        return self.earthquakeRadiusScale(magToEnergy(mag));
    }
    
    /*
     * Callback function that is called after every tick of the
     * force simulation.
     * Here we do the actual repositioning of the SVG circles
     * based on the current x and y values of their bound node data.
     * These x and y values are modified by the force simulation.
     */
    function ticked() {
        if( self.bubbles === undefined ) { return; }
        
        // FORMATTING FUNCTIONS
        // returns a nice magnitude string 4 or 4.6, not 4. , rounds up
        function magSubString(d) {
            var l = Math.floor(d.radius/2);
            switch(l) {
                case 0:
                    return "";
                    break;
                case 1:
                    return (""+d.magnitude).substring(0, l);
                    break;
                case 2:
                    return Math.round(d.magnitude);
                    break;
                default:
                    return (""+d.magnitude).substring(0, 3);
            }
        }
        // returns the correct font size based on radius
        function fontSize(d) {
            d.fontsize = Math.floor(d.radius/3);
            return d.fontsize + "px";
        }
        
        // set x,y of starting point of the line (for mouseover capability)
        self.bubbles
            .select("a")
            .select("line")
            .attr("x1",function(d){return d.startX-d.x;})
            .attr("y1",function(d){return d.startY-d.y;});
        
        // update bubble size
        self.bubbles
            .select("a")
            .select("circle")
            .transition()
            .duration(self.defaultDuration)
            .attr('r', function (d) {
                d.radius = magToRadius(d.magnitude);
                return d.radius;
            });
        
        // scale the text appropriately
        self.bubbles.select("text")
            .transition()
            .duration(self.defaultDuration)
            .style("font-size", fontSize)
            .text(magSubString)
            .attr("dy", function(d) { return d.fontsize / 2 + "px"; });
        
        // move the base "g" elements to the appropriate location based on force
        self.bubbles
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
    }
    
    // runs the main simulation to direct the bubbles
    function runSimulation()
    {
        // Charge function that is called for each node.
        // As part of the ManyBody force.
        // This is what creates the repulsion between nodes.
        function charge(d)
        {
            return -Math.pow(d.radius, 2) * self.forceStrength * 0.5;
        }
        
        function depthSort(d)
        {
            return self.eqDepthScale(d.depth);
        }
        
        function timeSort(d)
        {
            return self.eqTimeScale(d.time);
        }
        
        // Here we create a force layout and
        // @v4 We create a force simulation now and
        //  add forces to it.
        self.simulation = d3.forceSimulation()
            .velocityDecay(self.velocityDecay)
            .force('depth-align', d3.forceY().strength(self.forceStrength * 5).y(depthSort))
            .force('charge', d3.forceManyBody().strength(charge))
            .force('time-align', d3.forceX().strength(self.forceStrength * 5).x(timeSort))
            .on('tick', ticked);
        
        // @v4 Force starts up automatically,
        //  which we don't want as there aren't any nodes yet.
        self.simulation.stop();
    }
    
    // updates the radius scale to include the new maxium radius value based on the magnitude
    function updateRadiusScale(newMax) {
        
        var largerDim = self.width > self.height ? self.width : self.height;
        self.earthquakeRadiusScale = d3.scaleLinear()
            .domain([0, magToEnergy(newMax)])
            .range([1, largerDim * 0.09]);
        
        self.maxEarthquakeMagnitude = newMax;
        
        self.nodes.forEach(function(d)
        {
            d.radius = magToRadius(d.magnitude);
        });
    }
    
    // setup member variables and build the force layout
    function init()
    {
        self.options = options;
        self.nodes = [];
        // @v4 strength to apply to the position forces
        self.forceStrength = 0.03;
        self.velocityDecay = 0.6;
        self.defaultDuration = 200;
        self.maxEarthquakeMagnitude = 0;
        self.bubbles = null;
        
        // go ahead and build the svg
        self.svg = d3.select("#" + self.options.divId).insert("svg", ":first-child");
        
        self.popupDiv = d3.select("#" + self.options.divId)
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        
        updateRadiusScale(2);
        
        chart.onWindowResize();
        
        runSimulation();
    }
    init();
    
    return chart;
};

