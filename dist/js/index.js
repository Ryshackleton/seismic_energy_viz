var params = {}; // store some default parameters
var eqMap; // earthquakes on a slippy map
var bubble; // force layout
var tour;

window.onload = function() {
    // build the quake map!
    var options = {
        mapDivId: 'leaflet-map',
        outerContainerId: 'map-canvas'
    };
    
    // set up earthquake map
    eqMap = new BasemapWithEarthquakes(options)
        // add a bunch of default layers, geology, faults etc
        .addESRIWorldImageryBaseMapLayer()
        .addESRIOceanBaseMapLayer()
        .addUSGSFaultsOverlay()
        .addTectonicPlateBoundariesOverlay()
        .addGeologicMapOverlay();
    
    // set up force layout to show seismic energy display
    bubble = new EarthquakeForceLayout({ divId: "force-canvas"});
    
    // set up triggers
    var slippy = eqMap.leafletmap();
    slippy.on('movestart',bubble.clearNodes); // clear force as soon as the user moves map
    slippy.on('resize',bubble.onWindowResize); // resize
    
    setDefaultAnimationSpeed();
    buildEarthquakeViews();
    
};

function linkEqMapToForce()
{
    // before adding earthquakes, send a list of earthquakes so bubble can update scales, etc
    eqMap.onStartRenderCallback(bubble.onStartRender)
        // on adding a bubble to map, add one to the bubble layout
        .onAddEarthquakeCallback(bubble.addEarthquakeBubble)
        .onLegendChangedCallback(bubble.clearNodes());
}

function setDefaultAnimationSpeed()
{
    params.duration = eqMap.transitionDuration();
    params.delay = eqMap.transitionDelay();
    params.velocityDecay = bubble.velocityDecay();
}

function triggerLockedSimulation()
{
    bubble.showChart();
    linkEqMapToForce();
    setDefaultAnimationSpeed();
    
    eqMap.transitionDuration(6000);
    eqMap.transitionDelay(10000000);
    bubble.velocityDecay(1);
    
    eqMap.setEarthquakeQuery(quakeViews[0].params);
}

function startSlowSimulation()
{
    bubble.velocityDecay(0.95);
}

function triggerOneSlowEarthquakeAdd()
{
    bubble.showChart();
    eqMap.transitionDuration(6000);
    eqMap.transitionDelay(1000);
    bubble.velocityDecay(0.95);
    
    eqMap.setEarthquakeQuery(quakeViews[0].params);
}

function resetDefaultSpeedParameters()
{
    if( eqMap !== undefined )
    {
        eqMap.transitionDelay(params.delay)
            .transitionDuration(params.duration);
    }
    if( bubble !== undefined )
    {
        bubble.velocityDecay(params.velocityDecay);
    }
}

function onEndTour()
{
    tour = null;
    resetDefaultSpeedParameters();
    linkEqMapToForce();
    bubble.showChart();
    d3.select("#west-coast-now").on('click')();
}

function startTour()
{
    bubble.hideChart();
    tour = new Tour({
        storage : false,
        onEnd: onEndTour,
        steps: [
            {
                element: "body",
                title: "Take a quick tour of the graphical elements of this page",
                content: "Use the left and right arrow keys to proceed.",
                placement: 'top'
            }
            ,
            {
                element: "body",
                title: "What will I learn from this visualization?",
                content: "1) How the energy release varies widely for earthquakes of different magnitudes</br>\
                          2) At what depth most earthquakes occur</br>\
                          3) The location of recent earthquake swarms on earth",
                
                placement: 'top'
            }
            ,
            {
                element: "#leaflet-map",
                title: "Earthquake Map",
                content: "Earthquake locations are sequentially added to the map in time sequence. The time sequence will restart as you pan and zoom.",
                placement: 'left',
                backdrop: true,
                backdropContainer: "#map-canvas",
                backdropPadding: 5
            }
            ,
            {
                element: "div.magnitude-legend-selector",
                title: "Magnitude Range Selector",
                content: "Select a magnitude to change the range of earthquakes displayed in the view. Try selecting the M4 circle to include more earthquakes in the view.",
                placement: 'bottom',
            }
            ,
            {
                element: "#earthquake-a",
                title: "Get Earthquake Information",
                content: "Hover over earthquakes to display further information. Click on the earthquake to open the USGS page for that earthquake in a new tab or window.",
                placement: 'left',
                onNext: triggerLockedSimulation
            }
            ,
            {
                // element: "#leaflet-map",
                element: "#mapped-quakes",
                title: "Seismic Energy Visualization",
                content: "As each earthquake is added to the map, a new circle is added, then scaled to represent the Seismic Energy Release of that earthquake:</br>Bigger earthquake = more seismic energy = bigger circle.",
                placement: 'top',
                onNext: startSlowSimulation
            }
            ,
            {
                element: "#leaflet-map",
                title: "Showing Seismic Energy Release",
                content: "Seismic energy circles \"fall\" to the graph below as they are added. Earthquake swarms will appear as many earthquakes falling from one location in rapid succession.",
                placement: 'left',
                onNext: triggerOneSlowEarthquakeAdd
            }
            ,
            {
                element: "#map-canvas",
                title: "Relative Seismic Energy Release",
                content: "As new earthquakes are added, the scale of ALL seismic energy release earthquakes is updated. This causes all smaller magnitude earthquakes to shrink in size.</br></br>The magnitude scale is logarithmic, so a 1 unit increase in magnitude increases seismic energy release by ~32 times. For example, notice how much larger a M6.2 earthquake is than a M5 earthquake.",
                placement: 'top',
            }
            ,
            {
                element: ".time-scale",
                title: "Time Scale",
                content: "Earthquakes are loosely sorted horizontally by time, but \"repel\" each other to show the magnitudes where possible.",
                placement: 'top',
            }
            ,
            {
                element: ".depth-scale",
                title: "Depth Scale",
                content: "Earthquakes are loosely sorted vertically by depth. Pay attention to where most earthquakes fall on the depth scale.",
                placement: 'right',
            }
            ,
            {
                element: "#force-canvas > svg > g:last-of-type", // this madness selects the last g type, which will be a bubble in the force layout
                title: "Get Earthquake Information",
                content: "Hover over each seismic energy bubble to show the original location of the earthquake. Click on the earthquake to open the USGS page for that earthquake in a new tab or window.",
                placement: 'top',
            }
            ,
            {
                element: "#west-coast-now",
                title: "Choose a sequence to view",
                content: "Select each of the earthquake sequences to see other time periods and notable historical earthquakes!",
                placement: 'right',
            }
        ]});
    
    // Initialize the tour
    tour.init();
    
    // Start the tour
    tour.start();
}

function buildEarthquakeViews() {
    // build a button and a click response for each view
    // (attached to a div with id='earthquake-view-list'
    quakeViews.forEach(function(v,i){
        // get the div that holds the earthquake buttons
        d3.select('#earthquake-view-list')
            .append('div')
            .attr('class',"panel panel-default")
            .append('div')
            .attr('class', "panel-heading")
            .attr('id', v.divId)
            .append("a")
            .attr("href","#")
            .text(v.params.label);
        
        d3.select('#earthquake-view-list')
            .append("p")
            .classed("hidden",true)
            .attr('id', v.divId )
            .style("padding-left","5px")
            .text(v.params.longlabel);
        
        d3.select('#earthquake-view-list')
            .append("hr");
        
        d3.select("#"+v.divId)
            .on('click', function()
                {
                    d3.select('#events-title')
                        .text("Seismic Energy Release for " + v.params.label);
                    
                    d3.select('#earthquake-view-list')
                        .selectAll("p")
                        .classed("hidden", true );
                    
                    d3.selectAll("#"+v.divId)
                        .classed("hidden", false );
                    
                    
                    if( i < 1) {
                        eqMap.setEarthquakeQuery(v.params);
                        startTour();
                    }
                    else
                    {
                        if( tour !== null )
                            tour.end();
                        resetDefaultSpeedParameters();
                        eqMap.setEarthquakeQuery(v.params);
                    }
                }
            );
        
        // trigger the earthquake query for the first view in the list
        if( i < 1){
            d3.select("#"+v.divId).on('click')();
        }
    });
}

