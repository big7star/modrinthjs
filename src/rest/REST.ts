import {
    HandlerRequestData,
    InternalRequest,
    RequestData,
    RequestManager,
    RequestMethod,
    RouteLike
} from './RequestManager.js';
import type { request, Dispatcher } from 'undici';
import { parseResponse } from './utils/utils.js';

/**
 * Options to be passed when creating a REST instance
 */
export interface RESTOptions{
    /**
     * The agent to set globally
     */
    agent: Dispatcher;
    /** The base API origin URL, excluding version
     * @default https://api.modrinth.com/
     */
    api: string;
    /**
     * How many requests to allow sending per second
     */
    globalRequestsPerSecond: number;
    /**
     * Additional headers to send for all API requests
     * @default {}
     */
    headers: Record<string, string>;
    /**
     * The number of invalid REST requests (those that return 401, 403, or 429) in a 10 minute window between emitted warnings (0 for no warnings).
     * That is, if set to 500, warnings will be emitted at invalid request number 500, 1000, 1500, and so on.
     * @default 0
     */
    invalidRequestWarningInterval: number;
    /**
     * The extra offset to add to rate limits in milliseconds
     * @default 50
     */
    offset: number;
    /**
     * Determines how rate limiting and pre-emptive throttling should be handled.
     * When an array of strings, each element is treated as a prefix for the request route.
     * (e.g. '/project' to match any route starting with '/project' such as '/project/${id|slug}/gallery'
     * for which to throw {@link RateLimitError}s. All other request routes will be queued normally.
     */
    rejectOnRateLimit: RateLimitQueueFilter | string[] | null;
    /**
     * The number of retries for 5xx error codes returned, or requests that timeout
     * @default 3
     */
    retries: number;
    /**
     * The time to wait in milliseconds before a request is aborted
     * @default 30_000
     */
    timeout: number;
    /**
     * The user agent to use for all requests
     * @default big7star/labrinthjs/${VERSION}
     */
    userAgent: string,
    /**
     * The version of the API to use
     * @default 2
     */
    version: string;
}

/**
 * Data emitted on 'RESTEvents.RateLimited'
 */
export interface RateLimitData {
    /**
     * The amount of requests we can perform before locking requests
     */
    limit: number;
    /**
     * The major parameter for this route.
     * For example, in '/project/x', this will be 'x'.
     * If there is no major parameter (e.g. '/tag/category') this will be 'global'.
     */
    majorParameter: string;
    /**
     * The HTTP method being performed
     */
    method: string;
    /**
     * The route being hit in this request
     */
    route: string;
    /**
     * The time, in milliseconds, until the request-lock is reset
     */
    timeToReset: number;
    /**
     * The full URL for this request
     */
    url: string;
}

/**
 * A function that determines whether the rate limit hit should throw an Error
 */
export type RateLimitQueueFilter = (rateLimitData: RateLimitData) => Promise<boolean> | boolean;

export interface APIRequest {
    /**
     * The data that was used to form the body of this request
     */
    data: HandlerRequestData;
    /**
     * The HTTP method used in this request
     */
    method: string;
    /**
     * Additional HTTP options for this request
     */
    options: RequestOptions;
    /**
     * The full path used to make the request
     */
    path: RouteLike;
    /**
     * The number of times this request has been attempted
     */
    retries: number;
    /**
     * The API route identifying the ratelimit for this request
     */
    route: string;
}

export interface InvalidRequestWarningData {
    /**
     * Number of invalid requests that have been made in the window
     */
    count: number;
    /**
     * Time in milliseconds remaining before the count resets
     */
    remainingTime: number;
}

export interface RestEvents {
    invalidRequestWarning: [invalidRequestInfo: InvalidRequestWarningData];
    newListener: [name: string, listener: (...args: any) => void];
    rateLimited: [rateLimitInfo: RateLimitData];
    removeListener: [name: string, listener: (...args: any) => void];
    response: [request: APIRequest, response: Dispatcher.ResponseData];
    restDebug: [info: string];
}

export type RequestOptions = Exclude<Parameters<typeof request>[1], undefined>;

export class REST {
    public readonly requestManager: RequestManager;

    public constructor(options: Partial<RESTOptions> = {}) {
        this.requestManager = new RequestManager(options);
    }

    /**
     * Gets the agent set for this instance
     */
    public getAgent() {
        return this.requestManager.agent;
    }

    /**
     * Sets the default agent to use for requests performed by this instance
     * @param agent - The agent to use
     */
    public setAgent(agent: Dispatcher) {
        this.requestManager.setAgent(agent);
        return this;
    }

    /**
     * Sets the authorization token to be used for all requests
     * @param token - The authorization token to use
     * @returns This REST instance
     */
    public setToken(token: string): this {
        this.requestManager.setToken(token);
        return this;
    }

    /**
     * Runs a GET request to Modrinth
     */
    public async get(fullRoute: RouteLike, options: RequestData = {}) {
        return this.request({ ...options, fullRoute, method: RequestMethod.Get });
    }

    /**
     * Runs a POST request to Modrinth
     */
    public async post(fullRoute: RouteLike, options: RequestData = {}) {
        return this.request({ ...options, fullRoute, method: RequestMethod.Post });
    }

    /**
     * Runs a PATCH request to Modrinth
     */
    public async patch(fullRoute: RouteLike, options: RequestData = {}) {
        return this.request({ ...options, fullRoute, method: RequestMethod.Patch });
    }

    /**
     * Runs a DELETE request to Modrinth
     */
    public async delete(fullRoute: RouteLike, options: RequestData = {}) {
        return this.request({ ...options, fullRoute, method: RequestMethod.Delete });
    }

    /**
     * Runs a request to Modrinth
     * @param options - Request options
     */
    public async request(options: InternalRequest) {
        const response = await this.raw(options);
        return parseResponse(response);
    }

    /**
     * Runs a request to Modrinth; returns the raw response object
     * @param options
     */
    public async raw(options: InternalRequest) {
        return this.requestManager.queueRequest(options);
    }
}

