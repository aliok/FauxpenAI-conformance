import {redact} from "../../lib/util";

export function sanitizeResponseBody(body:any | null | undefined) {
    if (!body) {
        return;
    }

    body.id = redact(body?.id)
    body.created = 1234567890;
    body.service_tier = "default";
    body.system_fingerprint = redact(body?.system_fingerprint);

    // sanitize stream chunks
    if (Array.isArray(body)) {
        for (const chunk of body) {
            sanitizeResponseBody(chunk);

            if (chunk.choices && Array.isArray(chunk.choices)) {
                for (const choice of chunk.choices) {
                    sanitizeResponseBody(choice);
                }
            }
        }
    }

    return;
}
