{
  "name": "Setlist",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the setlist"
    },
    "description": {
      "type": "string",
      "description": "Description or notes about the setlist"
    },
    "color": {
      "type": "string",
      "enum": [
        "amber",
        "blue",
        "green",
        "purple",
        "red",
        "pink"
      ],
      "default": "amber",
      "description": "Color theme for the setlist"
    }
  },
  "required": [
    "name"
  ]
}