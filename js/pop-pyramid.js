var utils = {
    translation: function(x,y) {
	return 'translate(' + x + ',' + y + ')';
    },
    pathTween:function(d,array,lineDrawer){
	var interpolate = d3.scale.quantile()
	    .domain([0,1])
	    .range(d3.range(1,array.length+1));
	return function(t) {
	    return lineDrawer(array.slice(0, interpolate(t)));
	};
    }
}

var line_pyramid = {
    initialize: function(id,dataUrl){
	var margin = {top: 20, right: 70, bottom: 10, left: 40, middle:0};
	var width = 800;
	var height = 600 - margin.top - margin.bottom;
	var mid_pnt = (width-margin.middle)/2;
	var currentYr = new Date().getFullYear();
	return {
	    // Define variables
	    elemId: id,
	    dataUrl: dataUrl,
	    margin: margin,
	    width: width,
	    height: height,
	    mid_pnt: mid_pnt,
	    format: d3.format(".1%"),
	    max: 0.07,
	    // Requiered variables to populate
	    svg: undefined,
	    maleAxis: undefined,
	    femaleAxis: undefined,
	    yAxis: undefined,
	    currentYr: currentYr,
	    selectedYrs: {'years':[],'values':[]},
	    data: undefined,
	    quartils: undefined,
	    // Scales
	    maleScale: d3.scale.linear().range([mid_pnt,0]).domain([0,0.07]),
	    femaleScale: d3.scale.linear().range([0,mid_pnt]).domain([0,0.07]),
	    y: d3.scale.ordinal().rangeRoundBands([0,height-margin.bottom], .1),
	    // Helper functions
	    updateComparativeYr: function(year){
		// first position is current year nad second is the comparative year
		var that = this;
		var isFirstDrawing = this.selectedYrs.years[1] ? false:true;
		this.selectedYrs.years[1] = year;
		var total = d3.sum(d3.keys(that.data[year].Hombres),function(r){
		    return that.data[year].Hombres[r]+that.data[year].Mujeres[r];
		});
		this.selectedYrs.values[1] = {
		    "year":parseInt(that.data[year].year),
		    "total":total,
		    "male":d3.keys(that.data[year].Hombres).map(function(r){
			return {'quartil':r,
				'percentage':that.data[year].Hombres[r]/total,
				'value':that.data[year].Hombres[r],
				'year':year
			       };
		    }),
		    "female":d3.keys(that.data[year].Mujeres).map(function(r){
			return {'quartil':r,
				'percentage':that.data[year].Mujeres[r]/total,
				'value':that.data[year].Mujeres[r],
				'year':year
			       };
		    })
		};
		isFirstDrawing ? this.drawGraph():this.redrawLine();
	    },
	    redrawLine:function(){
		var that = this;
		var newValues = that.selectedYrs.values[1];
		var trans_time = 500;
		['male','female'].forEach(function(t){
		    var scale = that[t+'Scale'];
		    var line = that[t+'Canvas'].lineDrawer;
		    that[t+'Canvas'].line.select('#'+t+'-selected-yr').transition().duration(trans_time).attr('d',line(newValues[t]));
		    that[t+'Canvas'].line.selectAll('.line-selected-yr').selectAll('circle')
			.data(newValues[t])
			.transition().duration(trans_time)
			.attr('cx',function(d){return scale(d.percentage)});
		})
	    },
	    drawGraph:function(){
		// clean before redraw
		d3.selectAll('.line-group-female').remove();
		d3.selectAll('.line-group-male').remove();
		
		this.maleCanvas = this.drawLine(this.maleScale,'male',0);
		this.femaleCanvas = this.drawLine(this.femaleScale,'female',this.mid_pnt);
	    },
	    createAxis: function(scale,orient,ticks){
		return d3.svg.axis()
		    .scale(scale)
		    .orient(orient)
		    .tickFormat(this.format)
		    .ticks(ticks);
	    },
	    initData:function(data){
		var newStruct = {};
		data.forEach(function(y){
		    newStruct[y.Year] = y.TotalNacional[0];
		    newStruct[y.Year]['year'] = y.Year;
		});
		data = newStruct;
		var domain = d3.keys(data[1985].Mujeres).reverse();
		this.y.domain(domain);
		// Create current year data to be drawn 
		this.selectedYrs.years.push(this.currentYr);
		var that = this;
		var total = d3.sum(domain,function(r){
		    return data[that.currentYr].Hombres[r]+data[that.currentYr].Mujeres[r];
		});
		this.selectedYrs.values[0] = {
		    "year":parseInt(data[that.currentYr].year),
		    "total":total,
		    "male":d3.keys(data[that.currentYr].Hombres).map(function(r){
			return {'quartil':r,
				'percentage':data[that.currentYr].Hombres[r]/total,
				'value':data[that.currentYr].Hombres[r],
				'year':that.currentYr
			       };
		    }),
		    "female":d3.keys(data[that.currentYr].Mujeres).map(function(r){
			return {'quartil':r,
				'percentage':data[that.currentYr].Mujeres[r]/total,
				'value':data[that.currentYr].Mujeres[r],
				'year':that.currentYr
			       };
		    })
		};
		return data;
	    },
	    drawLine:function(scale,selector,offset){
		var that = this;
		var lineDrawer = d3.svg.line()
		    .interpolate('cardinal')
		    .x(function(d){return scale(d.percentage)})
		    .y(function(d){return that.y(d.quartil)});
		var line = that.svg.append('g').classed('line-group-'+selector,true)
		    .selectAll('.'+selector+'-line')
		    .data(that.selectedYrs.values)
		    .enter().append("g")
		    .attr('class',selector+'-line')
	    	    .attr('transform', utils.translation(offset+that.margin.left,that.y.rangeBand()/2));
		var path = line.append('path')
		    .attr('id',function(d,i){return selector+(i==0?'-current-yr':'-selected-yr')})
		    .attr('class',function(d,i){
			return 'line-'+selector+' '+(i==0?'line-current-yr':'line-selected-yr');
		    })
		    .style('fill','none') // Keep to get only a line
		    .attr('d',function(d){return lineDrawer(d[selector]);});
		var pnts = line.append('g')
		    .attr('class',function(d,i){return selector+'-line-pnts'+' '+(i==0?'line-current-yr':'line-selected-yr')});
		pnts.selectAll('circle')
		    .data(function(d){return d[selector]})
		    .enter().append('circle')
		    .attr('class',function(d,i){
			return 'line-'+selector+' '+selector+'-line-pnts quartil-'+d.quartil.match(/\d+/g).join('-')
		    })
		    .attr('r',2.5)
		    .attr('cx',function(d){return scale(d.percentage)})
		    .attr('cy',function(d){return that.y(d.quartil)})
		    .on('click',function(d){
			var rowPnts = d3.selectAll('.quartil-'+d.quartil.match(/\d+/g).join('-'));
			console.log(rowPnts.data());
		    });
		return {'lineDrawer':lineDrawer,'line':line,'selector':selector}; // 'pnts':pnts,'path':path,
	    },
	    drawAxis: function(ticks){
		// Create axis
		this.yAxis = d3.svg.axis().scale(this.y).orient('left').tickSize(-this.width);
		this.maleAxis = this.createAxis(this.maleScale,'bottom',ticks).tickSize(-this.height);
		this.femaleAxis = this.createAxis(this.femaleScale,'bottom',ticks).tickSize(-this.height);
		
		// Initialize this object
		this.svg = d3.select(this.elemId).append('svg')
		    .attr('width', this.width + this.margin.left + this.margin.right)
		    .attr('height', this.height + this.margin.top + this.margin.bottom)
		    .append('g')
		    .attr('transform', utils.translation(this.margin.left,this.margin.top));
		
		// Create axis DOM elements
		this.svg.append('g').attr('class', 'y axis')
		    .attr('transform', utils.translation(this.margin.left,0))	    
		    .call(this.yAxis);
		this.svg.append('line')
                    .attr('x1', this.mid_pnt+this.margin.left).attr('y1', 0)
                    .attr('x2', this.mid_pnt+this.margin.left).attr('y2', this.height-this.margin.bottom)
		    .attr('class','central-line');
		this.svg.append('g')
		    .attr('class', 'male axis')
		    .attr('transform', utils.translation(this.margin.left,this.height-this.margin.bottom))
		    .call(this.maleAxis);	
		this.svg.append('g')
		    .attr('class', 'female axis')
		    .attr('transform', utils.translation(this.margin.left+this.mid_pnt,this.height-this.margin.bottom))
		    .call(this.femaleAxis);
	    }
	};
    },
    generate: function(id,dataUrl){
	var graph = this.initialize(id,dataUrl);
	// Load data
	d3.json(dataUrl,function(error,data){
	    oas = JSON.parse(JSON.stringify(data));
	    // Initialize data
	    graph.data = graph.initData(data);
	    // Create axis
	    graph.drawAxis(7);
	    // Create lines for female and male
	    graph.drawGraph();
	    // Select current yr on slider
	    document.getElementById('slider').value = graph.currentYr;
	    document.getElementById('slider').onchange();
	});
	
	return graph;
    }
};
var oas,aux,blah;
$(document).ready(function(){
    var chart = line_pyramid.generate('#pop-pyramid','json/poblacion_1985-2020.min.json');
    aux = chart;
    document.getElementById('slider').onchange =function(elem){
	chart.updateComparativeYr(document.getElementById('slider').valueAsNumber);
    };
});

document.onkeydown = function(event) {
    var yr = document.getElementById('slider').valueAsNumber;
    switch (event.keyCode) {
        case 37: // left arrow
            y = Math.max(1985, yr-1);
            break;
        case 39: // right arrow
            y = Math.min(2020, yr+1);
            break;
    };
    if(y && y != yr) {
	document.getElementById('slider').value = y;
	document.getElementById('slider').onchange();
    }
};
