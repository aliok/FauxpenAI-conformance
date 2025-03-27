import {Result} from "./result";
import {sleep} from "./util";

interface ScenarioRunnerOptions {
    url:string;
    method?:string;
    headers?:Record<string, string>;
    rateLimit?:number;
    onProgress?:(completed:number, total:number) => void;
    onError?:(error:any, scenarioKey:string) => void;
    maxTrials?:number;
    responseHeaderSanitizer?:(headers:{ [p:string]:string }) => void;
    responseBodySanitizer?:(body:any) => void;
}

export class ScenarioRunner<T> {
    private readonly results:Result<T>[];
    private readonly options:ScenarioRunnerOptions;
    private stopped = false;

    constructor(results:Result<T>[], options:ScenarioRunnerOptions) {
        this.results = results;
        this.options = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            rateLimit: 0,
            onProgress: () => {
            },
            onError: (error, scenarioKey) => {
                console.error(`Error in scenario ${scenarioKey}:`, error);
            },
            maxTrials: 3,
            responseHeaderSanitizer: (_) => {
                return;
            },
            responseBodySanitizer: (_o) => {
                return;
            },
            ...options,
        };
    }

    isStopped():boolean {
        return this.stopped;
    }

    async run():Promise<void> {
        const interval = this.options.rateLimit ? 1000 / this.options.rateLimit : 0;

        const resultsToProcess = this.results.filter(result =>
            result.response === null && result.errors.length < (this.options.maxTrials || 1)
        );

        const total = this.results.length;
        let completedCount = total - resultsToProcess.length;

        for (const currentResult of resultsToProcess) {
            await this.executeScenario(currentResult);
            this.options.responseHeaderSanitizer?.(currentResult.response?.headers || {});
            this.options.responseBodySanitizer?.(currentResult.response?.body || {});
            completedCount++;
            this.options.onProgress?.(completedCount, total);
            if (this.stopped) {
                break;
            }
            if (interval > 0) {
                await sleep(interval);
            }
        }

        return;
    }

    private async executeScenario(result:Result<T>) {
        try {
            const response = await fetch(this.options.url, {
                method: this.options.method,
                headers: this.options.headers,
                body: JSON.stringify(result.scenario.requestBody),
            });

            const statusCode = response.status;

            if (!response.ok && statusCode >= 400 && statusCode == 429) {
                // rate limit reached.
                // OR
                // it would've been reached, if the OpenAI API processed the request.
                // e.g
                // {
                //   "error": {
                //     "message": "Request too large for gpt-4o in organization org-XYZ on tokens per min (TPM):
                //     Limit 30000, Requested 1000011. The input or output tokens must be reduced in
                //     order to run successfully. Visit https://platform.openai.com/account/rate-limits to learn more.",
                //     "type": "tokens",
                //     "param": null,
                //     "code": "rate_limit_exceeded"
                //   }
                // }
                // Headers:
                // 'x-ratelimit-limit-requests' => { name: 'x-ratelimit-limit-requests', value: '500' },
                // 'x-ratelimit-limit-tokens' => { name: 'x-ratelimit-limit-tokens', value: '30000' },
                // 'x-ratelimit-remaining-requests' => { name: 'x-ratelimit-remaining-requests', value: '499' },
                // 'x-ratelimit-remaining-tokens' => { name: 'x-ratelimit-remaining-tokens', value: '29999' },
                // 'x-ratelimit-reset-requests' => { name: 'x-ratelimit-reset-requests', value: '120ms' },
                // 'x-ratelimit-reset-tokens' => { name: 'x-ratelimit-reset-tokens', value: '0s' },
                // if there's nothing wrong with the reported rate limit in the headers, we can record this error
                // and continue.
                // if there's actually a problem with the rate limit we mark the runner as stopped.

                const remainingRequests = parseInt(response.headers.get('x-ratelimit-remaining-requests') || '0', 10);
                const remainingTokens = parseInt(response.headers.get('x-ratelimit-remaining-tokens') || '0', 10);
                let actualRateLimitIssue = remainingRequests === 0 || remainingTokens === 0;

                if (actualRateLimitIssue) {
                    // The service actually hit the rate limit.
                    // this is to be retried, but do not record it as an error in the result
                    // mark the runner as stopped, so that user can call the runner again later
                    this.options.onError?.({message: 'Rate limit reached'}, result.key);
                    console.log(`Rate limit reached for scenario ${result.key}. Stopping the runner.`);
                    this.stopped = true;
                    return;
                } else {
                    // The request was rejected based on estimation, not an actual limit
                    // we don't stop the runner, but we record this error.
                    this.options.onError?.({message: "Request rejected. Rate limit would've rejected for scenario."}, result.key);
                    console.log(`Request rejected. Rate limit would've rejected for scenario ${result.key}.`);
                    result.errors.push({
                        message: {message: "Request rejected. Rate limit would've rejected for scenario."},
                        statusCode: statusCode,
                    });
                    return;
                }
            }

            if (!response.ok && statusCode >= 400 && statusCode <= 499) {
                // if the error status code is 4xx, we can assume the request was malformed
                // this is not an error in the sense that we can retry it
                const errorObj = await this.handleResponseError(response);
                result.response = {
                    status: statusCode,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: errorObj,
                };
                return;
            }

            if (!response.ok) {
                // retryable error
                const errorObj = await this.handleResponseError(response);
                this.options.onError?.(errorObj, result.key);
                result.errors.push({
                    message: errorObj,
                    statusCode: statusCode,
                });
                return;
            }

            // Check content type *after* getting the response
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/event-stream')) {
                try {
                    const resultData = await this.handleSSEResponse(response);
                    result.response = {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: resultData,
                    };
                    return;
                } catch (e) {
                    this.options.onError?.(e, result.key);
                    result.errors.push({
                        message: {message: `Failed to parse SSE response: ${e}`},
                        statusCode: -1,
                    });
                }
            }

            if (contentType && contentType.includes('application/json')) {
                try {
                    const resultData = await response.json() as object;
                    result.response = {
                        status: response.status,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: resultData,
                    };
                    return;
                } catch (jsonError) {
                    this.options.onError?.(jsonError, result.key);
                    result.errors.push({
                        message: {message: `Failed to parse JSON response: ${jsonError}`},
                        statusCode: -1,
                    });
                    return;
                }

            }

            // no error, no SSE, no JSON
            const responseText = await response.text();
            result.response = {
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                body: {
                    message: `Unexpected response content type: ${contentType}, body: ${responseText}`,
                },
            };
        } catch (e:any) {
            result.errors.push({
                message: {message: `Network/IO error: ${e}`},
                statusCode: -1,
            });
            result.response = null;
        }
    }

    private async handleResponseError(response:Response):Promise<object> {
        const contentType = response.headers.get('content-type');
        const statusCode = response.status;

        if (contentType && contentType.includes('application/json')) {
            try {
                return await response.json() as object;
            } catch (jsonError) {
                const responseText = await response.text();
                return {
                    message: `Failed to parse JSON response for the error. Status code: ${statusCode}, body: ${responseText}`,
                };
            }
        }

        const responseText = await response.text();
        return {
            message: `HTTP error: ${response.status} - ${responseText}`,
        }
    }

    private async handleSSEResponse(response:Response):Promise<object> {
        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';

        try {
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;

                let chunk = decoder.decode(value, {stream: true});
                acc += chunk;
            }
        } catch (error:any) {
            throw new Error(`Error reading SSE stream: ${error}`);
        } finally {
            reader.releaseLock();
        }

        let out = [];
        try {
            const lines = acc.split("\n\n");
            for (const line of lines) {
                // if the chunk is "data: [DONE]", skip its
                if (!line || line === "data: [DONE]") {
                    continue;
                }
                // trim the "data: " prefix and the trailing new line
                let chunk = line.replace(/^data: /gm, "").trim();
                // if the chunk is empty, skip it
                if (!chunk) {
                    continue;
                }
                let chunkObj = JSON.parse(chunk);
                out.push(chunkObj);
            }
            return out;
        } catch (error:any) {
            throw new Error(`Error parsing SSE data: ${error}`);
        }
    }
}

