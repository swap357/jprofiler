import { Widget } from '@lumino/widgets';
import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Cell, CodeCell, ICodeCellModel } from '@jupyterlab/cells';
import { OutputArea } from '@jupyterlab/outputarea';
import { IOutputModel } from '@jupyterlab/rendermime';

export const PLUGIN_NAME = 'jprofiler';
const MEMORY_USAGE_CLASS = 'memory-usage';

// How long do we animate the color for
const ANIMATE_TIME_MS = 1000;
const ANIMATE_CSS = `memoryHighlight ${ANIMATE_TIME_MS}ms`;

export interface IMemoryUsageSettings {
  enabled: boolean;
  highlight: boolean;
  positioning: string;
  textContrast: string;
}

export default class MemoryUsageWidget extends Widget {
  constructor(
    panel: NotebookPanel,
    tracker: INotebookTracker,
    settings: ISettingRegistry.ISettings
  ) {
    super();
    this._panel = panel;

    // Initialize _settings in the constructor
    this._settings = this._getSettingsValues(settings);
    settings.changed.connect(this._updateSettings.bind(this));

    if (panel.content && panel.content.model) {
      panel.content.model.cells.changed.connect((sender, args) => {
        if (args.type === 'add') {
          args.newValues.forEach(cell => {
            if (cell.type === 'code') {
              (cell as ICodeCellModel).outputs.changed.connect(sender => {
                console.log('outputs changed');
                const outputArea = (
                  this._panel.content.widgets.find(
                    widget => widget.model === cell
                  ) as CodeCell
                ).outputArea;
                outputArea.model.changed.connect((model, args) => {
                  console.log('outputArea.model.changed', args);
                  if (args.type === 'add') {
                    args.newValues.forEach(output => {
                      this._handleOutput(outputArea, output);
                    });
                  }
                });
              });
            }
          });
        }
      });
    }
  }

  private _handleOutput(sender: OutputArea, output: IOutputModel) {
    console.log('at _handleOutput', output);
    if (output.type === 'display_data') {
      const data = output.data as Record<string, any>;
      console.log('data', data);
      if (data && data['application/vnd.miniprof+json']) {
        const profData = data['application/vnd.miniprof+json'] as any;
        console.log('profData:', profData);
        const cell = sender.parent as Cell;
        this._updateCellWithMemoryUsage(cell, profData);
      }
    }
  }

  private _updateCellWithMemoryUsage(cell: Cell, profData: any) {
    const memoryUsage = profData.memory_usage.toFixed(2);
    let memoryUsageNode = cell.node.querySelector(
      `.${MEMORY_USAGE_CLASS}`
    ) as HTMLElement;

    if (!memoryUsageNode) {
      memoryUsageNode = document.createElement('div');
      memoryUsageNode.className = MEMORY_USAGE_CLASS;
      cell.node.appendChild(memoryUsageNode);
    }

    memoryUsageNode.textContent = `Memory: ${memoryUsage} MB`;

    if (this._settings.highlight) {
      memoryUsageNode.style.animation = ANIMATE_CSS;
      setTimeout(() => {
        if (memoryUsageNode) {
          memoryUsageNode.style.animation = '';
        }
      }, ANIMATE_TIME_MS);
    }
  }

  private _updateSettings(settings: ISettingRegistry.ISettings) {
    this._settings = this._getSettingsValues(settings);
  }

  private _getSettingsValues(
    settings: ISettingRegistry.ISettings
  ): IMemoryUsageSettings {
    return {
      enabled: settings.get('enabled').composite as boolean,
      highlight: settings.get('highlight').composite as boolean,
      positioning: settings.get('positioning').composite as string,
      textContrast: settings.get('textContrast').composite as string
    };
  }

  private _settings: IMemoryUsageSettings;
  private _panel: NotebookPanel;
}
