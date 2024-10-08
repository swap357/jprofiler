import { Widget } from '@lumino/widgets';
import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';
import { Cell, CodeCell, ICodeCellModel } from '@jupyterlab/cells';
import { OutputArea } from '@jupyterlab/outputarea';
import { IOutputModel } from '@jupyterlab/rendermime';

export const PLUGIN_NAME = 'jprofiler';
const MEMORY_USAGE_CLASS = 'memory-usage';

export interface IMemoryUsageSettings {
  enabled: boolean;
  positioning: string;
  textContrast: string;
}

export default class MemoryUsageWidget extends Widget {
  constructor(panel: NotebookPanel, tracker: INotebookTracker) {
    super();
    this._panel = panel;

    if (panel.content && panel.content.model) {
      panel.content.model.cells.changed.connect(
        this._handleCellsChanged.bind(this)
      );
    }
  }

  private _handleCellsChanged(sender: any, args: any) {
    if (args.type === 'add') {
      args.newValues.forEach((cell: any) => {
        if (cell.type === 'code') {
          this._setupOutputListener(cell);
        }
      });
    }
  }

  private _setupOutputListener(cell: ICodeCellModel) {
    cell.outputs.changed.connect((sender: any) => {
      const outputArea = (
        this._panel.content.widgets.find(
          widget => widget.model === cell
        ) as CodeCell
      ).outputArea;

      outputArea.model.changed.connect(
        this._handleOutputAreaChanged.bind(this, outputArea)
      );
    });
  }

  private _handleOutputAreaChanged(
    outputArea: OutputArea,
    model: any,
    args: any
  ) {
    if (args.type === 'add') {
      args.newValues.forEach((output: IOutputModel) => {
        this._handleOutput(outputArea, output);
      });
    }
  }

  private _handleOutput(sender: OutputArea, output: IOutputModel) {
    if (output.type === 'display_data') {
      const data = output.data as Record<string, any>;
      if (data && data['application/vnd.miniprof+json']) {
        const profData = data['application/vnd.miniprof+json'] as any;
        console.log('_handleOutput profData', profData);
        const cell = sender.parent as Cell;
        this._updateCellWithMemoryUsage(cell, profData);
      }
    }
  }

  private _updateCellWithMemoryUsage(cell: Cell, profData: any) {
    const memoryUsage = profData.memory_usage.toFixed(4);
    const cpuTime = profData.cpu_time.toFixed(4);
    const duration = profData.duration.toFixed(4);
    const parallelization = profData.parallelization.toFixed(4);
    const cpuUtilization = profData.cpu_utilization.toFixed(4);
    const amdahlSpeedup = profData.amdahl_speedup.toFixed(4);
    const uslSpeedup = profData.usl_speedup.toFixed(4);
    let memoryUsageNode = cell.node.querySelector(
      `.${MEMORY_USAGE_CLASS}`
    ) as HTMLElement;

    if (!memoryUsageNode) {
      memoryUsageNode = document.createElement('div');
      memoryUsageNode.className = MEMORY_USAGE_CLASS;
      cell.node.appendChild(memoryUsageNode);
    }

    memoryUsageNode.textContent = `Memory: ${memoryUsage} MB, cpuTime: ${cpuTime} s, 
    Duration: ${duration} s, Parallelization: ${parallelization}, CPU Utilization: ${cpuUtilization}, 
    Amdahl Speedup: ${amdahlSpeedup}, USL Speedup: ${uslSpeedup}`;
  }

  private _panel: NotebookPanel;
}
