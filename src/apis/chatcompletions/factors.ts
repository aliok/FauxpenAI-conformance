import OpenAI from "openai";
import {
    ChatCompletionContentPart,
    ChatCompletionContentPartRefusal,
    ChatCompletionContentPartText
} from "openai/resources/chat/completions/completions";
import * as Shared from "openai/src/resources/shared";
import {Register} from "../../lib/decorators";
import {AbstractFactor} from "../../lib/factor";
import {FactorRegistry} from "../../lib/factorRegistry";
import data from "./data.json";

export const RegistryInstance = new FactorRegistry<AbstractFactor>();
export const SeedRegistryInstance = new FactorRegistry<AbstractFactor>();

interface Message {
    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams):void;
}

export class UserMessage implements Message {
    private parts:string | ChatCompletionContentPart[] = [];

    static readonly UNKNOWN_TYPE = new UserMessage()
        .addPart({
            "text": "Hello",
            "type": "unknown",
        });

    static readonly BLANK_TYPE = new UserMessage()
        .addPart({
            "text": "Hello",
            "type": "",
        });

    static readonly SIMPLE_TEXT_BLANK = new UserMessage()
        .setSimpleTextPart("");

    static readonly SIMPLE_TEXT_HELLO = new UserMessage()
        .setSimpleTextPart("Hello");

    static readonly TEXT_BLANK = new UserMessage()
        .addTextPart("");

    static readonly TEXT_HELLO = new UserMessage()
        .addTextPart("Hello");

    static readonly IMAGE_EXTERNAL_NOT_EXISTS = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart("https://github.com/foo/bar/baz.jpg");

    static readonly IMAGE_EXTERNAL = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart("https://upload.wikimedia.org/wikipedia/commons/6/6b/Lycopodium_clavatum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-219_%28extracted%29.jpg");

    static readonly IMAGE_BASE64_CORRUPT = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart(data.image_10_20.substring(20));

    static readonly IMAGE_BASE64 = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart(data.image_10_20);

    static readonly IMAGE_LOW_EXTERNAL = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart("https://upload.wikimedia.org/wikipedia/commons/6/6b/Lycopodium_clavatum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-219_%28extracted%29.jpg", "low");

    static readonly IMAGE_BASE64_UNKNOWN_DETAIL = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart(data.image_10_20, "foo" as "low");

    static readonly IMAGE_LOW_BASE64 = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart(data.image_10_20, "low");

    static readonly IMAGE_HIGH_EXTERNAL = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart("https://upload.wikimedia.org/wikipedia/commons/8/8f/Erciyes_Volcano%2C_Cappadocia.jpg", "high");

    static readonly IMAGE_HIGH_BASE64 = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart(data.image_605_600, "high");

    static readonly IMAGE_AUTO_EXTERNAL = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart("https://upload.wikimedia.org/wikipedia/commons/8/8f/Erciyes_Volcano%2C_Cappadocia.jpg", "auto");

    static readonly IMAGE_AUTO_BASE64 = new UserMessage()
        .addTextPart("What is in the image?")
        .addImagePart(data.image_605_600, "auto");

    static readonly AUDIO_CORRUPT = new UserMessage()
        .addAudioPart(data.audio_hello_mp3.substring(20), "mp3");

    static readonly AUDIO_ONLY_HELLO = new UserMessage()
        .addAudioPart(data.audio_hello_mp3, "mp3");

    static readonly AUDIO_AND_TEXT = new UserMessage()
        .addTextPart("What is in the recording?")
        .addAudioPart(data.audio_hello_mp3, "mp3");

    static readonly AUDIO_AND_IMAGE = new UserMessage()
        .addAudioPart(data.audio_hello_mp3, "mp3")
        .addImagePart(data.image_10_20);

    static readonly TEXT_AUDIO_AND_IMAGE = new UserMessage()
        .addTextPart("What is in the recording?")
        .addAudioPart(data.audio_hello_mp3, "mp3")
        .addImagePart(data.image_10_20);

    // TODO: file input!

    private constructor() {
        this.parts = [];
    }

    setSimpleTextPart(text:string) {
        this.parts = text;
        return this;
    }

    addPart(part:any) {
        (this.parts as unknown[]).push(part);
        return this;
    }

    addTextPart(text:string) {
        return this.addPart({
            text,
            type: "text",
        });
    }

    addImagePart(url:string, detail?:'auto' | 'low' | 'high') {
        return this.addPart({
            image_url: {
                url: url,
                detail: detail
            },
            type: "image_url",
        });
    }

    addAudioPart(data:string, format:'wav' | 'mp3') {
        return this.addPart({
            input_audio: {
                data,
                format,
            },
            type: 'input_audio'
        });
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.messages.push({
            role: "user",
            content: this.parts
        });
    }
}

export class AssistantMessage implements Message {
    private parts:string | Array<ChatCompletionContentPartText | ChatCompletionContentPartRefusal>;

    static readonly UNKNOWN_TYPE = new AssistantMessage()
        .addPart({
            "text": "Hello",
            "type": "unknown",
        });

    static readonly BLANK_TYPE = new AssistantMessage()
        .addPart({
            "text": "Hello",
            "type": "",
        });

    static readonly SIMPLE_TEXT_BLANK = new AssistantMessage()
        .setSimpleTextPart("");

    static readonly SIMPLE_TEXT_HELLO = new AssistantMessage()
        .setSimpleTextPart("Hello, how can I help you?");

    static readonly TEXT_BLANK = new AssistantMessage()
        .addTextPart("");

    static readonly TEXT_HELLO = new AssistantMessage()
        .addTextPart("Hello, how can I help you?");

    static readonly TEXT_MULTIPLE = new AssistantMessage()
        .addTextPart("Hello, how can I help you?")
        .addTextPart("Seriously bro, do not hesitate to ask me anything!");

    static readonly REFUSAL_BLANK = new AssistantMessage()
        .addRefusalPart("");

    static readonly REFUSAL = new AssistantMessage()
        .addRefusalPart("I refuse to answer this question.");

    static readonly MULTIPLE_REFUSAL = new AssistantMessage()
        .addRefusalPart("I refuse to answer this question.")
        .addRefusalPart("For real!");

    static readonly MIXED = new AssistantMessage()
        .addTextPart("Hello, how can I help you?")
        .addRefusalPart("I refuse to answer this question.");

    private constructor() {
        this.parts = [];
    }

    setSimpleTextPart(text:string) {
        this.parts = text;
        return this;
    }

    addPart(part:any) {
        (this.parts as unknown[]).push(part);
        return this;
    }

    addTextPart(text:string) {
        return this.addPart({
            text,
            type: "text",
        });
    }

    addRefusalPart(text:string) {
        return this.addPart({
            text,
            type: "refusal",
        });
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        if (!chatReq.messages) {
            chatReq.messages = [];
        }
        chatReq.messages.push({
            role: "assistant",
            content: this.parts
        });
    }
}

export class SystemMessage implements Message {
    protected parts:string | Array<ChatCompletionContentPartText>;

    static readonly UNKNOWN_TYPE = new SystemMessage()
        .addPart({
            "text": "Hello",
            "type": "unknown",
        });

    static readonly BLANK_TYPE = new SystemMessage()
        .addPart({
            "text": "Hello",
            "type": "",
        });

    static readonly SIMPLE_TEXT_BLANK = new SystemMessage()
        .setSimpleTextPart("");

    static readonly SIMPLE_TEXT_INSTRUCTION = new SystemMessage()
        .setSimpleTextPart("You are a helpful assistant.");

    static readonly TEXT_BLANK = new SystemMessage()
        .addTextPart("");

    static readonly TEXT_INSTRUCTION = new SystemMessage()
        .addTextPart("You are a helpful assistant.");

    static readonly MULTIPLE = new SystemMessage()
        .addTextPart("You are a helpful assistant.")
        .addTextPart("You are a very helpful assistant.");

    protected constructor() {
        this.parts = [];
    }

    setSimpleTextPart(text:string) {
        this.parts = text;
        return this;
    }

    addPart(part:any) {
        (this.parts as unknown[]).push(part);
        return this;
    }

    addTextPart(text:string) {
        return this.addPart({
            text,
            type: "text",
        });
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        if (!chatReq.messages) {
            chatReq.messages = [];
        }
        chatReq.messages.push({
            role: "system",
            content: this.parts
        });
    }
}

export class DeveloperMessage extends SystemMessage {

    static readonly UNKNOWN_TYPE = new DeveloperMessage()
        .addPart({
            "text": "Hello",
            "type": "unknown",
        });

    static readonly BLANK_TYPE = new DeveloperMessage()
        .addPart({
            "text": "Hello",
            "type": "",
        });

    static readonly SIMPLE_TEXT_BLANK = new DeveloperMessage()
        .setSimpleTextPart("");

    static readonly SIMPLE_TEXT_INSTRUCTION = new DeveloperMessage()
        .setSimpleTextPart("You are a helpful assistant.");

    static readonly TEXT_BLANK = new DeveloperMessage()
        .addTextPart("");

    static readonly TEXT_INSTRUCTION = new DeveloperMessage()
        .addTextPart("You are a helpful assistant.");

    static readonly MULTIPLE = new DeveloperMessage()
        .addTextPart("You are a helpful assistant.")
        .addTextPart("You are a very helpful assistant.");

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        if (!chatReq.messages) {
            chatReq.messages = [];
        }
        chatReq.messages.push({
            role: "developer",
            content: this.parts
        });
    }
}

// TODO: tool message!


//   /**
//    * A list of messages comprising the conversation so far. Depending on the
//    * [model](https://platform.openai.com/docs/models) you use, different message
//    * types (modalities) are supported, like
//    * [text](https://platform.openai.com/docs/guides/text-generation),
//    * [images](https://platform.openai.com/docs/guides/vision), and
//    * [audio](https://platform.openai.com/docs/guides/audio).
//    */
//   messages: Array<ChatCompletionMessageParam>;
@Register(SeedRegistryInstance)
export class Messages extends AbstractFactor {
    private messages:Message[];

    static readonly EMPTY = new Messages(false, false, "EMPTY");

    static readonly BLANK_USER_MESSAGE = new Messages(false, false, "BLANK_USER_MESSAGE")
        .with(UserMessage.SIMPLE_TEXT_BLANK);

    static readonly BLANK_ASSISTANT_MESSAGE = new Messages(false, false, "BLANK_ASSISTANT_MESSAGE")
        .with(AssistantMessage.SIMPLE_TEXT_BLANK);

    static readonly BLANK_SYSTEM_MESSAGE = new Messages(false, false, "BLANK_SYSTEM_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_BLANK);

    static readonly BLANK_DEVELOPER_MESSAGE = new Messages(false, false, "BLANK_DEVELOPER_MESSAGE")
        .with(DeveloperMessage.SIMPLE_TEXT_BLANK);

    static readonly BLANK_SYSTEM_AND_USER_MESSAGE = new Messages(false, false, "BLANK_SYSTEM_AND_USER_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_BLANK)
        .with(UserMessage.SIMPLE_TEXT_BLANK);

    static readonly USER_MESSAGE_UNKNOWN_PART = new Messages(false, false, "USER_MESSAGE_UNKNOWN_PART")
        .with(UserMessage.UNKNOWN_TYPE);

    static readonly ONLY_SYSTEM_MESSAGE = new Messages(false, false, "ONLY_SYSTEM_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION);

    static readonly ONLY_USER_MESSAGE = new Messages(false, false, "ONLY_USER_MESSAGE")
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly ONLY_ASSISTANT_MESSAGE = new Messages(false, false, "ONLY_ASSISTANT_MESSAGE")
        .with(AssistantMessage.SIMPLE_TEXT_HELLO);

    static readonly ONLY_DEVELOPER_MESSAGE = new Messages(false, false, "ONLY_DEVELOPER_MESSAGE")
        .with(DeveloperMessage.SIMPLE_TEXT_INSTRUCTION);

    static readonly SYSTEM_AND_USER_MESSAGE = new Messages(false, true, "ONLY_SYSTEM_AND_USER_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly SYSTEM_AND_ASSISTANT_MESSAGE = new Messages(false, false, "SYSTEM_AND_ASSISTANT_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(AssistantMessage.SIMPLE_TEXT_HELLO);

    static readonly SYSTEM_AND_DEVELOPER_MESSAGE = new Messages(false, false, "SYSTEM_AND_DEVELOPER_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(DeveloperMessage.SIMPLE_TEXT_INSTRUCTION);

    static readonly USER_AND_ASSISTANT_MESSAGE = new Messages(false, false, "USER_AND_ASSISTANT_MESSAGE")
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.SIMPLE_TEXT_HELLO);

    static readonly ASSISTANT_AND_DEVELOPER_MESSAGE = new Messages(false, false, "ASSISTANT_AND_DEVELOPER_MESSAGE")
        .with(DeveloperMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(AssistantMessage.SIMPLE_TEXT_HELLO);

    static readonly HISTORY_TEXT_ONLY = new Messages(false, false, "HISTORY")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.SIMPLE_TEXT_HELLO)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly USER_IMAGE_MESSAGE = new Messages(false, false, "USER_IMAGE_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_EXTERNAL);

    static readonly USER_IMAGE_EXTERNAL_NOT_EXISTS = new Messages(false, false, "USER_IMAGE_EXTERNAL_NOT_EXISTS")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_EXTERNAL_NOT_EXISTS);

    static readonly USER_IMAGE_BASE64_CORRUPT = new Messages(false, false, "USER_IMAGE_BASE64_CORRUPT")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_BASE64_CORRUPT);

    static readonly USER_IMAGE_BASE64 = new Messages(false, false, "USER_IMAGE_BASE64")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_BASE64);

    static readonly USER_IMAGE_LOW_EXTERNAL = new Messages(false, false, "USER_IMAGE_LOW_EXTERNAL")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_LOW_EXTERNAL);

    static readonly USER_IMAGE_LOW_BASE64 = new Messages(false, false, "USER_IMAGE_LOW_BASE64")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_LOW_BASE64);

    static readonly USER_IMAGE_HIGH_EXTERNAL = new Messages(false, false, "USER_IMAGE_HIGH_EXTERNAL")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_HIGH_EXTERNAL);

    static readonly USER_IMAGE_HIGH_BASE64 = new Messages(false, false, "USER_IMAGE_HIGH_BASE64")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_HIGH_BASE64);

    static readonly USER_IMAGE_AUTO_EXTERNAL = new Messages(false, false, "USER_IMAGE_AUTO_EXTERNAL")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_AUTO_EXTERNAL);

    static readonly USER_IMAGE_AUTO_BASE64 = new Messages(false, false, "USER_IMAGE_AUTO_BASE64")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.IMAGE_AUTO_BASE64);

    static readonly USER_AUDIO_AND_TEXT_MESSAGE = new Messages(false, false, "USER_AUDIO_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.AUDIO_AND_TEXT);

    static readonly USER_AUDIO_CORRUPT_MESSAGE = new Messages(false, false, "USER_AUDIO_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.AUDIO_CORRUPT);

    static readonly USER_AUDIO_ONLY_MESSAGE = new Messages(false, false, "USER_AUDIO_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.AUDIO_ONLY_HELLO);

    static readonly USER_AUDIO_AND_IMAGE_MESSAGE = new Messages(false, false, "USER_AUDIO_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.AUDIO_AND_IMAGE);

    static readonly USER_TEXT_AUDIO_AND_IMAGE_MESSAGE = new Messages(false, false, "USER_AUDIO_MESSAGE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.TEXT_AUDIO_AND_IMAGE);

    static readonly ASSISTANT_UNKNOWN_PART = new Messages(false, false, "ASSISTANT_UNKNOWN_PART")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.UNKNOWN_TYPE);

    static readonly ASSISTANT_BLANK_TYPE = new Messages(false, false, "ASSISTANT_BLANK_TYPE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.BLANK_TYPE);

    static readonly ASSISTANT_TEXT_BLANK = new Messages(false, false, "ASSISTANT_TEXT_BLANK")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.TEXT_BLANK);

    static readonly ASSISTANT_TEXT_HELLO = new Messages(false, false, "ASSISTANT_TEXT_HELLO")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.TEXT_HELLO);

    static readonly ASSISTANT_TEXT_MULTIPLE = new Messages(false, false, "ASSISTANT_TEXT_MULTIPLE")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.TEXT_MULTIPLE);

    static readonly ASSISTANT_REFUSAL_BLANK = new Messages(false, false, "ASSISTANT_REFUSAL_BLANK")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.REFUSAL_BLANK);

    static readonly ASSISTANT_REFUSAL = new Messages(false, false, "ASSISTANT_REFUSAL")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.REFUSAL);

    static readonly ASSISTANT_MULTIPLE_REFUSAL = new Messages(false, false, "ASSISTANT_MULTIPLE_REFUSAL")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.MULTIPLE_REFUSAL);

    static readonly ASSISTANT_MIXED = new Messages(false, false, "ASSISTANT_MIXED")
        .with(SystemMessage.SIMPLE_TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO)
        .with(AssistantMessage.MIXED);

    static readonly SYSTEM_UNKNOWN_PART = new Messages(false, false, "SYSTEM_UNKNOWN_PART")
        .with(SystemMessage.UNKNOWN_TYPE)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly SYSTEM_BLANK_TYPE = new Messages(false, false, "SYSTEM_BLANK_TYPE")
        .with(SystemMessage.BLANK_TYPE)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly SYSTEM_TEXT_BLANK = new Messages(false, false, "SYSTEM_TEXT_BLANK")
        .with(SystemMessage.TEXT_BLANK)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly SYSTEM_TEXT_INSTRUCTION = new Messages(false, false, "SYSTEM_TEXT_INSTRUCTION")
        .with(SystemMessage.TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly SYSTEM_MULTIPLE = new Messages(false, false, "SYSTEM_MULTIPLE")
        .with(SystemMessage.MULTIPLE)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly DEVELOPER_UNKNOWN_PART = new Messages(false, false, "DEVELOPER_UNKNOWN_PART")
        .with(DeveloperMessage.UNKNOWN_TYPE)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly DEVELOPER_BLANK_TYPE = new Messages(false, false, "DEVELOPER_BLANK_TYPE")
        .with(DeveloperMessage.BLANK_TYPE)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly DEVELOPER_TEXT_BLANK = new Messages(false, false, "DEVELOPER_TEXT_BLANK")
        .with(DeveloperMessage.TEXT_BLANK)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly DEVELOPER_TEXT_INSTRUCTION = new Messages(false, false, "DEVELOPER_TEXT_INSTRUCTION")
        .with(DeveloperMessage.TEXT_INSTRUCTION)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    static readonly DEVELOPER_MULTIPLE = new Messages(false, false, "DEVELOPER_MULTIPLE")
        .with(DeveloperMessage.MULTIPLE)
        .with(UserMessage.SIMPLE_TEXT_HELLO);

    private constructor(negative:boolean, primary:boolean, name:string) {
        super(negative, primary, name);
        this.messages = [];
    }

    with(msg:Message) {
        this.messages.push(msg);
        return this;
    }

    apply(target:any):void {
        for (const m of this.messages) {
            if (!target.messages) {
                target.messages = [];
            }
            m.apply(target);
        }
    }

}

//
//   /**
//    * Model ID used to generate the response, like `gpt-4o` or `o1`. OpenAI offers a
//    * wide range of models with different capabilities, performance characteristics,
//    * and price points. Refer to the
//    * [model guide](https://platform.openai.com/docs/models) to browse and compare
//    * available models.
//    */
//   model: (string & {}) | Shared.ChatModel;
@Register(SeedRegistryInstance)
export class Model extends AbstractFactor {
    // primary values for models

    static readonly BLANK = new Model(true, false, "");
    static readonly UNKNOWN = new Model(true, false, "foo");
    static readonly GPT_3_5_TURBO = new Model(false, false, "gpt-3.5-turbo");
    static readonly GPT_4 = new Model(false, false, "gpt-4");
    static readonly GPT_4O = new Model(false, false, "gpt-4o");
    static readonly GPT_4O_AUDIO_PREVIEW = new Model(false, false, "gpt-4o-audio-preview");

    val:string;

    private constructor(negative:boolean, primary:boolean, val:string) {
        let name = `model=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.model = this.val;
    }
}

//   /**
//    * Parameters for audio output. Required when audio output is requested with
//    * `modalities: ["audio"]`.
//    * [Learn more](https://platform.openai.com/docs/guides/audio).
//    */
//   audio?: ChatCompletionAudioParam | null;
@Register(RegistryInstance)
export class Audio extends AbstractFactor {
    static readonly UNKNOWN_FORMAT = new Audio(true, false, "foo" as "wav", "alloy");
    static readonly UNKNOWN_VOICE = new Audio(true, false, "wav", "foo" as "alloy");
    static readonly WAV = new Audio(false, true, "wav", "alloy");
    static readonly MP3 = new Audio(false, false, "mp3", "ash");
    static readonly FLAC = new Audio(false, false, "flac", "ballad");
    static readonly OPUS = new Audio(false, false, "opus", "coral");
    static readonly PCM16 = new Audio(false, false, "pcm16", "echo");

    format:'wav' | 'mp3' | 'flac' | 'opus' | 'pcm16';
    voice:'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';

    private constructor(negative:boolean, primary:boolean, format:'wav' | 'mp3' | 'flac' | 'opus' | 'pcm16', voice:'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse') {
        let name = `audio_format=${format}`;
        super(negative, primary, name);
        this.format = format;
        this.voice = voice;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.audio = {
            format: this.format,
            voice: this.voice,
        };
    }
}

//
//   /**
//    * Number between -2.0 and 2.0. Positive values penalize new tokens based on their
//    * existing frequency in the text so far, decreasing the model's likelihood to
//    * repeat the same line verbatim.
//    */
//   frequency_penalty?: number | null;
@Register(RegistryInstance)
export class FrequencyPenalty extends AbstractFactor {
    static readonly NOT_A_NUMBER = new FrequencyPenalty(true, false, "foo" as unknown as number);
    static readonly MINUS = new FrequencyPenalty(false, false, -1);
    static readonly ZERO = new FrequencyPenalty(false, false, 0);
    static readonly ONE = new FrequencyPenalty(false, true, 1);
    static readonly TWO = new FrequencyPenalty(false, false, 2);
    static readonly BILLION = new FrequencyPenalty(true, false, 1_000_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `frequency_penalty=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.frequency_penalty = this.val;
    }
}

//
//   /**
//    * Deprecated in favor of `tool_choice`.
//    *
//    * Controls which (if any) function is called by the model.
//    *
//    * `none` means the model will not call a function and instead generates a message.
//    *
//    * `auto` means the model can pick between generating a message or calling a
//    * function.
//    *
//    * Specifying a particular function via `{"name": "my_function"}` forces the model
//    * to call that function.
//    *
//    * `none` is the default when no functions are present. `auto` is the default if
//    * functions are present.
//    */
//   function_call?: 'none' | 'auto' | ChatCompletionFunctionCallOption;
// NOTE: ignored due to deprecation

//
//   /**
//    * Deprecated in favor of `tools`.
//    *
//    * A list of functions the model may generate JSON inputs for.
//    */
//   functions?: Array<ChatCompletionCreateParams.Function>;
// NOTE: ignored due to deprecation

//
//   /**
//    * Modify the likelihood of specified tokens appearing in the completion.
//    *
//    * Accepts a JSON object that maps tokens (specified by their token ID in the
//    * tokenizer) to an associated bias value from -100 to 100. Mathematically, the
//    * bias is added to the logits generated by the model prior to sampling. The exact
//    * effect will vary per model, but values between -1 and 1 should decrease or
//    * increase likelihood of selection; values like -100 or 100 should result in a ban
//    * or exclusive selection of the relevant token.
//    */
//   logit_bias?: Record<string, number> | null;
@Register(RegistryInstance)
export class LogitBias extends AbstractFactor {
    static readonly NOT_A_MAP = new LogitBias(true, false, "foo" as unknown as Record<string, number>);
    static readonly EMPTY = new LogitBias(false, false, {});
    static readonly MUST_HAVE = new LogitBias(false, true, {"12345": 100});
    static readonly MUST_BAN = new LogitBias(false, false, {"12345": -100});
    static readonly INVALID_POSITIVE_BIAS = new LogitBias(false, true, {"12345": 10000});
    static readonly INVALID_NEGATIVE_BIAS = new LogitBias(false, true, {"12345": -10000});

    val:Record<string, number>;

    private constructor(negative:boolean, primary:boolean, val:Record<string, number>) {
        let name = `logit_bias=${JSON.stringify(val)}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.logit_bias = this.val;
    }
}

//
//   /**
//    * Whether to return log probabilities of the output tokens or not. If true,
//    * returns the log probabilities of each output token returned in the `content` of
//    * `message`.
//    */
//   logprobs?: boolean | null;
@Register(RegistryInstance)
export class Logprobs extends AbstractFactor {
    static readonly NOT_A_BOOLEAN = new Logprobs(false, true, "foo" as unknown as boolean);
    static readonly TRUE = new Logprobs(false, true, true);
    static readonly FALSE = new Logprobs(false, false, false);

    val:boolean;

    private constructor(negative:boolean, primary:boolean, val:boolean) {
        let name = `logprobs=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.logprobs = this.val;
    }
}

//
//   /**
//    * An upper bound for the number of tokens that can be generated for a completion,
//    * including visible output tokens and
//    * [reasoning tokens](https://platform.openai.com/docs/guides/reasoning).
//    */
//   max_completion_tokens?: number | null;
@Register(RegistryInstance)
export class MaxCompletionTokens extends AbstractFactor {
    static readonly NOT_A_NUMBER = new MaxCompletionTokens(true, false, "foo" as unknown as number);
    static readonly MINUS = new MaxCompletionTokens(true, false, -1);
    static readonly ZERO = new MaxCompletionTokens(true, false, 0);
    static readonly ONE = new MaxCompletionTokens(false, true, 1);
    static readonly TWO = new MaxCompletionTokens(false, false, 2);
    static readonly BILLION = new MaxCompletionTokens(true, false, 1_000_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `max_completion_tokens=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.max_completion_tokens = this.val;
    }
}

//
//   /**
//    * The maximum number of [tokens](/tokenizer) that can be generated in the chat
//    * completion. This value can be used to control
//    * [costs](https://openai.com/api/pricing/) for text generated via API.
//    *
//    * This value is now deprecated in favor of `max_completion_tokens`, and is not
//    * compatible with
//    * [o1 series models](https://platform.openai.com/docs/guides/reasoning).
//    */
//   max_tokens?: number | null;
@Register(RegistryInstance)
export class MaxTokens extends AbstractFactor {
    static readonly NOT_A_NUMBER = new MaxTokens(true, false, "foo" as unknown as number);
    static readonly MINUS = new MaxTokens(true, false, -1);
    static readonly ZERO = new MaxTokens(true, false, 0);
    static readonly ONE = new MaxTokens(false, true, 1);
    static readonly TWO = new MaxTokens(false, false, 2);
    static readonly BILLION = new MaxTokens(true, false, 1_000_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `max_tokens=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.max_tokens = this.val;
    }
}

//
//   /**
//    * Set of 16 key-value pairs that can be attached to an object. This can be useful
//    * for storing additional information about the object in a structured format, and
//    * querying for objects via API or the dashboard.
//    *
//    * Keys are strings with a maximum length of 64 characters. Values are strings with
//    * a maximum length of 512 characters.
//    */
//   metadata?: Shared.Metadata | null;
@Register(RegistryInstance)
export class Metadata extends AbstractFactor {
    static readonly NOT_A_MAP = new Metadata(true, false, "foo" as unknown as Record<string, string>);
    static readonly EMPTY = new Metadata(false, false, {});
    static readonly SINGLE = new Metadata(false, true, {"foo": "bar"});
    static readonly MULTIPLE = new Metadata(false, false, {"foo": "bar", "baz": "qux"});
    static readonly LONG_KEY = new Metadata(true, false, {"12345678901234567890123456789012345678901234567890123456789012345": "foo"});
    static readonly LONG_VALUE = new Metadata(true, false, {"foo": "a".repeat(513)});
    static TOO_MANY_FIELDS:Metadata;

    static {
        const theMap:Record<string, string> = {};
        for (let i = 0; i < 17; i++) {
            theMap[`key_${i}`] = `value_${i}`;
        }
        Metadata.TOO_MANY_FIELDS = new Metadata(true, false, theMap);
    }

    val:Record<string, string>;

    private constructor(negative:boolean, primary:boolean, val:Record<string, string>) {
        let name = `metadata=${JSON.stringify(val)}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.metadata = this.val;
    }
}


//
//   /**
//    * Output types that you would like the model to generate. Most models are capable
//    * of generating text, which is the default:
//    *
//    * `["text"]`
//    *
//    * The `gpt-4o-audio-preview` model can also be used to
//    * [generate audio](https://platform.openai.com/docs/guides/audio). To request that
//    * this model generate both text and audio responses, you can use:
//    *
//    * `["text", "audio"]`
//    */
//   modalities?: Array<'text' | 'audio'> | null;
@Register(RegistryInstance)
export class Modalities extends AbstractFactor {
    static readonly BLANK = new Modalities(true, false, ["" as "text"]);
    static readonly UNKNOWN = new Modalities(true, false, ["UNKNOWN" as "text"]);
    static readonly TEXT = new Modalities(false, true, ["text"]);
    static readonly AUDIO = new Modalities(false, false, ["audio"]);
    static readonly TEXT_AND_AUDIO = new Modalities(false, false, ["text", "audio"]);

    val:Array<'text' | 'audio'>;

    private constructor(negative:boolean, primary:boolean, val:Array<'text' | 'audio'>) {
        let name = `modalities=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.modalities = this.val;
    }
}

//
//   /**
//    * How many chat completion choices to generate for each input message. Note that
//    * you will be charged based on the number of generated tokens across all of the
//    * choices. Keep `n` as `1` to minimize costs.
//    */
//   n?: number | null;
@Register(RegistryInstance)
export class N extends AbstractFactor {
    static readonly NOT_A_NUMBER = new N(true, false, "foo" as unknown as number);
    static readonly MINUS = new N(true, false, -1);
    static readonly ZERO = new N(true, false, 0);
    static readonly ONE = new N(false, true, 1);
    static readonly TWO = new N(false, false, 2);
    static readonly MILLION = new N(true, false, 1_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `n=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.n = this.val;
    }
}

//   /**
//    * Whether to enable
//    * [parallel function calling](https://platform.openai.com/docs/guides/function-calling#configuring-parallel-function-calling)
//    * during tool use.
//    */
//   parallel_tool_calls?: boolean;
@Register(RegistryInstance)
export class ParallelToolCalls extends AbstractFactor {
    static readonly NOT_A_BOOLEAN = new ParallelToolCalls(true, false, "foo" as unknown as boolean);
    static readonly TRUE = new ParallelToolCalls(false, true, true);
    static readonly FALSE = new ParallelToolCalls(false, false, false);

    val:boolean;

    private constructor(negative:boolean, primary:boolean, val:boolean) {
        let name = `parallel_tool_calls=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.parallel_tool_calls = this.val;
    }
}

//
//   /**
//    * Static predicted output content, such as the content of a text file that is
//    * being regenerated.
//    */
//   prediction?: ChatCompletionPredictionContent | null;
@Register(RegistryInstance)
export class Prediction extends AbstractFactor {
    static readonly BLANK = new Prediction(false, false, [""]);
    static readonly HELLO = new Prediction(false, true, ["Hello"]);
    static readonly MULTIPLE = new Prediction(false, false, ["Hello", "World"]);
    static readonly MULTIPLE_WITH_BLANK = new Prediction(false, false, ["Hello", ""]);

    val:string[];

    private constructor(negative:boolean, primary:boolean, texts:string[]) {
        let name = `prediction=${texts.join(",")}`;
        super(negative, primary, name);
        this.val = texts;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        let contents:OpenAI.ChatCompletionContentPartText[] = [];
        for (const text of this.val) {
            contents.push({
                type: "text",
                text: text,
            });
        }

        chatReq.prediction = {
            type: "content",
            content: contents,
        };
    }
}

//
//   /**
//    * Number between -2.0 and 2.0. Positive values penalize new tokens based on
//    * whether they appear in the text so far, increasing the model's likelihood to
//    * talk about new topics.
//    */
//   presence_penalty?: number | null;
@Register(RegistryInstance)
export class PresencePenalty extends AbstractFactor {
    static readonly NOT_A_NUMBER = new PresencePenalty(true, false, "foo" as unknown as number);
    static readonly MINUS_THREE = new PresencePenalty(true, false, -3);
    static readonly MINUS_TWO = new PresencePenalty(false, false, -2);
    static readonly ZERO = new PresencePenalty(false, false, 0);
    static readonly ONE = new PresencePenalty(false, true, 1);
    static readonly TWO = new PresencePenalty(false, false, 2);
    static readonly THREE = new PresencePenalty(true, false, 3);
    static readonly BILLION = new PresencePenalty(true, false, 1_000_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `presence_penalty=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.presence_penalty = this.val;
    }
}

//
//   /**
//    * **o-series models only**
//    *
//    * Constrains effort on reasoning for
//    * [reasoning models](https://platform.openai.com/docs/guides/reasoning). Currently
//    * supported values are `low`, `medium`, and `high`. Reducing reasoning effort can
//    * result in faster responses and fewer tokens used on reasoning in a response.
//    */
//   reasoning_effort?: Shared.ReasoningEffort | null;
@Register(RegistryInstance)
export class ReasoningEffort extends AbstractFactor {
    static readonly UNKNOWN = new ReasoningEffort(true, false, "foo" as unknown as OpenAI.ReasoningEffort);
    static readonly LOW = new ReasoningEffort(false, true, "low");
    static readonly MEDIUM = new ReasoningEffort(false, false, "medium");
    static readonly HIGH = new ReasoningEffort(false, false, "high");

    val:OpenAI.ReasoningEffort;

    private constructor(negative:boolean, primary:boolean, val:OpenAI.ReasoningEffort) {
        let name = `reasoning_effort=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.reasoning_effort = this.val;
    }
}

//
//   /**
//    * An object specifying the format that the model must output.
//    *
//    * Setting to `{ "type": "json_schema", "json_schema": {...} }` enables Structured
//    * Outputs which ensures the model will match your supplied JSON schema. Learn more
//    * in the
//    * [Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs).
//    *
//    * Setting to `{ "type": "json_object" }` enables the older JSON mode, which
//    * ensures the message the model generates is valid JSON. Using `json_schema` is
//    * preferred for models that support it.
//    */
//   response_format?:
//     | Shared.ResponseFormatText
//     | Shared.ResponseFormatJSONSchema
//     | Shared.ResponseFormatJSONObject;
@Register(RegistryInstance)
export class ResponseFormat extends AbstractFactor {
    static readonly UNKNOWN = new ResponseFormat(true, false, "foo" as unknown as OpenAI.ResponseFormatText);
    static readonly TEXT = new ResponseFormat(false, true, {type: "text"});
    static readonly JSON_OBJECT = new ResponseFormat(false, false, {type: "json_object"});
    // TODO:
    // static readonly JSON_SCHEMA_WEATHER = new ResponseFormat(false, false, {
    //     type: "json_schema",
    //     json_schema: {name:"greeting", description:"greeting message", schema:{""}}
    // });

    val:| Shared.ResponseFormatText
        | Shared.ResponseFormatJSONSchema
        | Shared.ResponseFormatJSONObject;

    private constructor(negative:boolean, primary:boolean, val:| Shared.ResponseFormatText | Shared.ResponseFormatJSONSchema | Shared.ResponseFormatJSONObject) {
        let name = `response_format=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.response_format = this.val;
    }
}

//
//   /**
//    * This feature is in Beta. If specified, our system will make a best effort to
//    * sample deterministically, such that repeated requests with the same `seed` and
//    * parameters should return the same result. Determinism is not guaranteed, and you
//    * should refer to the `system_fingerprint` response parameter to monitor changes
//    * in the backend.
//    */
//   seed?: number | null;
@Register(RegistryInstance)
export class Seed extends AbstractFactor {
    static readonly NOT_A_NUMBER = new Seed(true, false, "foo" as unknown as number);
    static readonly MINUS = new Seed(false, false, -1);
    static readonly ZERO = new Seed(false, false, 0);
    static readonly ONE = new Seed(false, true, 1);
    static readonly TWO = new Seed(false, false, 2);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `seed=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.seed = this.val;
    }
}

//
//   /**
//    * Specifies the latency tier to use for processing the request. This parameter is
//    * relevant for customers subscribed to the scale tier service:
//    *
//    * - If set to 'auto', and the Project is Scale tier enabled, the system will
//    *   utilize scale tier credits until they are exhausted.
//    * - If set to 'auto', and the Project is not Scale tier enabled, the request will
//    *   be processed using the default service tier with a lower uptime SLA and no
//    *   latency guarentee.
//    * - If set to 'default', the request will be processed using the default service
//    *   tier with a lower uptime SLA and no latency guarentee.
//    * - When not set, the default behavior is 'auto'.
//    *
//    * When this parameter is set, the response body will include the `service_tier`
//    * utilized.
//    */
//   service_tier?: 'auto' | 'default' | null;
@Register(RegistryInstance)
export class ServiceTier extends AbstractFactor {
    static readonly UNKNOWN = new ServiceTier(true, false, "foo" as 'auto' | 'default' | null);
    static readonly AUTO = new ServiceTier(false, true, "auto");
    static readonly DEFAULT = new ServiceTier(false, false, "default");

    val:'auto' | 'default' | null;

    private constructor(negative:boolean, primary:boolean, val:'auto' | 'default' | null) {
        let name = `service_tier=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.service_tier = this.val;
    }
}

//
//   /**
//    * Up to 4 sequences where the API will stop generating further tokens. The
//    * returned text will not contain the stop sequence.
//    */
//   stop?: string | null | Array<string>;
@Register(RegistryInstance)
export class Stop extends AbstractFactor {
    static readonly INVALID_TYPE = new Stop(false, false, 123 as unknown as string);
    static readonly BLANK = new Stop(false, false, "");
    static readonly EMPTY = new Stop(false, true, []);
    static readonly SINGLE = new Stop(false, false, "foo");
    static readonly MULTIPLE = new Stop(false, false, ["foo", "bar"]);
    static readonly LONG = new Stop(true, false, "a".repeat(10000));

    val:string | string[];

    private constructor(negative:boolean, primary:boolean, val:string | string[]) {
        let name = `stop=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.stop = this.val;
    }
}

//
//   /**
//    * Whether or not to store the output of this chat completion request for use in
//    * our [model distillation](https://platform.openai.com/docs/guides/distillation)
//    * or [evals](https://platform.openai.com/docs/guides/evals) products.
//    */
//   store?: boolean | null;
@Register(RegistryInstance)
export class Store extends AbstractFactor {
    static readonly NOT_A_BOOLEAN = new Store(true, true, "foo" as unknown as boolean);
    static readonly TRUE = new Store(false, false, true);
    static readonly FALSE = new Store(false, true, false);

    val:boolean;

    private constructor(negative:boolean, primary:boolean, val:boolean) {
        let name = `store=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.store = this.val;
    }
}

//
//   /**
//    * If set to true, the model response data will be streamed to the client as it is
//    * generated using
//    * [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format).
//    * See the
//    * [Streaming section below](https://platform.openai.com/docs/api-reference/chat/streaming)
//    * for more information, along with the
//    * [streaming responses](https://platform.openai.com/docs/guides/streaming-responses)
//    * guide for more information on how to handle the streaming events.
//    */
//   stream?: boolean | null;
@Register(RegistryInstance)
export class Stream extends AbstractFactor {
    static readonly NOT_A_BOOLEAN = new Stream(true, false, "foo" as unknown as boolean);
    static readonly BLANK = new Stream(false, false, null);
    static readonly TRUE = new Stream(false, false, true);
    static readonly FALSE = new Stream(false, false, false);

    val:boolean | null;

    private constructor(negative:boolean, primary:boolean, val:boolean | null) {
        let name = `stream=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.stream = this.val;
    }
}

//
//   /**
//    * Options for streaming response. Only set this when you set `stream: true`.
//    */
//   stream_options?: ChatCompletionStreamOptions | null;
@Register(RegistryInstance)
export class StreamOptions extends AbstractFactor {
    static readonly NOT_A_BOOLEAN = new StreamOptions(true, false, "foo" as unknown as boolean);
    static readonly BLANK = new StreamOptions(false, true, null);
    static readonly TRUE = new StreamOptions(false, false, true);
    static readonly FALSE = new StreamOptions(false, true, false);

    val:boolean | null;

    private constructor(negative:boolean, primary:boolean, val:boolean | null) {
        let name = `stream_options=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.stream_options = {}

        if (this.val !== null) {
            chatReq.stream_options.include_usage = this.val;
        }
    }
}


//
//   /**
//    * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will
//    * make the output more random, while lower values like 0.2 will make it more
//    * focused and deterministic. We generally recommend altering this or `top_p` but
//    * not both.
//    */
//   temperature?: number | null;
@Register(RegistryInstance)
export class Temperature extends AbstractFactor {
    static readonly NOT_A_NUMBER = new Temperature(true, false, "foo" as unknown as number);
    static readonly MINUS = new Temperature(true, false, -1);
    static readonly ZERO = new Temperature(false, false, 0);
    static readonly ONE = new Temperature(false, true, 1);
    static readonly TWO = new Temperature(false, false, 2);
    static readonly BILLION = new Temperature(true, false, 1_000_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `temperature=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.temperature = this.val;
    }
}

//
//   /**
//    * Controls which (if any) tool is called by the model. `none` means the model will
//    * not call any tool and instead generates a message. `auto` means the model can
//    * pick between generating a message or calling one or more tools. `required` means
//    * the model must call one or more tools. Specifying a particular tool via
//    * `{"type": "function", "function": {"name": "my_function"}}` forces the model to
//    * call that tool.
//    *
//    * `none` is the default when no tools are present. `auto` is the default if tools
//    * are present.
//    */
//   tool_choice?: ChatCompletionToolChoiceOption;
// TODO

//
//   /**
//    * A list of tools the model may call. Currently, only functions are supported as a
//    * tool. Use this to provide a list of functions the model may generate JSON inputs
//    * for. A max of 128 functions are supported.
//    */
//   tools?: Array<ChatCompletionTool>;
// TODO

//
//   /**
//    * An integer between 0 and 20 specifying the number of most likely tokens to
//    * return at each token position, each with an associated log probability.
//    * `logprobs` must be set to `true` if this parameter is used.
//    */
//   top_logprobs?: number | null;
@Register(RegistryInstance)
export class TopLogprobs extends AbstractFactor {
    static readonly NOT_A_NUMBER = new TopLogprobs(true, false, "foo" as unknown as number);
    static readonly MINUS = new TopLogprobs(true, false, -1);
    static readonly ZERO = new TopLogprobs(false, false, 0);
    static readonly ONE = new TopLogprobs(false, true, 1);
    static readonly TWENTY = new TopLogprobs(false, false, 2);
    static readonly BILLION = new TopLogprobs(true, false, 1_000_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `top_logprobs=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.top_logprobs = this.val;
    }
}

//
//   /**
//    * An alternative to sampling with temperature, called nucleus sampling, where the
//    * model considers the results of the tokens with top_p probability mass. So 0.1
//    * means only the tokens comprising the top 10% probability mass are considered.
//    *
//    * We generally recommend altering this or `temperature` but not both.
//    */
//   top_p?: number | null;
@Register(RegistryInstance)
export class TopP extends AbstractFactor {
    static readonly NOT_A_NUMBER = new TopP(true, false, "foo" as unknown as number);
    static readonly MINUS = new TopP(true, false, -1);
    static readonly ZERO = new TopP(false, false, 0);
    static readonly ONE = new TopP(false, true, 1);
    static readonly TWO = new TopP(true, false, 2);
    static readonly BILLION = new TopP(true, false, 1_000_000_000);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `top_p=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.top_p = this.val;
    }
}

//
//   /**
//    * A unique identifier representing your end-user, which can help OpenAI to monitor
//    * and detect abuse.
//    * [Learn more](https://platform.openai.com/docs/guides/safety-best-practices#end-user-ids).
//    */
//   user?: string;
@Register(RegistryInstance)
export class User extends AbstractFactor {
    static readonly NOT_A_STRING = new User(true, false, 123 as unknown as string);
    static readonly BLANK = new User(false, false, "");
    static readonly SOMEBODY = new User(false, true, "somebody");

    val:string;

    private constructor(negative:boolean, primary:boolean, val:string) {
        let name = `user=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(chatReq:OpenAI.Chat.ChatCompletionCreateParams) {
        chatReq.user = this.val;
    }
}

//
//   /**
//    * This tool searches the web for relevant results to use in a response. Learn more
//    * about the
//    * [web search tool](https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat).
//    */
//   web_search_options?: ChatCompletionCreateParams.WebSearchOptions;
// TODO
