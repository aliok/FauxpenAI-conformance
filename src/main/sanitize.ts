import {redact} from "../lib/util";

const RESPONSE_HEADER_ALLOW_LIST:string[] = [
    "access-control-expose-headers",
    "alt-svc",
    "cf-cache-status",
    "connection",
    "content-encoding",
    "content-length",
    "content-type",
    "openai-processing-ms",
    "openai-version",
    "server",
    "strict-transport-security",
    "transfer-encoding",
    "x-content-type-options",
    "x-ratelimit-limit-requests",
    "x-ratelimit-limit-tokens",
    "x-ratelimit-remaining-requests",
    "x-ratelimit-remaining-tokens",
    "x-ratelimit-reset-requests",
    "x-ratelimit-reset-tokens",
];

export function sanitizeResponseHeaders(headers:{ [p:string]:string } | null | undefined) {
    if (!headers) {
        return;
    }
    for (const [key, value] of Object.entries(headers)) {
        if (!RESPONSE_HEADER_ALLOW_LIST.includes(key.toLowerCase())) {
            headers[key] = redact(value);
        }
    }

    return;
}
