# Cómo Obtener el Chat ID del Grupo de Telegram

## Paso 1: Envía un Mensaje al Grupo

1. Ve al grupo de Telegram donde agregaste el bot
2. Envía cualquier mensaje (por ejemplo: "test" o "/start")

## Paso 2: Obtén el Chat ID

Visita esta URL en tu navegador (reemplaza `YOUR_BOT_TOKEN` con tu token):

```
https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates
```

## Paso 3: Busca el Chat ID del Grupo

En la respuesta JSON, busca un objeto con `"type": "group"` o `"type": "supergroup"`. El `chat.id` será un número negativo (por ejemplo: `-1001234567890`).

Ejemplo de respuesta:
```json
{
  "ok": true,
  "result": [
    {
      "update_id": 123456789,
      "message": {
        "message_id": 5,
        "from": {...},
        "chat": {
          "id": -1001234567890,  // <-- Este es el chat_id del grupo
          "title": "Nombre del Grupo",
          "type": "group"  // o "supergroup"
        },
        "date": 1234567890,
        "text": "test"
      }
    }
  ]
}
```

## Paso 4: Usa el Chat ID

El chat_id del grupo será un número negativo. Cópialo y úsalo en tu configuración.

**Nota**: Si el grupo es un "supergroup", el chat_id será algo como `-1001234567890`. Si es un grupo normal, será algo como `-987654321`.

