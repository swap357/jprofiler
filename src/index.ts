import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  INotebookTracker,
  INotebookModel,
  NotebookPanel,
} from '@jupyterlab/notebook';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import MemoryUsageWidget from './MemoryUsageWidget';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

class MemoryUsageWidgetExtension implements DocumentRegistry.WidgetExtension {
  constructor(tracker: INotebookTracker, settings: ISettingRegistry.ISettings | null) {
    this._settings = settings!;
    this._tracker = tracker;
  }

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ) {
    return new MemoryUsageWidget(panel, this._tracker, this._settings!);
  }
  
  private _settings: ISettingRegistry.ISettings;
  private _tracker: INotebookTracker;
}

function loadIPythonExtension(notebook: NotebookPanel) {
  console.log('Attempting to load IPython extension');
  
  const sessionContext = notebook.sessionContext;
  
  if (sessionContext.session?.kernel) {
    _loadExtension(sessionContext.session.kernel);
  } else {
    sessionContext.kernelChanged.connect((_, changed) => {
      if (changed.newValue) {
        _loadExtension(changed.newValue);
      }
    });
  }
}

async function _loadExtension(kernel: any) {
  try {
    const response = await kernel.requestExecute({
      code: '%load_ext jprofiler.miniprofiler'
    }).done;
    
    if (response.content.status === 'ok') {
      console.log('MiniProfiler IPython extension loaded successfully');
    } else {
      console.error('Failed to load MiniProfiler IPython extension:', response.content);
    }
  } catch (error) {
    console.error('Error loading MiniProfiler IPython extension:', error);
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jprofiler',
  description: 'resource profiler for Jupyter',
  autoStart: true,
  requires: [INotebookTracker, ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    settingRegistry: ISettingRegistry
  ) => {
    console.log('JupyterLab extension jprofiler is activated!');

    let settings: ISettingRegistry.ISettings | null = null;
    try {
      settings = await settingRegistry.load('jprofiler:settings');
    } catch (err: unknown) {
      console.error(
        `jprofiler: Could not load settings, so did not activate jprofiler: ${err}`
      );
    }

    // Load the IPython extension for each new notebook
    notebookTracker.widgetAdded.connect((_, notebook) => {
      loadIPythonExtension(notebook);
    });

    // Also load for any existing notebooks
    notebookTracker.forEach((notebook) => {
      loadIPythonExtension(notebook);
    });

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new MemoryUsageWidgetExtension(notebookTracker, settings)
    );
  }
};

export default plugin;
