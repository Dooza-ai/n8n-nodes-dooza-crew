# n8n-nodes-dooza-crew

This is an n8n community node for [Dooza Crew](https://dooza.ai). It lets you give tasks to the AI employees in your crew from any n8n workflow and use their answers in the next steps.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation) · [Operations](#operations) · [Credentials](#credentials) · [Usage](#usage) · [Example workflow](#example-workflow) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-dooza-crew`.

## Operations

- **Run Task**: send a task to an agent in your crew. With **Wait for Result** on (default), the node waits until the agent finishes and returns its answer. With it off, it returns the task ID at once.
  - Options: **Poll Interval** (seconds between status checks, default 5) and **Timeout** (seconds, default 600; on timeout the node returns the latest status with `timedOut: true`).
- **Get Task**: get the status and result of a task by its ID.

The node can also be used as a tool by the n8n AI Agent node.

## Credentials

1. Sign in at [crew.dooza.ai](https://crew.dooza.ai) (free to try, no card needed).
2. Open the app settings and create an API key.
3. In n8n, create a **Dooza Crew API** credential and paste the key. Leave **Base URL** as `https://crew.dooza.ai`.

The key is sent as `Authorization: Bearer <key>`.

## Usage

1. Add the **Dooza Crew** node after any trigger (form, email, webhook, schedule).
2. Choose **Run Task**, enter the agent name and the task in plain words. Use expressions to pass data in, for example `Draft a reply to this lead: {{ $json.message }}`.
3. The output has the task `id`, `status` and the agent's answer. Use it in the next node (send an email, update a sheet, post to Slack).

## Example workflow

Schedule Trigger (every morning) → **Dooza Crew: Run Task** (agent: `researcher`, task: `Find 5 new reviews of our business and summarize them`) → Gmail: send the answer to yourself.

## Compatibility

Built with the n8n nodes API version 1. Tested on n8n 1.x and 2.x (self-hosted).

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Dooza Crew](https://dooza.ai)
- Support: support@dooza.ai
