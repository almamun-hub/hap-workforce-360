@echo off
netsh advfirewall firewall add rule name="HAP Workforce 360" dir=in action=allow protocol=TCP localport=3001
pause
