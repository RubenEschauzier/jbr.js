# JBR Experiment - SolidBench Derived Resources

[![Build status](https://github.com/rubensworks/jbr.js/workflows/CI/badge.svg)](https://github.com/rubensworks/jbr.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/rubensworks/jbr.js/badge.svg?branch=master)](https://coveralls.io/github/rubensworks/jbr.js?branch=master)
[![npm version](https://badge.fury.io/js/%40jbr-experiment%2Fsolidbench-derived-resources.svg)](https://www.npmjs.com/package/@jbr-experiment/solidbench-derived-resources)

A [jbr](https://github.com/rubensworks/jbr.js/tree/master/packages/jbr) experiment type for the
[SolidBench social network benchmark](https://github.com/SolidBench/SolidBench.js),
fragmented into Solid pods that additionally expose **derived resources**.

This experiment behaves exactly like the [`solidbench`](https://github.com/rubensworks/jbr.js/tree/master/packages/experiment-solidbench)
experiment, except that it fragments the generated dataset with a fragmentation config that also emits
derived resource descriptions alongside the regular pod documents:

* `FragmentationStrategyDatasetSummaryDerivedResourceQpf`: Quad Pattern Fragment style derived resources per pod.
* `FragmentationStrategyDatasetSummaryDerivedResourceStarTemplate`: Templated derived resources over star-shaped patterns.
* `FragmentationStrategyDatasetSummaryDerivedResourceLinearTemplate`: Templated derived resources over path-shaped patterns.

The derived resource descriptions are written as `.meta` documents inside each pod
(in the `urn:npm:solid:derived-resources:` namespace), so a
[Community Solid Server with derived resource support](https://github.com/CommunitySolidServer/CommunitySolidServer)
can serve them, and a client can discover them via
`https://knows.idlab.ugent.be/vocab/derived#definedBy`.

## Requirements

* [Node.js](https://nodejs.org/en/) _(1.12 or higher)_
* [Docker](https://www.docker.com/) _(required for invoking [LDBC SNB generator](https://github.com/ldbc/ldbc_snb_datagen_hadoop))_
* [jbr](https://github.com/rubensworks/jbr.js/tree/master/packages/jbr) _(required for initializing, preparing, and running experiments on the command line)_

## Quick start

### 1. Install jbr

[jbr](https://github.com/rubensworks/jbr.js/tree/master/packages/jbr) is a command line tool that enables experiments to be initialized, prepared, and started.
It can be installed from the npm registry:

```bash
$ npm install -g jbr
```
or
```bash
$ yarn global add jbr
```

### 2. Initialize a new experiment

Using the `jbr` CLI tool, initialize a new experiment:

```bash
$ jbr init solidbench-derived-resources my-experiment
$ cd my-experiment
```

This will create a new `my-experiment` directory with default configs for this experiment type.

### 3. Configure the required hooks

This experiment type requires you to configure a certain SPARQL endpoint to send queries to for the `hookSparqlEndpoint`.
A value for this hook can be set as follows, such as [`sparql-endpoint-comunica`](https://github.com/rubensworks/jbr.js/tree/master/packages/hook-sparql-endpoint-comunica):

```bash
$ jbr set-hook hookSparqlEndpoint sparql-endpoint-comunica
```

Setting the sparql-endpoint-comunica hook will create a `config-client.json` file that uses default Comunica.
This should be link traversal instead, using a configuration like this (the version may be out of date):
```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/config-query-sparql-link-traversal/^0.0.0/components/context.jsonld"
  ],
  "import": [
    "ccqslt:config/config-solid-default.json"
  ]
}
```

Furthermore, the file `context-client.json` will also not work for link traversal. This should be set to
```json
{
  "sources": [ ],
  "lenient": true
}
```

Finally, the `Dockerfile-client` will use this base Docker image: `FROM comunica/query-sparql:v2.5.0`.
This should be changed to a version of `comunica/query-sparql-link-traversal-solid`. In addition,
you should add `--idp void` to the CMD line. So a working `Dockerfile-client` should look like:

```docker
FROM comunica/query-sparql-link-traversal-solid:dev

ARG CONFIG_CLIENT
ARG QUERY_TIMEOUT
ARG MAX_MEMORY
ARG LOG_LEVEL

ADD $CONFIG_CLIENT /tmp/config.json

ENV COMUNICA_CONFIG=/tmp/config.json
ENV NODE_ENV=production
ENV MAX_MEMORY=$MAX_MEMORY
ENV QUERY_TIMEOUT=$QUERY_TIMEOUT
ENV LOG_LEVEL=$LOG_LEVEL

EXPOSE 3000

ENTRYPOINT []
CMD [ "/bin/sh", "-c", "node --max-old-space-size=$MAX_MEMORY ./bin/http.js -c /tmp/context.json -p 3000 -t $QUERY_TIMEOUT -l $LOG_LEVEL -i --idp void" ]
```

### 4. Prepare the experiment

In order to run all preprocessing steps, such as creating all required datasets, invoke the prepare step:

```bash
$ jbr prepare
```

All prepared files will be contained in the `generated/` directory.
Next to the regular pod documents in `generated/out-fragments/`, this will also produce the
`.meta` documents and `filters/` and `resources/` entries that describe the derived resources.

### 5. Run the experiment

Once the experiment has been fully configured and prepared, you can run it:

```bash
$ jbr run
```

Once the run step completes, results will be present in the `output/` directory.

## Output

The following output is generated after an experiment has run.

`output/query-times.csv`:
```csv
name;id;results;time;timestamps
interactive-short-4;0;0;7;
interactive-short-4;1;0;5;
interactive-short-4;2;0;6;
interactive-short-4;3;0;3;
interactive-short-4;4;0;3;
interactive-short-5;0;0;0;
interactive-short-5;1;0;0;
interactive-short-5;2;0;0;
interactive-short-5;3;0;0;
interactive-short-5;4;0;0;
```

`output/stats-server.csv`: Per second of the experiment: CPU percentage, memory usage (bytes), memory percentage, received bytes, transmitted bytes.
```csv
cpu_percentage,memory,memory_percentage,received,transmitted
9.915362228116711,10489856,0.5024267940030527,488,0
9.863725050505051,17354752,0.8312308965993495,648,0
9.64850952141058,19116032,0.915589944401502,738,0
9.345685076142132,23072768,1.105103526208198,738,0
10.029959365079364,26759168,1.2816689750964243,738,0
10.25411566137566,30363648,1.45431074734269,738,0
```

`output/logs/server.txt`: Logs of the [Solid Community Server](https://github.com/solid/community-server/).

### Per-query resource usage

Next to the whole-run `stats-*.csv` files above, this experiment measures the resource usage of the
server container (`server*` columns) and the SPARQL endpoint container (`endpoint*` columns, only if the hook runs in Docker)
during every individual (non-warmup) query execution.
Counters are read directly from the containers' cgroup v2 files on the host,
with a fallback to the (slower) Docker API if those can not be read, e.g. for a remote Docker daemon.

`output/query-resources-raw.csv` contains one row per execution, with the following columns per container:

| Column | Unit | Meaning |
| --- | --- | --- |
| `<c>CpuAvg` | cores | Exact average CPU usage (CPU time / wall time). 1 means one fully used core. |
| `<c>CpuMin`, `<c>CpuMax` | cores | Min/max CPU usage over the sampling intervals. Intervals shorter than half the sampling interval are ignored; if there are no other intervals, these equal `<c>CpuAvg`. |
| `<c>CpuTime` | ms | Exact CPU time consumed. |
| `<c>MemoryAvg`, `<c>MemoryMin`, `<c>MemoryMax` | bytes | Sampled anonymous memory (excluding page cache). The average is time-weighted. |
| `<c>MemoryTotalMax` | bytes | Maximum sampled memory including page cache (comparable to `docker stats`). |
| `<c>IoReadBytes`, `<c>IoWriteBytes` | bytes | Exact block device I/O. |
| `<c>NetworkRxBytes`, `<c>NetworkTxBytes` | bytes | Exact network traffic, excluding loopback. |
| `<c>Samples` | | Number of snapshots the sampled values are based on, including start and end. |

Furthermore, each row contains `executionStartTime` and `executionEndTime` (Unix epoch, ms),
and if idle waiting is enabled, `idleWaitTime` (ms) and `idleWaitTimedOut`.

The same metrics are aggregated across replications in `output/query-times.csv`, over successful executions only:
`*Min` columns take the minimum, `*Max` columns the maximum, and all other columns the mean (with a `*Std` column).
`idleWaitTimedOutCount` counts the executions for which idle waiting timed out.

Sampled values (`CpuMin`, `CpuMax`, `Memory*`) are only meaningful for queries that last several sampling intervals.
All other values are exact for any query duration.

Before every measured execution, the runner waits until the server is idle (CPU, block I/O and network below thresholds
for a number of consecutive windows), so that leftover work of the previous execution does not leak into the next measurement.

## Configuration

The default generated configuration file (`jbr-experiment.json`) for this experiment looks as follows:

```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/jbr/^6.0.0/components/context.jsonld",
    "https://linkedsoftwaredependencies.org/bundles/npm/@jbr-experiment/solidbench-derived-resources/^6.0.0/components/context.jsonld"
  ],
  "@id": "urn:jbr:test-experiment",
  "@type": "ExperimentSolidBenchDerivedResources",
  "scale": "0.1",
  "configEnhance": "input/config-enhancer.json",
  "configFragment": "input/config-fragmenter.json",
  "configQueries": "input/config-queries.json",
  "configServer": "input/config-server.json",
  "configValidation": "input/config-validation.json",
  "validationParamsUrl": "https://cloud.ilabt.imec.be/index.php/s/bBZZKb7cP95WgcD/download/validation_params.zip",
  "hadoopMemory": "4G",
  "dockerfileServer": "input/dockerfiles/Dockerfile-server",
  "endpointUrl": "http://localhost:3001/sparql",
  "serverPort": 3000,
  "serverLogLevel": "info",
  "serverBaseUrl": "http://solidbench-server:3000/",
  "serverResourceConstraints": {
    "@type": "StaticDockerResourceConstraints",
    "cpu_percentage": 100
  },
  "queryRunnerReplication": 3,
  "queryRunnerWarmupRounds": 1,
  "queryRunnerRequestDelay": 0,
  "queryRunnerEndpointAvailabilityCheckTimeout": 1000,
  "queryRunnerUrlParams": {},
  "hookSparqlEndpoint": {
    "@id": "urn:jbr:test-experiment:hookSparqlEndpoint",
    "@type": "HookNonConfigured"
  }
}
```

Any config changes require re-running the prepare step.

More background information on these config options can be found in the README of the [SolidBench social network benchmark](https://github.com/SolidBench/SolidBench.js).

### Configuration fields

* `scale`: The SNB scale factor
* `configEnhance`: Path to enhancement config for [`ldbc-snb-enhancer`](https://github.com/SolidBench/ldbc-snb-enhancer.js/).
* `configFragment`: Path to fragmentation config for [`rdf-dataset-fragmenter`](https://github.com/SolidBench/rdf-dataset-fragmenter.js). Defaults to the derived resources variant.
* `configQueries`: Path to query instantiation config for [`sparql-query-parameter-instantiator`](https://github.com/SolidBench/sparql-query-parameter-instantiator.js).
* `configServer`: Path to server config for [Solid Community Server](https://github.com/solid/community-server/).
* `validationParamsUrl`: Validation parameters URL.
* `configValidation`: Config for the SolidBench validator.
* `hadoopMemory`: Memory limit for Hadoop for [LDBC SNB](https://github.com/ldbc/ldbc_snb_datagen_hadoop).
* `dockerfileServer`: Path to a Dockerfile for [Solid Community Server](https://github.com/CommunitySolidServer/CommunitySolidServer).
* `serverPort`: HTTP Port for [Solid Community Server](https://github.com/CommunitySolidServer/CommunitySolidServer).
* `serverLogLevel`: Logging level for [Solid Community Server](https://github.com/CommunitySolidServer/CommunitySolidServer).
* `serverBaseUrl`: Base URL for the Solid Community Server.
* `serverResourceConstraints`: Resource constraints for the [Solid Community Server](https://github.com/CommunitySolidServer/CommunitySolidServer) Docker container.
* `endpointUrl`: URL through which the SPARQL endpoint of the `hookSparqlEndpoint` hook will be exposed.
* `queryRunnerReplication`: Number of replication runs for [`sparql-benchmark-runner`](https://github.com/comunica/sparql-benchmark-runner.js).
* `queryRunnerWarmupRounds`: Number of warmup runs for [`sparql-benchmark-runner`](https://github.com/comunica/sparql-benchmark-runner.js).
* `queryRunnerRequestDelay`: Delay between requests in milliseconds.
* `queryRunnerUrlParams`: A JSON record of string mappings containing URL parameters that will be passed to the SPARQL endpoint.
* `queryTimeoutFallback`: An optional timeout value for a single query in milliseconds, to be used as fallback in case the SPARQL endpoint hook's timeout fails. This should always be higher than the timeout value configured in the SPARQL endpoint hook.
* `queryResourceSamplingInterval`: _(optional, default `100`)_ Interval in milliseconds at which container resource usage is sampled during each query execution. Set to `0` to disable per-query resource tracking and idle waiting.
* `queryResourceIdleCpuThreshold`: _(optional, default `0.05`)_ Maximum CPU usage (in cores) of the server for it to count as idle.
* `queryResourceIdleIoThreshold`: _(optional, default `100000`)_ Maximum block I/O (bytes per second) of the server for it to count as idle.
* `queryResourceIdleNetworkThreshold`: _(optional, default `10000`)_ Maximum network traffic (bytes per second) of the server for it to count as idle.
* `queryResourceIdleWindow`: _(optional, default `250`)_ Length in milliseconds of a single idle check window.
* `queryResourceIdleWindows`: _(optional, default `2`)_ Number of consecutive idle windows required before a query execution. Set to `0` to disable idle waiting.
* `queryResourceIdleTimeout`: _(optional, default `30000`)_ Maximum time in milliseconds to wait for idleness, after which the query is executed anyway and a warning is logged.
* `queryResourceIdleIncludeEndpoint`: _(optional, default `false`)_ If the SPARQL endpoint container must also be idle before a query execution.

## License

jbr.js is written by [Ruben Taelman](http://www.rubensworks.net/).

This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
