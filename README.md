# FauxpenAI Conformance Tool

The FauxpenAI Conformance tool is designed to build, run, and record scenarios to test the compatibility of 
custom API servers with OpenAI's API. This tool is used to:
- Build scenarios for various APIs such as chat completions and embeddings.
- Run these scenarios against an OpenAI API server and a custom API server.
- Record and compare the results to identify compatibility issues.

## Project Purpose
Many API servers claim to be OpenAI-compatible, but their actual behavior may differ from OpenAI's. 
The FauxpenAI Conformance tool helps ensure that these servers meet the expected conformance standards 
by automating the testing process. It does so by:
- Sending requests to both OpenAI and custom API servers.
- Comparing responses between the OpenAI API and the custom server.
- Logging differences for further analysis.

The data for the test scenarios used in this tool is stored in the [FauxpenAI Spec repository](https://github.com/aliok/FauxpenAI-spec).

## Features
- **Scenario Building**: Create a variety of test scenarios for OpenAI-compatible endpoints, including Chat Completions and Embeddings.
- **Scenario Execution**: Run the scenarios against both the OpenAI API and any custom API server for comparison.
- **Result Recording**: Capture and store the results of each test, including request payloads and response data.
- **Comparison**: Automatically compare the responses between OpenAI and the custom server to identify discrepancies.

## Install

To install the FauxpenAI Conformance tool, use the NPM package:
```bash
npm install fauxpenai-conformance -g
```

## How to Use
1. **Run Scenarios**: Execute the scenarios against your custom API server.
```shell
export OPENAI_API_KEY="<your_openai_api_key>"
fauxpenai-conformance runScenarios --api=embeddings --baseUrl="https://your-server/v1" --scenariosFile=/path/to/data/embeddings/scenarios.json --resultsFile=/path/to/data/embeddings/results.json.gz
# or, change the API to chatcompletions, etc.
```

2. **Compare Results**: After running the tests, the tool compares the results from OpenAI and your custom API server.
  You are going to need the data from the [FauxpenAI Spec repository](https://github.com/aliok/FauxpenAI-spec).
```shell
fauxpenai-conformance compareResults --api=embeddings --level=1  --resultsFile=/path/to/data/embeddings/results.json.gz --openaiResultsFile=/path/to/data/embeddings/openai-results.json.gz 
```


## Commands and options

#### createScenarios
```shell
fauxpenai-conformance createScenarios
# TODO
```

#### runScenarios
```shell
fauxpenai-conformance runScenarios
# TODO
```

## Contributing
We welcome contributions to improve the tool. If you have additional features or bug fixes, feel free to submit a pull request!

## How to Add New Scenarios or Record New Data for OpenAI API

1. **Create Scenarios**: Define scenarios for the API requests you want to test (e.g., Chat Completions, Embeddings).
```shell
# create embeddings scenarios
fauxpenai-conformance createScenarios --api=embeddings --outputFile=/path/to/data/embeddings/scenarios.json
# or from source, e.g.
# ts-node src/main/main.ts createScenarios --api=embeddings --outputFile=/Users/aliok/go/src/github.com/aliok/FauxpenAI-spec/embeddings/scenarios.json

# create chatcompletions scenarios
fauxpenai-conformance createScenarios --api=chatcompletions --outputFile=/path/to/data/chatcompletions/scenarios.json
# or from source, e.g.
# ts-node src/main/main.ts createScenarios --api=chatcompletions --outputFile=/Users/aliok/go/src/github.com/aliok/FauxpenAI-spec/chatcompletions/scenarios.json
```

2. **Run Scenarios**: Execute the scenarios against OpenAI's API.
```shell
# set your OpenAI API key
export OPENAI_API_KEY="<your_openai_api_key>"

# run embeddings scenarios
fauxpenai-conformance runScenarios --api=embeddings --scenariosFile=/path/to/data/embeddings/scenarios.json --resultsFile=/path/to/data/embeddings/results.json.gz
# or from source, e.g.
# ts-node src/main/main.ts runScenarios --api=embeddings --scenariosFile=/Users/aliok/go/src/github.com/aliok/FauxpenAI-spec/embeddings/scenarios.json --resultsFile=/Users/aliok/go/src/github.com/aliok/FauxpenAI-spec/embeddings/results.json.gz

# run chatcompletions scenarios
fauxpenai-conformance runScenarios --api=chatcompletions --scenariosFile=/path/to/data/chatcompletions/scenarios.json --resultsFile=/path/to/data/chatcompletions/results.json.gz
# or from source, e.g.
# ts-node src/main/main.ts runScenarios --api=chatcompletions --scenariosFile=/Users/aliok/go/src/github.com/aliok/FauxpenAI-spec/chatcompletions/scenarios.json --resultsFile=/Users/aliok/go/src/github.com/aliok/FauxpenAI-spec/chatcompletions/results.json.gz
```


# Development

## Creating a new release

```shell
# update the version in package.json to something like "0.0.6"
npm install
git add .
git commit -m "Release 0.0.6"
git tag -a "0.0.6" -m "Release 0.0.6"
git push --follow-tags

# create a new release on GitHub
gh release create

# update the version in package.json to something like "0.0.7-dev"
npm install
git add .
git commit -m "Start 0.0.7-dev"
git push
```
