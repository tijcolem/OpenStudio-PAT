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
import jetpack from 'fs-jetpack';

export class ModalDuplicateMeasureController {

  constructor($log, $uibModalInstance, measure, Project, Message) {
    'ngInject';

    const vm = this;
    vm.$uibModalInstance = $uibModalInstance;
    vm.Project = Project;
    vm.$log = $log;
    vm.measure = measure;
    vm.newDisplayName = measure.display_name;
    vm.newDescription = measure.description;
    vm.newModelerDescription = measure.modeler_description;
    //vm.MeasureManager = MeasureManager;
    vm.jetpack = jetpack;
    vm.Message = Message;
  }

  ok() {
    const vm = this;
    if (vm.Message.showDebug()) vm.$log.debug('Duplicate Measure measure: ', vm.measure);
    //const oldMeasureDir = vm.measure.measure_dir;

    // Find a unique measure_dir (& unique name?)
    let count = 0;
    let displayName = vm.newDisplayName;
    // dirname is sometimes UpperCamelCase, other times it is snake_case.  Check both, but set new measure to snake_case
    let measureDir = vm.Project.getMeasuresDir().path(_.snakeCase(displayName));
    let measureDirUCC = vm.Project.getMeasuresDir().path(_.startCase(displayName).replace(/\s+/g, ''));
    if (vm.Message.showDebug()) vm.$log.debug('measureDir: ', measureDir);

    while (vm.jetpack.exists(measureDir) || vm.jetpack.exists(measureDirUCC)) {
        count++;
        displayName = vm.newDisplayName + count.toString();
        measureDir = vm.Project.getMeasuresDir().path(_.snakeCase(displayName));
        measureDirUCC = vm.Project.getMeasuresDir().path(_.startCase(displayName).replace(/\s+/g, ''));
        if (vm.Message.showDebug()) vm.$log.debug('measureDir: ', measureDir);
    }

    // extra check to ensure that the new name (which will be a snake_case version of displayName) doesn't match the old name.  If so, increment.
    // The expectation is that users would go in and fix the names to what they actually want in the newly duplicated measure
    if (_.snakeCase(displayName) === vm.measure.name) {
      // edge case caused by bad directory naming
      // increment one more time
      count ++;
      displayName = vm.newDisplayName + count.toString();
      measureDir = vm.Project.getMeasuresDir().path(_.snakeCase(displayName));
    }

    const params = {
      old_measure_dir: vm.measure.measure_dir,
      measure_dir: measureDir,
      display_name: displayName,
      class_name: _.upperFirst(_.camelCase(displayName)),
      taxonomy_tag: vm.measure.tags,
      measure_type: vm.measure.type,
      description: vm.newDescription,
      modeler_description: vm.newModelerDescription,
      force_reload: 0
    };

    if (vm.Message.showDebug()) vm.$log.debug('Duplicate Measure params: ', params);
    vm.$uibModalInstance.close(params);
  }

  cancel() {
    const vm = this;
    vm.$uibModalInstance.dismiss('cancel');
  }

}
