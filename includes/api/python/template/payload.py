from CursedScreech import CursedScreech

cs = CursedScreech("Network Client")
cs.startMulticaster("IPAddress", mcastport)
cs.setRemoteCertificateSerial("serial")
cs.startSecureServerThread("privateKey", "publicKey", "kuroKey")
