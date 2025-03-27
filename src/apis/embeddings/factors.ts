import OpenAI from "openai";
import {EmbeddingCreateParams,} from "openai/resources/embeddings";
import {Register} from "../../lib/decorators";
import {AbstractFactor} from "../../lib/factor";
import {FactorRegistry} from "../../lib/factorRegistry";

export const RegistryInstance = new FactorRegistry<AbstractFactor>();
export const SeedRegistryInstance = new FactorRegistry<AbstractFactor>();

// /**
//    * Input text to embed, encoded as a string or array of tokens. To embed multiple
//    * inputs in a single request, pass an array of strings or array of token arrays.
//    * The input must not exceed the max input tokens for the model (8192 tokens for
//    * `text-embedding-ada-002`), cannot be an empty string, and any array must be 2048
//    * dimensions or less.
//    * [Example Python code](https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken)
//    * for counting tokens. Some models may also impose a limit on total number of
//    * tokens summed across inputs.
//    */
//   input: string | Array<string> | Array<number> | Array<Array<number>>;
@Register(SeedRegistryInstance)
export class Input extends AbstractFactor {
    static readonly INVALID_TYPE = new Input(true, false, true as unknown as string);
    static readonly BLANK_STRING = new Input(false, false, "");
    static readonly STRING = new Input(false, true, "hello");
    static readonly MULTIPLE_STRINGS = new Input(false, false, ["foo", "bar"]);
    static readonly MINUS_INT = new Input(false, false, [-123]);
    static readonly INTEGERS = new Input(false, false, [123, 456]);
    static readonly ARRAY_OF_INTEGERS = new Input(false, false, [[123, 456], [789, 12]]);
    static readonly BLANK_ARRAY = new Input(false, false, []);
    static readonly BLANK_STRING_ARRAY = new Input(false, false, [""]);
    static readonly MIXED = new Input(false, false, [123, "foo"] as unknown as any);

    val:string | Array<string> | Array<number> | Array<Array<number>>;

    private constructor(negative:boolean, primary:boolean, val:string | Array<string> | Array<number> | Array<Array<number>>) {
        let name = `input=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(embeddingReg:OpenAI.Embeddings.EmbeddingCreateParams) {
        embeddingReg.input = this.val;
    }
}

//   /**
//    * ID of the model to use. You can use the
//    * [List models](https://platform.openai.com/docs/api-reference/models/list) API to
//    * see all of your available models, or see our
//    * [Model overview](https://platform.openai.com/docs/models) for descriptions of
//    * them.
//    */
//   model: (string & {}) | EmbeddingModel;
@Register(SeedRegistryInstance)
export class Model extends AbstractFactor {
    static readonly NOT_A_STRING = new Model(true, false, 123 as unknown as string);
    static readonly BLANK = new Model(true, false, "");
    static readonly UNKNOWN = new Model(true, false, "foo");
    static readonly EMBEDDING_ADA_002 = new Model(false, false, "text-embedding-ada-002");
    static readonly EMBEDDING_3_SMALL = new Model(false, false, "text-embedding-3-small");
    static readonly EMBEDDING_3_LARGE = new Model(false, false, "text-embedding-3-large");

    val:string;

    private constructor(negative:boolean, primary:boolean, val:string) {
        let name = `model=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(embeddingReg:OpenAI.Embeddings.EmbeddingCreateParams) {
        embeddingReg.model = this.val;
    }
}

//   /**
//    * The number of dimensions the resulting output embeddings should have. Only
//    * supported in `text-embedding-3` and later models.
//    */
//   dimensions?: number;
@Register(RegistryInstance)
export class Dimensions extends AbstractFactor {
    static readonly NOT_A_NUMBER = new Dimensions(true, false, "123" as unknown as number);
    static readonly BLANK = new Dimensions(true, false, 0);
    static readonly DIMENSION_1536 = new Dimensions(false, true, 1536);
    static readonly DIMENSION_4096 = new Dimensions(false, false, 4096);
    static readonly MINUS = new Dimensions(true, false, -1);

    val:number;

    private constructor(negative:boolean, primary:boolean, val:number) {
        let name = `dimensions=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(embeddingReg:OpenAI.Embeddings.EmbeddingCreateParams) {
        embeddingReg.dimensions = this.val;
    }
}

//   /**
//    * The format to return the embeddings in. Can be either `float` or
//    * [`base64`](https://pypi.org/project/pybase64/).
//    */
//   encoding_format?: 'float' | 'base64';
@Register(RegistryInstance)
export class EncodingFormat extends AbstractFactor {
    static readonly NOT_A_STRING = new EncodingFormat(true, false, 123 as unknown as string);
    static readonly BLANK = new EncodingFormat(true, false, "");
    static readonly FLOAT = new EncodingFormat(false, true, "float");
    static readonly BASE64 = new EncodingFormat(false, false, "base64");
    static readonly UNKNOWN = new EncodingFormat(true, false, "unknown");

    val:string;

    private constructor(negative:boolean, primary:boolean, val:string) {
        let name = `encoding_format=${val}`;
        super(negative, primary, name);
        this.val = val;
    }

    apply(embeddingReg:OpenAI.Embeddings.EmbeddingCreateParams) {
        embeddingReg.encoding_format = this.val as unknown as EmbeddingCreateParams["encoding_format"];
    }
}

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

    apply(embeddingReg:OpenAI.Embeddings.EmbeddingCreateParams) {
        embeddingReg.user = this.val;
    }
}
