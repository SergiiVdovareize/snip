import os
import sys
import asyncio
from google.antigravity import Agent, LocalAgentConfig
from google.antigravity.hooks import policy

# Try to load dotenv for reading GEMINI_API_KEY from .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Verify API key
if not os.environ.get("GEMINI_API_KEY"):
    print("WARNING: GEMINI_API_KEY environment variable is not set.")
    print("Please set it in your environment or in a .env file.")
    print("To get a Gemini API key, visit: https://aistudio.google.com/app/api-keys\n")

# Get path of the skills directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SKILLS_DIR = os.path.join(CURRENT_DIR, "skills")
WORKSPACE_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))

# Create the agent configuration
config = LocalAgentConfig(
    system_instructions=(
        "You are a professional, senior software developer and code reviewer. "
        "Adhere to the custom code-review skill guidelines when performing reviews."
    ),
    skills_paths=[SKILLS_DIR],
    workspaces=[WORKSPACE_DIR],
    policies=[
        policy.workspace_only([WORKSPACE_DIR]),
        policy.confirm_run_command()
    ]
)

async def main():
    print("Starting Code Reviewer Agent...")
    print(f"Skills loaded from: {SKILLS_DIR}")
    print(f"Workspace path: {WORKSPACE_DIR}\n")
    
    async with Agent(config) as agent:
        print("Agent is ready. Type 'exit' or 'quit' to end.")
        await agent.run_interactive_loop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nExited.")
        sys.exit(0)
