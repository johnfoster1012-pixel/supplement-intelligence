#!/usr/bin/env python3
from pathlib import Path
import json, re, sys, xml.etree.ElementTree as ET
import yaml

ROOT = Path(__file__).resolve().parents[1] / "plugin-package"
errors = []

def require(cond, msg):
    if not cond:
        errors.append(msg)

def load_json(name):
    path = ROOT / name
    require(path.is_file(), f"missing {name}")
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"invalid JSON {name}: {e}")
        return {}

plugin = load_json("plugin.json")
mcp = load_json("mcp.json")

require(plugin.get("$schema") == "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", "plugin.json schema is wrong")
require(plugin.get("name") == "supplement-intelligence", "plugin name is wrong")
require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", plugin.get("name","")) is not None, "plugin name is not submission-safe")
require(re.fullmatch(r"\d+\.\d+\.\d+", plugin.get("version","")) is not None, "version must be semver")

oi = ((plugin.get("extensions") or {}).get("com.openai") or {})
interface = oi.get("interface") or {}
required_strings = {
    "displayName":30,
    "shortDescription":30,
    "longDescription":4000,
    "developerName":80,
    "websiteURL":1024,
    "supportURL":1024,
    "privacyPolicyURL":1024,
    "termsOfServiceURL":1024,
}
for key, limit in required_strings.items():
    value = interface.get(key)
    require(isinstance(value,str) and bool(value.strip()), f"missing interface.{key}")
    if isinstance(value,str):
        require(len(value) <= limit, f"interface.{key} exceeds {limit} characters")

allowed_categories = {
    "Productivity","Creativity","Developer Tools","Business & Operations",
    "Data & Analytics","Communication","Education & Research","Security",
    "Finance","Healthcare","Travel","Entertainment","Other"
}
require(interface.get("category") in allowed_categories, "unsupported interface.category")

prompts = interface.get("defaultPrompt") or []
require(isinstance(prompts,list) and 1 <= len(prompts) <= 3, "defaultPrompt must contain 1-3 prompts")
for prompt in prompts:
    require(isinstance(prompt,str) and len(prompt) <= 128 and "\n" not in prompt, "invalid starter prompt")

for asset_key in ("logo","composerIcon"):
    rel = interface.get(asset_key)
    require(isinstance(rel,str) and rel.startswith("./"), f"missing {asset_key}")
    if isinstance(rel,str) and rel.startswith("./"):
        asset = ROOT / rel[2:]
        require(asset.is_file(), f"missing asset {rel}")
        if asset.is_file() and asset.suffix.lower() == ".svg":
            try:
                root = ET.fromstring(asset.read_text(encoding="utf-8"))
                vb = root.attrib.get("viewBox","").split()
                if len(vb) == 4:
                    width, height = float(vb[2]), float(vb[3])
                else:
                    width, height = float(root.attrib["width"]), float(root.attrib["height"])
                require(width == height and width >= 48, f"{rel} must be square and at least 48x48")
            except Exception as e:
                errors.append(f"invalid SVG {rel}: {e}")

review = oi.get("review") or {}
cases = review.get("test_cases") or {}
positive = cases.get("positive") or []
negative = cases.get("negative") or []
require(len(positive) == 5, "initial MCP review requires exactly 5 positive cases")
require(len(negative) == 3, "initial MCP review requires exactly 3 negative cases")
for i, case in enumerate(positive, 1):
    for key in ("description","prompt","tools_triggered","expected_behavior"):
        require(isinstance(case.get(key),str) and bool(case.get(key).strip()), f"positive case {i} missing {key}")
for i, case in enumerate(negative, 1):
    for key in ("description","prompt","expected_behavior"):
        require(isinstance(case.get(key),str) and bool(case.get(key).strip()), f"negative case {i} missing {key}")

require(mcp.get("$schema") == "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", "mcp.json schema is wrong")
servers = mcp.get("mcpServers") or {}
server = servers.get("supplement-intelligence") or {}
require(server.get("type") == "streamable-http", "MCP transport must be streamable-http")
require(server.get("url") == "https://mcp.supplement-intelligence.com/mcp", "MCP URL is wrong")

skill_dir = ROOT / "skills" / "supplement-evidence-research"
skill = skill_dir / "SKILL.md"
agent = skill_dir / "agents" / "openai.yaml"
require(skill.is_file(), "missing skill SKILL.md")
require(agent.is_file(), "missing agents/openai.yaml")
if agent.is_file():
    try:
        y = yaml.safe_load(agent.read_text(encoding="utf-8"))
        require(isinstance(y,dict), "agents/openai.yaml root must be a mapping")
        iface = (y or {}).get("interface") or {}
        require(bool(iface.get("display_name")), "agents/openai.yaml missing interface.display_name")
        require(bool(iface.get("short_description")), "agents/openai.yaml missing interface.short_description")
        deps = (((y or {}).get("dependencies") or {}).get("tools") or [])
        require(any(
            isinstance(d,dict) and d.get("type") == "mcp"
            and d.get("url") == "https://mcp.supplement-intelligence.com/mcp"
            for d in deps
        ), "agents/openai.yaml missing MCP dependency")
    except Exception as e:
        errors.append(f"invalid agents/openai.yaml: {e}")

for name in ("EVALS.md","REVIEW_NOTES.md","README.md"):
    require((ROOT / name).is_file(), f"missing {name}")

if errors:
    print("PLUGIN PACKAGE VALIDATION FAILED")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("PLUGIN PACKAGE VALIDATION PASSED")
print("name:", plugin["name"])
print("version:", plugin["version"])
print("category:", interface["category"])
print("mcp:", server["url"])
print("positive review cases:", len(positive))
print("negative review cases:", len(negative))
