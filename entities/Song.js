{
  "name": "Song",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "Title of the song"
    },
    "artist": {
      "type": "string",
      "description": "Artist or composer"
    },
    "setlist_id": {
      "type": "string",
      "description": "ID of the setlist this song belongs to"
    },
    "order": {
      "type": "number",
      "default": 0,
      "description": "Order within the setlist"
    },
    "key": {
      "type": "string",
      "description": "Musical key (e.g. C Major, A Minor)"
    },
    "tempo": {
      "type": "number",
      "description": "Tempo in BPM"
    },
    "duration": {
      "type": "string",
      "description": "Duration of the song (e.g. 3:45)"
    },
    "score_url": {
      "type": "string",
      "description": "URL to the PDF score file"
    },
    "audio_url": {
      "type": "string",
      "description": "URL to the full mix audio file"
    },
    "stems": {
      "type": "array",
      "description": "Individual instrument stems",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Instrument name (e.g. Vocals, Guitar, Bass, Drums)"
          },
          "url": {
            "type": "string",
            "description": "URL to the stem audio file"
          }
        }
      }
    },
    "notes": {
      "type": "string",
      "description": "Practice notes for this song"
    }
  },
  "required": [
    "title",
    "setlist_id"
  ]
}