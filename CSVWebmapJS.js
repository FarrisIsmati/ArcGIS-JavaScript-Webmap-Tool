//Script uses DOJO, JQUERY, ARCGIS Restful API
$(document).ready(function() {
    console.log('JQUERY -- DOM Loaded')
	
    //Refreshes tool-bar features every time page is reloaded
	$(window).unload(function() { $('#dropdownColors option:selected').remove();
								  $('#dropdownShapes option:selected').remove();
								  divButtons('#ctFields', '#ctAttributes', '#fieldsListDiv', '#queryOptionsDiv', true);
								  });

    //Inital Javascript DOM Styling
    //There are some CSS errors if these elements initally have these attributes
    $('#queryOptionsDiv').hide();
	$('#StyleOptionAttr').css('display','none');

    //INITIALIZE LOCAL VARIABLES
	
	//Main map & Current File Reference
    var map, mainFile, currentFile;

    //Prevent query dropdown menus from adding fields every time the parsing function is ran
    var runQuery = false; var getFieldNames = true; var appendQueryOptionsOnce = false; 

	//Whether you are choosing general coloring or category coloring
	var general = true; var attribute = false; var queryRunReset = false;
	
	//CREATE LIST OF LAT AND LONG FIELDS. If you want more options add another string to the array.
	var latFieldStrings = ["lat", "latitude", "Latitude", "y", "ycenter", "XCOOR", "geo_x"];
	var longFieldStrings = ["lon", "long", "longitude", "Longitude", "x", "xcenter", "YCOOR", "geo_y"];
	
	//Whether or not the query submit/reset option will default to the general or categorical colors
	var sendGenStyle = false; var colorQueryRunQuery = false; 
	
	//Legend booleans
	var appendedLegend = false; var legendRan = false; 
	
	var legend, uniqueDates, dateTimeField, curFileName, basemapTurnOFfZoomSlider;
	var reformattedTime = [];
	var appendedTimeSelectTag = false;
	var timeStampAvaliable = false;


    //START OF DOJO.js & INTERNAL MAP FUNCTIONS
    require([
            "esri/config", "esri/Color", "esri/symbols/SimpleMarkerSymbol", "esri/renderers/SimpleRenderer", "esri/renderers/HeatmapRenderer",
			"esri/symbols/PictureMarkerSymbol", "esri/renderers/UniqueValueRenderer", "esri/symbols/SimpleLineSymbol",
			"esri/symbols/SimpleFillSymbol", "esri/symbols/TextSymbol", "esri/layers/LabelLayer", "esri/dijit/BasemapLayer", "esri/dijit/Basemap",
            "esri/dijit/BasemapGallery", "esri/dijit/Print", "esri/tasks/PrintTask", "esri/tasks/PrintTemplate", "esri/dijit/Legend",
			"esri/tasks/LegendLayer", "esri/layers/GraphicsLayer", "esri/graphic", "esri/InfoTemplate", "esri/map", "esri/request",
            "esri/urlUtils", "esri/dijit/InfoWindowLite", "esri/geometry/Point", "esri/geometry/webMercatorUtils", "esri/layers/ArcGISDynamicMapServiceLayer",
            "esri/layers/ArcGISImageServiceLayer", "esri/layers/FeatureLayer", "esri/symbols/PictureMarkerSymbol", "dojo/dom",
            "dojo/json", "dojo/on", "esri/tasks/query", "esri/tasks/QueryTask", "dojo/parser",  "dojo/_base/array", 
			"dojo/_base/lang", "dojox/data/CsvStore", "dojo/domReady!"
        ],
        function(
            esriConfig, Color, SimpleMarkerSymbol, SimpleRenderer, HeatmapRenderer, PictureMarkerSymbol, UniqueValueRenderer, SimpleLineSymbol, SimpleFillSymbol, 
			TextSymbol, LabelLayer, BasemapLayer, Basemap, BasemapGallery, Print, PrintTask, PrintTemplate, Legend, LegendLayer, GraphicsLayer, Graphic, 
			InfoTemplate, Map, request, urlUtils, InfoWindowLite, Point, webMercatorUtils, ArcGISDynamicMapServiceLayer, ArcGISImageServiceLayer, FeatureLayer, 
			PictureMarkerSymbol, dom, JSON, on, Query, QueryTask, parser, arrayUtils, lang, CsvStore
        ) {
            //ENABLE PARSER
            parser.parse();

            //specfiy cors enabled server and proxy for backup
            esriConfig.defaults.io.corsEnabledServers.push("serverapi.arcgisonline.com");
            esriConfig.defaults.io.proxyUrl = 'http://serverapi.arcgisonline.com/proxy/proxy.ashx';
			esriConfig.defaults.io.proxyUrl = "/proxy/";
	
            //Sets up drop zone  
            setupDropZone('mapCanvas');

            //MAP SETUP
            map = new Map("mapCanvas", {
                basemap: "oceans",
                center: [-90.272, 39.096],
                zoom: 4,
                slider: true,
                logo: false,
                showAttribution: false,
            });
			
			window.onresize = function(event) {
				$('#mapCanvas').css('height', '100%');
				$('#mapCanvas').css('width', '100%');
			};
					
			windowHeight = window.innerHeight
			windowWidth = window.innerWidth
			
			//Sets the size of info-template window (Pop-up window when clicking on data points) 
            map.infoWindow.resize(475, 275);
			
            //WIDGETS
            //Adds Basemap Gallery
            var basemapGalleryWidget = BasemapGallery({
                showArcGISBasemaps: true,
                map: map
            }, "basemapGallery");
			
			//basemapGalleryWidget.add(mapLayer1);
            basemapGalleryWidget.startup();
			
			//If you want inset maps to change basemap with the basemap gallery set the inset map's basemap to currentBasemap
			basemapGalleryWidget.on("selection-change",function(){
				var basemapTitle = basemapGalleryWidget.getSelected().title;
				basemapNames = {
					'Imagery' : 'satellite', 'Streets' : 'streets','Topographic':'topo', 'USA Topo Maps' : 'usa-topo',
					'Dark Gray Canvas' : 'dark-gray', 'Light Gray Canvas':'gray','National Geographic':'national-geographic',
					'Oceans':'oceans', 'Terrain with Labels':'terrain', 'OpenStreetMap':'osm',
					'Imagery with Labels':'hybrid'
				}
				currentBasemap = basemapNames[basemapTitle];
			});
			
			var legendLayer = new LegendLayer();
			legendLayer.layerId = 'csvLayer';
			legendLayer.subLayerIds = [0, 2];
			
			var printTask = new PrintTask(printUrl);

			//Adds Map image export functionality

			var printUrl = "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
			var printer = new Print({
   			 	map: map,
			 	url: printUrl,
				templates: [{
				  label: "Map",
				  format: "jpg",
				  layout: "Tabloid ANSI B Landscape",
				  preserveScale: true,
				  layoutOptions: {
					titleText: "TITLE",
					authorText: "AUTHOR",
					copyrightText: "COMPANY",
					scalebarUnit: "Miles",
				  },
				  exportOptions: {
					width: 900,
					height: 400,
					dpi: 250 //Dots per inch (Quality level)
				  }
				}]
				}, dom.byId("printButton")
			)
			
			//Can't figure out how to get the LegendLayer feature to work on this so I'm leaving it out 
			//printer.startup(); <--Starts the print task enabling a print button

            //HANDLE DROPPED CSV DATA
            //Gets ready to proccess files dropped onto the map 
            //prevents default HTML5 drag and drop functions from executing
			
            function setupDropZone(mapName) {
				var mapCanvas = dom.byId(mapName);
			
                on(mapCanvas, "dragenter", function(event) {
                    event.preventDefault();
                });
                on(mapCanvas, "dragover", function(event) {
                    event.preventDefault();
                });
				on(mapCanvas, "drop", handleDrop);
            }

            //Checks to see if file is a .csv once dropped
            function handleDrop(event) {
                event.preventDefault();

                var dataTransfer = event.dataTransfer,
                    files = dataTransfer.files,
                    types = dataTransfer.types;
					
				mainFile = files[0]; //Reading only one file
				
				//If there's a current file loaded, remove that file upon a new drop
				//Checks for current file by checking the HTML value of the file name displayer
				if ($("#LoadedFileName").val() !== "File") {
						
					//Makes sure file has a .csv extension
					if (mainFile.name.indexOf(".csv") !== -1) {
						wipeAll();
						//Changes file name display 
						$("#LoadedFileName").html(mainFile.name)
						curFileName = mainFile.name;
						//Starts CSV Handling process
						
						//Start off with the original map
						handleCSV(mainFile, map);
					}
				}   
            }
			
            //Prepares .csv file as a text to be parsed
            //Querying options are ran here
            function handleCSV(mainFile, mapName) {
                var currentData;
                var reader = new FileReader();
				
                reader.onload = function() {
					currentFile = reader.result
                    processCSVData(currentFile, mapName);
					
					//Clears all the data then reparses the original map with query parameters
                    $('#queryTextSubmit').click(function() {
						if ($('#LoadedFileName').html() != 'File'){
							clearAll();
							runQuery = true;
							getFieldNames = false;
							queryRunReset = true;
							processCSVData(currentFile, map);
						}
                    });
					
					//Clears all the data then reparses the original map with original parameters
					
                    $('#queryReset').click(function() {
						if ($('#LoadedFileName').html() != 'File'){
							clearAll();
							runQuery = false;
							queryRunReset = true;
							processCSVData(currentFile, map);
						}
                    });
					
                };
                currentData = reader.readAsText(mainFile);
            }
			
            //Brains of CSV file parsing and Query Parsing (Also converts CSV data to points on map)
            function processCSVData(data, mapName) {
				
                //csvStore contains all functions to manipulate the CSV file
                var csvStore = new CsvStore({
                    //The data being passed in from the handleCSV function
                    data: data,
					urlPreventCache: true
                });
				csvStoreOn = true;
				
				
                //Fetch gets csvStore ready for querying
                csvStore.fetch({
                    onComplete: function(items) {
                        //objectId to be appended to the point data table
                        var objectId = 0;
						
                        //Sets up featurelayer to take the data format from a featureCollection
                        var featureCollection = generateFeatureCollectionTemplateCSV(csvStore, items);
                        var popupInfo = generateDefaultPopupInfo(featureCollection);
                        //Sets up popup screen when each individual point is clicked
                        var infoTemplate = new InfoTemplate(buildInfoTemplate(popupInfo));

                        //Finds the latitude and longitude fields from the CSV table and que's them for parsing
                        var latField, longField;
                        var fieldNames = csvStore.getAttributes(items[0]);
						var matchId;
						
						//Function finds and returns a field name if it's within the array passed in the function
						function findSpecificFieldName(newFieldArray){
							var newFieldName
							arrayUtils.forEach(fieldNames, function(fieldName) {
									matchId = arrayUtils.indexOf(newFieldArray,
										fieldName);
									if (matchId !== -1) {
										newFieldName = fieldName;
									} 
								 });
							return newFieldName
						}

						var dateTimeVariables = ['Date/Time','Date','Time','mm/dd/yyyy', 'mm/dd/yy', 'date/time', 'Date/time', 'date', 'time', 'Dates', 'dates'];					
						var dateFieldSelected = false;
						dateTimeField = findSpecificFieldName(dateTimeVariables);
						
						//Sets lat/long fieldnames
						latField = findSpecificFieldName(latFieldStrings);
						longField = findSpecificFieldName(longFieldStrings);

						//If improper lat/long fields defined prompt a warning error
						if (latField === undefined || longField === undefined){
							wipeAll();
							alert('Your lat/long coordinates field is incorrect!')
						}

                        //Populate query fields
                        function fieldsPopulator(fieldName, queryAttr){
							//fetFieldNames prevents duplicates from being added in the field
							if (getFieldNames) {
								fieldNames.sort();
								$.each(fieldNames, function(value) {
								totAttr = 0
								states = []
								arrayUtils.forEach(items, function(item) {
									currentState = csvStore.getValue(item, fieldNames[value]);
									if ($.inArray(currentState, states) == -1) {
										states.push(currentState);
										totAttr += 1;
									}
								})
								//$.each(fieldNames, function(value) {
								if(queryAttr){
									//Cuts out Query by Style options that return less than 17 attribute types
									if (totAttr < 17){
										$(fieldName).append($('<option></option>')
										.attr("class", "addedFieldOptions")
										.attr("value", fieldNames[value])
										.text(fieldNames[value]))
									}
								} else {
									$(fieldName).append($('<option></option>')
										.attr("class", "addedFieldOptions")
										.attr("value", fieldNames[value])
										.text(fieldNames[value]))
										}
								});
							}
						}
						
						//Checks if dateTimeSupport is available
						jQuery.dateTimeSupport = function(appendOptions, fieldDisplay, fieldNameSelected){
							var reformattedTimeCheck = []
							var i = 0;
							var states = [];
							var dateTimeSupport

							arrayUtils.forEach(items, function(item) {
								var currentState = csvStore.getValue(item, $(fieldNameSelected).val());
								if ($.inArray(currentState, states) == -1) {
									if ($(fieldNameSelected).val() === dateTimeField){
										var attrs = csvStore.getAttributes(item), attributes = {};
										arrayUtils.forEach(attrs, function(attr) {
											if(attr===dateTimeField){
												var currentDate = csvStore.getValue(item, attr);
												reformattedTimeCheck.push({'date': new Date(currentDate), 'textDate': currentDate});
												if(reformattedTimeCheck[i].date.toString() === 'Invalid Date'){
													dateTimeSupport = false;
												} else {	
													dateTimeSupport = true;
												}
											}
										});
									} 
									i += 1
								}
							})
							return dateTimeSupport;
						}
					
						//Populate query attributes
						jQuery.fieldsAttrPopulator = function(appendOptions, fieldDisplay, fieldNameSelected){
							//Number of uniqueDates returned if there's an appropiate date/time field specified
							uniqueDates = 0;

							reformattedTime = []
							var i = 0;
							states = [];
							$('#fieldDisplay').css('color','#3C3C3C');
							//Prevents the style categories field from interfering with the query categories field
							if (appendOptions){
								$(fieldDisplay).html($(fieldNameSelected).val());
								$('.addedQueryOptions').remove()
							}
							arrayUtils.forEach(items, function(item) {

								currentState = csvStore.getValue(item, $(fieldNameSelected).val());

								//No duplicate attributes
								if ($.inArray(currentState, states) == -1) {

									//If an appropiate date/time field selection is chosen then give it timestamps for sorting
									if ($(fieldNameSelected).val() === dateTimeField){
										dateFieldSelected = true;
										var attrs = csvStore.getAttributes(item), attributes = {};
										arrayUtils.forEach(attrs, function(attr) {
											//var value = Number(csvStore.getValue(item, attr));
											if(attr===dateTimeField){
												var currentDate = csvStore.getValue(item, attr);
												reformattedTime.push({'date': new Date(currentDate), 'textDate': currentDate});
												if(reformattedTime[i].date.toString() === 'Invalid Date'){
													$('#fieldDisplay').html('Time stamp formatting is not avaliable for your data');
													timeStampAvaliable = false;
													states.push(currentState);
												} else {	
													timeStampAvaliable = true;
													states.push(currentState);
													reformattedTime.sort(function(a,b){
														return a.date - b.date;
													});
												}
											uniqueDates += 1
											}
										});
										
									} else {
										//Append regulate attributes without timestamps
										dateFieldSelected = false;
										states.push(currentState);
									}
									//Sorts the query attributes alphabetically if the attributes aren't numbers or date/time fields
									if ($(fieldNameSelected).val() !== dateTimeField){
										states.sort();
									} 
									
									i += 1
								}
							})
							
							//Prevents the style categories field from interfering with the query categories field
							if(appendOptions){
								if (dateFieldSelected){
									appendQueryOptionsTime();
								} else {
									appendQueryOptions();
								}
							}

						}

						//Append regular query attributes
                        function appendQueryOptions() {
                            $.each(states, function(value) {
									$('#queryOptions').append($('<option></option>')
										.attr("class", "addedQueryOptions")
										.attr("value", states[value])
										.text(states[value]));
                            });
                        }

						//Append timestamped query attributes
						function appendQueryOptionsTime() {
							var i = 0
							
                            $.each(states, function(value) {
									$('#queryOptions').append($('<option></option>')
										.attr("class", "addedQueryOptions")
										.attr("value", states[value])
										.text(reformattedTime[i].textDate));
									$('#queryOptionsTime').append($('<option></option>')
										.attr("class", "addedQueryOptions")
										.attr("value", states[value])
										.text(reformattedTime[i].textDate));
									i += 1
                            });
                        }

                        //Handles initial parsing displaying of records
                        function addRecords() {
							var numOfRecords = 0
							
                            arrayUtils.forEach(items, function(item) {

                                var attrs = csvStore.getAttributes(item), attributes = {};

                                arrayUtils.forEach(attrs, function(attr) {
                                	var value = Number(csvStore.getValue(item, attr));
									attributes[attr] = isNaN(value) ? csvStore.getValue(item, attr) : value;
								});

                                //Append all of the CSV items to he attributes object
                                arrayUtils.forEach(attrs, function(attr) {
                                	var value = Number(csvStore.getValue(item, attr));
									attributes[attr] = isNaN(value) ? csvStore.getValue(item, attr) : value;
								});		
								
								//Create an object ID field					
                                attributes["__OBJECTID"] = objectId;
                                objectId++;

                                //Makes sure it's a floating number for all records of lat and long
                                var latitude = parseFloat(attributes[latField]);
                                var longitude = parseFloat(attributes[longField]);

                                //If either is not a number return empty
                                if (isNaN(latitude) || isNaN(longitude)) {
                                    return;
                                }

                                //Set coordinate system
                                var geometry = webMercatorUtils
                                    .geographicToWebMercator(new Point(longitude, latitude));
                                var feature = {
                                    "geometry": geometry.toJson(),
                                    "attributes": attributes
                                };
								
								//Push all the attributes into the features variable
                                featureCollection.featureSet.features.push(feature);
								numOfRecords += 1
                            });

							//Only run this function once when the file is initally added
							if (!appendQueryOptionsOnce){
								appendQueryOptions();
								appendQueryOptionsOnce = true;
							}
							
							//Display number of records and display the field selected in the tool bar
							$('#numberOfObjects').html('Number of Records : ' + numOfRecords)
							$('#fieldDisplay').html($('#fieldsList option:selected').val());
							
							//Get query button ready
							$.fieldsAttrPopulator(true, '#fieldDisplay', '#fieldsList option:selected')
                        }
						
                        //Handles parsing when querying is necessary
                        function queryRecords() {
							var numOfRecords = 0
							var currentQuery = $('#queryOptions option:selected').val();
							
							//Loop runs through each object within the loaded csv file and pending on what the query options are it appends those objects to the feature set
                            arrayUtils.forEach(items, function(item) {
								var currentField = csvStore.getValue(item, $('#fieldsList option:selected').val());
								
								//If an appropiate date/time field is selected run the date query
								if ($('#fieldsList option:selected').val() === dateTimeField && appendedTimeSelectTag){
									function returnCurrentPosition(selector){
										var curPosition;
										for(var i = 0;i <reformattedTime.length; i++){
											if(reformattedTime[i].textDate === selector){
												curPosition = i;
											}
										}
										return curPosition;
									}							
									var position1 = returnCurrentPosition($('#queryOptions option:selected').html());
									var position2 = returnCurrentPosition($('#queryOptionsTime option:selected').html());
	
									var greater = Math.max(position1,position2);
									for (var lesser = Math.min(position1, position2); lesser <= greater; lesser++){
										queryExecute(reformattedTime[lesser].textDate === currentField);
									}
								} else {
									queryExecute(currentField === currentQuery);	
								}

								//Querying function
								function queryExecute(queryFormat){
									if(queryFormat) {
										
									var attrs = csvStore.getAttributes(item),
										attributes = {};
	
									// Read all the attributes for  this record/item
									arrayUtils.forEach(attrs, function(attr) {
										var value = Number(csvStore.getValue(item, attr));
										attributes[attr] = isNaN(value) ? csvStore.getValue(item, attr) : value;
									});	
	
									attributes["__OBJECTID"] = objectId;
									objectId++;
	
									//Makes sure it's a floating number for all records of lat and long
									var latitude = parseFloat(attributes[latField]);
									var longitude = parseFloat(attributes[longField]);
	
									//If either is not a number return empty
									if (isNaN(latitude) || isNaN(longitude)) {
										return;
									}
	
									var geometry = webMercatorUtils
										.geographicToWebMercator(new Point(longitude, latitude));
									var feature = {
										"geometry": geometry.toJson(),
										"attributes": attributes
									};
	
									featureCollection.featureSet.features.push(feature);
									
									numOfRecords += 1
										
									}
								}
                            });
							
							$('#numberOfObjects').html('Number of Records : ' + numOfRecords)
                        }
						

                        //FEATURE LAYER STYLING OPTIONS
						jQuery.colorSwitch = function() {
						   switch (returnColor()) {
                                case 'Orange':
                                    currentColor = new Color([238, 69, 0, .85]);
                                    break;
                                case 'Black':
                                    currentColor = new Color([18, 18, 18, .85]);
                                    break;
                                case 'Red':
                                    currentColor = new Color([204, 0, 0, .85]);
                                    break;
                                case 'Gray':
                                    currentColor = new Color([163, 163, 163, .85]);
                                    break;
                                case 'Yellow':
                                    currentColor = new Color([255, 255, 102, .85]);
                                    break;
                                case 'Green':
                                    currentColor = new Color([0, 204, 0, .85]);
                                    break;
                                case 'Purple':
                                    currentColor = new Color([204, 51, 255, .85]);
                                    break;
                                case 'White':
                                    currentColor = new Color([245, 245, 245, .88]);
                                    break;
                            }
						}
						
						jQuery.shapeSwitch = function(){
						   switch (returnShape()) {
                                case 'Circle':
                                    currentShape = "circle";
                                    break;
                                case 'Square':
                                    currentShape = "square";
                                    break;
                                case 'Diamond':
                                    currentShape = "diamond";
                                    break;
                            }
						}

						var colorOptions = {
											'set1' : {
														'brightOrange' : new Color([255, 117, 25, .85]),
														'brightRed' : new Color([255, 25, 25, .85]),
														'softYellow' : new Color([255, 255, 128, .85]),
														'lightGreen' : new Color([77, 219, 77, .85]),
														'aquiteBlue' : new Color([0, 204, 255, .85]),
														'dealBlue' : new Color([51, 51, 255, .85]),
														'aquaBlue' : new Color([51, 173, 255, .85]),
														'deadViolet' : new Color([102, 102, 153, .85]),
														'offMagenta' : new Color([153, 51, 153, .85]),
														'ronBurgendy' : new Color([153, 51, 51, .85]),
														'color1' : new Color([221, 255, 247, .85]),
														'color2' : new Color([147, 225, 216, .85]),
														'color3' : new Color([255, 166, 158, .85]),
														'color4' : new Color([170, 68, 101, .85]),
														'color5' : new Color([134, 22, 87, .85]),
														'color6' : new Color([222, 239, 183, .85]),
														'color7' : new Color([152, 223, 175, .85]),
														'color8' : new Color([95, 180, 156, .85]),
														'color9' : new Color([65, 66, 136, .85]),
														'color10' : new Color([104, 45, 99, .85]),
														},
												'set2' : {
														'lowBlue' : new Color([0, 46, 184, .85]),
														'offBlue' : new Color([0, 138, 184, .85]),
														'deadTeal' : new Color([55, 238, 138, .85]),
														'deepGreen' : new Color([46, 138, 92, .85]),
														'darkGreen' : new Color([0, 102, 0, .85]),
														'agedLime' : new Color([138, 184, 0, .85]),
														'oldOrange' : new Color([184, 138, 0, .85]),
														'deadMaroon' : new Color([115, 0, 0, .85]),
														'dementorPink' : new Color([204, 163, 163, .85]),
														'sullyGrey' : new Color([102, 102, 153, .85]),
														'jollyGrey' : new Color([210, 210, 210, .85]),
														'deepBlue' : new Color([102, 235, 85, .85]),
														'sullyGrey' : new Color([102, 102, 200, .85]),
														'sullyGrey2' : new Color([200, 50, 153, .85]),
														'sullyGrey3' : new Color([243, 102, 153, .85]),
														'jollyGrey' : new Color([185, 214, 242, .85]),
														'deepBlue' : new Color([6, 26, 64, .85]),
														'sullyGrey' : new Color([0, 53, 89, .85]),
														'sullyGrey2' : new Color([86, 110, 61, .85]),
														'sullyGrey3' : new Color([5, 74, 145, .85]),
														},
												'set3' : {
														'blue1' : new Color([5, 74, 145, .85]),
														'blue2' : new Color([62, 124, 177, .85]),
														'blue3' : new Color([129, 164, 205, .85]),
														'white1' : new Color([219, 228, 238, .85]),
														'orange1' : new Color([241, 115, 0, .85]),
														'blue5' : new Color([56, 95, 113, .85]),
														'white2' : new Color([245, 240, 246, .85]),
														'brown1' : new Color([215, 179, 119, .85]),
														'brown2' : new Color([143, 117, 79, .85]),
														'purple1' : new Color([51, 105, 159, .85]),
														'purple2' : new Color([105, 77, 117, .85]),
														'blue6' : new Color([159, 194, 204, .85]),
														'yellow1' : new Color([241, 236, 206, .85]),
														'green1' : new Color([14, 26, 19, .85]),
														'blue7' : new Color([107, 120, 147, .85]),
														'purple3' : new Color([171, 165, 218, .85]),
														'purple4' : new Color([135, 142, 187, .85]),
														'orange2' : new Color([250, 121, 33, .85]),
														'orange3' : new Color([254, 153, 32, .85]),
														'orange4' : new Color([185, 164, 76, .85]),
														
														}
												
						}

						var colorData = []
						var attributes = []

						//Append color sets into the color categories dropdown box
						jQuery.colorSetFunc = function(){
							colorOption = [];
							var colorVal = $('#dropDownColorSetColors').val();					
							var colorSet = colorOptions[colorVal];
							for(var key in colorSet){
								if (colorSet.hasOwnProperty(key)){
									colorOption.push(colorSet[key]);
								}
							}
							return colorSet;
						}

						//Append color sets into the color categories dropdown box
						function colorSetFunc(){
							colorOption = [];
							var colorVal = $('#dropDownColorSetColors').val();					
							var colorSet = colorOptions[colorVal];
							for(var key in colorSet){
								if (colorSet.hasOwnProperty(key)){
									colorOption.push(colorSet[key]);
								}
							}
							return colorSet;
						}

						//Functions return the current selection of their resepected color/shape/size
                        function returnColor() {
                            var colorSelected = $("#dropdownColors option:selected").val();
                            return colorSelected
                        }

                        function returnShape() {
								var shapeSelected = $("#dropdownShapes option:selected").val();
                            	return shapeSelected
                        }

                        function returnSize() {
								var sizeTyped = $("#inputSize").val()
								return sizeTyped
                        }

                        //Sets style to current general colors if a query submit/reset option is ran
						function genStyle(){
							var marker = new SimpleMarkerSymbol(currentShape, returnSize(), null, currentColor);
							var renderer = new SimpleRenderer(marker);
							featureLayer.setRenderer(renderer);
							featureLayer.refresh();	
						}
							
						//Generate the colors categories for the attribute points
						function setCatStyle(){
							legend.refresh();
							//Query Reset/submit options
							colorQueryRunQuery = true;
							toSendStyle = false;
							
							//Takes legend and appends it to the div once a file is loaded. ONLY RUNS ONCE.
							$('#reuseableLegendDiv :nth-child(1)').remove();
							$('#normalLegend :nth-child(2)').remove();

							attributeRenderer = new UniqueValueRenderer(marker, $('#fieldOptionsStyle option:selected').val(), '', '');

							colorData = []
							var attributes

							 attributes = [];
							 arrayUtils.forEach(items, function(item) {
                                var currentState = csvStore.getValue(item, $('#fieldOptionsStyle option:selected').val());
								if ($.inArray(currentState, attributes) == -1) {
								   attributes.push(currentState);
                                   }
								});
								var attrLen = attributes.length
								for (var i = 0; i < attrLen; i++){
									var attrColor = attributeRenderer.addValue(attributes[i], new SimpleMarkerSymbol(currentShape, returnSize(), null, colorOption[i]));
									colorData.push(attrColor);	
							}
							catStyle()

							appendedLegend = true;
							$('#reuseableLegendDiv').append($('table.esriLegendLayer:nth-child(2)'));
							$('#normalLegend').append($('table.esriLegendLayer:nth-child(1)'));
							var colorCATval = $('#fieldOptionsStyle').val();
							$('#currentColorCATdisplay').html(colorCATval);	
						}
						
						function catStyle(){
							featureLayer.setRenderer(attributeRenderer);
							featureLayer.refresh();
							legend.refresh();
						}
						
                        //Populate dropdown menu for query fields 
						fieldsPopulator('#fieldsList', false)
						fieldsPopulator('#fieldOptionsStyle', true)

						var attributeRenderer;

						//Populate dropdown menu for query options
						var states = [];
						var currentState;
						
                        //If query button is pressed runQuery otherwise *default addRecords
                        if (runQuery) {
                            queryRecords();
                        } else {
                            addRecords();
                        }
														
						//Setup Legend Div
    					$('#normalLegend').draggable({
							appendTo: 'body',
							scroll: false,
							containment: 'window'
						});				

                        $('#sendStyle').click(function() {
							//If there's a legend then clear the legend
							if (appendedLegend){
								$('#reuseableLegendDiv :nth-child(1)').remove();
								$('#normalLegend :nth-child(2)').remove();
								legendHide('#normalLegend');
							}
							toSendStyle = true;
							colorQueryRunQuery = false;
							toSendStyle = true;
                            genStyle();
							legend.refresh();
                        })
						
						$('#StyleOptionButtonCAT').click(function(){
							setCatStyle();
						});

						var featureLayer = new FeatureLayer(featureCollection, {
                            //SNAP_SHOT makes most functions on feature layer clientside
                            mode: FeatureLayer.MODE_SNAPSHOT,
                            infoTemplate: infoTemplate,
                            id: 'csvLayer',
                        });

						featureLayer.__popupInfo = popupInfo;
                        mapName.addLayer(featureLayer);

						//Calling functions here makes the color changing more responsive
						$.colorSetFunc();
						$.colorSwitch();
						$.shapeSwitch();						
								
						//Run the rendering options 
						//If statements for running the current color option after a query is ran
						if (toSendStyle){
							genStyle();	
						} else if (colorQueryRunQuery){
							setCatStyle();
						} else {
							var marker = new SimpleMarkerSymbol("circle", 7, null, new Color([238, 69, 0, .85]));
							var renderer = new SimpleRenderer(marker);
							featureLayer.setRenderer(renderer);
						}

						if (!legendRan){
						legend = new Legend({
							map: map,
							respectCurrentMapScale: false,
							autoUpdate: true,
							layerInfos: [{layer: featureLayer}]
						  }, "legendDiv");
						legend.startup();
						legendRan = true;
						}
						legend.layerInfos = [{layer: featureLayer}]
                    },

                    //Calls error incase something goes wrong with queign the CSV file for parsing
                    onError: function(error) {
                        console.error("Error fetching items from CSV store: ", error);
                    }
                });
            }

            function generateFeatureCollectionTemplateCSV(store, items) {
                //create a feature collection for the input csv file
                var featureCollection = {
                    "layerDefinition": null,
                    "featureSet": {
                        "features": [],
                        "geometryType": "esriGeometryPoint"
                    }
                };
                featureCollection.layerDefinition = {
                    "geometryType": "esriGeometryPoint",
                    "objectIdField": "__OBJECTID",
                    "type": "Feature Layer",
                    "typeIdField": "",
                    "fields": [{
                        "name": "__OBJECTID",
                        "alias": "__OBJECTID",
                        "type": "esriFieldTypeOID",
                        "editable": false,
                        "domain": null
                    }],
                    "types": [],
                    "capabilities": "Query"
                };

                var fields = store.getAttributes(items[0]);
	
                arrayUtils.forEach(fields, function(field) {
                    var value = store.getValue(items[0], field);
                    var parsedValue = Number(value);

                    if (isNaN(parsedValue)) { //check first value and see if it is a number

                        featureCollection.layerDefinition.fields.push({
                            "name": field,
                            "alias": field,
                            "type": "esriFieldTypeString",
                            "editable": true,
                            "domain": null
                        });
                    } else {
                        featureCollection.layerDefinition.fields.push({
                            "name": field,
                            "alias": field,
                            "type": "esriFieldTypeDouble",
                            "editable": true,
                            "domain": null
                        });
                    }
                });
                return featureCollection;
            }

            function generateDefaultPopupInfo(featureCollection) {
                var fields = featureCollection.layerDefinition.fields;
                var decimal = {
                    'esriFieldTypeDouble': 1,
                    'esriFieldTypeSingle': 1
                };
                var integer = {
                    'esriFieldTypeInteger': 1,
                    'esriFieldTypeSmallInteger': 1
                };
                var dt = {
                    'esriFieldTypeDate': 1
                };
                var displayField = null;
                var fieldInfos = arrayUtils.map(fields,
                    lang.hitch(this, function(item) {
                        if (item.name.toUpperCase() === "NAME") {
                            displayField = item.name;
                        }
                        var visible = (item.type !== "esriFieldTypeOID" &&
                            item.type !== "esriFieldTypeGlobalID" &&
                            item.type !== "esriFieldTypeGeometry");
                        var format = null;
                        if (visible) {
                            var f = item.name.toLowerCase();
                            var hideFieldsStr = ",stretched value,fnode_,tnode_,lpoly_,rpoly_,poly_,subclass,subclass_,rings_ok,rings_nok,";
                            if (hideFieldsStr.indexOf("," + f + ",") > -1 ||
                                f.indexOf("area") > -1 || f.indexOf("length") > -1 ||
                                f.indexOf("shape") > -1 || f.indexOf("perimeter") > -1 ||
                                f.indexOf("objectid") > -1 || f.indexOf("_") == f.length - 1 ||
                                f.indexOf("_i") == f.length - 2) {
                                visible = false;
                            }
                            if (item.type in integer) {
                                format = {
                                    places: 0,
                                    digitSeparator: true
                                };
                            } else if (item.type in decimal) {
                                format = {
                                    places: 2,
                                    digitSeparator: true
                                };
                            } else if (item.type in dt) {
                                format = {
                                    dateFormat: 'shortDateShortTime'
                                };
                            }
                        }

                        return lang.mixin({}, {
                            fieldName: item.name,
                            label: item.alias,
                            isEditable: false,
                            tooltip: "",
                            visible: visible,
                            format: format,
                            stringFieldOption: 'textbox'
                        });
                    }));

                var popupInfo = {
                    title: displayField ? '{' + displayField + '}' : '',
                    fieldInfos: fieldInfos,
                    description: null,
                    showAttachments: false,
                    mediaInfos: []
                };
                return popupInfo;
            }

            function buildInfoTemplate(popupInfo) {
                var json = {
                    content: "<table>"
                };

                arrayUtils.forEach(popupInfo.fieldInfos, function(field) {
                    if (field.visible) {
                        json.content += "<tr><td valign='top'>" + field.label +
                            ": <\/td><td valign='top'>${" + field.fieldName + "}<\/td><\/tr>";
                    }
                });
                json.content += "<\/table>";

                return json;
            }
			
			function wipeAll(){
				//Allows field names to be populated once a new file is dropped
				getFieldNames = true;
				colorQueryRunQuery = false;
				toSendStyle = false;

				$('.addedFieldOptions').remove();
				$('.addedQueryOptions').remove();
				
				//Reselects ctFields in query menu
				runctFields();
				
				clearAll();
				if (appendedLegend){
					$('#normalLegend').css('display', 'none');
					legend.refresh();
				}
			}
			
			//Removes all layers
            function clearAll() {
				//If there's a legend then clear the legend
				if (appendedLegend){
					$('#reuseableLegendDiv :nth-child(1)').remove();
					$('#normalLegend :nth-child(2)').remove();
					$('#currentColorCATdisplay').html('Field');
				}
                runQuery = false;
                $('#numberOfObjects').html('Number of Records');
					
				clearAllMap(map);
				function clearAllMap(mapName){
					var layerIds = mapName.graphicsLayerIds.slice(0);
					//layerIds = layerIds.concat(map.layerIds.slice(1));
					arrayUtils.forEach(layerIds, function(layerId) {
							mapName.removeLayer(mapName.getLayer(layerId));
					});
				}
				
            }
			
			function trueFalse(trueVar){
				if (trueVar){
					trueVar = false;	
				}
			}
			
			$("#LoadedFileName").click(function() {
				wipeAll();
				//Reset field display once file is removed
				$('#fieldDisplay').html('Current Field');
				$("#LoadedFileName").html("File");
			});	
			
			//Appends a state layer overlay to the map
			$('#hideZoom').click(function(){  
			  if(map.isZoomSlider){
				  map.hideZoomSlider();
			  } else {
				  map.showZoomSlider();
			  }
			 });

            //END OF DROP CSV DATA HANDLING FUNCTIONS

            //END OF DOJO & INTERNAL MAP FUNCTIONS
        });


    //Map/Taskpane Height adjustment
    var windowSize = window.innerHeight

    var sidebarHeight = $('#sidebar').css('height')
    $('#mapCanvas').css('height', windowSize)
	
	//BUTTONS AND OTHER CSS FUNCTIONALITY
	
	//Handles animations (slideup/slidedown/reappear/dissapear
	function crossbrowserAnimation(selector, property, value, animation){
			  $(selector).css(property, value);
			  $(selector).css("-moz-transition",  property + ' ' + animation)
			  $(selector).css("-ms-transition", property + ' ' + animation)
			  $(selector).css("-o-transition", property + ' ' + animation)
			  $(selector).css("transition", property + ' ' + animation)
	}
	
	//Displays the legend
	function legendShow(selector, position1, position2, position1val, position2val){
			$(selector).css(position1, position1val);
			$(selector).css(position2, position2val);
			$(selector).css('display', 'inherit');
			$(selector).removeClass('dissapear').addClass('reappear');
			$(selector).removeClass('reappear')
			legend.refresh();
	}
	
	//Hides the legend
	function legendHide(selector){
			$(selector).removeClass('reappear').addClass('dissapear');
			$(selector).one('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd', 
				function() { 
					$(selector).css('display', 'none');
			});
	}
	
	//General/Categories Buttons and Fields/Attributes Buttons styling 
	function divButtons(init, after, show, hide, tf){
		$(init).css('border', 'Solid 2px');
        $(after).css('border-color', 'rgba(0,0,0, 0)');
		crossbrowserAnimation(init, 'border-color', 'rgba(50,50,50, .9)', '.15s ease-out')
        $(show).show();
        $(hide).hide();
		if (tf) {
        	$('#fieldDisplay').html($('#fieldsList option:selected').val());
		}
	}
	
	function divButtonHasRemove(selector, hasRemoveClass, addClass){
			if ($(selector).hasClass(hasRemoveClass)){
				$(selector).removeClass(hasRemoveClass).addClass(addClass);
			}
	}
	
	  //Display current field name initially
      $('#fieldDisplay').html($('#fieldsList option:selected').val());
	
	  //Loaded file name button styling functionality
	  $("#LoadedFileName").hover(function() {
		  if ($("#LoadedFileName").html() !== "File") {
			  $("#LoadedFileName").css("cursor", "pointer");
			  $("#LoadedFileName").css("width", "auto");
			  crossbrowserAnimation("#LoadedFileName", 'background-color', "rgba(245,245,250,.8)", '3s cubic-bezier(0,1.18,.29,.9)');
		  } else{
			  $("#LoadedFileName").css("cursor", "default");
		  };
	  }, function() {
		  $("#LoadedFileName").css("border", "0px");
		  $("#LoadedFileName").css("width", "auto");
		  crossbrowserAnimation("#LoadedFileName", 'background-color', "rgba(240,220,220,0)", '.15s ease-out');
		  if ($("#LoadedFileName").html() !== "File") {
			  $("#LoadedFileName").html(curFileName);
		  }
	  });


	  $('#LoadedFileName').mousedown(function() {
		  if ($('#LoadedFileName').html() !== "File"){
			  crossbrowserAnimation("#LoadedFileName", 'color', "rgb(170,150,146)", '.7s ease-out');
		  }
	  }).bind('mouseup mouseleave', function() {
		 $('#LoadedFileName').css("color", "black");
	  });
	  
	  
	  $("#LoadedFileName").click(function(){
		  if ($("#LoadedFileName").html() == "File"){
			  $("#LoadedFileName").css("cursor", "default");
			  crossbrowserAnimation("#LoadedFileName", 'background-color', "rgba(240,240,240,0)", '.15s ease-out');
		  }
	  })
			
	//SVG at top of the sidebar for dragging
	$('#sidebarSVG').hover(function(){
			  crossbrowserAnimation('#sidebarSVG', 'opacity', '.95', '3s cubic-bezier(0,1.18,.29,.9)')
			  $('#sidebarSVG').css('cursor', 'pointer');
			}, function(){ 
			  crossbrowserAnimation('#sidebarSVG', 'opacity', '0', '.25s ease-out')
			  $('#sidebarSVG').css('cursor', 'default');
		});
		
	//Bottom hide button at the sidebar
	$('#sidebarBottom').hover(function(){
				crossbrowserAnimation('#sidebarBottom', 'opacity', '.95', '3s cubic-bezier(0,1.18,.29,.9)')
			    $('#sidebarBottom').css('cursor', 'pointer');
			}, function(){ 
			    crossbrowserAnimation('#sidebarBottom', 'opacity', '0', '.25s ease-out')
			    $('#sidebarBottom').css('cursor', 'default');
	});
		
	$('#sidebarCollapse').click(function(){
				crossbrowserAnimation('#sidebar', "opacity", '0', '1s cubic-bezier(0,1.18,.29,.9)')
	});
	
	//Bring sidebar back if it's hidden on hover
	$('#sidebar').hover(function(){
		setTimeoutConst = setTimeout(function(){
			crossbrowserAnimation('#sidebar', "opacity", '1', "opacity 2s cubic-bezier(0,1.18,.29,.9)")
		}, 50);
	}, function(){clearTimeout(setTimeoutConst );});
		
	//Turn on sidebar draggability but start disabled 
	$('#sidebar').draggable({
			scroll: false,
			containment: 'window',
			disabled: true,
	});
		
	//Enable sidebar draggability
	$('#sidebarMoveSVG').mousedown(function(){
		$( "#sidebar" ).draggable( "enable" );
	}).bind('mouseup mouseleave', function() {
		$( "#sidebar" ).draggable( "disable" );
	});

	//Shows query fields selector
    $('#ctFields').click(function() {
		runctFields();
    });
	
	function runctFields(){
		divButtons('#ctFields', '#ctAttributes', '#fieldsListDiv', '#queryOptionsDiv', true);
		if(appendedTimeSelectTag){
			$('#queryOptionsTime').remove();
			appendedTimeSelectTag = false;			
		}
	}
	
	//Shows the query attributes selector
	//If the appropriate date/time field is selected add a second selector 
    $('#ctAttributes').click(function() {
		divButtons('#ctAttributes', '#ctFields', '#queryOptionsDiv', '#fieldsListDiv', false);
		//If there's a loaded file and a selected field is an appropiate date/time field & second selector has not been appended yet & timestamp data is supported
		if($('#LoadedFileName').html() != 'File' && $.dateTimeSupport(true, '#fieldDisplay', '#fieldsList option:selected') && !appendedTimeSelectTag){
			$('#queryOptionsDiv').append("<select class='selectionsStyle' id='queryOptionsTime'>");
			appendedTimeSelectTag = true;
			$.fieldsAttrPopulator(true, '#fieldDisplay', '#fieldsList option:selected');
		} else {
			//If the selector is appended and ctAttributes isn't already selected
			if(appendedTimeSelectTag && $('#fieldsListDiv').is(":visible")){
				$('#queryOptionsTime').remove();	
				appendedTimeSelectTag = false;
			}
		}
    })
				
	//Populates ctAttributes
	//Made it a jQuery function because the referencing the local function inside parsingCSV caused it to duplicate
	$('#fieldsList').change(function() {
		$.fieldsAttrPopulator(true, '#fieldDisplay', '#fieldsList option:selected');
	});
	
	//Populates the color categories attributes in the style section
	$('#fieldOptionsStyle').change(function() {
		$.fieldsAttrPopulator(false, '#fieldDisplay', '#fieldOptionsStyle option:selected');
	});
	
	//Set color sets
	$('#dropDownColorSetColors').change(function(){
		$.colorSetFunc()
	});
	
	//Set general colors
	$("#dropdownColors").change(function() {
		$.colorSwitch();
	});
	
	//Set shapes
	$("#dropdownShapes, #dropdownShapesCat").change(function() {
	   $.shapeSwitch();
	});

	//General styling options
	$('#ctGeneral').click(function() {
		general = true;
		attribute = false;
		if ($("#CATselection").hasClass('CATslidedown')) {
            $('#CATselection').removeClass('CATslidedown').addClass('CATslideup');
		}
		divButtons('#ctGeneral', '#ctAttributesColor', '#fieldsListDiv', '#queryOptionsDiv', false);
		$('#StyleOptionButtonCAT').css('display', 'none');
		$('#dropDownColorSet').css('display', 'none');
		$('#dropdownColors').css('display', 'initial');
		$('#sendStyle').css('display', 'initial');
	});
		
	//Attribute Styling Options
	$('#ctAttributesColor').click(function() {
		general = false;
		attribute = true;
        if ($("#CATselection").hasClass('CATslideup')) {
            $('#CATselection').removeClass('CATslideup').addClass('CATslidedown');
		}
		divButtons('#ctAttributesColor', '#ctGeneral', '#queryOptionsDiv', '#fieldsListDiv', false);
		$('#dropdownColors').css('display', 'none');
		$('#sendStyle').css('display', 'none');
		$('#StyleOptionButtonCAT').css('display', 'inline');
		$('#dropDownColorSet').css('display', 'inline');
	});
	
	//FOUR MAIN BUTTONS ON THE SIDEBAR	
	//Style
    $('#stylingOptionsHeader').click(function(){
		divButtonHasRemove("#queryDiv", 'slidedown', 'dissapear');
		divButtonHasRemove('#reuseableLegendDiv', 'reuseableLegendDivClass', 'slideup');
        if ($("#stylingDiv").hasClass('slideup') || $("#stylingDiv").hasClass('dissapear')) {
            $('#stylingDiv').removeClass('slideup').addClass('slidedown');
			$('#stylingDiv').removeClass('dissapear').addClass('slidedown');
        } else {
            $('#stylingDiv').removeClass('slidedown').addClass('slideup');
        }
	})
	
	//Query
    $('#queryOptionsHeader').click(function(){
		divButtonHasRemove("#stylingDiv", 'slidedown', 'dissapear');
		divButtonHasRemove('#reuseableLegendDiv', 'reuseableLegendDivClass', 'slideup');
        if ($("#queryDiv").hasClass('slideup') || $("#queryDiv").hasClass('dissapear')) {
            $('#queryDiv').removeClass('slideup').addClass('slidedown');
			$('#queryDiv').removeClass('dissapear').addClass('slidedown');
        } 	
		else {
            $('#queryDiv').removeClass('slidedown').addClass('slideup');
        }
    })
	
	//Turns on and off basemap
    $("#basemapButton").click(function() {
		if ($('#basemapGalleryHolder').hasClass('dissapear')) {
				 $('#basemapGalleryHolder').removeClass('dissapear').addClass('reappear');
				 //If the Zoom slider is on and the basemap turns on turn off the basemap
				 if(map.isZoomSlider){
					 map.hideZoomSlider();
					 basemapTurnOFfZoomSlider = true;
				 }
			} else {
				 $('#basemapGalleryHolder').removeClass('reappear').addClass('dissapear');
				 //If turning on the basemap turned off the zoom slider then turn ont he zoom slider
				 if(basemapTurnOFfZoomSlider){
					 map.showZoomSlider();
					 basemapTurnOFfZoomSlider = false;
				 }
    		}
	});
	
	//Basemaps
    $('#legendTitle').click(function(){
		if (appendedLegend && colorQueryRunQuery && $('#normalLegend').hasClass('dissapear')){
			legendShow('#normalLegend', 'top', 'left', '45%', '10%');
		} else {
			legendHide('#normalLegend');
		}
    })
	
	$('#hideZoom').hover(function() {
		crossbrowserAnimation('#hideZoom', 'color', "rgba(190,190,195,.8)", '.5s cubic-bezier(0,1.18,.29,.9)')
	}, function(){ 
		crossbrowserAnimation('#hideZoom', 'color', "black", '.33s ease-out');
	});
	
 //END OF DOM
});