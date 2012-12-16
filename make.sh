#!/bin/bash

OUTPUT="out"
DOMAIN="https://api.github.com"

USER="fabriceleal"

# Ask for user,password if not passed command line / config
if [ -z "$USER" ]
then
    echo "Type your username, press [Enter]:"
    read USER
fi

#if [ -z "$PASS" ]
#then
#    echo "Type you password, press [Enter]:"
#    read PASS
#fi

# Make output, if it doesnt exists
if [ ! -d "$OUTPUT" ]
then
    mkdir "$OUTPUT"
fi

# Reads token
if [ ! -e "$OUTPUT/reqtoken_resp.json" ]
then
    if [ -z "$PASS" ]
    then
	echo "Type you password, press [Enter]:"
	read PASS
    fi

    echo "Asking for token ..."
    curl -d @jsons/reqtoken.json -u "$USER:$PASS" "$DOMAIN/authorizations" > "$OUTPUT/reqtoken_resp.json"
fi

REQTOKEN=$(<"$OUTPUT/reqtoken_resp.json")

#echo "$REQTOKEN"

TOKEN=`echo $REQTOKEN | jsoned -d "function(_){ return _.token;}"`

# Take off '"'
TOKEN=${TOKEN//\"}

echo $TOKEN

curl -H "Authorization: token $TOKEN" "$DOMAIN/user/repos" > "$OUTPUT/repos.json"
