/**
* This script was developed by Guberni and is part of Tellki's Monitoring Solution
*
* February, 2015
* 
* Version 1.0
*
* DEPENDENCIES:
*		net-snmp v1.1.13 (https://www.npmjs.com/package/net-snmp)
*
* DESCRIPTION: Monitor Heartbeat (SNMP) utilization
*
* SYNTAX: node network_check_snmp_monitor.js <HOST> <METRIC_STATE> <COMMUNITY>
* 
* EXAMPLE: node network_check_snmp_monitor.js "10.10.2.5" "1,1" "public"
*
* README:
*		<HOST> Hostname or ip address to check
* 
*		<METRIC_STATE> is generated internally by Tellki and it's only used by Tellki default monitors.
*		1 - metric is on ; 0 - metric is off
*
*		<COMMUNITY> SNMP community
*
**/

var snmp = require("net-snmp");

//METRICS IDS
var metricStatusId = "54:Status:9";
var metricResponseTimeId = "116:Response Time:4";


// ############# INPUT ###################################
//START
(function() {
	try
	{
		monitorInput(process.argv.slice(2));
	}
	catch(err)
	{	
		if(err instanceof InvalidParametersNumberError)
		{
			console.log(err.message);
			process.exit(err.code);
		}
		else
		{
			console.log(err.message);
			process.exit(1);
		}
	}
}).call(this)


/*
* Verify number of passed arguments into the script.
*/
function monitorInput(args)
{

	if(args.length != 3)
	{
		throw new InvalidParametersNumberError()
	}		

	monitorInputProcess(args);
}


/*
* Process the passed arguments and send them to monitor execution (monitorSNMP)
* Receive: arguments to be processed
*/
function monitorInputProcess(args)
{
	
	// <HOST> 
	var host = args[0];
	
	// <METRIC_STATE> 
	var metricState = args[1].split(",");
	
	var metricsExecution = new Array(2);
	
	for(var i in metricState)
	{
		metricsExecution[i] = (metricState[i] === "1")
	}
	
	// <COMMUNITY>
	var community = args[2];
	
	//create request object to be executed
	var request = new Object();
	request.host = host;
	request.metricsExecution = metricsExecution;
	request.community = community;
	
	//call monitor
	monitorSNMP(request);

}


// ################# SNMP CHECK ###########################
/*
* Retrieve metrics information
* Receive: object request containing configuration
*/
function monitorSNMP(request) 
{
	// oids list
	var oids = [];
	oids.push("1.3.6.1.2.1.1.2.0");
	
	//set snmp options 
	var options = {
		port: 161,
		version: snmp.Version1
	};
	
	//create session
	var session = snmp.createSession (request.host, request.community, options);

	var start = Date.now();
	
	//do request
	session.get (oids, function (error, varbinds) 
	{
		if (error) 
		{	
			//try snmp version 2
			callSNMP_V2(oids, request, start);	
		} 
		else 
		{
			// output metrics
			processMetricOnSuccess(request, start)
		}
		
		
		session.close();
				
	});
	
	session.on ("error", function(err)
	{
		// output status set to 0
		processMetricOnError(request, start)
	});
}

/*
* Test on SNMP version 2.
* Receive: 
* - oids list
* - object request containing configuration
* - start time, to calculate execution time
*/
function callSNMP_V2(oids, request, start)
{
	//set snmp options 
	var options = {
		port: 161,
		version: snmp.Version2c
	};
	
	//create session
	var session = snmp.createSession (request.host, request.community, options);

	//do request
	session.get (oids, function (error, varbinds) 
	{
		if (error) 
		{
			// output status set to 0
			processMetricOnError(request, start)
		} 
		else 
		{
			// output metrics
			processMetricOnSuccess(request, start)
		}
		
		session.close();
	});
	
	session.on("error", function(err)
	{
		// output status set to 0
		processMetricOnError(request, start)
	});
	
}



//################### OUTPUT METRICS ###########################
/*
* Send metrics to console
* Receive: metrics list to output
*/
function output(metrics)
{
	for(var i in metrics)
	{
		var out = "";
		var metric = metrics[i];
		
		out += metric.id;
		out += "|";
		out += metric.val
		out += "|";
		
		console.log(out);
	}
}

/*
* Process metrics on error.
* Receive:
* - object request to output info 
* - start time, to calculate execution time
*/
function processMetricOnError(request, start)
{
	var metrics = [];
	
	if(request.metricsExecution[0])
	{
		var metric = new Object();
		metric.id = metricStatusId;
		metric.val = 0;
		metric.ts = start;
		metric.exec = Date.now() - start;

		metrics.push(metric);
	}

	output(metrics);
	
}

/*
* process metrics on success
* Receive: 
* - object request to output info
* - start time, to calculate execution time and response time
*/
function processMetricOnSuccess(request, start)
{
	var metrics = [];
	
	if(request.metricsExecution[0])
	{
		var metric = new Object();
		metric.id = metricStatusId;
		metric.val = 1;
		metric.ts = start;
		metric.exec = Date.now() - start;

		metrics.push(metric);
	}
	
	if(request.metricsExecution[1])
	{
		var metric = new Object();
		metric.id = metricResponseTimeId;
		metric.val = Date.now() - start;
		metric.ts = start;
		metric.exec = Date.now() - start;

		metrics.push(metric);
	}
	
	output(metrics);
}


//####################### EXCEPTIONS ################################

//All exceptions used in script

function InvalidParametersNumberError() {
    this.name = "InvalidParametersNumberError";
    this.message = "Wrong number of parameters.";
	this.code = 3;
}
InvalidParametersNumberError.prototype = Object.create(Error.prototype);
InvalidParametersNumberError.prototype.constructor = InvalidParametersNumberError;

function InvalidMetricStateError() {
    this.name = "InvalidMetricStateError";
    this.message = "Metrics and Status length not match";
	this.code = 9;
}
InvalidMetricStateError.prototype = Object.create(Error.prototype);
InvalidMetricStateError.prototype.constructor = InvalidMetricStateError;

