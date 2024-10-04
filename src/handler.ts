import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Sample server extension API call, this is not used in the extension.
 * Call the API extension
 *
 * @param endPoint API REST end point for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint = 'get-example',
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const settings = ServerConnection.makeSettings();
  const requestUrl = URLExt.join(
    settings.baseUrl,
    'jprofiler', // API Namespace
    endPoint
  );

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(requestUrl, init, settings);
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

/**
 * Test the memory profiler endpoint
 *
 * @returns The memory usage data
 */
export async function testMemoryProfiler(): Promise<any> {
  const sampleCode =
    'a = [0] * 1000000  # Create a list with 1 million elements';

  console.log('Sending request to memory-profile endpoint');
  try {
    const data = await requestAPI<any>('telemetry', {
      method: 'POST',
      body: JSON.stringify({ code: sampleCode }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Memory profiler response:', data);
    return data;
  } catch (error) {
    console.error('Error in testMemoryProfiler:', error);
    throw error;
  }
}

export async function profileCode(code: string): Promise<any> {
  console.log('Profiling code:', code);
  try {
    const data = await requestAPI<any>('telemetry', {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Memory profiler response:', data);
    return data;
  } catch (error) {
    console.error('Error in profileCode:', error);
    throw error;
  }
}
