
var snmp = require("net-snmp");

var metricStatusId = "54:Status:9";
var metricResponseTimeId = "116:Response Time:7";


//####################### EXCEPTIONS ################################

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



// ############# INPUT ###################################

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
		else if(err instanceof InvalidMetricStateError)
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



function monitorInput(args)
{

	if(args.length != 3)
	{
		throw new InvalidParametersNumberError()
	}		

	monitorInputProcess(args);
}



function monitorInputProcess(args)
{
	
	//host
	var host = args[0];
	
	//metric state
	var metricState = args[1].split(",");
	
	var metricsExecution = new Array(2);
	
	if (metricState.length != 2)
	{
		throw new InvalidMetricStateError();
	}
	else
	{
		for(var i in metricState)
		{
			metricsExecution[i] = (metricState[i] === "1")
		}
	}
	
	//community
	var community = args[2];
	
	var request = new Object();
	request.host = host;
	request.metricsExecution = metricsExecution;
	request.community = community;
	
	monitorSNMP(request);

}




//################### OUTPUT ###########################


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



// ################# MONITOR ###########################

function monitorSNMP(request) 
{
	var oids = [];
	
	oids.push("1.3.6.1.2.1.1.2.0");
	
	var options = {
		port: 161,
		version: snmp.Version1
	};
	
	
	var session = snmp.createSession (request.host, request.community, options);

	var start = Date.now();
	
	session.get (oids, function (error, varbinds) 
	{
		if (error) 
		{	
			callSNMP_V2(oids, request, start);	
		} 
		else 
		{
			processMetricOnSuccess(request, start)
		}
		
		
		session.close();
				
	});
	
	session.on ("error", function(err)
	{
		processMetricOnError(request, start)
	});
}


function callSNMP_V2(oids, request, start)
{
	var options = {
		port: 161,
		version: snmp.Version2c
	};
	
	var session = snmp.createSession (request.host, request.community, options);

	session.get (oids, function (error, varbinds) 
	{
		if (error) 
		{
			processMetricOnError(request, start)
		} 
		else 
		{
			processMetricOnSuccess(request, start)
		}
		
		session.close();
	});
	
	session.on("error", function(err)
	{
		processMetricOnError(request, start)
	});
	
}



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
