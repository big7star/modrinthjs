import type { InternalRequest } from '../RequestManager.js';
import type { RequestBody } from './ModrinthAPIError.js';

/**
 * Represents an HTTP error
 */
export class HTTPError extends Error {
    public requestBody: RequestBody;

    /**
     * @param name - The name of the error
     * @param status - The status code of the response
     * @param method - The method of the request that erred
     * @param url - The url of the request the erred
     * @param bodyData - The unparsed data for the request that erred
     */
    public constructor(
        public override name: string,
        public status: number,
        public method: string,
        public url: string,
        bodyData: Pick<InternalRequest, 'body' | 'files'>,
    ) {
        super();

        this.requestBody = { files: bodyData.files, json: bodyData.body };
    }
}