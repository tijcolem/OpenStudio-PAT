/***********************************************************************************************************************
 *  OpenStudio(R), Copyright (c) 2008-2020, Alliance for Sustainable Energy, LLC. All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 *  following conditions are met:
 *
 *  (1) Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 *  disclaimer.
 *
 *  (2) Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *  following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 *  (3) Neither the name of the copyright holder nor the names of any contributors may be used to endorse or promote
 *  products derived from this software without specific prior written permission from the respective party.
 *
 *  (4) Other than as required in clauses (1) and (2), distributions in any form of modifications or other derivative
 *  works may not use the "OpenStudio" trademark, "OS", "os", or any other confusingly similar designation without
 *  specific prior written permission from Alliance for Sustainable Energy, LLC.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
 *  INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *  DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER, THE UNITED STATES GOVERNMENT, OR ANY CONTRIBUTORS BE LIABLE FOR
 *  ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *  PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
 *  AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **********************************************************************************************************************/
/*global bootlint*/

import {remote} from 'electron';
const {app, Menu, shell} = remote;

export function runBlock($rootScope, $state, $window, $document, $translate, toastr, MeasureManager, DependencyManager, Project, BCL, OsServer, SetProject, OpenProject, $log, Message) {
  'ngInject';

  let exitReady = false;

  $window.onbeforeunload = e => {
    console.log('EXIT BUTTON CLICKED?: ', remote.getGlobal('exitClicked'));
    if (!exitReady && remote.getGlobal('exitClicked')) {
      try {
        // only if project is set
        if (Project.getProjectDir() != null) {
          e.returnValue = false;
          $translate('toastr.prepareExit').then(translation => {
            toastr.info(translation);
          });
          Project.modifiedModal().then(() => {
            $log.debug('Resolving modifiedModal()');
            MeasureManager.stopMeasureManager();
            // stop cloud?
            OsServer.cloudRunningModal().then(() => {
              // stop success or nothing to stop
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                //jetpack.write(Project.getProjectDir().path('serverStopTest.json'), {message: 'Server stopped.'});
                exitReady = true;
                app.quit();
              }, () => {
                exitReady = true;
                app.quit();
              });
            }, () => {
              // stop error
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                //jetpack.write(Project.getProjectDir().path('serverStopTest.json'), {message: 'Server stopped.'});
                exitReady = true;
                app.quit();
              }, () => {
                exitReady = true;
                app.quit();
              });
            });
          }, () => {
            $log.debug('Rejected modifiedModal()');
            // stop cloud?
            OsServer.cloudRunningModal().then(() => {
              // cloud stop success or nothing to stop
              MeasureManager.stopMeasureManager();
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                exitReady = true;
                app.quit();
              }, () => {
                exitReady = true;
                app.quit();
              });
            }, () => {
              // cloud stop error
              MeasureManager.stopMeasureManager();
              // force stop LOCAL server (even if remote server is running)
              OsServer.stopServer('local').then(() => {
                //  server is stopped
                exitReady = true;
                app.quit();
              }, () => {
                exitReady = true;
                app.quit();
              });
            });
          });
        } else {
          // nothing to do, exit.
          exitReady = true;
          app.quit();
        }
      } catch (e) {
        // TODO: log something to a file
        // if (Project.getProjectDir() != null) {
        //   //jetpack.write(Project.getProjectDir().path('serverStopTest.json'), {message: 'There was an error closing the app.'});
        // }
        exitReady = true;
        app.quit();
      }
    }

    // Prevent exit.  Uncomment to test
    //e.returnValue = false;
  };

  $window.lint = () => {
    const s = $document[0].createElement('script');
    s.src = 'https://maxcdn.bootstrapcdn.com/bootlint/latest/bootlint.min.js';
    s.onload = () => bootlint.showLintReportForCurrentDocument([]);
    $document[0].body.appendChild(s);
  };


  $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    // Save pretty options when leaving analysis state (needed for PAT.json and for DesignAlternatives tab)
    if (fromState.name == 'analysis') {
      Project.savePrettyOptions();
    }

    // warn user that they need to cancel their run before moving from this state
    if (fromState.name == 'run' && OsServer.getAnalysisRunningFlag()) {
      event.preventDefault();
      OsServer.showAnalysisRunningDialog();
    }

  });

  // For now don't check for dependencies..wait for Kyle's new code
  //DependencyManager.checkDependencies()
  //  .then(_.bind(MeasureManager.startMeasureManager, MeasureManager), _.bind(MeasureManager.startMeasureManager, MeasureManager));
  MeasureManager.startMeasureManager();

  // open project and navigate to analysis tab
  OpenProject.openModal().then(() => {
    //$state.go('analysis');
    $log.debug('RELOADING PAGE / NAVIGATE TO ANALYSIS PAGE');
    $state.transitionTo('analysis', {}, {reload: true});
  });

  const initialLanguage = $translate.use();
  const setLanguage = language => {
    console.log(language);
    $translate.use(language);
  };

  const fileMenu = {
    label: 'File',
    submenu: [{
      label: 'New',
      accelerator: 'Ctrl+N',
      click: () => SetProject.warnCloudRunning('new')
    }, {
      label: 'Open',
      accelerator: 'Ctrl+O',
      click: () => SetProject.warnCloudRunning('open')
    }, {
      label: 'Save',
      accelerator: 'Ctrl+S',
      click: () => SetProject.saveProject()
    }, {
      label: 'Save As',
      click: () => SetProject.saveAsProject()
    }, {
      label: 'Quit',
      accelerator: 'Ctrl+Q',
      click: () => app.quit()
    }]
  };
  const template = [{
    label: 'Edit',
    submenu: [{
      label: 'Cut',
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    }, {
      label: 'Copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    }, {
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    }, {
      label: 'Select All',
      accelerator: 'CmdOrCtrl+A',
      role: 'selectall'
    }]
  }, {
    label: 'View',
    submenu: [{
      label: 'Language',
      submenu: [{
        label: 'English',
        type: 'radio',
        checked: initialLanguage == 'en',
        click() {
          setLanguage('en');
        }
      }, {
        label: 'French',
        type: 'radio',
        checked: initialLanguage == 'fr',
        click() {
          setLanguage('fr');
        }
      }]
    }, {
      label: 'Toggle Full Screen',
      accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
      click(item, focusedWindow) {
        if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
      }
    }, {
      label: 'Toggle Developer Tools',
      accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
      click(item, focusedWindow) {
        if (focusedWindow) focusedWindow.webContents.toggleDevTools();
      }
    }, {
      label: 'Toggle Debug Messages',
      click() {
        Message.setShowDebug(!Message.showDebug());
      }
    }]
  }, {
    label: 'Window',
    role: 'window',
    submenu: [{
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    }, {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    }, {
      label: 'Open BCL',
      click() {
        BCL.openBCLModal().then(() => {
          // Do something
        });
      }
    }, {
      label: 'Set MyMeasures Directory',
      click: () => Project.openSetMyMeasuresDirModal()
    }, {
      label: 'Server Tools',
      click: () => OsServer.openServerToolsModal()
    }]
  }, {
    label: 'Help',
    role: 'help',
    submenu: [{
      label: 'Learn More',
      click() {
        shell.openExternal('https://www.openstudio.net/');
      }
    }, {
      label: 'Search Issues',
      click() {
        shell.openExternal('https://github.com/NREL/OpenStudio-PAT/issues');
      }
    }]
  }];

  if (process.platform === 'darwin') {
    const name = app.getName();
    template.unshift({
      label: name,
      submenu: [{
        label: 'About ' + name,
        role: 'about'
      }, {
        type: 'separator'
      }, {
        label: 'Services',
        role: 'services',
        submenu: []
      }, {
        type: 'separator'
      }, {
        label: 'Hide ' + name,
        accelerator: 'Command+H',
        role: 'hide'
      }, {
        label: 'Hide Others',
        accelerator: 'Command+Alt+H',
        role: 'hideothers'
      }, {
        label: 'Show All',
        role: 'unhide'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() {
          app.quit();
        }
      }]
    }, {
      label: 'File',
      submenu: [{
        label: 'New',
        accelerator: 'Command+N',
        click() {
          SetProject.warnCloudRunning('new');
        }
      }, {
        label: 'Open',
        accelerator: 'Command+O',
        click() {
          SetProject.warnCloudRunning('open');
        }
      }, {
        label: 'Save',
        accelerator: 'Command+S',
        click() {
          SetProject.saveProject();
        }
      }, {
        label: 'Save As',
        click() {
          SetProject.saveAsProject();
        }
      }]
    });

    // Window menu.
    template[3].submenu.push({
      type: 'separator'
    }, {
      label: 'Bring All to Front',
      role: 'front'
    });
  } else {
    template.unshift(fileMenu);
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
