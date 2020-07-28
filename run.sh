#!/bin/bash

cd $1
echo "Script is $2"
bash -c "$2"
echo "{\"taskId\":$3}" | netcat -q 1 127.0.0.1 $4

if [ "$5" == "true" ]
then
    read -p ":::FINISHED:::"
    bash -i
fi