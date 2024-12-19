@echo off
for /L %%P in (2600,1,2604) do (
    netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=%%P connectaddress=172.25.141.66 connectport=%%P
)