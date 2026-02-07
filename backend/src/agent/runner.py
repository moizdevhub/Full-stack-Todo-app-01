"""OpenAI Agent setup with tool registration and execution."""

from typing import Any, Dict, List

from openai import OpenAI
from openai.types.beta import Assistant

from .config import get_agent_config, get_gemini_client
from ..mcp.server import add_task, complete_task, delete_task, list_tasks, update_task


class AgentRunner:
    """Agent runner for executing natural language task management."""

    def __init__(self):
        """Initialize agent runner with Gemini client."""
        self.client: OpenAI = get_gemini_client()
        self.agent_config = get_agent_config()
        self.assistant: Assistant = None

    def _get_tools(self) -> List[Dict[str, Any]]:
        """
        Get tool definitions for OpenAI function calling.

        Returns:
            List of tool definitions
        """
        return [
            {
                "type": "function",
                "function": {
                    "name": "add_task",
                    "description": "Create a new task for the user. Use this when the user wants to add, create, or remember something.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "User UUID from JWT sub claim",
                            },
                            "title": {
                                "type": "string",
                                "description": "Task title or description (1-200 characters)",
                            },
                            "description": {
                                "type": "string",
                                "description": "Optional additional details about the task",
                            },
                        },
                        "required": ["user_id", "title"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "list_tasks",
                    "description": "Retrieve tasks for the user with optional filtering. Use this when the user wants to see their tasks.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "User UUID from JWT sub claim",
                            },
                            "status": {
                                "type": "string",
                                "enum": ["all", "pending", "completed"],
                                "description": "Filter tasks by completion status",
                            },
                        },
                        "required": ["user_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "complete_task",
                    "description": "Mark a task as completed. Use this when the user indicates they've finished a task.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "User UUID from JWT sub claim",
                            },
                            "task_id": {
                                "type": "integer",
                                "description": "ID of the task to mark as completed",
                            },
                        },
                        "required": ["user_id", "task_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_task",
                    "description": "Permanently delete a task. Use this when the user wants to remove a task.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "User UUID from JWT sub claim",
                            },
                            "task_id": {
                                "type": "integer",
                                "description": "ID of the task to delete",
                            },
                        },
                        "required": ["user_id", "task_id"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "update_task",
                    "description": "Update an existing task's title or description. Use this when the user wants to modify task details.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "user_id": {
                                "type": "string",
                                "description": "User UUID from JWT sub claim",
                            },
                            "task_id": {
                                "type": "integer",
                                "description": "ID of the task to update",
                            },
                            "title": {
                                "type": "string",
                                "description": "New task title (optional)",
                            },
                            "description": {
                                "type": "string",
                                "description": "New task description (optional)",
                            },
                        },
                        "required": ["user_id", "task_id"],
                    },
                },
            },
        ]

    async def execute_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool call.

        Args:
            tool_name: Name of the tool to execute
            arguments: Tool arguments

        Returns:
            Tool execution result
        """
        tool_map = {
            "add_task": add_task,
            "list_tasks": list_tasks,
            "complete_task": complete_task,
            "delete_task": delete_task,
            "update_task": update_task,
        }

        if tool_name not in tool_map:
            raise ValueError(f"Unknown tool: {tool_name}")

        tool_func = tool_map[tool_name]
        return await tool_func(**arguments)

    async def run(
        self, user_id: str, message: str, conversation_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Run agent with message and conversation history.

        Args:
            user_id: User UUID for tool calls
            message: User's message
            conversation_history: Previous messages in conversation

        Returns:
            Dict containing response message and tool calls
        """
        # Build messages with conversation history
        messages = conversation_history + [{"role": "user", "content": message}]

        # Create chat completion with tools
        response = self.client.chat.completions.create(
            model="gemini-pro",  # Gemini model via OpenAI-compatible endpoint
            messages=[
                {"role": "system", "content": self.agent_config["instructions"]},
                *messages,
            ],
            tools=self._get_tools(),
            tool_choice="auto",
        )

        # Extract response
        assistant_message = response.choices[0].message
        tool_calls_made = []

        # Execute tool calls if any
        if assistant_message.tool_calls:
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = eval(tool_call.function.arguments)  # Parse JSON arguments

                # Ensure user_id is included in tool arguments
                if "user_id" not in tool_args:
                    tool_args["user_id"] = user_id

                # Execute tool
                tool_result = await self.execute_tool_call(tool_name, tool_args)

                tool_calls_made.append(
                    {"tool": tool_name, "arguments": tool_args, "result": tool_result}
                )

        return {
            "message": assistant_message.content or "Action completed.",
            "tool_calls": tool_calls_made,
        }


# Global agent runner instance
_agent_runner = None


def get_agent_runner() -> AgentRunner:
    """
    Get global agent runner instance.

    Returns:
        AgentRunner: Global agent runner
    """
    global _agent_runner
    if _agent_runner is None:
        _agent_runner = AgentRunner()
    return _agent_runner
