var AWS = require('aws-sdk'),async=require('async');

AWS.config.update({accessKeyId: 'AKIAJFPPGWABF2ROMFNQ', secretAccessKey: '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'});

AWS.config.update({region: 'eu-west-1'});


require('http').createServer().listen('8009');

ec2 = new AWS.EC2();
var elb = new AWS.ELB();


launch();


function launch(){
	logm("starting waterfall");
async.waterfall([checkForHealthyInstances,getOldestInstance,deregisterInstance,deleteInstance],function(err,result){
	if(err){
logm("final callback "+err)
	}else{
		logm("final call succeded")
logm(result);
	}
	logm("reset launch")
setTimeout(launch,1000*60*10);
});

}





//getRunningInstances();
//checkForHealthyInstances();
//deregisterInstance('i-6e3c1923');
function checkForHealthyInstances(callback){

elb.describeInstanceHealth({LoadBalancerName:'mim'},function (err,data){
if(err){
	logm(err);
	callback(err);
}else{

	//logm(data);
	var d = data['InstanceStates'];
	logm(d);
	var count=0
	for(var key in d){
		logm(d[key]['State']);
		if(d[key]['State'].indexOf('OutOfService')==-1){
           count++;
		}
	}
	if(count>=3){
		logm("there are "+ count +" healthy instances so continue");
		callback(null);
	}else{
		logm("healthy instances are less so we wont delete "+count);
		callback(new Error());
	}
	
}


})

}

function deleteInstance(instanceId,callback){
		ec2.terminateInstances({InstanceIds:[instanceId]},function(err,data){
			if(err){
				logm(err);
				callback(err);
			}
			else{
				logm(data);
				callback(null,data);
			}
		});
}

function deregisterInstance(instanceId,callback){
logm("trying to deregister instance "+instanceId);
	elb.deregisterInstancesFromLoadBalancer({LoadBalancerName:'mim',
		Instances:[{'InstanceId':instanceId}]},function(err,data) {
if(err){
logm(err);
callback(err);
}else{
	logm(data);
	logm("sleeping for a minute "+new Date());
	sleep(callback,instanceId,new Date().getTime());

	//callback(null,instanceId);
}


	});
}

function sleep(callback,instanceId,tim){
	
ec2.describeInstances(function(err,data){
dt = new Date().getTime();
if(dt>(60000+tim)){
	logm("done sleeping "+new Date())
	callback(null,instanceId);
}else{
	sleep(callback,instanceId,tim);
}
    
});

}



function getOldestInstance(callback){
	
	
	ec2.describeInstances(function(err, data){
		if(err){
			logm("error in calling aws --- "+err);
		callback(err);
	}
		else{
			     var count = 0;
			     var dt = data['Reservations'];
			     var lt = null;
			     var instanceId = null;
			   	for(var k in dt){
			   	//logm(dt[k]);
			   	logm(JSON.stringify(dt[k]['Instances'][0]['InstanceId']));
			   	logm(JSON.stringify(dt[k]['Instances'][0]['LaunchTime']));
			   	logm(JSON.stringify(dt[k]['Instances'][0]['State']['Name']));
			   	var state = JSON.stringify(dt[k]['Instances'][0]['State']['Name']);
				if(state.indexOf('running')==-1){
                  continue;
				}
			   	var launchTime = dt[k]['Instances'][0]['LaunchTime'];
			   	if(lt == null){
			   		lt=launchTime;
			   		instanceId=dt[k]['Instances'][0]['InstanceId'];
			   	}else{
			   		if(lt>launchTime){
			   			lt=launchTime;
			   			instanceId=dt[k]['Instances'][0]['InstanceId'];
			   		}
			   	}
			   	count++;
			   	
			   }
			   logm("oldest intance "+lt+"  "+instanceId);
			   if(count<2){
			   	callback(null,null);//lets not delete if there;s only one instance
			   }
			   callback(null,instanceId);
			}
		
		
	});
}


function logm(msg){
	console.log(msg);
}

