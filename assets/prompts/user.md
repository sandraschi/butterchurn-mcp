# Butterchurn MCP — User Guide

## Introduction

Welcome to butterchurn-mcp. This guide teaches you how to use the server to
create beautiful, audio-reactive visualizations in your browser, whether you
want a nostalgic Winamp-style MilkDrop look or a clean modern GLSL shader, and
how to keep those visuals pulsing in time with a live DJ set. It assumes you
have a working installation and walks you through the common workflows in
plain language.

The server gives you two things at once. It is a FastMCP server that any MCP
client can talk to, and it is a web application that renders full-screen
visualizations. The two tools it exposes, `get_bpm` and `set_bpm`, control the
beat. Everything else lives in the webapp. This guide covers both the agent
workflow and the human workflow, because you will likely use both.

## Installation

There are a few ways to install the server, and the right one depends on what
you already have installed.

The simplest path is to install the packaged bundle. If you have a `.mcpb`
file, you can install it directly into Claude Desktop by opening the file or
dragging it onto the Claude Desktop window. This bundles the Python server,
the manifest, and the prompts so the client knows how to launch it. This is
the recommended path for most users because it requires the least setup.

If you prefer to run from source, you need a few tools. First install the
prerequisites: Git to clone the repository, Python and the uv package manager
to run the server, and bun to run the webapp dev server. On Windows you can
install most of these through winget. Then clone the repository, run `uv sync`
to install the Python dependencies, and run `bun install` inside the webapp
directory to install the frontend dependencies. Once those are done, you can
start everything with the launcher script.

A manual configuration path is also available if you want to register the
server with an MCP client by hand. You add an entry to the client's
configuration file, pointing the command at uv and the arguments at the
repository and the entry point. The configuration file lives under the
application data directory on Windows, and under the library application
support directory on macOS.

After you install, you should verify the server works. Start it and open the
webapp in your browser. You should see the dashboard and the sidebar. Via an
MCP client, ask for the current BPM; it should return 128 by default.

## Quick Start

Before you do anything else, get the stack running. On a Windows machine,
open a PowerShell terminal in the repository and run the launcher.

Run `start.ps1`. The launcher clears any stale processes on the backend and
frontend ports, starts the Python backend on port 10878, waits until its
health endpoint responds, starts the Vite frontend on port 10879, and opens
your browser. It returns immediately because the servers run in the
background. If a browser does not open, or the frontend seems slow to appear,
wait a few seconds and navigate to `http://127.0.0.1:10879` manually.

Once the webapp is open, you are on the dashboard. You should see the current
BPM, the uptime, and navigation links. The page layout has a sidebar on the
left with links to the Toolbox, Presets, Visualizer, Tools, Skills, Chat,
Settings, Logs, and Help pages. The main area shows the content of the page
you have selected, and it scrolls vertically when the content is taller than
the window.

## The First Visualizer

The fastest way to see something beautiful is to open the Presets page. Click
Presets in the sidebar. You will see a grid of visualizer cards. Each card
shows an animated thumbnail of a preset once it scrolls into view. The grid is
searchable and filterable, so you can narrow it down by name, author, or
category. Click any card to select it. A live preview of the selected preset
appears at the top of the page, above the grid. Click the Fullscreen button to
open that preset in a full-screen canvas.

While the full-screen visualizer is open, click anywhere on the canvas or
press the left and right arrow keys to cycle through the presets in the
library. The overlay at the bottom shows the current preset name and its
position in the list. This is the fastest way to flip through the whole
library and find the ones you love.

If you prefer a modern look, open the Toolbox page instead. The toolbox lets
you pick between the two engines. Choose GLSL Shaders to see the modern
WebGL2 scenes, or choose Butterchurn to see the MilkDrop presets. You can
preview scenes and presets right in the toolbox and jump to fullscreen from
there.

## Browsing and Searching the Library

The preset library is large. It includes the classic butterchurn packs plus
the projectM MilkDrop collections. To make the library manageable, the
Presets page gives you several controls.

The search box filters presets by name or author as you type. The category
dropdown filters by pack, so you can view only the Main pack, or only the
cream of the crop geometric presets, or any other pack. The author dropdown
filters by the preset author, which is useful if you have a favorite creator.
The favorites toggle shows only the presets you have starred, and the random
button jumps to a random preset.

The slideshow mode, labeled Demo, cycles through the presets automatically
every few seconds, fading between them in the preview. This is a great way to
let the gallery run in the background while you work.

When you browse a large lazy-loaded category such as the cream of the crop
packs, the first visit downloads that pack on demand. You will see a brief
loading message, and then the cards for that category will animate and
populate. The download happens once and is cached by the browser.

## Making the Visualizer Pulse with Music

The visualizer's beat is driven by a single value: the beats per minute, or
BPM. By default it is 128. You can change it in two ways.

The first way is through the Settings page. Open Settings, find the BPM
section, and use the slider or the number input to set a tempo between 60 and
200, then click Save. The webapp picks up the new value and the visualizer's
beat changes.

The second way is through an agent or an automation. If you are using an MCP
client, you can ask the assistant to set the BPM. The assistant calls the
`set_bpm` tool with a value, and the backend updates its clock. The webapp
notices the change on its next poll and the beat adjusts. You can read the
current BPM at any time with `get_bpm`.

The most powerful use is to sync the visualizer to a live DJ set. The fleet
includes a DJ controller called mixx-dj-mcp. If a DJ set is running, the DJ
automation keeps calling `set_bpm` with the current tempo of the track, so the
visualizer pulses in time with the music. This turns the browser into a live
stage visual rather than a passive screensaver.

## Using the MCP Tools

The server exposes two MCP tools. They are simple, but they are the entire
agent-facing contract.

`get_bpm` reads the current BPM. It takes no arguments and returns the current
value. Use it when you need to know the tempo before you make a decision, or
when you want to confirm the state after a change.

`set_bpm` writes a new BPM. It takes one argument, an integer between 60 and
200. Use it to change the tempo, especially to sync with a DJ set. If you pass
a value outside the range, the tool returns an error explaining that the BPM
must be between 60 and 200.

Here is a realistic agent workflow. A user asks you to make the visualizer
dance to a techno track. You first call `get_bpm` to see the current tempo.
You decide the track is around 128 beats per minute. You call `set_bpm` with
128. You then direct the user to the Visualizer page in the webapp so they can
see the result. Because the webapp polls the BPM every two seconds, the beat
updates almost immediately.

Here is another. A user is playing a set and the tempo changes from 124 to
132. You call `set_bpm` with 132. The webapp picks up the new tempo and the
visualizer's beat speeds up to match. You confirm the change with a call to
`get_bpm`.

## Working with a Local LLM

The settings page includes local intelligence. It probes for three local LLM
engines when you open it: Ollama, LM Studio, and vLLM. Each is shown with a
status indicator. If a provider is detected, you can select it in the Provider
dropdown, and the Model dropdown populates with the models that provider has
installed.

The default model is chosen thoughtfully. The server never evicts a model
that is already loaded in Ollama just to load a different one, because loading
a second big model evicts the first and forces a slow reload for every client
using it. Instead, it picks the highest-preference model that is already
loaded, and falls back to the highest-preference installed model only if
nothing is loaded. On machines with more than one NVIDIA card, a GPU selector
appears so you can choose which card the local model runs on, defaulting to a
card other than the primary one to avoid evicting a resident agentic model.

If no local LLM is detected, the settings page shows a gentle prompt
suggesting you install Ollama or LM Studio. If a high-performance GPU is
detected but no local LLM is running, you will see a suggestion that a GPU is
available and that installing a local engine would unlock AI features for
free.

## Understanding the Pages

The webapp has a page for every major surface.

The Dashboard shows the BPM, the uptime, and quick links. It is the landing
page and a compact overview of the server's state.

The Toolbox is the engine picker. It presents the two engines and lets you
preview scenes and presets and go fullscreen. Use it when you want to choose
the visual style deliberately.

The Presets page is the gallery. It is the best place to browse the entire
preset library, search it, filter it, star favorites, run a slideshow, and
open a preset fullscreen.

The Visualizer page is the full-screen canvas. It accepts parameters in the
URL to open a specific engine and scene or a specific preset index, which
makes it possible to deep-link to a particular visual.

The Tools page renders the dynamic list of MCP tools from the server. It is a
reference for what the server can do.

The Skills page lists any bundled skills.

The Chat page provides a chat interface backed by a local LLM when one is
detected. If no local LLM is available, it shows a disabled state.

The Settings page lets you configure the local LLM provider and model, the
GPU placement on multi-GPU machines, and the BPM.

The Logs page streams server activity. It supports filtering by level and
kind, searching, exporting to JSON or CSV, and clearing the buffer. This is
the operator console for understanding what the server is doing.

The Help page documents the architecture, ports, environment variables, and
troubleshooting. It is a good first stop when something is not working.

## Understanding the Logs Page

The Logs page is your window into what the server is actually doing. Every
HTTP request under the API path is logged with the kind `http`, showing the
method, the path, the status code, and the duration in milliseconds. MCP tool
calls are logged with the kind `tool_call`. BPM changes are logged with the
kind `bpm`. Startup and lifecycle events are logged with the kind `server`.

The page has a live tail that polls the server every few seconds and streams
new entries. You can turn the live tail off to freeze the view. The level
filter narrows to a minimum severity, and the kind filter narrows to a
specific kind such as `http` or `tool_call`. The search box matches text in
the detail and metadata. The export button downloads the current view as a
file, and the clear button empties the buffer after confirmation.

When you first open the server, the buffer contains the startup entry and any
requests you have already made. As you browse the webapp, the buffer fills
with request and tool-call entries. If the page looks empty, make a few
requests or change the BPM, and the entries will appear.

## Understanding the Settings Page

The Settings page has two main sections.

The Local Intelligence section handles the local LLM. It probes for providers,
shows their status, and lets you select a provider and a model. On machines
with more than one NVIDIA card, it shows a GPU selector with the cards and
their memory. It also explains the resident-first model preference so you
understand why a particular model is selected by default.

The BPM section lets you set the tempo. Use the slider or the number input to
choose a value between 60 and 200, then click Save. The value persists on the
backend and drives the visualizer.

## Troubleshooting Common Issues

If the backend does not start, the most likely cause is that a stale process
is still holding the backend port. The launcher and the CLI both clear stale
listeners, but if you started a server manually, kill the process holding the
port and retry. On Windows you can check the port with the netstat command
and stop the owning process.

If the frontend does not start, verify that bun is installed and available on
the PATH, or present at its default location under the user profile. The
launcher needs bun to run the Vite dev server.

If the preset gallery shows static gradient placeholders instead of animated
thumbnails, remember that cards animate only while they are visible and only
up to a bounded number of concurrent WebGL contexts. Scroll the gallery so the
cards come into view, and close other tabs or windows that are using WebGL so
the browser has free contexts. Once a card has animated, a still frame is
cached so it displays immediately on subsequent visits.

If the logs page appears empty, the ring buffer only holds entries produced
after the server started. Generate some activity by making requests or
changing the BPM, and the logs will populate.

If the settings page reports no local LLM, install Ollama or LM Studio and
restart the server. If you have more than one NVIDIA card, select the
appropriate GPU in the selector so the model does not evict a resident model
on the primary card.

If the BPM will not go above 200, remember that the value is clamped to the
range 60 through 200. Use a value in that range.

If the visualizer appears black or static, the most likely cause is that the
browser suspended the audio context because it started without a user gesture.
Click anywhere in the page or press a key, and the shared audio context
resumes, after which the visualizer animates. This is a browser policy, not a
server fault.

## Example Dialogues

Here are a few example conversations to illustrate how you might use the
server with an assistant.

The user asks: "Show me some retro MilkDrop visuals." You should direct them
to the Presets page, mention that the butterchurn engine is the retro MilkDrop
engine, and suggest they browse the Main pack or search for a specific preset.
You can open the full-screen visualizer for them by navigating to the
Visualizer page.

The user asks: "Can you make the visualizer sync to my DJ set?" You should
explain the BPM clock, ask for the current tempo or read it with `get_bpm`,
and then call `set_bpm` with the correct tempo. You should also mention that
mixx-dj-mcp can automate this so the visuals follow the set live.

The user asks: "Why is the gallery showing plain colors instead of
animations?" You should explain that cards animate while visible and up to a
bounded number of WebGL contexts, and that scrolling brings more cards to
life. You should also mention closing other WebGL-heavy tabs if the browser is
out of contexts.

The user asks: "What models can I use for chat?" You should guide them to the
Settings page, explain that the server probes for Ollama, LM Studio, and
vLLM, and that the model dropdown populates from the detected provider. On a
multi-GPU machine, you should mention the GPU selector.

The user asks: "Why do the logs show nothing?" You should explain that the
log buffer starts empty after startup and fills as requests and tool calls
happen, and suggest they browse the webapp or change the BPM to generate
activity.

## Working with the REST API Directly

The webapp talks to the backend over HTTP, and you can too. Every endpoint
under `/api` is available to any HTTP client, which is useful for scripts and
automation that are not inside an MCP client.

To check the server is healthy, request the health endpoint. You should get a
JSON response with the status, the version, the uptime in seconds, the current
BPM, and the port mapping. To read the current BPM, request the BPM endpoint
with a GET. To set the BPM, send a POST with a JSON body containing the value.
The value must be between 60 and 200; if it is not, the server returns an
error.

To inspect the tool surface, request the capabilities endpoint. It returns a
structured inventory of the tools, the enabled features, and the runtime
transport. To list the visualizer engines, request the visualizers endpoint.
It describes the shader scenes and the butterchurn engine so you know what
the webapp can show.

To read the server logs, request the logs endpoint. You can filter by level,
kind, and search text, and you can control the limit and sort order. Related
endpoints provide statistics, export in JSON or CSV, and a delete operation
to clear the buffer. To enumerate NVIDIA GPUs for local intelligence, request
the LLM GPU endpoint, and to detect the GPU tier and installed Ollama models,
request the LLM detect endpoint.

These endpoints are the same ones the webapp uses, so the data you get from a
script matches what the webapp shows. This makes it easy to build custom
dashboards or to integrate the visualizer into a larger automation without
going through an MCP client.

## Choosing an Engine

The server offers two distinct visual styles, and which one you choose
depends on the mood you want.

The butterchurn engine is the retro choice. It renders MilkDrop presets, the
same engine that powered Winamp, with all of its trippy, geometric, particle,
and kaleidoscope effects. If you want a nostalgic feel, a live show look, or
just something that feels like classic music visualization, this is the
engine. The gallery holds hundreds of presets across several packs, and the
classic presets are famous for their "threads of light" particle aesthetic.

The GLSL shader engine is the modern choice. It renders a set of curated
WebGL2 fragment shaders that look clean, crisp, and contemporary. If you want
a sleek, minimal, or high-tech look that matches a modern interface, this is
the engine. It has fewer scenes than the butterchurn library has presets, but
each scene is polished.

You switch engines in the Toolbox page. The toolbox shows both engines and
lets you preview their scenes or presets before going fullscreen. You can also
jump directly to a specific scene or preset through the Visualizer page's URL
parameters, which is handy for deep links.

## Exploring the Preset Packs in Depth

The preset library is organized into packs, and understanding the packs helps
you find what you want faster.

The classic butterchurn packs are Main, Extra, Extra 2, MD1, Minimal, and
Non-Minimal. The Main pack is the core collection and a good starting point.
The Extra and Extra 2 packs add more variety. The MD1 pack is named after a
classic MilkDrop release. The Minimal and Non-Minimal packs group presets by
their complexity, so you can find simple, clean presets or elaborate ones.

The projectM packs bring in more content converted from the MilkDrop
community. The original pack loads eagerly with the rest of the library. The
cream of the crop packs, which are the community-curated best of the best,
are larger and load lazily; you only download them when you browse their
category. The geometric pack is full of the shapes and patterns that made
MilkDrop famous, and the particles pack is full of the flowing particle
effects.

When you are looking for a specific style, use the category filter to narrow
to one pack, then use the search box to find a preset by name or author. Star
the ones you like so you can return to them with the favorites toggle. Run
the slideshow to let the gallery cycle through a pack and discover presets
you would not have found by scrolling.

## Integrating with Agents and Automations

The server is designed to be driven by agents as well as by humans. Because
the MCP tool surface is small, an agent can learn it quickly and use it
reliably.

The most common agent task is to set the tempo so the visualizer pulses with
music. The pattern is simple: read the current BPM, decide on the correct
tempo, and set it. The webapp notices the change within a couple of seconds
and the beat updates. This is how a DJ automation keeps the visuals in sync
with a live set, and it is the core loop you will use most often.

Another common task is to guide a user to a visual. When a user wants to see
a specific style of visualizer, an agent can point them to the right page and,
where the webapp supports deep links, navigate them directly to a particular
scene or preset. The visualizer page accepts engine and scene or preset index
parameters, so an agent can construct a link that opens exactly the visual the
user wants.

A less common but useful task is to inspect the server state. An agent can
read the capabilities endpoint to understand the tool surface, read the logs
endpoint to understand recent activity, and read the health endpoint to
confirm the server is up. This is helpful when diagnosing why something is
not working or when building a status report.

The server also cooperates with the rest of the fleet. The most important
cooperation is with mixx-dj-mcp for live DJ sets, but the server also follows
the fleet's standards for local intelligence, logging, and port allocation, so
it behaves predictably alongside other servers. An agent that understands
these standards can reason about the server correctly without special case
logic.

## Best Practices

Read the BPM before you change it. Grounding your decision in the current
state avoids surprises and makes the change intentional.

Respect the tempo range. Values below 60 or above 200 are rejected, so keep
your changes within the valid range.

Keep the visuals in sync during a set. If a DJ automation is running, let it
drive the BPM rather than fighting it with manual changes.

Direct users to the right page. The gallery is for browsing, the toolbox is
for choosing an engine, and the fullscreen visualizer is for focused viewing.

Understand the local LLM placement. On a multi-GPU machine, prefer the
secondary card so you do not evict a resident model. The settings page makes
this easy.

Use the logs to understand behavior. When something seems wrong, check the
logs page first; it will show the requests and tool calls that happened.

Remember that everything renders in the browser. The human sees the result in
the webapp, and your job is to operate the BPM clock and point them to the
right place.

## Where to Go From Here

You now know how to start the stack, browse the visualizer library, sync the
beat to music, use the two MCP tools, configure a local LLM, read the logs,
and troubleshoot common issues. The most rewarding thing to do next is to open
the gallery, pick a favorite preset, and let it run full screen while music
plays. From there, experiment with the slideshow mode, try both engines, and
connect a DJ set to see the visuals pulse in real time.

If you are an agent, keep the BPM contract in mind: read before you write,
stay within the range, and use `set_bpm` to drive the beat during a set. If
you are a human, enjoy the library and make the visuals your own. The server
is small, focused, and built to be enjoyed.
