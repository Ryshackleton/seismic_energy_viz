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
                title: "What can I explore in this visualization?",
                content: "<ul><li>The location and rates of recent earthquake activity on earth</li>\
                          <li>How seismic energy release varies for earthquakes of different magnitudes</li>\
                          <li>The range of depths that earthquakes occur</li></ul>\
                          <small>Use the left and right arrow keys to proceed.</small>",
                placement: 'top'
            }
            ,
            {
                element: "div.magnitude-legend-selector",
                title: "Magnitude Range Selector",
                content: "<ul><li>Selecting a magnitude circle above changes the range of earthquakes displayed in the view.</li><li>For example, try selecting the M4 circle, which causes more earthquakes to appear in the view.</li> <li>Earthquakes appear in time sequence, or in order of occurrence.</li></ul> <small>Note: This scale only applies to earthquakes in the map view.</small>",
                placement: 'bottom',
            }
            ,
            {
                element: "#earthquake-circles > a:first-of-type",
                title: "Get Earthquake Information",
                content: "<ul><li>Hover over the earthquake to display further information.</li><li>To open the USGS page for that earthquake, click on the earthquake circle.</li> ",
                placement: 'left',
                onNext: triggerLockedSimulation
            }
            ,
            {
                element: "#leaflet-map",
                title: "Seismic Energy Visualization",
                content: "As each earthquake is added to the map, a corresponding \"bubble\" is added to the view. <ul><li>The bubbles are <strong>scaled to represent the relative seismic energy release of each earthquake.</strong></li><li>Labels represent <a href=\"https://youtu.be/HL3KGK5eqaw\" target=\"blank\">moment magnitude</a>.</li><li>Bigger earthquake = bigger bubble = more seismic energy.</li></ul>",
                placement: 'top',
                onNext: startSlowSimulation
            }
            ,
            {
                element: "#force-canvas > svg > g:last-of-type", // this madness selects the last g type, which will be a bubble in the force layout
                title: "Showing Seismic Energy Release",
                content: "Seismic energy bubbles \"fall\" to the graph below as they are added. <ul><li>To see the original location of each earthquake, hover over the seismic energy bubble in the graph below.</li><li>Click on the bubble to open the USGS page for that earthquake.</li></ul>",
                placement: 'right',
                onNext: triggerOneSlowEarthquakeAdd
            }
            ,
            {
                element: "#map-canvas",
                title: "Relative Seismic Energy Release",
                content: "<ul><li>As new earthquake bubbles are added, the scale of ALL bubbles are updated, causing smaller magnitude earthquake bubbles to shrink when larger ones appear.</li><li>The shrinking occurs because <strong>the relationship between moment magnitude and seismic energy is logarithmic</strong>, so a 1 unit increase in magnitude increases seismic energy release by ~32 times.</li><li>For example, notice how much larger the M6.2 earthquake bubble is than the M5 earthquake bubble.</li> ",
                placement: 'top',
            }
            ,
            {
                element: ".time-scale",
                title: "Time Scale",
                content: "Earthquake bubbles in the lower space are sorted horizontally by time and vertically by depth.<br/><small>(The scale is not exact because smaller bubbles are pushed aside by larger bubbles to ensure that the magnitude labels are visible where possible.)</small>",
                placement: 'top',
            }
            ,
            {
                element: "#west-coast-now",
                title: "Choose a sequence to view",
                content: "Select each of the earthquake sequences to see other time periods and notable historical earthquakes. As you explore, pay attention to the following:<ul><li>Earthquakes are generally found along the plate boundaries (red lines on the map)</li><li>\"Swarms\" of earthquakes will appear as many earthquake bubbles falling from one location in rapid succession.</li><li>Most earthquakes fall within a specific range on the depth scale, especially for the \"Big Earthquakes in the last 100 years\" sequence.</li>",
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

