'use strict';

var http = require('http'),
    q = require('q'),
    _ = require('underscore');

var DataApiClient = function(host, port, path) {

  var urls = {
    auth: path +'/ws/security/token',
    readContentId: path+'/ws/content/contentid/',
    readExternalId: path+'/ws/content/externalid/',
    create: path+'/ws/content',
    search: path+'/ws/search'
  };

  var makeRequest = function(method, path, token, payload, customHeaders) {
    var deferred = q.defer();
    var responseData = '';

    var params = {
      'hostname': host,
      'port': port,
      'method': method,
      'path': path,
      'headers': _.extend({ 'Content-Type': 'application/json' }, customHeaders)
    };

    if(token) {
      params.headers['X-Auth-Token'] = token;
    }

    var req = http.request(params, function(res) {
      var statusCode = res.statusCode;

      res.on('data', function(chunk) {
        responseData += chunk;
      });

      res.on('end', function() {
        var jsonData = JSON.parse(responseData);

        if(_.contains([400, 401, 403, 404, 500], statusCode)) {
          deferred.reject('HTTP '+ statusCode +': '+ (jsonData.message || jsonData.error.msg));
        }

        if(statusCode === 401) {
          deferred.reject('401 Unauthorized');
        } else if(statusCode === 403) {
          deferred.reject('403 Forbidden');
        } else if(statusCode === 400) {
          deferred.reject('400 Bad Request');
        } else if(statusCode === 500) {
          deferred.reject('500 Internal Server Error');
        } else if(statusCode === 303) {
          makeRequest(method, jsonData.location, token, payload, customHeaders).then(function(response) {
            deferred.resolve(response);
          }, function(error ) {
            deferred.reject(error);
          });
        } else {
          if(responseData && responseData !== '') {
            deferred.resolve(jsonData);
          } else {
            deferred.resolve();
          }
        }
      });
    });

    req.on('error', function(error) {
      console.log('ERROR: '+ error);
      deferred.reject(error);
    });

    if(params.method === 'POST' || params.method === 'PUT') {
      req.write(JSON.stringify(payload));
    }

    req.end();

    return deferred.promise;
  };

  return {
    authenticate: function(username, password) {
      var payload = {
        'username': username,
        'password': password
      };

      return makeRequest('POST', urls.auth, undefined, payload);
    },

    invalidateToken: function(token) {
      return makeRequest('DELETE', urls.auth, token);
    },

    search: function(token, index, searchExpression, variant, rows) {
      var path = urls.search+'/'+ encodeURIComponent(index) +'/select?q='+ encodeURIComponent(searchExpression) +'&wt=json';

      if(rows) path += '&rows='+encodeURIComponent(rows);
      if(variant) path += '&variant='+encodeURIComponent(variant);

      return makeRequest('GET', path, token);
    },

    create: function(token, payload, variant) {
      return makeRequest('POST', urls.create+'?variant='+variant, token, payload);
    },

    read: function(token, contentId, variant) {
      var path = (/\d+\.\d+/.test(contentId) ? urls.readContentId : urls.readExternalId) + contentId;

      if(variant) path += "?variant="+ variant;

      return makeRequest('GET', path, token);
    },

    update: function(token, payload, variant) {
      var path = (/\d+\.\d+/.test(payload.id) ? urls.readContentId : urls.readExternalId) + payload.id;
      if(variant) path += "?variant="+ variant;

      return makeRequest('PUT', path, token, payload, { 'If-Match': payload.id +'.'+ payload.version });
    }
  };
};

module.exports = {
  client: DataApiClient
};
