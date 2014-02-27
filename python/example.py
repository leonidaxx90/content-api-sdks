#!/usr/bin/python

import dataapi
import time
import sys

client = dataapi.Client("localhost", 8080, "/data-api")
token = None
try:
    print "-- Authenticating..."
    response = client.authenticate('edmund', 'edmund')
    token = response['token']
    print "-- Successfully authenticated!"
except Exception as e:
    print "-- Failed to authenticate: {0}".format(e)

if token:
    content = None

    try:
        print "-- Reading content 1.229..."
        content = client.read(token, "1.229", "act")
        print "-- Successfully read content! {0}.{1}".format(content["id"], content["version"])
    except Exception, Argument:
        print "-- Failed to read content: {0}".format(e)
        sys.exit(1)

    if content:
        content["contentData"]["name"] = "An updated article {0}".format(int(time.time()))

        try:
            print "-- Updating content..."
            response = client.update(token, content, "act")
            print "-- Successfully updated content! {0}.{1}".format(response["id"], response["version"])
        except Exception as e:
            print "-- Failed to update content: {0}".format(e)
            sys.exit(1)

        try:
            print "-- Creating content..."
            content["contentData"]["name"] = "A created article {0}".format(int(time.time()))
            response = client.create(token, content, "act")
            print "-- Successfully created content! {0}.{1}".format(response["id"], response["version"])
        except Exception as e:
            print "-- Failed to create content: {0}".format(e)
            sys.exit(1)

        try:
            print "-- Searching for content..."
            response = client.search(token, "public", "text:An updated article", "act")
            print "-- Successfully searched for content! Got {0} hits.".format(response["response"]["numFound"])
        except Exception as e:
            print "-- Failed to search for content: {0}".format(e)
            sys.exit(1)

        try:
            print "-- Invalidating token..."
            response = client.invalidateToken(token)
            print "-- Successfully invalidated token!"
        except Exception as e:
            print "-- Failed to invalidate token: {0}".format(e)
            sys.exit(1)