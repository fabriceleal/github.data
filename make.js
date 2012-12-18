var fs = require('fs');
var https = require('https');

var basicRequest = function(user, password)
{
    return function(options, callback)
    {
	options["headers"] = options["headers"] || {};
	options["headers"]["Authorization"] = "Basic " + (new Buffer(user + ':' + password).toString('base64'));
	var req = https.request(options, callback);	
	return req;
    }
}

var tokenRequest = function(token)
{
    return function(options, callback)
    {
	options["headers"] = options["headers"] || {};	
	options["headers"]["Authorization"] = "token " + token;	
	//console.log(options["headers"]["Authorization"]);
	var req = https.request(options, callback);
	return req;
    };
}


var readConfig = function(done){
    fs.exists('config.json', function(val) {
	console.log('* config exists:', val);

	var user = '', password = '';
	if(val) {
	    // Read from file
	    fs.readFile('config.json', 'utf-8', function(err, data) {
		if(err)
		    throw 'Error reading from file config.json: ' + err.toString();

		var config = JSON.parse(data);
		user = config.user;
		password = config.password;

		done(user, password);
	    });

	} else {
	    // Ask for user, password
	    user = '';
	    password = '';
		
	    // Write to file
	    fs.writeFile('config.json', JSON.stringify({"user" : user, "password" : password}), function(err) {
		if(err)
		    throw 'Error writing to file config.json: ' + err.toString(); 
	    });

	    done(user, password);
	} 
    });
};



var reqDone = function(hasData) { 
    return function(res)
    {
	//console.log(res.statusCode);
	res.setEncoding('utf8');
	var stuff = '';
	res.on('data', function(chunk){
	    stuff += chunk;
	});
	res.on('end', function(){
	    hasData(JSON.parse(stuff));
	});
    };
};

var reqStr = function(hasData) { 
    return function(res)
    {
	//console.log(res.statusCode);
	res.setEncoding('utf8');
	var stuff = '';
	res.on('data', function(chunk){
	    stuff += chunk;
	});
	res.on('end', function(){
	    hasData(stuff);
	});
    };
};

// ----------------------------

var parse = function(jsonst)
{
    return JSON.parse(jsonst);
}

var stringy = function(obj)
{
    return JSON.stringify(obj);
};

var get_token = function(st)
{
    return st.token;
};

var writeToFile = function(filename, dependencies)
{
    return function(data)
    {
	if(dependencies) {
	    for(var i = 0; i < dependencies.length; ++i) {
		if(!fs.existsSync(dependencies[i])) {
		    fs.mkdirSync(dependencies[i]);
		}
	    }
	}

	fs.writeFile(filename, data, function(err)
		     {
			 if(err)
			     throw 'Error writing to file ' + filename + ': ' + err.toString();
		     });
	return data;
    }
};

var compose = function()
{
    // The argument of arguments[i] is passed to arguments[i+1], and so forth ...
    // Always expect one argument - curry everything! \:D/
    var arguments = Array.prototype.slice.call(arguments);
    var composed = function(x){return x;};

    for(var i = 0; i < arguments.length; ++i)
    {
	composed = (function(fun, innerMost) {
	    return function(arg)
	    {
		return fun(innerMost(arg));
	    }
	})(arguments[i], composed);
    }

    return composed;
};

var map = function(action)
{
    return function(arr) {
	return arr.map(action);
    };
}

// ----------------------------

//compose(function(x){ console.log('+'); return x + 1;}, function(x){ console.log('*'); return x * 5;}, function(x){ console.log(x)} )(5);

// ----------------------------



readConfig(function(user, password){
    // * Create request factory so we can start downloading stuff
    var reqFactory = basicRequest(user, password);

    // * Start bringing stuff
    /* Download authorization token */
    var content = JSON.stringify({"scopes" : ["public_repo"], "note" : "admin script" });
    var req = reqFactory({ 
	hostname: 'api.github.com', 
	path: '/authorizations', 
	method:'POST', 
	headers:{ 
	    'content-length' : content.length
	}}, reqDone( compose(function(obj){ 
	    console.log(obj);
	    return obj;
	}, get_token, tokenRequest, /* Download repos */ function(reqFactory) {
	    var req = reqFactory({ 
		hostname: 'api.github.com',
		path: '/user/repos',
		method: 'GET',
	    }, reqStr( compose( writeToFile('out/' + user + '/repos.json', ['out/' + user]), parse, map(function(i){ return i.name; }),  
				/* Download languages */
				function(repos) {
				    repos.map(function(repo) {
					var req = reqFactory({
					    hostname: 'api.github.com',
					    path: '/repos/' + user + '/' + repo + '/languages', 
					    method: 'GET',					
					}, reqStr(
					    compose(
						writeToFile('out/' + user + '/' + repo + '/languages.json', ['out/' + user + '/' + repo])
					    )
					));
					req.end();
				    });
				    
				    return repos;
				}
				
			      )));
	    req.end();
	    return req;
	})));
    
    req.write(content);
    req.end();

    //* Finished bringing stuff    
});
