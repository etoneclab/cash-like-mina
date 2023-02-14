
// removes the quotes on JSON keys
function removeJsonQuotes(json: string) {
    let cleaned = JSON.stringify(JSON.parse(json), null, 2);
    return cleaned.replace(/\"(\S+)\"\s*:/gm, '$1:');
  }
  
  // TODO: Decide an appropriate response structure.
 function sendZkappQuery(json: string) {
    return `mutation {
    sendZkapp(input: {
      zkappCommand: ${removeJsonQuotes(json)}
    }) {
      zkapp {
        hash
        id
        failureReason {
          failures
          index
        }
        zkappCommand {
          memo
          feePayer {
            body {
              publicKey
            }
          }
          accountUpdates {
            body {
              publicKey
              useFullCommitment
              incrementNonce
            }
          }
        }
      }
    }
  }
  `;
  }
  
  type FetchConfig = { timeout?: number };
  type FetchResponse = { data: any };
  type FetchError = {
    statusCode: number;
    statusText: string;
  };
  
  async function checkResponseStatus(
    response: Response
  ): Promise<[FetchResponse, undefined] | [undefined, FetchError]> {
    if (response.ok) {
      return [(await response.json()) as FetchResponse, undefined];
    } else {
      return [
        undefined,
        {
          statusCode: response.status,
          statusText: response.statusText,
        } as FetchError,
      ];
    }
  }
  
  function inferError(error: unknown): FetchError {
    let errorMessage = JSON.stringify(error);
    if (error instanceof AbortSignal) {
      return { statusCode: 408, statusText: `Request Timeout: ${errorMessage}` };
    } else {
      return {
        statusCode: 500,
        statusText: `Unknown Error: ${errorMessage}`,
      };
    }
  }
  
export async function sendTransaction(query:string, graphqlEndpoint:string) {
    try {
      console.log('QUEREY', query)
      query = sendZkappQuery(query)  
      let body = JSON.stringify({ operationName: null, query, variables: {} });
      let response = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        //signal: controller.signal,
      });
      return await checkResponseStatus(response);
    } catch (error) {
      return [undefined, inferError(error)] as [undefined, FetchError];
    }
  }
  