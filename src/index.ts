import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './handler';

/**
 * Initialization data for the jprofiler extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jprofiler:plugin',
  description: 'resource profiler for Jupyter ',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jprofiler is activated!');

    requestAPI<any>('get-example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jprofiler server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default plugin;
